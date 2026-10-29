import Konva from "konva";
import { STAGE_WIDTH, STAGE_HEIGHT, HUD_HEIGHT } from "../../constants";
import { INK, createModal, makeButton, makeRibbon } from "../../utils/uiKit.ts";
import pauseSrc from "../../../assets/pause.png";
const WOOD_STOPS = [0, "#80502a", 1, "#55331a"];
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

/** Paints the static hunt field (dusk scrub, grass, dirt, a nest) once into a canvas. */
const drawHuntField = (): HTMLCanvasElement => {
	const canvas = document.createElement("canvas");
	canvas.width = STAGE_WIDTH;
	canvas.height = STAGE_HEIGHT;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const rand = seededRandom(1932);

	const sky = ctx.createLinearGradient(0, HUD_HEIGHT, 0, STAGE_HEIGHT);
	sky.addColorStop(0, "#2c4a4e");
	sky.addColorStop(0.45, "#3d5c3a");
	sky.addColorStop(1, "#2a4a28");
	ctx.fillStyle = sky;
	ctx.fillRect(0, HUD_HEIGHT, STAGE_WIDTH, STAGE_HEIGHT - HUD_HEIGHT);

	for (let y = HUD_HEIGHT; y < STAGE_HEIGHT; y += 4) {
		for (let x = 0; x < STAGE_WIDTH; x += 4) {
			const r = rand();
			if (r < 0.18) {
				ctx.fillStyle = r < 0.08 ? "rgba(20, 50, 15, 0.28)" : "rgba(180, 210, 90, 0.1)";
				ctx.fillRect(x, y, 4, 4);
			}
		}
	}

	ctx.lineCap = "round";
	ctx.lineWidth = 1.5;
	const blades = ["#2f6b28", "#4a8a32", "#6fbf4a"];
	for (let i = 0; i < 1800; i++) {
		const x = rand() * STAGE_WIDTH;
		const y = HUD_HEIGHT + 8 + rand() * (STAGE_HEIGHT - HUD_HEIGHT - 8);
		const h = 4 + rand() * 8;
		const lean = (rand() - 0.5) * 6;
		ctx.strokeStyle = blades[Math.floor(rand() * blades.length)];
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.quadraticCurveTo(x + lean * 0.4, y - h / 2, x + lean, y - h);
		ctx.stroke();
	}

	for (let i = 0; i < 18; i++) {
		const x = 30 + rand() * (STAGE_WIDTH - 60);
		const y = HUD_HEIGHT + 40 + rand() * (STAGE_HEIGHT - HUD_HEIGHT - 80);
		const w = 40 + rand() * 70;
		const h = 16 + rand() * 22;
		ctx.fillStyle = "rgba(120, 88, 50, 0.35)";
		roundRectPath(ctx, x, y, w, h, 10);
		ctx.fill();
	}

	// A quiet nest in the corner so the hunt feels like it has a destination.
	const nestX = 86;
	const nestY = STAGE_HEIGHT - 78;
	ctx.fillStyle = "rgba(20, 40, 10, 0.4)";
	ctx.beginPath();
	ctx.ellipse(nestX, nestY + 10, 38, 12, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#6b4424";
	ctx.beginPath();
	ctx.ellipse(nestX, nestY, 34, 14, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#3a2412";
	ctx.lineWidth = 2;
	ctx.stroke();
	for (const [dx, dy] of [[-10, -4], [2, -8], [12, -2]]) {
		ctx.fillStyle = "#fbf3e0";
		ctx.beginPath();
		ctx.ellipse(nestX + dx, nestY + dy, 7, 9, dx * 0.04, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#b89a6a";
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	const vignette = ctx.createRadialGradient(STAGE_WIDTH / 2, (HUD_HEIGHT + STAGE_HEIGHT) / 2, 220, STAGE_WIDTH / 2, (HUD_HEIGHT + STAGE_HEIGHT) / 2, 520);
	vignette.addColorStop(0, "rgba(0, 20, 10, 0)");
	vignette.addColorStop(1, "rgba(0, 15, 10, 0.45)");
	ctx.fillStyle = vignette;
	ctx.fillRect(0, HUD_HEIGHT, STAGE_WIDTH, STAGE_HEIGHT - HUD_HEIGHT);

	return canvas;
};

export class HuntingScreenView {
	private group: Konva.Group;
	private hudBanner: Konva.Rect;
	private ammoValueText: Konva.Text;
	private emusValueText: Konva.Text;
	private timerText: Konva.Text;
	private timerBarFill: Konva.Rect;
	private pauseOverlay: Konva.Group;
	private onPause: (() => void) | null = null;
	private onResume: (() => void) | null = null;
	private onLeave: (() => void) | null = null;

	constructor() {
		this.group = new Konva.Group({ visible: false });

		this.group.add(new Konva.Image({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			image: drawHuntField(),
			listening: false,
		}));

		this.group.add(new Konva.Rect({
			x: 0,
			y: HUD_HEIGHT,
			width: STAGE_WIDTH,
			height: 8,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: 8 },
			fillLinearGradientColorStops: [0, "rgba(0, 0, 0, 0.4)", 1, "rgba(0, 0, 0, 0)"],
			listening: false,
		}));

		this.hudBanner = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: HUD_HEIGHT,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: HUD_HEIGHT },
			fillLinearGradientColorStops: WOOD_STOPS,
		});
		this.group.add(this.hudBanner);
		this.group.add(new Konva.Rect({ x: 0, y: HUD_HEIGHT - 4, width: STAGE_WIDTH, height: 4, fill: "#2e1a0b", listening: false }));

		const ammoChip = this.createChip(16, "AMMO");
		this.ammoValueText = ammoChip.findOne(".value") as Konva.Text;

		const emuChip = this.createChip(STAGE_WIDTH / 2 - 70, "EMUS LEFT");
		this.emusValueText = emuChip.findOne(".value") as Konva.Text;

		this.addPauseButton();

		const timer = new Konva.Group({ x: STAGE_WIDTH - 258, y: 14, listening: false });
		timer.add(new Konva.Rect({ width: 194, height: 36, cornerRadius: 18, fill: "rgba(30, 18, 8, 0.6)", stroke: "#c9a66b", strokeWidth: 1.5 }));
		timer.add(new Konva.Circle({ x: 18, y: 18, radius: 11, fill: CREAM, stroke: "#4a2c0a", strokeWidth: 2 }));
		timer.add(new Konva.Line({ points: [18, 10, 18, 18, 24, 21], stroke: "#4a2c0a", strokeWidth: 2, lineCap: "round", lineJoin: "round" }));
		this.timerText = new Konva.Text({
			x: 34,
			y: 8,
			width: 52,
			text: "01:00",
			fontSize: 18,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: CREAM,
			align: "center",
		});
		timer.add(this.timerText);
		timer.add(new Konva.Rect({ x: 90, y: 13, width: 90, height: 10, cornerRadius: 5, fill: "rgba(0, 0, 0, 0.5)" }));
		this.timerBarFill = new Konva.Rect({ x: 90, y: 13, width: 90, height: 10, cornerRadius: 5, fill: "#58d36a" });
		timer.add(this.timerBarFill);
		this.group.add(timer);

		this.group.add(new Konva.Text({
			x: 16,
			y: 56,
			width: 520,
			text: "WASD or arrows to move.  SPACE to shoot.  Esc to pause.",
			fontSize: 12,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: "#f3e3bf",
			shadowColor: "black",
			shadowBlur: 2,
			shadowOpacity: 0.6,
			listening: false,
		}));

		this.pauseOverlay = this.createPauseOverlay();
		this.group.add(this.pauseOverlay);
	}

	private addPauseButton(): void {
		const pauseImage = typeof Image !== "undefined" ? Object.assign(new Image(), { src: pauseSrc }) : (document.createElement("img") as HTMLImageElement);
		const group = new Konva.Group({ x: STAGE_WIDTH - 52, y: 14, cursor: "pointer" });
		group.add(new Konva.Rect({ y: 4, width: 40, height: 40, cornerRadius: 9, fill: "#4b5560" }));
		group.add(new Konva.Rect({
			width: 40,
			height: 40,
			cornerRadius: 9,
			fill: "#7d8a96",
			stroke: "rgba(255, 255, 255, 0.35)",
			strokeWidth: 1.5,
		}));
		group.add(new Konva.Image({ x: 5, y: 5, width: 30, height: 30, image: pauseImage, listening: false }));
		group.on("click tap", () => this.onPause?.());
		this.group.add(group);
	}

	private createPauseOverlay(): Konva.Group {
		const { popup, y } = createModal(400, 270);
		popup.visible(false);
		popup.add(makeRibbon(STAGE_WIDTH / 2, y - 24, 220, "PAUSED"));
		popup.add(new Konva.Text({
			x: STAGE_WIDTH / 2 - 180,
			y: y + 40,
			width: 360,
			text: "The emus will wait. Probably.",
			fontSize: 16,
			fontFamily: "Georgia",
			fontStyle: "italic",
			fill: INK,
			align: "center",
		}));
		popup.add(makeButton(
			{ x: STAGE_WIDTH / 2 - 140, y: y + 84, width: 280, height: 54, text: "RESUME", color: "#2fa84f", lip: "#1b6b31", fontSize: 22 },
			() => this.onResume?.()
		));
		popup.add(makeButton(
			{ x: STAGE_WIDTH / 2 - 140, y: y + 160, width: 280, height: 54, text: "LEAVE HUNT", color: "#e0453a", lip: "#8f231b", fontSize: 22 },
			() => this.onLeave?.()
		));
		return popup;
	}

	setPauseHandlers(onPause: () => void, onResume: () => void, onLeave: () => void): void {
		this.onPause = onPause;
		this.onResume = onResume;
		this.onLeave = onLeave;
	}

	showPauseOverlay(): void {
		this.pauseOverlay.visible(true);
		this.pauseOverlay.moveToTop();
		this.group.getLayer()?.draw();
	}

	hidePauseOverlay(): void {
		this.pauseOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	private createChip(x: number, label: string): Konva.Group {
		const chip = new Konva.Group({ x, y: 10, listening: false });
		chip.add(new Konva.Rect({ width: 140, height: 40, cornerRadius: 20, fill: "rgba(30, 18, 8, 0.6)", stroke: "#c9a66b", strokeWidth: 1.5 }));
		chip.add(new Konva.Text({ x: 16, y: 6, text: label, fontSize: 10, fontFamily: "Arial", fontStyle: "bold", letterSpacing: 1, fill: "#d9c28f" }));
		chip.add(new Konva.Text({ name: "value", x: 16, y: 18, width: 110, text: "0", fontSize: 18, fontFamily: "Arial", fontStyle: "bold", fill: CREAM, wrap: "none" }));
		this.group.add(chip);
		return chip;
	}

	getGroup() {
		return this.group;
	}

	show() {
		this.group.visible(true);
		this.group.getLayer()?.draw();
	}

	hide() {
		this.group.visible(false);
		this.pauseOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	updateAmmo(ammo: number) {
		this.ammoValueText.text(ammo.toString());
		this.ammoValueText.fill(ammo <= 15 ? "#ff8a7a" : CREAM);
		this.group.getLayer()?.draw();
	}

	updateDefeat(emusLeft: number) {
		this.emusValueText.text(emusLeft.toString());
		this.group.getLayer()?.draw();
	}

	updateTimer(secondsRemaining: number) {
		const minutes = Math.floor(secondsRemaining / 60);
		const seconds = Math.floor(secondsRemaining % 60);
		const secondsStr = seconds.toString().padStart(2, "0");
		this.timerText.text(`${minutes.toString().padStart(2, "0")}:${secondsStr}`);
		const ratio = Math.max(0, Math.min(1, secondsRemaining / 60));
		this.timerBarFill.width(90 * ratio);
		this.timerBarFill.visible(ratio > 0);
		this.timerBarFill.fill(ratio > 0.34 ? "#58d36a" : ratio > 0.17 ? "#f2c14e" : "#ff5a4a");
		this.timerText.fill(secondsRemaining <= 10 ? "#ff8a7a" : CREAM);
		this.group.getLayer()?.draw();
	}

	batchDraw() {
		this.group.getLayer()?.batchDraw();
	}
}
