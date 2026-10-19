import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8766;
const DEBUG_PORT = 9333;
const outDir = '/tmp/rollout-shots';
const storeDir = path.join(root, 'store');
await mkdir(outDir, { recursive: true });

function contentType(file){
  const ext = path.extname(file);
  return { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.md': 'text/plain' }[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)){ res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err){ res.writeHead(404); res.end('missing ' + rel); return; }
    res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--remote-debugging-port=' + DEBUG_PORT,
  '--user-data-dir=/tmp/rollout-chrome-' + Date.now(),
  '--window-size=1280,720',
  'about:blank',
], { stdio: 'ignore' });

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function debuggerWs(){
  for (let i = 0; i < 40; i++){
    try {
      const res = await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/version');
      const j = await res.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(150);
  }
  throw new Error('Chrome debugger did not open');
}

const browserWs = new WebSocket(await debuggerWs());
await new Promise((res, rej) => { browserWs.onopen = res; browserWs.onerror = rej; });

let nextId = 0;
const pending = new Map();
const sessions = new Map();
browserWs.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)){
    const p = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    return;
  }
  if (msg.method === 'Target.attachedToTarget'){
    const sid = msg.params.sessionId;
    const bag = sessions.get(sid);
    if (bag) bag.onMessage(msg);
  }
  if (msg.sessionId && sessions.has(msg.sessionId)){
    sessions.get(msg.sessionId).onMessage(msg);
  }
};
function browserSend(method, params = {}){
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    browserWs.send(JSON.stringify({ id, method, params }));
  });
}

function makeSession(sessionId){
  const listeners = [];
  const bag = {
    onMessage(msg){
      if (msg.id && bag.pending.has(msg.id)){
        const p = bag.pending.get(msg.id); bag.pending.delete(msg.id);
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
        return;
      }
      if (msg.method) for (const fn of listeners) fn(msg);
    },
    pending: new Map(),
  };
  sessions.set(sessionId, bag);
  function send(method, params = {}){
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      bag.pending.set(id, { resolve, reject });
      browserWs.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  return { send, on: fn => listeners.push(fn) };
}

await browserSend('Target.setDiscoverTargets', { discover: true });
const { targetId } = await browserSend('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await browserSend('Target.attachToTarget', { targetId, flatten: true });
const page = makeSession(sessionId);

const errors = [];
const failedUrls = [];
page.on(msg => {
  if (msg.method === 'Runtime.exceptionThrown'){
    const d = msg.params.exceptionDetails;
    errors.push('exception: ' + (d.exception && d.exception.description || d.text));
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error'){
    const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
    if (/crazygames|sdk/i.test(text)) return;
    errors.push('console: ' + text);
  } else if (msg.method === 'Network.loadingFailed'){
    const url = msg.params.errorText + ' ' + (msg.params.type || '');
    failedUrls.push(msg.params);
  } else if (msg.method === 'Network.responseReceived'){
    const { response } = msg.params;
    if (response.status >= 400 && !/crazygames/.test(response.url)) failedUrls.push(response.url + ' ' + response.status);
  }
});

await page.send('Runtime.enable');
await page.send('Page.enable');
await page.send('Network.enable');
await page.send('Log.enable').catch(() => {});

async function go(url, width, height, mobile){
  await page.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: !!mobile,
  });
  if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  else await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await page.send('Page.navigate', { url });
  await page.send('Page.loadEventFired').catch(() => {});
  for (let i = 0; i < 80; i++){
    const ready = await page.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
    if (ready.result.value === 'complete') break;
    await sleep(100);
  }
}

async function evalJson(expr){
  const r = await page.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function waitSnap(pred, label, ms = 20000){
  const start = Date.now();
  let last = null;
  while (Date.now() - start < ms){
    last = await evalJson('window.__rollout ? window.__rollout.snap() : null');
    if (last && pred(last)) return last;
    await sleep(200);
  }
  throw new Error(label + ' timed out. last=' + JSON.stringify(last) + ' errors=' + errors.join(' | '));
}

async function shot(name, dir = outDir){
  const r = await page.send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(dir, name);
  await writeFile(file, Buffer.from(r.data, 'base64'));
  return file;
}

async function key(code, type){
  await page.send('Input.dispatchKeyEvent', { type, key: code, code, windowsVirtualKeyCode: 0 });
}

const base = 'http://127.0.0.1:' + PORT + '/index.html?debug=1';

await go(base, 1216, 684, false);
const race = await waitSnap(s => (s.state === 'countdown' || s.state === 'race') && s.racers === 30 && s.mode === 'solo', 'desktop race');
const rolling = await waitSnap(s => s.state === 'race', 'go');
await key('KeyD', 'keyDown');
await sleep(900);
await key('Space', 'keyDown');
await sleep(80);
await key('Space', 'keyUp');
await key('ShiftLeft', 'keyDown');
await sleep(80);
await key('ShiftLeft', 'keyUp');
await sleep(700);
await key('KeyD', 'keyUp');
const after = await evalJson('window.__rollout.snap()');
const coachText = await evalJson(`(() => {
  const c = document.getElementById('coach');
  return { hidden: !c || c.hidden, title: document.getElementById('coachTitle') && document.getElementById('coachTitle').textContent, hud: document.getElementById('hud').classList.contains('on') };
})()`);
await shot('playtest-desktop.png');

await evalJson(`localStorage.setItem('rollout_coach','1'); true`);
await go(base, 1216, 684, false);
const menu = await waitSnap(s => s.mode === 'attract' && s.state === 'race', 'menu attract');
const menuOn = await evalJson(`document.getElementById('scrMenu').classList.contains('on')`);
await evalJson(`document.getElementById('btnHow').click(); true`);
await sleep(300);
const howOn = await evalJson(`document.getElementById('scrHow').classList.contains('on')`);
await evalJson(`document.getElementById('btnHowBack').click(); document.getElementById('btnSkins').click(); true`);
await sleep(300);
const skins = await evalJson(`document.getElementById('scrSkins').classList.contains('on') && document.querySelectorAll('#skinGrid .skin').length`);
await shot('playtest-shop.png');
const watchHidden = await evalJson(`document.getElementById('skinWatch').hidden === true`);
await evalJson(`document.getElementById('btnSkinsBack').click(); true`);
await sleep(200);
await evalJson(`document.getElementById('btnPlay').click(); true`);
const perk = await waitSnap(s => s.state === 'perk', 'perk pick');
await evalJson(`document.querySelector('#perkList .perk').click(); true`);
const secondRace = await waitSnap(s => s.state === 'race' || s.state === 'countdown', 'second race');
await evalJson(`document.getElementById('btnPause').click(); true`);
await sleep(250);
const paused = await evalJson(`document.getElementById('scrPause').classList.contains('on') && window.__rollout.snap().paused`);
await evalJson(`document.getElementById('btnQuality2').click(); true`);
await sleep(200);
const smooth = await evalJson(`window.__rollout.snap().quality`);
await evalJson(`document.getElementById('btnResume').click(); true`);
await sleep(200);
const resumed = await evalJson(`!document.getElementById('scrPause').classList.contains('on') && !window.__rollout.snap().paused`);

await go(base, 800, 450, true);
const mobile = await waitSnap(s => s.mode === 'attract' || s.mode === 'solo', 'mobile');
const touchUi = await evalJson(`(() => {
  const jump = document.getElementById('btnJump');
  const cs = getComputedStyle(jump);
  return { display: cs.display, touch: document.body.classList.contains('touch'), w: innerWidth, h: innerHeight };
})()`);
await shot('playtest-mobile.png');

async function cover(kind, w, h, file){
  await go(base.replace('debug=1', 'poster=' + kind), w, h, false);
  const start = Date.now();
  while (Date.now() - start < 15000){
    const ready = await evalJson('window.__posterReady === true');
    if (ready) break;
    await sleep(200);
  }
  const ready = await evalJson('window.__posterReady === true && document.body.classList.contains("poster")');
  if (!ready) throw new Error('poster ' + kind + ' not ready');
  await sleep(400);
  await shot(file, storeDir);
}

await go(base, 821, 462, false);
await waitSnap(s => s.mode === 'attract' || s.mode === 'solo', 'narrow');
const narrow = await evalJson(`(() => {
  const ids = ['rankNum','stripBar','btnMute','btnPause'];
  const box = document.getElementById('app').getBoundingClientRect();
  return ids.map(id => {
    const r = document.getElementById(id).getBoundingClientRect();
    return { id, ok: r.width > 0 && r.right <= box.right + 2 && r.left >= -2 && r.top >= -2 };
  });
})()`);
await shot('playtest-narrow.png');

await cover('landscape', 1920, 1080, 'cover-landscape.png');
await cover('portrait', 800, 1200, 'cover-portrait.png');
await cover('square', 800, 800, 'cover-square.png');

const report = { race, after, coachText, menu, menuOn, howOn, skins, watchHidden, perk, secondRace, paused, smooth, resumed, touchUi, narrow, errors, failedUrls };
console.log(JSON.stringify(report, null, 2));

chrome.kill('SIGKILL');
server.close();
const narrowOk = Array.isArray(narrow) && narrow.every(x => x.ok);
if (errors.length || failedUrls.length || !menuOn || !howOn || skins < 10 || !watchHidden || !paused || smooth !== 'low' || !resumed || touchUi.display === 'none' || after.racers !== 30 || !(after.s > rolling.s + 1) || !narrowOk){
  console.error('movement', rolling && rolling.s, '->', after.s);
  process.exit(1);
}
