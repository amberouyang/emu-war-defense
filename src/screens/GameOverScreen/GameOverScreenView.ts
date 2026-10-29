import Konva from "konva";
import type { View } from "../../types.ts";
import type { LeaderboardEntry } from "./GameOverScreenModel.ts";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../../constants.ts";
import { GOLD, INK, PARCHMENT, makeButton, makeRibbon, woodRect } from "../../utils/uiKit.ts";
import backgroundSrc from "../../../assets/background.png";
import emuSrc from "../../../assets/Emu.png";
import wheatSrc from "../../../assets/fully_grown.png";

const loadImage = (src: string): HTMLImageElement => {
	if (typeof Image !== "undefined") {
		const image = new Image();
		image.src = src;
		return image;
	}
	const fallback = document.createElement("img") as HTMLImageElement;
	fallback.src = src;
	return fallback;
};

const PANEL = { x: 100, y: 222, width: 600, height: 350 };
const ROW_TOP = PANEL.y + 64;
const ROW_HEIGHT = 27;
const MAX_ROWS = 10;
const COLUMNS = { rank: PANEL.x + 40, name: PANEL.x + 76, score: PANEL.x + 370, days: PANEL.x + 450, date: PANEL.x + 480 };
const MEDALS = [["#ffd24a", "#a8761f"], ["#d9dee3", "#7d8a96"], ["#e0a070", "#8a5a2b"]];
const COUNT_UP_MS = 900;

/**
 * ResultsScreenView - Renders the results screen
 */
export class GameOverScreenView implements View {
	private group: Konva.Group;
	private title: Konva.Text;
	private scoreValue: Konva.Text;
	private daysValue: Konva.Text;
	private rowsGroup: Konva.Group;
	private nameInput: HTMLInputElement;
	private name: string = "Anonymous";
	private nameSubmitted = false;
	private nameInputContainer: HTMLDivElement;
	private playAgainButtonGroup: Konva.Group;
	private noHighScoreMsg: Konva.Text;
	private runners: { node: Konva.Group; speed: number; phase: number }[] = [];
	private anim: Konva.Animation | null = null;
	private finalScore = 0;
	private finalDays = 0;
	private shownAt = 0;

	constructor(
		onPlayAgainClick: () => void,
		onNameEntered: (name: string) => void
	) {
		this.group = new Konva.Group({ visible: false });

		const bgImage = loadImage(backgroundSrc);
		this.group.add(new Konva.Image({ width: STAGE_WIDTH, height: STAGE_HEIGHT, image: bgImage, listening: false }));
		if (!bgImage.complete) {
			bgImage.onload = () => this.group.getLayer()?.batchDraw();
		}
		this.group.add(new Konva.Rect({
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: STAGE_HEIGHT },
			fillLinearGradientColorStops: [0, "rgba(40, 8, 30, 0.88)", 0.5, "rgba(90, 25, 15, 0.72)", 1, "rgba(30, 12, 4, 0.9)"],
			listening: false,
		}));
		this.createRunners();

		this.title = new Konva.Text({
			x: STAGE_WIDTH / 2,
			y: 62,
			text: "GAME OVER",
			fontSize: 66,
			fontFamily: "Impact, Arial Black, Arial",
			letterSpacing: 4,
			fill: "#ff5a4a",
			stroke: "#3a0a06",
			strokeWidth: 6,
			fillAfterStrokeEnabled: true,
			shadowColor: "#ffb347",
			shadowBlur: 18,
			shadowOpacity: 0.6,
			listening: false,
		});
		this.title.offset({ x: this.title.width() / 2, y: this.title.height() / 2 });
		this.group.add(this.title);
		this.group.add(new Konva.Text({
			y: 100,
			width: STAGE_WIDTH,
			text: "The emus overran the farm. They will write songs about this.",
			fontSize: 15,
			fontFamily: "Georgia",
			fontStyle: "italic",
			fill: "#f3e3bf",
			align: "center",
			listening: false,
		}));

		this.scoreValue = this.createStatChip(STAGE_WIDTH / 2 - 210, "FINAL SCORE", "star");
		this.daysValue = this.createStatChip(STAGE_WIDTH / 2 + 10, "DAYS SURVIVED", "sun");

		// Leaderboard panel
		this.group.add(new Konva.Rect({ x: PANEL.x + 4, y: PANEL.y + 10, width: PANEL.width, height: PANEL.height, cornerRadius: 18, fill: "rgba(0, 0, 0, 0.4)", listening: false }));
		this.group.add(woodRect({ x: PANEL.x - 8, y: PANEL.y - 8, width: PANEL.width + 16, height: PANEL.height + 16, cornerRadius: 20, listening: false }));
		this.group.add(new Konva.Rect({ ...PANEL, cornerRadius: 14, fill: PARCHMENT, listening: false }));
		this.group.add(makeRibbon(STAGE_WIDTH / 2, PANEL.y - 24, 280, "HALL OF FAME"));
		const header = (x: number, text: string, align: "left" | "right" | "center", width = 80) => {
			const offset = align === "right" ? width : align === "center" ? width / 2 : 0;
			this.group.add(new Konva.Text({ x: x - offset, y: PANEL.y + 40, width, text, fontSize: 11, fontFamily: "Arial", fontStyle: "bold", letterSpacing: 2, fill: "#8a5a2b", align, listening: false }));
		};
		header(COLUMNS.rank, "RANK", "center", 60);
		header(COLUMNS.name, "NAME", "left");
		header(COLUMNS.score, "SCORE", "right");
		header(COLUMNS.days, "DAYS", "right");
		header(COLUMNS.date, "DATE", "left");
		this.group.add(new Konva.Line({ points: [PANEL.x + 16, PANEL.y + 58, PANEL.x + PANEL.width - 16, PANEL.y + 58], stroke: "#d9c193", strokeWidth: 2, listening: false }));
		this.rowsGroup = new Konva.Group({ listening: false });
		this.group.add(this.rowsGroup);

		this.noHighScoreMsg = new Konva.Text({
			y: PANEL.y + PANEL.height + 14,
			width: STAGE_WIDTH,
			text: "You didn't make the top 10. Better luck next time!",
			fontSize: 15,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: "#f3e3bf",
			align: "center",
			visible: false,
			listening: false,
		});
		this.group.add(this.noHighScoreMsg);

		this.playAgainButtonGroup = makeButton(
			{ x: STAGE_WIDTH / 2 - 130, y: 612, width: 260, height: 56, text: "PLAY AGAIN", color: "#2fa84f", lip: "#1b6b31", fontSize: 24 },
			onPlayAgainClick
		);
		this.group.add(this.playAgainButtonGroup);
		this.setPlayAgainEnabled(false);

		// Name entry popup (HTML so it can take keyboard input)
		this.nameInputContainer = document.createElement("div");
		Object.assign(this.nameInputContainer.style, {
			position: "fixed",
			display: "none",
			width: "360px",
			padding: "26px 24px 20px",
			borderRadius: "16px",
			background: "linear-gradient(#80502a, #55331a)",
			border: "3px solid #2e1a0b",
			boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(255, 210, 74, 0.35)",
			textAlign: "center",
			transform: "translate(-50%, -50%)",
			fontFamily: "Arial, sans-serif",
			zIndex: "10",
		});

		const heading = document.createElement("div");
		heading.innerText = "NEW HIGH SCORE!";
		Object.assign(heading.style, {
			fontSize: "28px",
			fontWeight: "bold",
			letterSpacing: "2px",
			color: GOLD,
			textShadow: "0 2px 0 #4a2c0a, 0 0 12px rgba(255, 210, 74, 0.5)",
			marginBottom: "6px",
		});
		this.nameInputContainer.appendChild(heading);

		const desc = document.createElement("div");
		desc.innerText = "Sign the Hall of Fame (up to 15 letters)";
		Object.assign(desc.style, { fontSize: "14px", color: "#f3e3bf", marginBottom: "14px" });
		this.nameInputContainer.appendChild(desc);

		this.nameInput = document.createElement("input");
		this.nameInput.type = "text";
		this.nameInput.maxLength = 15;
		this.nameInput.placeholder = "Your name";
		Object.assign(this.nameInput.style, {
			width: "100%",
			boxSizing: "border-box",
			fontSize: "22px",
			fontWeight: "bold",
			textAlign: "center",
			padding: "10px 12px",
			borderRadius: "10px",
			border: "3px solid #c9a66b",
			background: PARCHMENT,
			color: INK,
			outline: "none",
		});
		this.nameInputContainer.appendChild(this.nameInput);

		const saveButton = document.createElement("button");
		saveButton.innerText = "SAVE";
		Object.assign(saveButton.style, {
			marginTop: "16px",
			width: "100%",
			padding: "10px 0",
			fontSize: "20px",
			fontWeight: "bold",
			letterSpacing: "2px",
			color: "white",
			background: "#2fa84f",
			border: "none",
			borderRadius: "10px",
			boxShadow: "0 5px 0 #1b6b31",
			cursor: "pointer",
		});
		this.nameInputContainer.appendChild(saveButton);

		const hint = document.createElement("div");
		hint.innerText = "Enter to save, Esc to skip";
		Object.assign(hint.style, { fontSize: "12px", color: "#d9c28f", marginTop: "12px" });
		this.nameInputContainer.appendChild(hint);

		document.body.appendChild(this.nameInputContainer);

		const submit = () => {
			if (this.nameSubmitted) return;
			this.nameSubmitted = true;
			this.name = this.nameInput.value.trim();
			this.hideInput();
			this.nameInput.blur();
			this.setPlayAgainEnabled(true);
			onNameEntered(this.name);
		};

		// Prevent Konva canvas stealing events
		this.nameInput.addEventListener("mousedown", (e) => e.stopPropagation());
		this.nameInput.addEventListener("click", (e) => e.stopPropagation());
		saveButton.addEventListener("click", (e) => {
			e.stopPropagation();
			submit();
		});

		this.nameInput.addEventListener("keydown", (e) => {
			e.stopPropagation();
			if (e.key === "Enter") {
				submit();
			} else if (e.key === "Escape") {
				this.hideInput();
				this.nameInput.blur();
				this.setPlayAgainEnabled(true);
			}
		});
	}

	private createStatChip(x: number, label: string, icon: "star" | "sun"): Konva.Text {
		const chip = new Konva.Group({ x, y: 128, listening: false });
		chip.add(new Konva.Rect({ y: 4, width: 200, height: 62, cornerRadius: 14, fill: "#2e1a0b" }));
		chip.add(woodRect({ width: 200, height: 62, cornerRadius: 14, strokeWidth: 2 }));
		chip.add(new Konva.Circle({ x: 34, y: 31, radius: 21, fill: "rgba(255, 243, 214, 0.15)" }));
		if (icon === "star") {
			chip.add(new Konva.Star({ x: 34, y: 32, numPoints: 5, innerRadius: 7, outerRadius: 15, fill: GOLD, stroke: "#8a5a10", strokeWidth: 1.5 }));
		} else {
			chip.add(new Konva.Star({ x: 34, y: 31, numPoints: 10, innerRadius: 11, outerRadius: 16, fill: "#ffb347", stroke: "#a8561f", strokeWidth: 1 }));
			chip.add(new Konva.Circle({ x: 34, y: 31, radius: 9, fill: GOLD }));
		}
		chip.add(new Konva.Text({ x: 64, y: 10, text: label, fontSize: 11, fontFamily: "Arial", fontStyle: "bold", letterSpacing: 2, fill: "#d9c28f" }));
		const value = new Konva.Text({ x: 64, y: 24, width: 128, text: "0", fontSize: 30, fontFamily: "Arial", fontStyle: "bold", fill: "#fff3d6", wrap: "none", ellipsis: true });
		chip.add(value);
		this.group.add(chip);
		return value;
	}

	private createRunners(): void {
		const emuImage = loadImage(emuSrc);
		const wheatImage = loadImage(wheatSrc);
		for (let i = 0; i < 4; i++) {
			const runner = new Konva.Group({ x: STAGE_WIDTH + i * 230, y: 630 + (i % 2) * 12, listening: false });
			runner.add(new Konva.Ellipse({ x: 22, y: 44, radiusX: 18, radiusY: 4, fill: "rgba(0, 0, 0, 0.35)" }));
			runner.add(new Konva.Image({ width: 44, height: 44, image: emuImage }));
			runner.add(new Konva.Image({ x: 26, y: 4, width: 24, height: 24, rotation: 20, image: wheatImage }));
			this.runners.push({ node: runner, speed: 0.07 + (i % 3) * 0.015, phase: i * 1.7 });
			this.group.add(runner);
		}
	}

	private setPlayAgainEnabled(enabled: boolean): void {
		this.playAgainButtonGroup.listening(enabled);
		this.playAgainButtonGroup.opacity(enabled ? 1 : 0.45);
		this.group.getLayer()?.batchDraw();
	}

	/**
	 * Update the final score display
	 */
	updateFinalResults(survivalDays: number, score: number): void {
		this.finalDays = survivalDays;
		this.finalScore = score;
		this.nameSubmitted = false;
		this.scoreValue.text(`${score}`);
		this.daysValue.text(`${survivalDays}`);
		this.group.getLayer()?.draw();
	}

	/**
	 * Update the leaderboard display
	 */
	updateLeaderboard(entries: LeaderboardEntry[]): void {
		this.rowsGroup.destroyChildren();

		if (entries.length === 0) {
			this.rowsGroup.add(new Konva.Text({
				y: ROW_TOP + 100,
				width: STAGE_WIDTH,
				text: "No scores yet. Be the first legend of the Emu War!",
				fontSize: 16,
				fontFamily: "Georgia",
				fontStyle: "italic",
				fill: "#8a6a4a",
				align: "center",
			}));
		}

		let highlighted = !this.nameSubmitted;
		entries.slice(0, MAX_ROWS).forEach((entry, index) => {
			const y = ROW_TOP + index * ROW_HEIGHT;
			const isYou = !highlighted && entry.score === this.finalScore && entry.survivalDays === this.finalDays &&
				entry.name === (this.name || "Anonymous").substring(0, 15);
			if (isYou) highlighted = true;

			this.rowsGroup.add(new Konva.Rect({
				x: PANEL.x + 12,
				y: y - 1,
				width: PANEL.width - 24,
				height: ROW_HEIGHT - 2,
				cornerRadius: 6,
				fill: isYou ? "rgba(47, 168, 79, 0.25)" : index % 2 === 0 ? "rgba(201, 166, 107, 0.18)" : "rgba(0, 0, 0, 0)",
				stroke: isYou ? "#2fa84f" : undefined,
				strokeWidth: isYou ? 2 : 0,
			}));

			const medal = MEDALS[index];
			if (medal) {
				this.rowsGroup.add(new Konva.Circle({ x: COLUMNS.rank, y: y + 12, radius: 10, fill: medal[0], stroke: medal[1], strokeWidth: 2 }));
			}
			const cell = (x: number, text: string, align: "left" | "right" | "center", width: number, bold = false) => {
				const offset = align === "right" ? width : align === "center" ? width / 2 : 0;
				this.rowsGroup.add(new Konva.Text({
					x: x - offset,
					y: y + 5,
					width,
					text,
					fontSize: 15,
					fontFamily: "Arial",
					fontStyle: bold ? "bold" : "normal",
					fill: INK,
					align,
					wrap: "none",
					ellipsis: true,
				}));
			};
			cell(COLUMNS.rank, String(index + 1), "center", 30, true);
			cell(COLUMNS.name, entry.name.substring(0, 15) + (isYou ? "  (you)" : ""), "left", 200, isYou);
			cell(COLUMNS.score, String(entry.score), "right", 80, true);
			cell(COLUMNS.days, String(entry.survivalDays), "right", 60);
			cell(COLUMNS.date, entry.timestamp.split(",")[0].trim(), "left", 100);
		});

		this.group.getLayer()?.draw();
	}

	showNameInput(): void {
		const rect = this.group.getStage()?.container().getBoundingClientRect();
		this.nameInputContainer.style.left = rect ? `${rect.left + rect.width / 2}px` : "50%";
		this.nameInputContainer.style.top = rect ? `${rect.top + (PANEL.y + PANEL.height / 2) * (rect.height / STAGE_HEIGHT)}px` : "50%";
		this.nameInputContainer.style.display = "block";

		this.nameInput.value = "";
		this.nameInput.focus();
		this.nameInput.select();
	}

	/**
	 * Show the screen
	 */
	show(isHighScore: boolean = false): void {
		this.group.visible(true);
		this.nameSubmitted = false;
		this.shownAt = performance.now();
		this.title.scale({ x: 1.8, y: 1.8 });
		this.title.opacity(0);
		this.title.to({ scaleX: 1, scaleY: 1, opacity: 1, duration: 0.45, easing: Konva.Easings.BackEaseOut });
		this.startAnimation();
		if (isHighScore) {
			this.setPlayAgainEnabled(false);
			this.showNameInput();
			this.noHighScoreMsg.visible(false);
		} else {
			this.setPlayAgainEnabled(true);
			this.noHighScoreMsg.visible(true);
		}
		this.group.getLayer()?.draw();
	}

	private startAnimation(): void {
		const layer = this.group.getLayer();
		if (!layer) return;
		if (!this.anim) {
			this.anim = new Konva.Animation((frame) => {
				if (!frame) return;
				const progress = Math.min(1, (performance.now() - this.shownAt) / COUNT_UP_MS);
				const eased = 1 - Math.pow(1 - progress, 3);
				this.scoreValue.text(`${Math.round(this.finalScore * eased)}`);
				this.daysValue.text(`${Math.round(this.finalDays * eased)}`);
				for (const runner of this.runners) {
					const node = runner.node;
					node.x(node.x() - frame.timeDiff * runner.speed);
					if (node.x() < -60) {
						node.x(STAGE_WIDTH + 40 + Math.random() * 200);
					}
					node.offsetY(Math.abs(Math.sin(frame.time / 110 + runner.phase)) * 5);
				}
			}, layer);
		}
		this.anim.start();
	}

	hideInput(): void {
		this.nameInputContainer.style.display = "none";
	}

	/**
	 * Hide the screen
	 */
	hide(): void {
		this.group.visible(false);
		this.hideInput();
		this.anim?.stop();
		this.group.getLayer()?.draw();
	}

	/**
	 * Get the player name from input
	 */
	getPlayerName(): string {
		return (this.name || "Anonymous").trim();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
