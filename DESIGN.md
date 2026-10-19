# Rollout design notes

Rollout is still a 30-marble knockout: four heats, a shrinking qualifying field, and one winner. The toy-box look, worlds, skins, and upgrade picks stay. This pass makes the race feel like a game you restart on purpose, and makes the build something CrazyGames can review.

## Feel

Hits were correct and quiet. Hard landings, bumpers, pegs, and marble clashes now throw a small spark burst, kick the camera, and (on the big ones) hold the sim for a few frames. Dashes and high speed leave a short trail behind the marble you are watching. Only that marble gets a trail, and sparks come from one shared point cloud, so phones are not drawing thirty ribbons.

Coins, close overtakes, clean gap landings, and bumper pops feed one combo. The chain fades if you go quiet for a couple of seconds. A big chain is a happy-time moment, and the best chain pays a few extra coins at the end. Place is still what knocks you out. The combo is the reason to take the risky line.

## Difficulty

Bots now have a personality (safe lane, balanced, or the fast lane with the spinner) and a skill that scales with the heat. Heat 1 is a loose pack. The final is a sharp one. In solo, bots far ahead of you ease off a little and bots buried in the back get a small shove, so the photo at the line stays crowded. They do not get a boost for being near you in multiplayer.

## First thirty seconds

A brand-new player skips the menu and drops into heat 1. A coach card asks for a steer, then a jump, then a dash, then gets out of the way. Skip is always there. The first upgrade pick waits until the next heat, so the opening is driving, not a menu. After that, or if you quit, the game remembers and opens on the menu. One click starts the next race. An invite link skips the menu and joins that room. Instant multiplayer opens a fresh room instead of the coach.

## Sessions

Play again is on the knockout and the podium. Progress (coins, skins, level, worlds, stars, best place, audio, graphics) is saved. On CrazyGames that goes through the SDK data module. Anywhere else it falls back to localStorage. If a player already had a local save and later opens the game on CrazyGames, those keys are copied into the data module once.

## Graphics

The game picks low graphics on very small devices, medium on phones and modest memory, and high otherwise. Low uses pixel ratio 1, no shadows, and fewer sparks and scenery pieces. Medium keeps small shadows and a 1.15 pixel-ratio cap. High caps the pixel ratio at 1.5. Settings and the pause screen can switch it. Volume, camera shake, touch sensitivity, joystick side, and an FPS counter are saved there too.

Settings also stores the control layout. Arrow keys are the default: Up accelerates, Down brakes, Left and Right steer, Space jumps, Shift dashes. WASD is the same set with the letters first. Custom rebinds each action to a primary key and an optional second key. Bindings use the physical key and show the letter the keyboard prints. Holding accelerate adds a push that fades out by speed 24, and steering gets looser, so the extra speed is a line choice. Brake scrubs down to a crawl. Dash stays a separate charged burst. On a phone, Go and Brake sit with Jump and Dash, and a long upward drag accelerates too. The right mouse button accelerates. Hints, the coach, and How to play read the current keys.

A profile chip on the menu holds the player name, a marble color, and games, wins, best place, level, and coins. When the CrazyGames user module is available and the player is logged in, the chip uses that username and avatar. Otherwise it keeps a guest profile on the device. Sign-in is a button that calls the SDK auth prompt. It never opens by itself.

## Sound

Effects and music are still synthesized in WebAudio. There is a rising combo blip. Music and effects keep separate mute buttons. Ads mute only once an ad actually starts, and the context resumes on the next tap after the page was hidden. CrazyGames `settings.muteAudio` silences both buses on top of those sliders and does not rewrite the saved volumes. The listener is `addSettingsChangeListener`.

## Multiplayer

Friends rooms hold up to 8 people. Bots fill the rest, and the host can start whenever. Creating a room calls `updateRoom`, `inviteLink`, and `showInviteButton` with the room code. Leaving calls `hideInviteButton` and `leftRoom`. The copied invite is the SDK link. `getInviteParam('room')` and `inviteParams` join that lobby on load, and `isInstantMultiplayer` creates one. Signalling is the public PeerJS broker at `0.peerjs.com`. Midgame ads run between rounds only, and a request during a multiplayer race is ignored so the room stays up.
