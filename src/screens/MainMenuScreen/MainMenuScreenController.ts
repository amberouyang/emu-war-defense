import { ScreenController } from "../../types.ts";
import type { ScreenSwitcher } from "../../types.ts";
import type { GameStatusController } from "../../controllers/GameStatusController.ts";
import type { AudioManager } from "../../services/AudioManager.ts";
import { LEADERBOARD_KEY, type LeaderboardEntry } from "../GameOverScreen/GameOverScreenModel.ts";
import { MainMenuScreenView, type BestRun } from "./MainMenuScreenView.ts";

/**
 * MenuScreenController - Handles menu interactions
 */
export class MainMenuScreenController extends ScreenController {
	private view: MainMenuScreenView;
	private screenSwitcher: ScreenSwitcher;
	private status: GameStatusController;
	private audio: AudioManager | null;

	constructor(screenSwitcher: ScreenSwitcher, status: GameStatusController, audio: AudioManager | null = null) {
		super();
		this.screenSwitcher = screenSwitcher;
		this.status = status;
		this.audio = audio;
		this.view = new MainMenuScreenView(
			() => this.handleNewGameClick(),
			() => this.handleContinueClick(),
			() => this.audio?.playSfx("emu", 0.5),
		);

		window.addEventListener("keydown", (e) => this.handleKeyDown(e));
	}

	override show(): void {
		this.view.setContinueInfo(
			this.status.hasSavedGame()
				? {
					day: this.status.getDay(),
					score: this.status.getFinalScore(),
					eggs: this.status.getEmuEggCount(),
				}
				: null,
		);
		this.view.setBestRun(this.loadBestRun());
		super.show();
	}

	/**
	 * Handle start button click
	 */
	private handleNewGameClick(): void {
		this.screenSwitcher.switchToScreen({type: "game_intro"})
	}

	private handleContinueClick(): void {
		if (!this.status.hasSavedGame()) {
			this.screenSwitcher.switchToScreen({type: "game_intro"});
			return;
		}
		this.screenSwitcher.switchToScreen({type: "farm", newgame: false});
	}

	private handleKeyDown(e: KeyboardEvent): void {
		if (!this.view.getGroup().visible()) return;
		const key = e.key.toLowerCase();
		if (key === "arrowup" || key === "w") {
			e.preventDefault();
			this.view.moveSelection(-1);
		} else if (key === "arrowdown" || key === "s") {
			e.preventDefault();
			this.view.moveSelection(1);
		} else if ((key === "enter" || key === " " || e.code === "Space") && !e.repeat) {
			e.preventDefault();
			this.view.activateSelected();
		}
	}

	private loadBestRun(): BestRun | null {
		try {
			const entries = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? "[]") as LeaderboardEntry[];
			if (!Array.isArray(entries) || entries.length === 0) return null;
			const best = entries.reduce((top, entry) =>
				entry.score > top.score || (entry.score === top.score && entry.survivalDays > top.survivalDays) ? entry : top,
			);
			return { score: best.score, days: best.survivalDays };
		} catch {
			return null;
		}
	}

	/**
	 * Get the view
	 */
	getView(): MainMenuScreenView {
		return this.view;
	}
}
