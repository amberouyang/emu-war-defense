import { ScreenController } from "../../types";
import type { ScreenSwitcher } from "../../types";
import { GameStatusController } from "../../controllers/GameStatusController";
import { AudioManager } from "../../services/AudioManager";
import {
	RaidModel,
	TILE_TYPE,
	EGG_COUNT,
	EGG_TIME_BONUS,
	DIG_COOLDOWN_MS,
	MAZE_WIDTH,
	MAZE_HEIGHT,
	MINIGAME_DURATION,
	type Direction,
} from "./RaidModel";
import { RaidView } from "./RaidView";

type RaidPhase = "idle" | "intro" | "playing" | "results";

const RETURN_DELAY_SECONDS = 5;

const MOVE_KEYS: Record<string, Direction> = {
	w: "up",
	arrowup: "up",
	s: "down",
	arrowdown: "down",
	a: "left",
	arrowleft: "left",
	d: "right",
	arrowright: "right",
};

const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
	up: { dx: 0, dy: -1 },
	down: { dx: 0, dy: 1 },
	left: { dx: -1, dy: 0 },
	right: { dx: 1, dy: 0 },
};

export class RaidController extends ScreenController {
	private model: RaidModel;
	private view: RaidView;
	private screenSwitcher: ScreenSwitcher;
	private gameStatus: GameStatusController;
	private audio: AudioManager;
	private gameTimer: number | null = null;
	private returnTimer: number | null = null;
	private phase: RaidPhase = "idle";

	constructor(
		screenSwitcher: ScreenSwitcher,
		gameStatus: GameStatusController,
		audio: AudioManager,
	) {
		super();
		this.screenSwitcher = screenSwitcher;
		this.gameStatus = gameStatus;
		this.audio = audio;
		this.model = new RaidModel();
		this.view = new RaidView(
			() => this.handleIntroStart(),
			() => this.finishRaid(),
		);

		window.addEventListener("keydown", (e) => this.handleKeyDown(e));
	}

	public startGame(): void {
		this.clearTimers();
		this.phase = "intro";
		this.generateRandomMaze();
		this.view.setupBoard(
			this.model.mazeLayout,
			this.model.playerPosition,
			this.model.totalEggs,
			this.model.timeRemaining,
			MINIGAME_DURATION,
		);
		this.view.show();
		this.view.showIntro();
	}

	override hide(): void {
		this.clearTimers();
		this.phase = "idle";
		super.hide();
	}

	/**
	 * Random scatter maze. Some areas may be sealed off, which is what the
	 * dig ability is for.
	 */
	private generateRandomMaze(): void {
		this.model.reset();
		const layout = this.model.mazeLayout;

		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				const isBorder = x === 0 || x === MAZE_WIDTH - 1 || y === 0 || y === MAZE_HEIGHT - 1;
				layout[y][x] = isBorder || Math.random() < 0.3 ? TILE_TYPE.WALL : TILE_TYPE.PATH;
			}
		}

		layout[1][1] = TILE_TYPE.START;
		layout[1][2] = TILE_TYPE.PATH;
		layout[2][1] = TILE_TYPE.PATH;
		this.model.playerPosition = { x: 1, y: 1 };

		layout[MAZE_HEIGHT - 2][MAZE_WIDTH - 2] = TILE_TYPE.EXIT;
		layout[MAZE_HEIGHT - 2][MAZE_WIDTH - 3] = TILE_TYPE.PATH;
		layout[MAZE_HEIGHT - 3][MAZE_WIDTH - 2] = TILE_TYPE.PATH;

		let eggsPlaced = 0;
		let attempts = 0;
		while (eggsPlaced < EGG_COUNT && attempts < 1000) {
			attempts++;
			const x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
			const y = Math.floor(Math.random() * (MAZE_HEIGHT - 2)) + 1;
			if (layout[y][x] === TILE_TYPE.PATH) {
				layout[y][x] = TILE_TYPE.EGG;
				eggsPlaced++;
			}
		}
		this.model.totalEggs = eggsPlaced;
	}

	private handleIntroStart(): void {
		if (this.phase !== "intro") return;
		this.phase = "playing";
		this.view.hideIntro();
		this.view.showGo();
		this.audio.playSfx("run", 0.5);
		this.startTimer();
	}

	private startTimer(): void {
		this.clearTimers();
		this.gameTimer = window.setInterval(() => {
			this.model.timeRemaining--;
			this.view.updateTimer(this.model.timeRemaining, MINIGAME_DURATION);
			if (this.model.timeRemaining <= 0) {
				this.endGame(false);
			}
		}, 1000);
	}

	private handleKeyDown(e: KeyboardEvent): void {
		if (!this.view.getGroup().visible()) return;

		const key = e.key.toLowerCase();
		const isSpace = key === " " || e.code === "Space";
		const isConfirm = key === "enter" || isSpace;

		if (this.phase === "intro" || this.phase === "results") {
			if (!isConfirm) return;
			e.preventDefault();
			if (e.repeat) return;
			if (this.phase === "intro") this.handleIntroStart();
			else this.finishRaid();
			return;
		}

		if (this.phase !== "playing") return;

		if (isSpace) {
			e.preventDefault();
			this.tryDig();
			return;
		}

		const direction = MOVE_KEYS[key];
		if (!direction) return;
		e.preventDefault();
		this.tryMove(direction);
	}

	private tryMove(direction: Direction): void {
		const { dx, dy } = DIRECTION_DELTAS[direction];
		const newX = this.model.playerPosition.x + dx;
		const newY = this.model.playerPosition.y + dy;
		if (newY < 0 || newY >= MAZE_HEIGHT || newX < 0 || newX >= MAZE_WIDTH) return;

		const tile = this.model.mazeLayout[newY][newX];
		if (tile === TILE_TYPE.WALL) {
			this.view.bumpPlayer(direction);
			return;
		}

		this.model.playerPosition = { x: newX, y: newY };
		this.view.movePlayer(newX, newY, direction);

		if (tile === TILE_TYPE.EGG) {
			this.collectEgg(newX, newY);
		} else if (tile === TILE_TYPE.EXIT) {
			this.endGame(true);
		}
	}

	private collectEgg(x: number, y: number): void {
		this.model.eggsCollected++;
		this.model.timeRemaining += EGG_TIME_BONUS;
		this.model.mazeLayout[y][x] = TILE_TYPE.NEST;

		this.view.drawMaze(this.model.mazeLayout);
		this.view.collectEgg(x, y, this.model.eggsCollected);
		this.view.updateTimer(this.model.timeRemaining, MINIGAME_DURATION);
		this.audio.playSfx("harvest", 0.6);

		if (this.model.hasAllEggs()) {
			this.view.showAllEggsFound();
		}
	}

	private tryDig(): void {
		const now = performance.now();
		if (now - this.model.lastDigTime < DIG_COOLDOWN_MS) {
			this.view.flashDigNotReady();
			return;
		}

		const broken = this.breakAdjacentWalls(this.model.playerPosition.x, this.model.playerPosition.y);
		if (broken.length === 0) return;

		this.model.lastDigTime = now;
		this.view.drawMaze(this.model.mazeLayout);
		this.view.breakWalls(broken);
		this.view.startDigCooldown(DIG_COOLDOWN_MS);
		this.audio.playSfx("squeeze", 0.4);
	}

	private breakAdjacentWalls(x: number, y: number): { x: number; y: number }[] {
		const layout = this.model.mazeLayout;
		const broken: { x: number; y: number }[] = [];
		for (const { dx, dy } of Object.values(DIRECTION_DELTAS)) {
			const nx = x + dx;
			const ny = y + dy;
			// The outer border is permanent.
			if (nx > 0 && nx < MAZE_WIDTH - 1 && ny > 0 && ny < MAZE_HEIGHT - 1 && layout[ny][nx] === TILE_TYPE.WALL) {
				layout[ny][nx] = TILE_TYPE.PATH;
				broken.push({ x: nx, y: ny });
			}
		}
		return broken;
	}

	private endGame(didWin: boolean): void {
		if (this.phase !== "playing") return;
		this.phase = "results";
		this.clearTimers();

		if (didWin) {
			// Eggs only count if you make it out.
			this.gameStatus.addEmuEggs(this.model.eggsCollected);
			this.audio.playSfx("harvest");
		} else {
			this.audio.playSfx("emu");
		}

		this.view.showResults({
			didWin,
			eggsCollected: this.model.eggsCollected,
			totalEggs: this.model.totalEggs,
			timeLeft: Math.max(0, this.model.timeRemaining),
			stars: this.model.getStarRating(didWin),
		});

		let secondsLeft = RETURN_DELAY_SECONDS;
		this.view.updateReturnCountdown(secondsLeft);
		this.returnTimer = window.setInterval(() => {
			secondsLeft--;
			if (secondsLeft <= 0) {
				this.finishRaid();
			} else {
				this.view.updateReturnCountdown(secondsLeft);
			}
		}, 1000);
	}

	private finishRaid(): void {
		if (this.phase !== "results") return;
		this.screenSwitcher.switchToScreen({ type: "farm", newgame: false });
	}

	private clearTimers(): void {
		if (this.gameTimer !== null) {
			clearInterval(this.gameTimer);
			this.gameTimer = null;
		}
		if (this.returnTimer !== null) {
			clearInterval(this.returnTimer);
			this.returnTimer = null;
		}
	}

	getView(): RaidView {
		return this.view;
	}
}
