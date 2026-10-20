# CrazyGames store listing — Rollout

Upload the images in this folder with the game zip. Record the two preview videos yourself in the developer portal flow (the site wants silent 1080p clips, 15–20 seconds, landscape 16:9 and portrait 2:3, opening on a frame close to the cover, no cursor, no “Play now”).

## Title

Rollout: 30-Marble Knockout

## Short description

Thirty marbles, four heats, one way down. Steer, jump, and dash. Come back for a daily streak, three missions, and a weekly goal.

## Full description

Rollout is a 30-marble knockout. Everyone starts together. Each heat keeps a smaller field: 22, then 15, then 8, then a final where first across the line wins.

A yellow ring marks your marble. Steer with the keyboard, a mouse drag, or a finger. Jump the gaps. Dash for a burst when it is charged. Some roads split into a fast lane, a sticky safe lane, and a bumper lane. Coins sit on the risky lines. Grab them in a chain and the combo climbs. Between heats, pick an upgrade that stacks for the rest of the show.

Coins buy new marble skins. Leveling up opens more worlds: Toy Box, Savanna, Candy Canyon, Frost Peak, and Neon Night. Play solo against the pack, or open a room and race friends, with bots filling the empty spots.

Come back once a day for a streak that pays 20 coins and climbs to 150 on day 7, then starts a new cycle at day 1. A week badge counts each cycle you finish. Miss a day and the current cycle starts over. Three daily missions, the same for every player on that date, pay coins and XP the moment you finish them. A weekly goal pays a bigger purse once. In solo, one marble is your rival, a blue orb blocks a wall hit, and a gold orb pulls coins in. The rank chip shows whether you are safe, close to the cut, or out.

Rounds are short. When you are knocked out you can watch the rest or jump straight into another race.

## Controls

Keyboard: the Arrow layout is the default. Up accelerates, Down brakes, Left and Right steer, Space jumps, Shift dashes. WASD does the same jobs as a second set of keys (W accelerate, S brake, A and D steer). Settings can switch the labels to WASD or rebind every action. Keys are stored by physical key and shown with the letter your keyboard prints, so AZERTY can be rebound once. P pauses.

Mouse: drag left and right to steer. Click to jump. Hold the right button to accelerate.

Touch: two controls. A steering wheel sits on the joystick side (left or right in Settings). Drag the wheel, or anywhere on that half, to steer. Hold Go on the other side, and let go to coast. Swipe up to jump. Swipe down to brake. When Go glows, double-tap it to dash.

## Tags

Racing, Arcade, 3D, Skill, Casual, Multiplayer, Sports, Marble

## Category suggestion

Racing

## Cover files

- `cover-landscape.png` — 1920×1080
- `cover-portrait.png` — 800×1200
- `cover-square.png` — 800×800

All three are rendered from the game (Toy Box track, the same title treatment). No borders, no “Play” label, no store logos.

## Progress save

In the submission form, turn on progress save and choose the CrazyGames SDK data module. The game will not behave correctly on CrazyGames if that toggle is left off.

## Multiplayer

Tick “The game is an online multiplayer game”.

- Lobby size: Min 2, Max 8
- The host can start with one player. Bots fill the empty spots.
- Invite links, the invite button, room status, and instant multiplayer use the CrazyGames SDK.

## Audio

Tick “supports CrazyGames muting audio through SDK”. The game reads `settings.muteAudio` on startup and follows `addSettingsChangeListener`. Platform mute silences music and effects without changing the saved volume sliders.
