// The size of your maze (e.g., 20 tiles wide by 15 tiles high)
export const MAZE_WIDTH = 20;
export const MAZE_HEIGHT = 15;

// The starting time for the minigame (in seconds)
export const MINIGAME_DURATION = 30;
export const EGG_COUNT = 5; // Number of eggs to spawn
export const EGG_TIME_BONUS = 2; // Seconds added for each egg collected
export const DIG_COOLDOWN_MS = 450; // Delay between wall breaks

// Define what each number in the maze layout means
export const TILE_TYPE = {
	PATH: 0,
	WALL: 1,
	START: 2,
	EXIT: 3,
	EGG: 4, // A tile with an emu egg
	NEST: 5, // An empty nest left behind after collecting an egg
};

export type Direction = "up" | "down" | "left" | "right";

export class RaidModel {
	public timeRemaining: number;
	public playerPosition: { x: number; y: number }; // Player's position in tile coordinates
	public mazeLayout: number[][]; // 2D array representing the maze
	public eggsCollected: number; // Eggs collected this run
	public totalEggs: number; // Eggs actually placed in this maze
	public lastDigTime: number; // Timestamp of the last wall break

	constructor() {
		this.timeRemaining = MINIGAME_DURATION;
		this.playerPosition = { x: 0, y: 0 };
		this.mazeLayout = [];
		this.eggsCollected = 0;
		this.totalEggs = 0;
		this.lastDigTime = 0;
		this.reset();
	}

	/**
	 * Resets the minigame state to its default values.
	 */
	reset(): void {
		this.timeRemaining = MINIGAME_DURATION;
		this.playerPosition = { x: 1, y: 1 };
		this.eggsCollected = 0; // Reset egg count
		this.totalEggs = 0;
		this.lastDigTime = 0;
		this.mazeLayout = Array(MAZE_HEIGHT)
			.fill(null)
			.map(() => Array(MAZE_WIDTH).fill(TILE_TYPE.PATH));
	}

	hasAllEggs(): boolean {
		return this.totalEggs > 0 && this.eggsCollected >= this.totalEggs;
	}

	/**
	 * 0 to 3 stars. Escaping is required to earn any stars.
	 */
	getStarRating(didWin: boolean): number {
		if (!didWin || this.eggsCollected === 0) return 0;
		if (this.hasAllEggs()) return 3;
		if (this.eggsCollected >= 3) return 2;
		return 1;
	}
}
