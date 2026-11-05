export const LEADERBOARD_KEY = "farmDefenseLeaderboard";

/**
 * Represents a single leaderboard entry
 */
export type LeaderboardEntry = {
	name: string; 
	survivalDays: number;
	score: number;
	timestamp: string; // formatted timestamp
};

/**
 * ResultsScreenModel - Stores final score and leaderboard
 */
export class GameOverScreenModel {
	private survivalDays = 0;
	private finalScore = 0;
	private won = false;
	private cropsHarvested = 0;
	private leaderboard: LeaderboardEntry[] = [];

	/**
	 * Set the final results
	 */
	setFinalResults(survivalDays: number, score: number, won: boolean = false, cropsHarvested: number = 0): void {
		this.survivalDays = survivalDays;
		this.finalScore = score;
		this.won = won;
		this.cropsHarvested = cropsHarvested;
	}

	didWin(): boolean {
		return this.won;
	}

	getCropsHarvested(): number {
		return this.cropsHarvested;
	}

	/**
	 * Get the final score
	 */
	getFinalScore(): number {
		return this.finalScore;
	}
	/**
	 * Get the survival days
	 */
	getSurvivalDays(): number {
		return this.survivalDays;
	}

	/**
	 * Set the leaderboard entries
	 */
	setLeaderboard(entries: LeaderboardEntry[]): void {
		this.leaderboard = entries;
	}

	/**
	 * Get the leaderboard entries
	 */
	getLeaderboard(): LeaderboardEntry[] {
		return this.leaderboard;
	}
}
