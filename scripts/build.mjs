import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
process.chdir(root);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp('index.html', path.join(dist, 'index.html'));
await cp('vendor', path.join(dist, 'vendor'), { recursive: true });
await cp('fonts', path.join(dist, 'fonts'), { recursive: true });

const zipPath = path.join(root, 'rollout-crazygames.zip');
await rm(zipPath, { force: true });
execSync('zip -r -9 -X ../rollout-crazygames.zip .', { cwd: dist, stdio: 'inherit' });

const zip = await stat(zipPath);
const html = await stat(path.join(dist, 'index.html'));
const three = await stat(path.join(dist, 'vendor', 'three.min.js'));
console.log(`dist/index.html ${(html.size / 1024).toFixed(0)} KB`);
console.log(`dist/vendor/three.min.js ${(three.size / 1024).toFixed(0)} KB`);
console.log(`rollout-crazygames.zip ${(zip.size / 1024 / 1024).toFixed(2)} MB`);
if (zip.size > 20 * 1024 * 1024) {
  console.error('Zip is over the 20 MB mobile-homepage initial-download guide.');
  process.exit(1);
}
