import Konva from "konva";
import type { View } from "../../types.ts";
import {STAGE_WIDTH, STAGE_HEIGHT, PLANTER_WIDTH, PLANTER_HEIGHT, HUD_HEIGHT, GAME_DURATION} from "../../constants.ts";
import {FarmPlanterController} from "../../components/FarmPlanterComponent/FarmPlanterController.ts";
import {FarmEmuController} from "../../components/FarmEmuComponent/FarmEmuController.ts";
import {EMU_MIN_Y} from "../../components/FarmEmuComponent/FarmEmuView.ts";
import mineSrc from "../../../assets/mine.png";
import flagSrc from "../../../assets/flag.png";
import chevronSrc from "../../../assets/chevron.png";
import pauseSrc from "../../../assets/pause.png";

const createImage = (src: string): HTMLImageElement => {
	if (typeof Image !== "undefined") {
		const image = new Image();
		image.src = src;
		return image;
	}

	const fallback = document.createElement("img") as HTMLImageElement;
	fallback.src = src;
	return fallback;
};

const mineImage = createImage(mineSrc);
const flagImage = createImage(flagSrc);
const chevronImage = createImage(chevronSrc);
const pauseImage = createImage(pauseSrc);
const MINE_SIZE = 42;

const PLANTER_POSITIONS: { x: number; y: number }[] = [];
for (let x = (STAGE_WIDTH / 8) + (PLANTER_WIDTH / 2); x < STAGE_WIDTH; x += (7 * STAGE_WIDTH) / 32 - PLANTER_WIDTH / 8) {
	for (let y = 200; y < 500; y += 100) {
		PLANTER_POSITIONS.push({ x, y });
	}
}

const PLOT = { x: 76, y: 150, width: 640, height: 304 };
const BED_PAD = { x: 14, y: 8 };
const WOOD_LIGHT = "#c9a66b";
const CREAM = "#fff3d6";

const seededRandom = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
};

const isOpenGrass = (x: number, y: number, margin = 10): boolean => {
	if (y < HUD_HEIGHT + 6) return false;
	const onBed = PLANTER_POSITIONS.some((p) =>
		x > p.x - BED_PAD.x - margin && x < p.x + PLANTER_WIDTH + BED_PAD.x + margin &&
		y > p.y - BED_PAD.y - margin - 22 && y < p.y + PLANTER_HEIGHT + BED_PAD.y + margin);
	const pathPad = 16;
	const insideOuter = x > PLOT.x - pathPad && x < PLOT.x + PLOT.width + pathPad && y > PLOT.y - pathPad && y < PLOT.y + PLOT.height + pathPad;
	const insideInner = x > PLOT.x + pathPad && x < PLOT.x + PLOT.width - pathPad && y > PLOT.y + pathPad && y < PLOT.y + PLOT.height - pathPad;
	return !onBed && !(insideOuter && !insideInner);
};

/** Paints the static farm field (lawn, path, soil beds, decorations) once into a canvas. */
const drawFieldCanvas = (): HTMLCanvasElement => {
	const canvas = document.createElement("canvas");
	canvas.width = STAGE_WIDTH;
	canvas.height = STAGE_HEIGHT;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const rand = seededRandom(1932);

	const stripe = 44;
	for (let y = 0; y < STAGE_HEIGHT; y += stripe) {
		ctx.fillStyle = (y / stripe) % 2 === 0 ? "#5fae3e" : "#56a236";
		ctx.fillRect(0, y, STAGE_WIDTH, stripe);
	}

	for (let y = 0; y < STAGE_HEIGHT; y += 4) {
		for (let x = 0; x < STAGE_WIDTH; x += 4) {
			const r = rand();
			if (r < 0.2) {
				ctx.fillStyle = r < 0.1 ? "rgba(20, 70, 10, 0.18)" : "rgba(200, 245, 130, 0.13)";
				ctx.fillRect(x, y, 4, 4);
			}
		}
	}

	ctx.fillStyle = "rgba(25, 75, 10, 0.12)";
	roundRectPath(ctx, PLOT.x, PLOT.y, PLOT.width, PLOT.height, 26);
	ctx.fill();

	const bladeColors = ["#3f8a2a", "#4a972f", "#7cc753", "#8fd45e"];
	ctx.lineCap = "round";
	ctx.lineWidth = 1.5;
	for (let i = 0; i < 2200; i++) {
		const x = rand() * STAGE_WIDTH;
		const y = rand() * STAGE_HEIGHT;
		const h = 4 + rand() * 6;
		const lean = (rand() - 0.5) * 5;
		ctx.strokeStyle = bladeColors[Math.floor(rand() * bladeColors.length)];
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.quadraticCurveTo(x + lean * 0.4, y - h / 2, x + lean, y - h);
		ctx.stroke();
	}

	// Dirt path around the crop plot
	ctx.lineJoin = "round";
	ctx.strokeStyle = "#9c7744";
	ctx.lineWidth = 24;
	roundRectPath(ctx, PLOT.x, PLOT.y, PLOT.width, PLOT.height, 26);
	ctx.stroke();
	ctx.strokeStyle = "#d2b07a";
	ctx.lineWidth = 17;
	ctx.stroke();
	for (let i = 0; i < 260; i++) {
		const t = rand();
		const perimeter = 2 * (PLOT.width + PLOT.height);
		let d = t * perimeter;
		let px: number;
		let py: number;
		if (d < PLOT.width) { px = PLOT.x + d; py = PLOT.y; }
		else if ((d -= PLOT.width) < PLOT.height) { px = PLOT.x + PLOT.width; py = PLOT.y + d; }
		else if ((d -= PLOT.height) < PLOT.width) { px = PLOT.x + PLOT.width - d; py = PLOT.y + PLOT.height; }
		else { d -= PLOT.width; px = PLOT.x; py = PLOT.y + PLOT.height - d; }
		px += (rand() - 0.5) * 12;
		py += (rand() - 0.5) * 12;
		ctx.fillStyle = rand() < 0.5 ? "rgba(120, 88, 50, 0.55)" : "rgba(240, 220, 175, 0.6)";
		ctx.fillRect(Math.round(px), Math.round(py), 2 + Math.round(rand() * 2), 2);
	}

	// Tilled soil beds under each planter
	for (const p of PLANTER_POSITIONS) {
		const bx = p.x - BED_PAD.x;
		const by = p.y - BED_PAD.y;
		const bw = PLANTER_WIDTH + BED_PAD.x * 2;
		const bh = PLANTER_HEIGHT + BED_PAD.y * 2 + 2;
		ctx.fillStyle = "rgba(20, 50, 10, 0.35)";
		roundRectPath(ctx, bx + 2, by + 4, bw, bh, 12);
		ctx.fill();
		const soil = ctx.createLinearGradient(0, by, 0, by + bh);
		soil.addColorStop(0, "#8c5a35");
		soil.addColorStop(1, "#6a4024");
		ctx.fillStyle = soil;
		roundRectPath(ctx, bx, by, bw, bh, 12);
		ctx.fill();
		ctx.strokeStyle = "#4a2c16";
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.lineWidth = 2;
		for (let i = 1; i <= 3; i++) {
			const fy = by + (bh * i) / 4;
			ctx.strokeStyle = "rgba(60, 34, 14, 0.55)";
			ctx.beginPath();
			ctx.moveTo(bx + 7, fy);
			ctx.lineTo(bx + bw - 7, fy);
			ctx.stroke();
			ctx.strokeStyle = "rgba(190, 135, 80, 0.3)";
			ctx.beginPath();
			ctx.moveTo(bx + 7, fy + 2);
			ctx.lineTo(bx + bw - 7, fy + 2);
			ctx.stroke();
		}
		ctx.lineWidth = 1.5;
		for (let i = 0; i < 14; i++) {
			const gx = bx + 4 + rand() * (bw - 8);
			const top = rand() < 0.5;
			const gy = top ? by + 1 : by + bh + 1;
			ctx.strokeStyle = bladeColors[Math.floor(rand() * 2)];
			ctx.beginPath();
			ctx.moveTo(gx, gy);
			ctx.lineTo(gx + (rand() - 0.5) * 4, gy - 4 - rand() * 4);
			ctx.stroke();
		}
	}

	const scatter = (count: number, draw: (x: number, y: number) => void, margin = 10) => {
		let placed = 0;
		for (let tries = 0; placed < count && tries < count * 40; tries++) {
			const x = 10 + rand() * (STAGE_WIDTH - 20);
			const y = HUD_HEIGHT + 10 + rand() * (STAGE_HEIGHT - HUD_HEIGHT - 20);
			if (!isOpenGrass(x, y, margin)) continue;
			draw(x, y);
			placed++;
		}
	};

	// Bushes along the outer field
	scatter(10, (x, y) => {
		if (x > PLOT.x - 10 && x < PLOT.x + PLOT.width + 10 && y > PLOT.y - 10 && y < PLOT.y + PLOT.height + 10) return;
		ctx.fillStyle = "rgba(20, 50, 10, 0.35)";
		ctx.beginPath();
		ctx.ellipse(x, y + 10, 22, 7, 0, 0, Math.PI * 2);
		ctx.fill();
		const blobs = [[-12, 2, 11], [10, 3, 10], [0, -6, 13]];
		for (const [dx, dy, r] of blobs) {
			ctx.fillStyle = "#2f7422";
			ctx.beginPath();
			ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#4b9a32";
			ctx.beginPath();
			ctx.arc(x + dx - 2, y + dy - 3, r * 0.6, 0, Math.PI * 2);
			ctx.fill();
		}
		if (rand() < 0.6) {
			ctx.fillStyle = "#e0453a";
			for (let i = 0; i < 4; i++) {
				ctx.beginPath();
				ctx.arc(x + (rand() - 0.5) * 26, y + (rand() - 0.6) * 14, 2, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}, 26);

	scatter(16, (x, y) => {
		const w = 5 + rand() * 6;
		ctx.fillStyle = "rgba(20, 50, 10, 0.3)";
		ctx.beginPath();
		ctx.ellipse(x + 1, y + 2, w, w * 0.55, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#8d9196";
		ctx.beginPath();
		ctx.ellipse(x, y, w, w * 0.6, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#c3c7cb";
		ctx.beginPath();
		ctx.ellipse(x - w * 0.3, y - w * 0.2, w * 0.4, w * 0.22, 0, 0, Math.PI * 2);
		ctx.fill();
	});

	const petalColors = ["#ffffff", "#ffe066", "#ff9ecb", "#b9a5ff"];
	scatter(70, (x, y) => {
		ctx.fillStyle = petalColors[Math.floor(rand() * petalColors.length)];
		for (let i = 0; i < 4; i++) {
			const a = (i * Math.PI) / 2;
			ctx.beginPath();
			ctx.arc(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 2, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "#e0a526";
		ctx.beginPath();
		ctx.arc(x, y, 1.5, 0, Math.PI * 2);
		ctx.fill();
	}, 6);

	const vignette = ctx.createRadialGradient(STAGE_WIDTH / 2, STAGE_HEIGHT / 2, 260, STAGE_WIDTH / 2, STAGE_HEIGHT / 2, 560);
	vignette.addColorStop(0, "rgba(0, 30, 0, 0)");
	vignette.addColorStop(1, "rgba(0, 30, 0, 0.35)");
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

	return canvas;
};

/**
 * GameScreenView - Renders the game UI using Konva
 */
export class FarmScreenView implements View {
	private group: Konva.Group;
	private hudGroup: Konva.Group;
	private hudBanner: Konva.Rect;
	private scoreText: Konva.Text;
	private cropText: Konva.Text;
	private mineText: Konva.Text;
	private menuOverlay: Konva.Group;
	private huntMenuOverlay: Konva.Group;
	private eggMenuOverlay: Konva.Group;
	private minesLayer: Konva.Group;
	private defensesLayer: Konva.Group;
	private mines: Konva.Image[] = [];
	private menuButtonHandler: (() => void) | null = null;
	private onDefensePlaceClick: ((x: number, y: number) => void) | null = null;
	private menuSaveHandler: (() => void) | null = null;
	private menuBackHandler: (() => void) | null = null;
	private startRoundHandler: (() => void) | null = null;
	//Event handlers for skip/continue functionality for hunt/egg minigames:
	private huntContinueHandler: (() => void) | null = null;
	private huntSkipHandler: (() => void) | null = null;
	private eggContinueHandler: (() => void) | null = null;
	private eggSkipHandler: (() => void) | null = null;
	private registerEmu: ((emu: FarmEmuController) => void) | null = null;
	private removeEmus: (() => void) | null = null;
	private timerText: Konva.Text;
	private roundText: Konva.Text;
	private mineInstructionText: Konva.Text;
	private hudTooltipGroup: Konva.Group;
	private hudTooltipBackground: Konva.Rect;
	private hudTooltipText: Konva.Text;
	private startRoundGroup: Konva.Group;
	private startDayBackground: Konva.Rect;
	private startDayButton: Konva.Image;
	private startDayLip: Konva.Rect;
	private timerBarFill: Konva.Rect;
	private tufts: { node: Konva.Shape; phase: number }[] = [];
	private cloudShadows: Konva.Ellipse[] = [];
	private ambientAnim: Konva.Animation | null = null;
	private startRoundButtonEnabled: boolean = false;
	private startRoundTooltipMessage = "Start this round after placing defenses";
	private mouseX: number = 0;
	private mouseY: number = 0;
	private placementHintDefault = "Press M to place a mine. Select a defense and press T to place it.";

	constructor(
		handleKeydown: (event: KeyboardEvent) => void,
		handleEndGame: () => void,
		registerEmu: (emu: FarmEmuController) => void,
		removeEmus: () => void,
		registerPlanter: (planter: FarmPlanterController) => void,
	) {
		this.registerEmu = registerEmu;
		this.removeEmus = removeEmus;

		window.addEventListener("keydown", (event) => {
			const keyboardEvent = event as KeyboardEvent;
			handleKeydown(keyboardEvent);
		});

		this.group = new Konva.Group({ visible: false });

		// Background (stays listening so mousemove tracks the cursor for mine placement)
		this.group.add(new Konva.Image({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			image: drawFieldCanvas(),
		}));
		this.createAmbience();

		// Track mouse position for mine placement
		this.group.on("mousemove", (e) => {
			const stage = e.target.getStage();
			if (stage) {
				const pointerPos = stage.getPointerPosition();
				if (pointerPos) {
					this.mouseX = pointerPos.x;
					this.mouseY = pointerPos.y;
				}
			}
		});

		this.minesLayer = new Konva.Group({ listening: false });
		this.group.add(this.minesLayer);

		this.defensesLayer = new Konva.Group({ listening: false }); // Disabled by default, enabled during planning phase
		
		// Add a transparent rect to capture clicks anywhere on the stage for defense placement
		const defenseClickCatcher = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "transparent",
		});
		this.defensesLayer.add(defenseClickCatcher);
		
		this.group.add(this.defensesLayer);

		// Add click handler for defense placement during planning phase
		this.defensesLayer.on("click", (e) => {
			if (this.onDefensePlaceClick) {
				const pos = e.target.getStage()?.getPointerPosition();
				if (pos) {
					this.onDefensePlaceClick(pos.x, pos.y);
				}
			}
		});
		this.minesLayer = new Konva.Group({ listening: false });
		this.group.add(this.minesLayer);

		/**
		 * Create improved HUD with dark banner at top
		 */
		this.hudGroup = new Konva.Group({ listening: true });
		
		// Wooden plank banner
		this.hudGroup.add(new Konva.Rect({
			x: 0,
			y: HUD_HEIGHT,
			width: STAGE_WIDTH,
			height: 8,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: 8 },
			fillLinearGradientColorStops: [0, "rgba(0, 0, 0, 0.35)", 1, "rgba(0, 0, 0, 0)"],
			listening: false,
		}));
		this.hudBanner = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: HUD_HEIGHT,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: HUD_HEIGHT },
			fillLinearGradientColorStops: [0, "#80502a", 1, "#55331a"],
		});
		this.hudGroup.add(this.hudBanner);
		for (const seamY of [HUD_HEIGHT / 3, (HUD_HEIGHT * 2) / 3]) {
			this.hudGroup.add(new Konva.Line({ points: [0, seamY, STAGE_WIDTH, seamY], stroke: "rgba(0, 0, 0, 0.25)", strokeWidth: 1, listening: false }));
			this.hudGroup.add(new Konva.Line({ points: [0, seamY + 1, STAGE_WIDTH, seamY + 1], stroke: "rgba(255, 220, 170, 0.1)", strokeWidth: 1, listening: false }));
		}
		this.hudGroup.add(new Konva.Rect({ x: 0, y: HUD_HEIGHT - 4, width: STAGE_WIDTH, height: 4, fill: "#2e1a0b", listening: false }));
		for (const nailX of [6, STAGE_WIDTH - 6]) {
			for (const nailY of [7, HUD_HEIGHT - 11]) {
				this.hudGroup.add(new Konva.Circle({ x: nailX, y: nailY, radius: 2, fill: "#3a2412", stroke: "#a07a4a", strokeWidth: 0.8, listening: false }));
			}
		}

		// Stat chips
		const star = new Konva.Star({ x: 15, y: 15, numPoints: 5, innerRadius: 4, outerRadius: 8.5, fill: "#ffd24a", stroke: "#8a5a10", strokeWidth: 1 });
		this.scoreText = this.createStatChip(14, "SCORE", star, "Your score this run");

		const wheat = new Konva.Group({ x: 15, y: 16 });
		wheat.add(new Konva.Line({ points: [0, 9, 0, -9], stroke: "#c8962e", strokeWidth: 1.6, lineCap: "round" }));
		for (let i = 0; i < 3; i++) {
			const gy = -7 + i * 5;
			wheat.add(new Konva.Ellipse({ x: -3, y: gy, radiusX: 2, radiusY: 3.4, rotation: -30, fill: "#f2c94c", stroke: "#a8761f", strokeWidth: 0.6 }));
			wheat.add(new Konva.Ellipse({ x: 3, y: gy, radiusX: 2, radiusY: 3.4, rotation: 30, fill: "#f2c94c", stroke: "#a8761f", strokeWidth: 0.6 }));
		}
		this.cropText = this.createStatChip(100, "CROPS", wheat, "Crops in storage. Click an empty planter to plant one");

		const mineIcon = new Konva.Image({ x: 5, y: 5, width: 20, height: 20, image: mineImage });
		this.mineText = this.createStatChip(186, "MINES", mineIcon, "Mines in storage. Press M to drop one at the cursor");

		this.mineInstructionText = new Konva.Text({
			x: 14,
			y: 52,
			width: 590,
			text: this.placementHintDefault,
			fontSize: 12,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: "#f3e3bf",
			shadowColor: "black",
			shadowBlur: 2,
			shadowOpacity: 0.6,
			listening: false,
		});
		this.hudGroup.add(this.mineInstructionText);

		// Day badge
		const dayBadge = new Konva.Group({ x: 292, y: 7, listening: false });
		dayBadge.add(new Konva.Rect({ y: 4, width: 100, height: 36, cornerRadius: 9, fill: "#9a6410" }));
		dayBadge.add(new Konva.Rect({
			width: 100,
			height: 36,
			cornerRadius: 9,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: 36 },
			fillLinearGradientColorStops: [0, "#ffe089", 1, "#e3a92b"],
			stroke: "#7a4f12",
			strokeWidth: 2,
		}));
		this.roundText = new Konva.Text({
			width: 100,
			y: 8,
			text: "DAY 1",
			fontSize: 21,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: "#4a2c0a",
			align: "center",
		});
		dayBadge.add(this.roundText);
		this.hudGroup.add(dayBadge);

		// Timer pill with a draining bar
		const timer = new Konva.Group({ x: 404, y: 9, listening: false });
		timer.add(new Konva.Rect({ width: 176, height: 34, cornerRadius: 17, fill: "rgba(30, 18, 8, 0.6)", stroke: WOOD_LIGHT, strokeWidth: 1.5 }));
		timer.add(new Konva.Circle({ x: 18, y: 17, radius: 10, fill: CREAM, stroke: "#4a2c0a", strokeWidth: 2 }));
		timer.add(new Konva.Line({ points: [18, 10, 18, 17, 23, 20], stroke: "#4a2c0a", strokeWidth: 2, lineCap: "round", lineJoin: "round" }));
		this.timerText = new Konva.Text({
			x: 34,
			y: 7,
			width: 36,
			text: String(GAME_DURATION),
			fontSize: 21,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: CREAM,
			align: "center",
		});
		timer.add(this.timerText);
		timer.add(new Konva.Rect({ x: 76, y: 12, width: 88, height: 10, cornerRadius: 5, fill: "rgba(0, 0, 0, 0.5)" }));
		this.timerBarFill = new Konva.Rect({ x: 76, y: 12, width: 88, height: 10, cornerRadius: 5, fill: "#58d36a" });
		timer.add(this.timerBarFill);
		this.hudGroup.add(timer);

		this.hudTooltipGroup = new Konva.Group({ visible: false, listening: false });
		this.hudTooltipBackground = new Konva.Rect({
			x: 0,
			y: 0,
			width: 10,
			height: 10,
			fill: "rgba(20, 20, 20, 0.92)",
			cornerRadius: 6,
			stroke: "#d0d0d0",
			strokeWidth: 1,
		});
		this.hudTooltipText = new Konva.Text({
			x: 0,
			y: 0,
			text: "",
			fontSize: 12,
			fontFamily: "Arial",
			fill: "white",
			padding: 8,
		});
		this.hudTooltipGroup.add(this.hudTooltipBackground);
		this.hudTooltipGroup.add(this.hudTooltipText);
		this.hudGroup.add(this.hudTooltipGroup);

		// Three buttons on right side (exact layout from market-options)
		
		// 1. Pause button (slate)
		const pause = this.createHudButton(STAGE_WIDTH - 180, "#7d8a96", "#4b5560", pauseImage);
		// Attach event to the GROUP so background doesn't block clicks
		pause.group.on("mouseup", () => this.menuButtonHandler?.());
		pause.group.on("click", () => this.menuButtonHandler?.());
		this.attachHudTooltip(pause.group, "Pause and open the menu");
		this.hudGroup.add(pause.group);

		// 2. Start Day button (green)
		const start = this.createHudButton(STAGE_WIDTH - 120, "#2fa84f", "#1b6b31", chevronImage);
		this.startRoundGroup = start.group;
		this.startDayBackground = start.face;
		this.startDayLip = start.lip;
		this.startDayButton = start.icon;
		this.startRoundGroup.on("click", () => {
			if (!this.startRoundButtonEnabled) {
				return;
			}
			this.startRoundHandler?.();
		});
		this.startRoundGroup.on("mouseenter", () => this.showHudTooltip(this.startRoundGroup, this.startRoundTooltipMessage));
		this.startRoundGroup.on("mouseleave", () => this.hideHudTooltip());
		this.hudGroup.add(this.startRoundGroup);
		this.setStartRoundButtonEnabled(false);

		// 3. End Game button (red) - RIGHTMOST button
		const endGame = this.createHudButton(STAGE_WIDTH - 60, "#e0453a", "#8f231b", flagImage);
		endGame.group.on("mouseup", handleEndGame);
		endGame.group.on("click", handleEndGame);
		this.attachHudTooltip(endGame.group, "End the run and go to the results screen");
		this.hudGroup.add(endGame.group);

		this.group.add(this.hudGroup);

		this.menuOverlay = new Konva.Group({ visible: false });

		const overlayBackground = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "rgba(0, 0, 0, 0.55)",
		});
		overlayBackground.on("mouseup", (evt) => {
			evt.cancelBubble = true;
		});

		const panelWidth = 420;
		const panelHeight = 260;
		const panelX = (STAGE_WIDTH - panelWidth) / 2;
		const panelY = (STAGE_HEIGHT - panelHeight) / 2;

		const overlayPanel = new Konva.Rect({
			x: panelX,
			y: panelY,
			width: panelWidth,
			height: panelHeight,
			fill: "#f5f5f5",
			stroke: "#333333",
			strokeWidth: 2,
			cornerRadius: 12,
		});

		const overlayTitle = new Konva.Text({
			x: panelX,
			y: panelY + 24,
			width: panelWidth,
			text: "Pause Menu",
			fontSize: 32,
			fontFamily: "Arial",
			fill: "#333333",
			align: "center",
		});

		const saveButton = new Konva.Group({
			x: panelX + 40,
			y: panelY + 100,
			cursor: "pointer",
		});

		const saveRect = new Konva.Rect({
			width: panelWidth - 80,
			height: 56,
			fill: "#2e7d32",
			cornerRadius: 10,
		});

		const saveText = new Konva.Text({
			text: "Save and Exit",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			width: panelWidth - 80,
			y: 14,
			align: "center",
		});

		saveButton.add(saveRect);
		saveButton.add(saveText);
		saveButton.on("mouseup", () => {
			this.menuSaveHandler?.();
		});

		const backButton = new Konva.Group({
			x: panelX + 40,
			y: panelY + 170,
			cursor: "pointer",
		});

		const backRect = new Konva.Rect({
			width: panelWidth - 80,
			height: 56,
			fill: "#c62828",
			cornerRadius: 10,
		});

		const backText = new Konva.Text({
			text: "Back to Game",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			width: panelWidth - 80,
			y: 14,
			align: "center",
		});

		backButton.add(backRect);
		backButton.add(backText);
		backButton.on("mouseup", () => {
			this.menuBackHandler?.();
		});

		this.menuOverlay.add(overlayBackground);
		this.menuOverlay.add(overlayPanel);
		this.menuOverlay.add(overlayTitle);
		this.menuOverlay.add(saveButton);
		this.menuOverlay.add(backButton);

		//Hunting Menu overlay:
		this.huntMenuOverlay = this.createOverlay(
			"You Have An Opportunity to Hunt!!!",
			() => this.huntContinueHandler?.(),
			() => this.huntSkipHandler?.()
		);
		this.group.add(this.huntMenuOverlay);

		//Egg Menu overlay:
		this.eggMenuOverlay = this.createOverlay(
			"You Have An Opportunity to Collect!!!",
			() => this.eggContinueHandler?.(),
			() => this.eggSkipHandler?.()
		);
		this.group.add(this.eggMenuOverlay);

		// Planters
		for (const { x, y } of PLANTER_POSITIONS) {
			const planter = new FarmPlanterController(this.group, x, y);
			registerPlanter(planter);
		}

		// Add menu overlay last so it appears on top of everything
		this.group.add(this.menuOverlay);
	}

	private createStatChip(x: number, label: string, icon: Konva.Group | Konva.Shape, tooltip: string): Konva.Text {
		const chip = new Konva.Group({ x, y: 9 });
		chip.add(new Konva.Rect({ width: 80, height: 32, cornerRadius: 16, fill: "rgba(30, 18, 8, 0.6)", stroke: WOOD_LIGHT, strokeWidth: 1.5 }));
		chip.add(new Konva.Circle({ x: 15, y: 16, radius: 12, fill: "rgba(255, 243, 214, 0.15)" }));
		chip.add(icon);
		chip.add(new Konva.Text({ x: 32, y: 4, text: label, fontSize: 8, fontFamily: "Arial", fontStyle: "bold", letterSpacing: 1, fill: "#d9c28f" }));
		const value = new Konva.Text({ x: 32, y: 13, width: 46, text: "0", fontSize: 16, fontFamily: "Arial", fontStyle: "bold", fill: CREAM, wrap: "none", ellipsis: true });
		chip.add(value);
		this.attachHudTooltip(chip, tooltip);
		this.hudGroup.add(chip);
		return value;
	}

	private createHudButton(x: number, color: string, lipColor: string, image: HTMLImageElement) {
		const group = new Konva.Group({ cursor: "pointer", listening: true });
		const lip = new Konva.Rect({ x, y: 20, width: 40, height: 40, cornerRadius: 9, fill: lipColor });
		const face = new Konva.Rect({
			x,
			y: 16,
			width: 40,
			height: 40,
			cornerRadius: 9,
			fill: color,
			stroke: "rgba(255, 255, 255, 0.35)",
			strokeWidth: 1.5,
			shadowColor: color,
			shadowBlur: 0,
			shadowOpacity: 0.9,
		});
		const icon = new Konva.Image({ x: x + 5, y: 21, width: 30, height: 30, image });
		group.add(lip, face, icon);
		group.on("mouseenter", () => {
			face.y(14);
			icon.y(19);
		});
		group.on("mouseleave", () => {
			face.y(16);
			icon.y(21);
		});
		group.on("mousedown", () => {
			face.y(19);
			icon.y(24);
		});
		group.on("mouseup", () => {
			face.y(14);
			icon.y(19);
		});
		return { group, lip, face, icon };
	}

	private createAmbience(): void {
		const rand = seededRandom(1788);
		const cloudLayer = new Konva.Group({ listening: false });
		for (let i = 0; i < 3; i++) {
			const cloud = new Konva.Ellipse({
				x: i * 320 + rand() * 120,
				y: 180 + i * 160 + rand() * 60,
				radiusX: 130 + rand() * 60,
				radiusY: 55 + rand() * 20,
				fill: "rgba(10, 40, 10, 0.12)",
			});
			this.cloudShadows.push(cloud);
			cloudLayer.add(cloud);
		}
		this.group.add(cloudLayer);

		const tuftLayer = new Konva.Group({ listening: false });
		let placed = 0;
		for (let tries = 0; placed < 34 && tries < 1000; tries++) {
			const x = 12 + rand() * (STAGE_WIDTH - 24);
			const y = HUD_HEIGHT + 24 + rand() * (STAGE_HEIGHT - HUD_HEIGHT - 30);
			if (!isOpenGrass(x, y, 14)) continue;
			const scale = 0.8 + rand() * 0.6;
			const tuft = new Konva.Shape({
				x,
				y,
				scaleX: scale,
				scaleY: scale,
				stroke: rand() < 0.5 ? "#3c8a28" : "#6fbf4a",
				strokeWidth: 2,
				lineCap: "round",
				sceneFunc: (ctx, shape) => {
					ctx.beginPath();
					ctx.moveTo(-4, 0);
					ctx.quadraticCurveTo(-5, -6, -8, -11);
					ctx.moveTo(0, 0);
					ctx.quadraticCurveTo(0, -8, 1, -15);
					ctx.moveTo(4, 0);
					ctx.quadraticCurveTo(5, -6, 8, -10);
					ctx.strokeShape(shape);
				},
			});
			this.tufts.push({ node: tuft, phase: rand() * Math.PI * 2 });
			tuftLayer.add(tuft);
			placed++;
		}
		this.group.add(tuftLayer);
	}

	private startAmbience(): void {
		const layer = this.group.getLayer();
		if (!layer) return;
		if (!this.ambientAnim) {
			this.ambientAnim = new Konva.Animation((frame) => {
				if (!frame) return;
				const t = frame.time;
				for (const { node, phase } of this.tufts) {
					node.skewX(Math.sin(t / 650 + phase) * 0.28);
				}
				for (const cloud of this.cloudShadows) {
					cloud.x(cloud.x() + frame.timeDiff * 0.012);
					if (cloud.x() - cloud.radiusX() > STAGE_WIDTH) {
						cloud.x(-cloud.radiusX());
					}
				}
				this.startDayBackground.shadowBlur(this.startRoundButtonEnabled ? 8 + Math.sin(t / 220) * 6 : 0);
			}, layer);
		}
		this.ambientAnim.start();
	}

	//For adding overlays to access minigames:
	private createOverlay(msg: string, 
		continueHandler: (() => void) | null, 
		skipHandler: (() => void) | null) {

		const overlay = new Konva.Group({ visible: false });
		const panelWidth = 336;
		const panelHeight = 208;
		const panelX = (STAGE_WIDTH - panelWidth) / 2;
		const panelY = (STAGE_HEIGHT - panelHeight) / 2;

		const overlayBackground = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "rgba(0, 0, 0, 0.55)",
		});
		overlayBackground.on("mouseup", (evt) => {
			evt.cancelBubble = true;
		});


		const overlayPanel = new Konva.Rect({
			x: panelX,
			y: panelY,
			width: panelWidth,
			height: panelHeight,
			fill: "#f5f5f5",
			stroke: "#333333",
			strokeWidth: 2,
			cornerRadius: 12,
		});

		const overlayTitle = new Konva.Text({
			x: panelX,
			y: panelY + 19,
			width: panelWidth,
			text: msg,
			fontSize: 26,
			fontFamily: "Arial",
			fill: "#333333",
			align: "center",
		});

		const skipButton = new Konva.Group({
			x: panelX + 32,
			y: panelY + 80,
			cursor: "pointer",
		});

		const skipRect = new Konva.Rect({
			width: panelWidth - 64,
			height: 45,
			fill: "#2e7d32",
			cornerRadius: 10,
		});

		const skipText = new Konva.Text({
			text: "Skip",
			fontSize: 20,
			fontFamily: "Arial",
			fill: "white",
			width: panelWidth - 64,
			y: 14,
			align: "center",
		});

		skipButton.add(skipRect);
		skipButton.add(skipText);
		skipButton.on("mouseup", () => {
			skipHandler?.();
		});

		const continueButton = new Konva.Group({
			x: panelX + 32,
			y: panelY + 136,
			cursor: "pointer",
		});

		const continueRect = new Konva.Rect({
			width: panelWidth - 64,
			height: 45,
			fill: "#c62828",
			cornerRadius: 10,
		});

		const continueText = new Konva.Text({
			text: "Continue",
			fontSize: 20,
			fontFamily: "Arial",
			fill: "white",
			width: panelWidth - 64,
			y: 14,
			align: "center",
		});

		continueButton.add(continueRect);
		continueButton.add(continueText);
		continueButton.on("mouseup", () => {
			continueHandler?.();
		});

		overlay.add(overlayBackground);
		overlay.add(overlayPanel);
		overlay.add(overlayTitle);
		overlay.add(skipButton);
		overlay.add(continueButton);

		return overlay
	}

	spawnEmus(n: number): void {
		if (!this.registerEmu) return;

		for (let i = 0; i < n; i++) {
			const side = Math.floor(Math.random() * 4);
			let location = [0, 0];
			switch (side) {
			case 0: location = [0, EMU_MIN_Y + Math.random() * (STAGE_HEIGHT - EMU_MIN_Y)]; break;
			case 1: location = [Math.random() * STAGE_WIDTH, EMU_MIN_Y]; break;
			case 2: location = [STAGE_WIDTH, EMU_MIN_Y + Math.random() * (STAGE_HEIGHT - EMU_MIN_Y)]; break;
			case 3: location = [Math.random() * STAGE_WIDTH, STAGE_HEIGHT]; break;
			}

			const emu = new FarmEmuController(this.group, location[0], location[1], () => {
				emu.remove();
				emu.setActive(false);
			});
			this.registerEmu(emu);
		}
	}

	clearEmus(): void {
		if (!this.removeEmus) return;
		this.removeEmus();
		/**
		 * Should remove all emu objects from the game
		 * Is called when the timer ends
		 */
	}

	/**
	 * Update score display
	 */
	updateScore(score: number): void {
		this.scoreText.text(`${score}`);
		this.group.getLayer()?.draw();
	}

	updateCropCount(count: number): void {
		this.cropText.text(`${count}`);
		this.group.getLayer()?.draw();
	}

	updateMineCount(count: number): void {
		this.mineText.text(`${count}`);
		this.group.getLayer()?.draw();
	}

	setMenuButtonHandler(handler: () => void): void {
		this.menuButtonHandler = handler;
	}

	setMenuOptionHandlers(onExit: () => void, onBack: () => void): void {
		this.menuSaveHandler = onExit;
		this.menuBackHandler = onBack;
	}

	setStartRoundHandler(handler: () => void): void {
		this.startRoundHandler = handler;
	}

	//For hunting minigame:
	setHuntMenuOptionHandlers(onSkip: () => void, onCont: () => void){
		this.huntSkipHandler = onSkip;
		this.huntContinueHandler = onCont;
	}

	//For egg collection minigame:

	setEggMenuOptionHandlers(onSkip: () => void, onCont: () => void){
		this.eggSkipHandler = onSkip;
		this.eggContinueHandler = onCont;
	}

	showMenuOverlay(): void {
		this.menuOverlay.moveToTop();
		this.menuOverlay.visible(true);
		this.group.getLayer()?.draw();
	}

	hideMenuOverlay(): void {
		this.menuOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	//Hide and Show hunt menu:

	showHuntMenuOverlay(): void {
		this.huntMenuOverlay.moveToTop();
		this.huntMenuOverlay.visible(true);
		this.group.getLayer()?.draw();
	}

	hideHuntMenuOverlay(): void {
		this.huntMenuOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	//Hide and Show egg menu:

	showEggMenuOverlay(): void {
		this.eggMenuOverlay.moveToTop();
		this.eggMenuOverlay.visible(true);
		this.group.getLayer()?.draw();
	}

	hideEggMenuOverlay(): void {
		this.eggMenuOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	deployMineAtMouse(): { node: Konva.Image; size: number } | null {
		const mine = new Konva.Image({
			x: this.mouseX - MINE_SIZE / 2,
			y: this.mouseY - MINE_SIZE / 2,
			width: MINE_SIZE,
			height: MINE_SIZE,
			image: mineImage,
			listening: false,
		});
		this.minesLayer.add(mine);
		this.mines.push(mine);
		this.group.getLayer()?.draw();
		return { node: mine, size: MINE_SIZE };
	}

	removeMineSprite(node: Konva.Image): void {
		const idx = this.mines.indexOf(node);
		if (idx >= 0) {
			this.mines.splice(idx, 1);
		}
		node.destroy();
		this.group.getLayer()?.draw();
	}

	clearMines(): void {
		this.mines.forEach((mine) => mine.destroy());
		this.mines = [];
		this.minesLayer.destroyChildren();
		this.group.getLayer()?.draw();
	}

	/**
	 * Update timer display
	 */
	updateTimer(timeRemaining: number): void {
		this.timerText.text(`${timeRemaining}`);
		const ratio = Math.max(0, Math.min(1, timeRemaining / GAME_DURATION));
		this.timerBarFill.width(88 * ratio);
		this.timerBarFill.visible(ratio > 0);
		this.timerBarFill.fill(ratio > 0.34 ? "#58d36a" : ratio > 0.17 ? "#f2c14e" : "#ff5a4a");
		this.timerText.fill(timeRemaining <= 10 && timeRemaining > 0 ? "#ff8a7a" : CREAM);
		this.group.getLayer()?.draw();
	}

	/**
	 * Update round display (now shows day)
	 */
	updateRound(day: number): void {
		this.roundText.text(`DAY ${day}`);
		this.group.getLayer()?.draw();
	}

	setDefensePlaceClickHandler(handler: (x: number, y: number) => void): void {
		this.onDefensePlaceClick = handler;
	}

	setPlanningPhaseMode(enabled: boolean): void {
		// Enable/disable defense placement clicks
		this.defensesLayer.listening(enabled);
	}

	setStartRoundButtonEnabled(enabled: boolean): void {
		this.startRoundButtonEnabled = enabled;
		this.startRoundGroup.listening(true);
		this.startRoundGroup.opacity(enabled ? 1 : 0.35);
		this.startDayBackground.fill(enabled ? "#2fa84f" : "#6b7676");
		this.startDayLip.fill(enabled ? "#1b6b31" : "#434b4b");
		this.startDayBackground.listening(true);
		this.startDayButton.listening(true);
		this.group.getLayer()?.draw();
	}

	setStartRoundTooltip(message: string): void {
		this.startRoundTooltipMessage = message;
	}

	private attachHudTooltip(target: Konva.Group, message: string): void {
		target.on("mouseenter", () => this.showHudTooltip(target, message));
		target.on("mouseleave", () => this.hideHudTooltip());
	}

	private showHudTooltip(target: Konva.Group, message: string): void {
		const bounds = target.getClientRect({ relativeTo: this.hudGroup });
		this.hudTooltipText.text(message);
		this.hudTooltipBackground.width(this.hudTooltipText.width());
		this.hudTooltipBackground.height(this.hudTooltipText.height());

		const tooltipX = Math.max(8, Math.min(bounds.x + bounds.width / 2 - this.hudTooltipBackground.width() / 2, STAGE_WIDTH - this.hudTooltipBackground.width() - 8));
		const tooltipY = Math.max(8, bounds.y + bounds.height + 8);

		this.hudTooltipGroup.position({ x: tooltipX, y: tooltipY });
		this.hudTooltipGroup.visible(true);
		this.hudTooltipGroup.moveToTop();
		this.hudGroup.getLayer()?.draw();
	}

	private hideHudTooltip(): void {
		if (!this.hudTooltipGroup.visible()) {
			return;
		}
		this.hudTooltipGroup.visible(false);
		this.hudGroup.getLayer()?.draw();
	}

	addDefense(defenseGroup: Konva.Group): void {
		this.defensesLayer.add(defenseGroup);
		this.group.getLayer()?.draw();
	}

	clearDefenses(): void {
		this.defensesLayer.destroyChildren();
		this.group.getLayer()?.draw();
	}

	getDefensesLayer(): Konva.Group {
		return this.defensesLayer;
	}

	/**
	 * Show the screen
	 */
	show(): void {
		this.group.visible(true);
		this.startAmbience();
		this.group.getLayer()?.draw();
	}

	setPlacementHint(text?: string): void {
		this.mineInstructionText.text(text ?? this.placementHintDefault);
		this.group.getLayer()?.draw();
	}

	setPlacementCursor(enabled: boolean): void {
		const stage = this.group.getStage();
		if (stage) {
			stage.container().style.cursor = enabled ? "pointer" : "default";
		}
	}

	getMousePosition(): { x: number; y: number } | null {
		const stage = this.group.getStage();
		if (!stage) {
			return null;
		}
		const pointer = stage.getPointerPosition();
		if (!pointer) {
			return null;
		}
		return { x: pointer.x, y: pointer.y };
	}

	/**
	 * Hide the screen
	 */
	hide(): void {
		this.group.visible(false);
		this.ambientAnim?.stop();
		this.group.getLayer()?.draw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
