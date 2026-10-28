# Emu War Defense

A fast-paced browser strategy game where you defend a wheat farm from relentless emu attacks.

Inspired by the historical Great Emu War, this project blends resource management, real-time defense, and arcade mini-games into a single survival run. Built with TypeScript, Vite, and Konva.

## Live Demo

**[Play the game →](https://amberouyang.github.io/emu-war-defense/)**

## Overview

Set on a struggling wheat farm during the Great Emu War, you balance growing crops, upgrading defenses, and raiding emu territory to survive as many days as possible. Each day brings new threats, events, and choices that shape how long your farm lasts.

## Features

- **Farm defense** — Protect every crop from an escalating emu swarm.
- **Resource management** — Earn money, plant crops, and invest in upgradeable defenses.
- **Mini-games** — Hunt emus and launch raids to earn rewards between waves.
- **Daily quiz** — Answer trivia questions to unlock helpful bonuses.
- **Leaderboard** — Track your best runs locally.

## How to Play

1. Start a new run from the main menu.
2. Protect the farm, expand your defenses, and survive each day.
3. Use mini-games and daily rewards to stay ahead of the emus.

## Tech Stack

| Layer | Tools |
|-------|-------|
| Language | TypeScript |
| Build | Vite |
| Rendering | Konva (2D canvas) |
| Testing | Vitest |

## Architecture

The game follows an MVC-style pattern with clear separation between screens, components, and shared game state:

- **`src/screens/`** — Full-screen game phases (farm, hunting, raids, menus, game over)
- **`src/components/`** — Reusable entities (emus, defenses, bullets, player)
- **`src/controllers/`** — Shared game logic (status, quiz)
- **`src/services/`** — Cross-cutting concerns (audio)
- **`public/`** — Static assets (images, audio)

## Getting Started

**Requirements:** Node.js and npm

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will print a local URL in the terminal. Open it in your browser to play.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run the test suite |
| `npm run test:ui` | Open the interactive Vitest UI |

## License

See [LICENSE](LICENSE) for details.
