# Dragon Garden — 8-Level Phaser + Capacitor Game

## Features

- Eight levels
- Increasing apple speed and spawn rate
- Increasing fireball travel speed at every level
- Reduced firing cooldown at higher levels, allowing rapid shooting
- Dragon movement by touch or mouse drag
- Tap/click to shoot
- Score and energy HUD
- Start, pause/resume, restart, and play-again controls
- Apples shrink the dragon when they hit it
- From Level 3 onward, missed apples drain energy
- Full restart resets level, speeds, timers, score, energy, and dragon size
- Phaser 3, Vite, and Capacitor-ready project structure
- Included game images and pew sound

## Level score thresholds

- Level 2: 8
- Level 3: 18
- Level 4: 30
- Level 5: 45
- Level 6: 63
- Level 7: 84
- Level 8: 108

## Run in browser

```bash
npm install
npm run dev
```

## Build and open iOS

```bash
npx cap add ios
npm run ios
```

## Build and open Android

```bash
npx cap add android
npm run android
```

Run `npx cap add ios` and `npx cap add android` only once. Change the `appId`
inside `capacitor.config.ts` before publishing.

## Responsive mobile text

This version makes all HUD labels, level prompts, game-over messages, and
buttons responsive. Text sizes scale with the screen, long center messages wrap
inside a maximum width, and controls respect iPhone/Android safe areas,
including the notch and home indicator.
