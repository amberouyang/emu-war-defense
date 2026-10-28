import Konva from "konva";
import type { View } from "../../types";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import {
	TILE_TYPE,
	MAZE_WIDTH,
	MAZE_HEIGHT,
	EGG_COUNT,
	EGG_TIME_BONUS,
	type Direction,
} from "./RaidModel";
import flagSrc from "../../../assets/flag.png";

// Integer tile size so the maze maps to exact pixels (20x15 @ 40px = 800x600).
const TILE_SIZE = 40;
const MAZE_PIXEL_WIDTH = MAZE_WIDTH * TILE_SIZE;
const MAZE_PIXEL_HEIGHT = MAZE_HEIGHT * TILE_SIZE;
const HUD_HEIGHT = (STAGE_HEIGHT - MAZE_PIXEL_HEIGHT) / 2;
const LANTERN_RADIUS = 150;

const FONT = "Arial";
const TITLE_FONT = "Arial Black, Arial";

const COLORS = {
	bar: "#17110c",
	barLine: "#4a3726",
	panel: "#241a12",
	panelBorder: "#c8a25a",
	keycap: "#3a2c20",
	text: "#f1e6d2",
	mutedText: "#bfae8c",
	gold: "#ffd36b",
	egg: "#2f6f5e",
	eggDark: "#173b31",
	eggShine: "rgba(200, 255, 230, 0.6)",
	good: "#7fd36b",
	warn: "#f2c14e",
	danger: "#e5533d",
	darkness: "8, 10, 35",
};

const GROUND = "#6e4528";
const BASE_COLORS: Record<number, string> = {
	[TILE_TYPE.PATH]: GROUND,
	[TILE_TYPE.WALL]: "#2e6b2e",
	[TILE_TYPE.START]: "#7d6a48",
	[TILE_TYPE.EXIT]: GROUND,
	[TILE_TYPE.EGG]: GROUND,
	[TILE_TYPE.NEST]: GROUND,
};

const TIMER_BAR = { x: 250, y: 18, width: 250, height: 14 };
const DIG_BAR = { x: 680, y: 18, width: 100, height: 14 };

const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
	up: { dx: 0, dy: -1 },
	down: { dx: 0, dy: 1 },
	left: { dx: -1, dy: 0 },
	right: { dx: 1, dy: 0 },
};

export type RaidResults = {
	didWin: boolean;
	eggsCollected: number;
	totalEggs: number;
	timeLeft: number;
	stars: number;
};

type EggNode = {
	egg: Konva.Group;
	sparkle: Konva.Star;
	baseY: number;
	phase: number;
};

function hexToRgb(hex: string): [number, number, number] {
	const value = parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Deterministic per-tile noise so decorations don't shuffle on every redraw.
function tileNoise(x: number, y: number, i: number): number {
	let h = (x * 374761393 + y * 668265263 + i * 982451653) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}

function isWall(layout: number[][], x: number, y: number): boolean {
	if (y < 0 || y >= MAZE_HEIGHT || x < 0 || x >= MAZE_WIDTH) return true;
	return layout[y][x] === TILE_TYPE.WALL;
}

function tileCenter(x: number, y: number): { x: number; y: number } {
	return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
}

function drawDirt(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number): void {
	for (let i = 0; i < 7; i++) {
		const px = sx + 3 + Math.floor(tileNoise(x, y, i * 3) * 33);
		const py = sy + 3 + Math.floor(tileNoise(x, y, i * 3 + 1) * 33);
		ctx.fillStyle = tileNoise(x, y, i * 3 + 2) > 0.5 ? "#5c3920" : "#80552f";
		ctx.fillRect(px, py, 3, 2);
	}
	if (tileNoise(x, y, 30) < 0.3) {
		ctx.fillStyle = "#8d7c69";
		ctx.beginPath();
		ctx.ellipse(sx + 8 + tileNoise(x, y, 31) * 24, sy + 8 + tileNoise(x, y, 32) * 24, 3, 2, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	if (tileNoise(x, y, 40) < 0.2) {
		const tx = sx + 8 + Math.floor(tileNoise(x, y, 41) * 22);
		const ty = sy + 10 + Math.floor(tileNoise(x, y, 42) * 20);
		ctx.fillStyle = "#4f7a32";
		ctx.fillRect(tx, ty, 1, 5);
		ctx.fillRect(tx + 2, ty - 2, 1, 7);
		ctx.fillRect(tx + 4, ty, 1, 5);
	}
}

function drawHedge(ctx: CanvasRenderingContext2D, layout: number[][], x: number, y: number, sx: number, sy: number): void {
	const clumps = [
		[11, 12],
		[28, 11],
		[20, 21],
		[11, 29],
		[29, 28],
	];
	clumps.forEach(([cx, cy], i) => {
		const jx = sx + cx + Math.round((tileNoise(x, y, i) - 0.5) * 2);
		const jy = sy + cy + Math.round((tileNoise(x, y, i + 10) - 0.5) * 2);
		const radius = 8 + tileNoise(x, y, i + 20) * 1.5;
		ctx.fillStyle = "#3a7f37";
		ctx.beginPath();
		ctx.arc(jx, jy, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#5aa651";
		ctx.beginPath();
		ctx.arc(jx - 3, jy - 3, 3.5, 0, Math.PI * 2);
		ctx.fill();
	});
	ctx.fillStyle = "#1f4f20";
	for (let i = 0; i < 4; i++) {
		ctx.fillRect(
			sx + 4 + Math.floor(tileNoise(x, y, 50 + i) * 32),
			sy + 4 + Math.floor(tileNoise(x, y, 60 + i) * 30),
			2,
			2,
		);
	}
	// Darker front face where the hedge meets open ground below.
	if (!isWall(layout, x, y + 1)) {
		ctx.fillStyle = "#1e461e";
		ctx.fillRect(sx, sy + 32, TILE_SIZE, 8);
	}
}

function drawHatch(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
	ctx.strokeStyle = "#4a3a22";
	ctx.lineWidth = 2;
	ctx.strokeRect(sx + 4, sy + 4, 32, 32);
	ctx.fillStyle = "#5c4a2f";
	for (let k = 1; k <= 3; k++) {
		ctx.fillRect(sx + 5, sy + 4 + k * 8, 30, 2);
	}
	ctx.fillStyle = "#c9b48a";
	for (const [nx, ny] of [[7, 7], [31, 7], [7, 31], [31, 31]]) {
		ctx.fillRect(sx + nx, sy + ny, 2, 2);
	}
}

function drawBurrow(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
	const cx = sx + TILE_SIZE / 2;
	const cy = sy + TILE_SIZE / 2 + 6;
	ctx.fillStyle = "#86593a";
	ctx.beginPath();
	ctx.ellipse(cx, cy, 16, 10, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#2a170c";
	ctx.beginPath();
	ctx.ellipse(cx, cy, 13, 8, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#120904";
	ctx.beginPath();
	ctx.ellipse(cx, cy + 1, 9, 5, 0, 0, Math.PI * 2);
	ctx.fill();
}

function drawNest(ctx: CanvasRenderingContext2D, sx: number, sy: number, isEmpty: boolean): void {
	const cx = sx + TILE_SIZE / 2;
	const cy = sy + TILE_SIZE / 2 + 8;
	if (isEmpty) {
		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		ctx.beginPath();
		ctx.ellipse(cx, cy, 9, 3.5, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.strokeStyle = "#4a2e14";
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.ellipse(cx, cy, 13, 6, 0, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = "#9a6a35";
	ctx.lineWidth = 1.5;
	for (const [start, end] of [[0.1, 0.9], [1.1, 1.6], [1.7, 2.3]]) {
		ctx.beginPath();
		ctx.ellipse(cx, cy, 12, 5, 0, Math.PI * start, Math.PI * end);
		ctx.stroke();
	}
	if (isEmpty) {
		// Leftover shell fragments.
		ctx.fillStyle = COLORS.egg;
		ctx.fillRect(cx - 5, cy - 2, 4, 3);
		ctx.fillRect(cx + 3, cy - 1, 3, 2);
	}
}

function drawMazeToContext(ctx: CanvasRenderingContext2D, layout: number[][]): void {
	ctx.imageSmoothingEnabled = false;

	// Write each base pixel exactly once so no tile seams can appear.
	const imageData = ctx.createImageData(MAZE_PIXEL_WIDTH, MAZE_PIXEL_HEIGHT);
	const { data } = imageData;
	for (let y = 0; y < MAZE_HEIGHT; y++) {
		for (let x = 0; x < MAZE_WIDTH; x++) {
			const [r, g, b] = hexToRgb(BASE_COLORS[layout[y][x]] ?? GROUND);
			const startX = x * TILE_SIZE;
			const startY = y * TILE_SIZE;
			for (let py = 0; py < TILE_SIZE; py++) {
				const row = ((startY + py) * MAZE_PIXEL_WIDTH + startX) * 4;
				for (let px = 0; px < TILE_SIZE; px++) {
					const i = row + px * 4;
					data[i] = r;
					data[i + 1] = g;
					data[i + 2] = b;
					data[i + 3] = 255;
				}
			}
		}
	}
	ctx.putImageData(imageData, 0, 0);

	for (let y = 0; y < MAZE_HEIGHT; y++) {
		for (let x = 0; x < MAZE_WIDTH; x++) {
			const type = layout[y][x];
			const sx = x * TILE_SIZE;
			const sy = y * TILE_SIZE;
			if (type === TILE_TYPE.WALL) {
				drawHedge(ctx, layout, x, y, sx, sy);
				continue;
			}
			if (type === TILE_TYPE.START) {
				drawHatch(ctx, sx, sy);
			} else {
				drawDirt(ctx, x, y, sx, sy);
				if (type === TILE_TYPE.EXIT) drawBurrow(ctx, sx, sy);
				if (type === TILE_TYPE.EGG || type === TILE_TYPE.NEST) {
					drawNest(ctx, sx, sy, type === TILE_TYPE.NEST);
				}
			}
			// Hedges cast a shadow onto the ground below them.
			if (isWall(layout, x, y - 1)) {
				ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
				ctx.fillRect(sx, sy, TILE_SIZE, 6);
			}
		}
	}

	ctx.fillStyle = "rgba(20, 24, 70, 0.15)";
	ctx.fillRect(0, 0, MAZE_PIXEL_WIDTH, MAZE_PIXEL_HEIGHT);
}

function createEggShape(scale: number = 1): Konva.Group {
	const group = new Konva.Group({ scaleX: scale, scaleY: scale, listening: false });
	group.add(new Konva.Ellipse({
		radiusX: 8,
		radiusY: 10,
		fill: COLORS.egg,
		stroke: COLORS.eggDark,
		strokeWidth: 1,
	}));
	group.add(new Konva.Ellipse({
		x: -3,
		y: -4,
		radiusX: 2.5,
		radiusY: 4,
		fill: COLORS.eggShine,
	}));
	return group;
}

function createKeycap(x: number, y: number, width: number, label: string): Konva.Group {
	const group = new Konva.Group({ x, y, listening: false });
	group.add(new Konva.Rect({
		width,
		height: 44,
		fill: COLORS.keycap,
		stroke: COLORS.panelBorder,
		strokeWidth: 2,
		cornerRadius: 7,
		shadowColor: "#0d0906",
		shadowOffsetY: 4,
		shadowBlur: 0,
		shadowOpacity: 1,
	}));
	group.add(new Konva.Text({
		width,
		height: 44,
		text: label,
		fontSize: 18,
		fontFamily: FONT,
		fontStyle: "bold",
		fill: "#ffe9b8",
		align: "center",
		verticalAlign: "middle",
	}));
	return group;
}

function createClockIcon(x: number, y: number): Konva.Group {
	const group = new Konva.Group({ x, y, listening: false });
	group.add(new Konva.Circle({ radius: 11, fill: "#f3e2c0", stroke: "#8a5a2b", strokeWidth: 2 }));
	group.add(new Konva.Line({ points: [0, 0, 0, -7], stroke: "#3a2c20", strokeWidth: 2, lineCap: "round" }));
	group.add(new Konva.Line({ points: [0, 0, 5, 2], stroke: COLORS.danger, strokeWidth: 2, lineCap: "round" }));
	return group;
}

export class RaidView implements View {
	private group: Konva.Group;
	private world: Konva.Group;
	private mazeShape: Konva.Shape | null = null;
	private mazeLayout: number[][] = [];
	private eggLayer: Konva.Group;
	private fxLayer: Konva.Group;
	private fog: Konva.Rect;
	private eggNodes = new Map<string, EggNode>();
	private allEggsFound = false;

	private player: Konva.Group;
	private playerBody: Konva.Group;
	private moveTween: Konva.Tween | null = null;

	private exitGroup: Konva.Group;
	private exitGlow: Konva.Circle;
	private flagImage: HTMLImageElement;

	private hudEggSlots: Konva.Group;
	private eggSlots: Konva.Group[] = [];
	private eggCountText: Konva.Text;
	private shownEggCount = 0;
	private timerFill: Konva.Rect;
	private timerText: Konva.Text;
	private digFill: Konva.Rect;
	private digLabel: Konva.Text;
	private digTween: Konva.Tween | null = null;

	private banner: Konva.Text;
	private goText: Konva.Text;

	private introGroup: Konva.Group;

	private resultsGroup: Konva.Group;
	private resultsTitle: Konva.Text;
	private resultsStats: Konva.Text;
	private resultsReward: Konva.Text;
	private resultsCountdown: Konva.Text;
	private resultStars: Konva.Star[] = [];

	private animation: Konva.Animation | null = null;

	constructor(onIntroStartClick: () => void, onContinueClick: () => void) {
		this.group = new Konva.Group({ visible: false });

		this.flagImage = new Image();
		this.flagImage.onload = () => this.group.getLayer()?.batchDraw();
		this.flagImage.src = flagSrc;

		// Opaque backdrop so nothing white bleeds through at tile seams.
		this.group.add(new Konva.Rect({
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "#2a1f14",
			listening: false,
		}));

		// --- World (maze, entities, lighting) ---
		this.world = new Konva.Group({ y: HUD_HEIGHT });
		this.group.add(this.world);

		this.eggLayer = new Konva.Group({ listening: false });
		this.world.add(this.eggLayer);

		this.player = new Konva.Group({ listening: false });
		this.playerBody = this.createPlayerSprite();
		this.player.add(this.playerBody);
		this.world.add(this.player);

		this.fog = new Konva.Rect({
			width: MAZE_PIXEL_WIDTH,
			height: MAZE_PIXEL_HEIGHT,
			listening: false,
			fillRadialGradientStartRadius: 0,
			fillRadialGradientEndRadius: LANTERN_RADIUS,
			fillRadialGradientColorStops: [
				0, `rgba(${COLORS.darkness}, 0)`,
				0.55, `rgba(${COLORS.darkness}, 0.2)`,
				1, `rgba(${COLORS.darkness}, 0.82)`,
			],
		});
		this.world.add(this.fog);

		// Effects sit above the darkness so sparkles and the exit beacon read at night.
		this.fxLayer = new Konva.Group({ listening: false });
		this.world.add(this.fxLayer);

		this.exitGroup = new Konva.Group({ listening: false });
		this.exitGlow = new Konva.Circle({
			radius: 20,
			fill: "rgba(255, 120, 80, 0.35)",
			shadowColor: "#ff7a4a",
			shadowBlur: 25,
			shadowOpacity: 0.9,
		});
		this.exitGroup.add(this.exitGlow);
		this.exitGroup.add(new Konva.Image({
			image: this.flagImage,
			x: -10,
			y: -24,
			width: 28,
			height: 28,
		}));

		this.banner = new Konva.Text({
			y: 40,
			width: MAZE_PIXEL_WIDTH,
			text: "",
			fontSize: 26,
			fontFamily: TITLE_FONT,
			fill: COLORS.gold,
			align: "center",
			shadowColor: "#000",
			shadowBlur: 8,
			shadowOpacity: 0.9,
			visible: false,
		});

		this.goText = new Konva.Text({
			x: MAZE_PIXEL_WIDTH / 2,
			y: MAZE_PIXEL_HEIGHT / 2,
			text: "GO!",
			fontSize: 90,
			fontFamily: TITLE_FONT,
			fill: COLORS.gold,
			stroke: "#5a3a12",
			strokeWidth: 3,
			visible: false,
		});
		this.goText.offsetX(this.goText.width() / 2);
		this.goText.offsetY(this.goText.height() / 2);

		// --- HUD ---
		this.addBar(0, HUD_HEIGHT, HUD_HEIGHT - 2);
		this.addBar(HUD_HEIGHT + MAZE_PIXEL_HEIGHT, HUD_HEIGHT, 0);

		this.hudEggSlots = new Konva.Group({ listening: false });
		this.group.add(this.hudEggSlots);
		this.eggCountText = new Konva.Text({
			y: 15,
			text: "0/5",
			fontSize: 20,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.text,
		});
		this.group.add(this.eggCountText);

		this.group.add(new Konva.Text({
			x: TIMER_BAR.x - 52,
			y: TIMER_BAR.y,
			text: "TIME",
			fontSize: 14,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.mutedText,
			letterSpacing: 1,
		}));
		this.group.add(new Konva.Rect({
			...TIMER_BAR,
			fill: "#2c221a",
			stroke: COLORS.barLine,
			strokeWidth: 1,
			cornerRadius: 7,
		}));
		this.timerFill = new Konva.Rect({ ...TIMER_BAR, fill: COLORS.good, cornerRadius: 7 });
		this.group.add(this.timerFill);
		this.timerText = new Konva.Text({
			x: TIMER_BAR.x + TIMER_BAR.width + 12 + 28,
			y: TIMER_BAR.y + 7,
			width: 56,
			height: 22,
			offsetX: 28,
			offsetY: 11,
			text: "30s",
			fontSize: 20,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.text,
			verticalAlign: "middle",
		});
		this.group.add(this.timerText);

		this.digLabel = new Konva.Text({
			x: DIG_BAR.x - 80,
			y: DIG_BAR.y,
			width: 72,
			text: "SHOVEL",
			fontSize: 14,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.mutedText,
			align: "right",
			letterSpacing: 1,
		});
		this.group.add(this.digLabel);
		this.group.add(new Konva.Rect({
			...DIG_BAR,
			fill: "#2c221a",
			stroke: COLORS.barLine,
			strokeWidth: 1,
			cornerRadius: 7,
		}));
		this.digFill = new Konva.Rect({ ...DIG_BAR, fill: COLORS.good, cornerRadius: 7 });
		this.group.add(this.digFill);

		this.group.add(new Konva.Text({
			y: HUD_HEIGHT + MAZE_PIXEL_HEIGHT + 17,
			width: STAGE_WIDTH,
			text: "WASD or Arrow keys: Move      SPACE: Dig through hedges      Reach the flag to escape",
			fontSize: 15,
			fontFamily: FONT,
			fill: COLORS.mutedText,
			align: "center",
		}));

		// --- Overlays ---
		this.introGroup = this.createIntro(onIntroStartClick);
		this.group.add(this.introGroup);

		this.resultsTitle = new Konva.Text({});
		this.resultsStats = new Konva.Text({});
		this.resultsReward = new Konva.Text({});
		this.resultsCountdown = new Konva.Text({});
		this.resultsGroup = this.createResults(onContinueClick);
		this.group.add(this.resultsGroup);
	}

	// ------------------------------------------------------------------
	// Construction helpers
	// ------------------------------------------------------------------

	private addBar(y: number, height: number, lineY: number): void {
		this.group.add(new Konva.Rect({ y, width: STAGE_WIDTH, height, fill: COLORS.bar, listening: false }));
		this.group.add(new Konva.Rect({
			y: y + lineY,
			width: STAGE_WIDTH,
			height: 2,
			fill: COLORS.barLine,
			listening: false,
		}));
	}

	private createPlayerSprite(): Konva.Group {
		const body = new Konva.Group({ listening: false });
		body.add(new Konva.Ellipse({ y: 13, radiusX: 11, radiusY: 4, fill: "rgba(0, 0, 0, 0.35)" }));
		body.add(new Konva.Rect({ x: -8, y: -2, width: 16, height: 14, fill: "#3b6fd1", cornerRadius: 4 }));
		body.add(new Konva.Rect({ x: -5, y: 0, width: 10, height: 3, fill: "#2a52a3" }));
		body.add(new Konva.Circle({ y: -8, radius: 7, fill: "#f2c48d" }));
		body.add(new Konva.Rect({ x: -11, y: -14, width: 22, height: 3, fill: "#7a4b22", cornerRadius: 1 }));
		body.add(new Konva.Rect({ x: -6, y: -20, width: 12, height: 7, fill: "#8b5a2b", cornerRadius: 2 }));
		body.add(new Konva.Line({ points: [8, 2, 12, -2], stroke: "#5a4632", strokeWidth: 1.5 }));
		body.add(new Konva.Circle({
			x: 12,
			y: 3,
			radius: 4,
			fill: "#ffd35c",
			shadowColor: "#ffcf4a",
			shadowBlur: 14,
			shadowOpacity: 1,
		}));
		return body;
	}

	private createIntro(onStart: () => void): Konva.Group {
		const intro = new Konva.Group({ visible: false });
		intro.add(new Konva.Rect({ width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: "rgba(5, 6, 20, 0.85)" }));
		intro.add(new Konva.Rect({
			x: 110,
			y: 50,
			width: 580,
			height: 600,
			fill: COLORS.panel,
			stroke: COLORS.panelBorder,
			strokeWidth: 3,
			cornerRadius: 18,
			shadowColor: "#000",
			shadowBlur: 30,
			shadowOpacity: 0.6,
		}));

		const centered = (y: number, text: string, fontSize: number, fill: string, extra: Konva.TextConfig = {}) =>
			new Konva.Text({ y, width: STAGE_WIDTH, text, fontSize, fill, fontFamily: FONT, align: "center", ...extra });

		intro.add(centered(80, "NIGHT RAID", 54, COLORS.gold, {
			fontFamily: TITLE_FONT,
			shadowColor: "#ff9a3c",
			shadowBlur: 18,
			shadowOpacity: 0.8,
		}));
		intro.add(centered(148, "Sneak into the emu nest and steal their eggs before they wake up.", 17, "#e8dcc6"));

		intro.add(centered(190, "CONTROLS", 14, COLORS.panelBorder, { fontStyle: "bold", letterSpacing: 3 }));
		intro.add(createKeycap(248, 218, 44, "W"));
		intro.add(createKeycap(198, 268, 44, "A"));
		intro.add(createKeycap(248, 268, 44, "S"));
		intro.add(createKeycap(298, 268, 44, "D"));
		intro.add(createKeycap(430, 268, 170, "SPACE"));

		const caption = (x: number, width: number, y: number, text: string, fontSize: number, fill: string) =>
			new Konva.Text({ x, y, width, text, fontSize, fill, fontFamily: FONT, align: "center" });
		intro.add(caption(170, 200, 324, "Move", 16, COLORS.text));
		intro.add(caption(170, 200, 344, "or use the arrow keys", 13, COLORS.mutedText));
		intro.add(caption(405, 220, 324, "Dig through hedges", 16, COLORS.text));
		intro.add(caption(405, 220, 344, "short cooldown between digs", 13, COLORS.mutedText));

		intro.add(centered(384, "OBJECTIVE", 14, COLORS.panelBorder, { fontStyle: "bold", letterSpacing: 3 }));
		const rowText = (y: number, text: string) =>
			new Konva.Text({ x: 245, y: y - 10, text, fontSize: 17, fill: COLORS.text, fontFamily: FONT });

		const eggIcon = createEggShape(1.1);
		eggIcon.position({ x: 215, y: 420 });
		intro.add(eggIcon);
		intro.add(rowText(420, `Find the ${EGG_COUNT} hidden emu eggs. Each adds +${EGG_TIME_BONUS}s.`));

		intro.add(new Konva.Image({ image: this.flagImage, x: 203, y: 446, width: 26, height: 26 }));
		intro.add(rowText(460, "Reach the flag to escape with your loot."));

		intro.add(createClockIcon(215, 500));
		intro.add(rowText(500, "Run out of time and the emus take it all back."));

		intro.add(centered(536, "Tip: eggs glint in the dark, so watch for sparkles.", 15, COLORS.mutedText, {
			fontStyle: "italic",
		}));

		const button = this.createButton(STAGE_WIDTH / 2 - 120, 568, 240, 56, "START RAID", "#4caf50", onStart);
		intro.add(button);
		intro.add(centered(630, "or press Enter", 13, COLORS.mutedText));
		return intro;
	}

	private createResults(onContinue: () => void): Konva.Group {
		const results = new Konva.Group({ visible: false });
		results.add(new Konva.Rect({ width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: "rgba(5, 6, 20, 0.75)" }));
		results.add(new Konva.Rect({
			x: 180,
			y: 130,
			width: 440,
			height: 440,
			fill: COLORS.panel,
			stroke: COLORS.panelBorder,
			strokeWidth: 3,
			cornerRadius: 18,
			shadowColor: "#000",
			shadowBlur: 30,
			shadowOpacity: 0.6,
		}));

		this.resultsTitle = new Konva.Text({
			y: 160,
			width: STAGE_WIDTH,
			fontSize: 40,
			fontFamily: TITLE_FONT,
			align: "center",
			shadowColor: "#000",
			shadowBlur: 10,
			shadowOpacity: 0.8,
		});
		results.add(this.resultsTitle);

		this.resultStars = [-1, 0, 1].map((offset) => {
			const star = new Konva.Star({
				x: STAGE_WIDTH / 2 + offset * 80,
				y: 255,
				numPoints: 5,
				innerRadius: 13,
				outerRadius: 30,
				strokeWidth: 3,
			});
			results.add(star);
			return star;
		});

		this.resultsStats = new Konva.Text({
			y: 305,
			width: STAGE_WIDTH,
			fontSize: 20,
			fontFamily: FONT,
			fill: COLORS.text,
			align: "center",
			lineHeight: 1.5,
		});
		results.add(this.resultsStats);

		this.resultsReward = new Konva.Text({
			y: 382,
			width: STAGE_WIDTH,
			fontSize: 18,
			fontFamily: FONT,
			fontStyle: "bold",
			align: "center",
		});
		results.add(this.resultsReward);

		this.resultsCountdown = new Konva.Text({
			y: 430,
			width: STAGE_WIDTH,
			fontSize: 15,
			fontFamily: FONT,
			fill: COLORS.mutedText,
			align: "center",
		});
		results.add(this.resultsCountdown);

		results.add(this.createButton(STAGE_WIDTH / 2 - 110, 472, 220, 52, "BACK TO FARM", "#c8862e", onContinue));
		return results;
	}

	private createButton(
		x: number,
		y: number,
		width: number,
		height: number,
		label: string,
		color: string,
		onClick: () => void,
	): Konva.Group {
		const button = new Konva.Group({ x: x + width / 2, y: y + height / 2, offsetX: width / 2, offsetY: height / 2 });
		button.add(new Konva.Rect({
			width,
			height,
			fill: color,
			stroke: "#fff3d6",
			strokeWidth: 2,
			cornerRadius: 12,
			shadowColor: "#0d0906",
			shadowOffsetY: 5,
			shadowBlur: 0,
			shadowOpacity: 1,
		}));
		button.add(new Konva.Text({
			width,
			height,
			text: label,
			fontSize: 22,
			fontFamily: TITLE_FONT,
			fill: "white",
			align: "center",
			verticalAlign: "middle",
			listening: false,
		}));
		button.on("click tap", onClick);
		button.on("mouseenter", () => {
			this.setCursor("pointer");
			button.to({ scaleX: 1.06, scaleY: 1.06, duration: 0.1 });
		});
		button.on("mouseleave", () => {
			this.setCursor("default");
			button.to({ scaleX: 1, scaleY: 1, duration: 0.1 });
		});
		return button;
	}

	private setCursor(cursor: string): void {
		const stage = this.group.getStage();
		if (stage) stage.container().style.cursor = cursor;
	}

	// ------------------------------------------------------------------
	// Board setup
	// ------------------------------------------------------------------

	setupBoard(
		layout: number[][],
		playerPosition: { x: number; y: number },
		totalEggs: number,
		timeRemaining: number,
		maxTime: number,
	): void {
		this.allEggsFound = false;
		this.eggNodes.clear();
		this.eggLayer.destroyChildren();
		this.exitGroup.remove();
		this.banner.remove();
		this.goText.remove();
		this.fxLayer.destroyChildren();
		this.fxLayer.add(this.exitGroup, this.banner, this.goText);
		this.banner.visible(false);
		this.goText.visible(false);
		this.world.x(0);

		this.drawMaze(layout);

		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				if (layout[y][x] === TILE_TYPE.EGG) this.addEgg(x, y);
				if (layout[y][x] === TILE_TYPE.EXIT) this.exitGroup.position(tileCenter(x, y));
			}
		}
		this.setExitGlow(false);

		this.moveTween?.destroy();
		this.moveTween = null;
		this.player.position(tileCenter(playerPosition.x, playerPosition.y));
		this.playerBody.position({ x: 0, y: 0 });
		this.playerBody.scaleX(1);

		this.buildEggSlots(totalEggs);
		this.updateTimer(timeRemaining, maxTime);
		this.digTween?.destroy();
		this.digTween = null;
		this.digFill.width(DIG_BAR.width);
		this.digFill.fill(COLORS.good);

		this.resultsGroup.visible(false);
		this.updateFog(0);
	}

	drawMaze(layout: number[][]): void {
		this.mazeLayout = layout;

		if (!this.mazeShape) {
			this.mazeShape = new Konva.Shape({
				width: MAZE_PIXEL_WIDTH,
				height: MAZE_PIXEL_HEIGHT,
				listening: false,
				imageSmoothingEnabled: false,
				sceneFunc: (context, shape) => {
					const ctx = context._context as CanvasRenderingContext2D;
					drawMazeToContext(ctx, this.mazeLayout);
					context.fillStrokeShape(shape);
				},
			});
			this.world.add(this.mazeShape);
			this.mazeShape.moveToBottom();
		} else {
			this.mazeShape.clearCache();
		}

		this.mazeShape.cache({
			x: 0,
			y: 0,
			width: MAZE_PIXEL_WIDTH,
			height: MAZE_PIXEL_HEIGHT,
			pixelRatio: 1,
			imageSmoothingEnabled: false,
		});

		this.group.getLayer()?.batchDraw();
	}

	private addEgg(x: number, y: number): void {
		const center = tileCenter(x, y);
		const egg = createEggShape();
		egg.position({ x: center.x, y: center.y + 1 });
		this.eggLayer.add(egg);

		const sparkle = new Konva.Star({
			x: center.x + 7,
			y: center.y - 10,
			numPoints: 4,
			innerRadius: 1.5,
			outerRadius: 6,
			fill: "#e9fff4",
			shadowColor: "#bfffe6",
			shadowBlur: 8,
			shadowOpacity: 1,
			opacity: 0,
		});
		this.fxLayer.add(sparkle);
		this.eggNodes.set(`${x},${y}`, { egg, sparkle, baseY: center.y + 1, phase: Math.random() * Math.PI * 2 });
	}

	private buildEggSlots(totalEggs: number): void {
		this.hudEggSlots.destroyChildren();
		this.eggSlots = [];
		for (let i = 0; i < totalEggs; i++) {
			const slot = new Konva.Group({ x: 26 + i * 26, y: 25 });
			slot.add(new Konva.Ellipse({ radiusX: 8, radiusY: 11, strokeWidth: 2 }));
			slot.add(new Konva.Ellipse({ x: -3, y: -4, radiusX: 2.5, radiusY: 4, fill: COLORS.eggShine }));
			this.hudEggSlots.add(slot);
			this.eggSlots.push(slot);
		}
		this.eggCountText.x(26 + totalEggs * 26);
		this.shownEggCount = 0;
		this.updateEggCount(0);
	}

	// ------------------------------------------------------------------
	// Gameplay feedback
	// ------------------------------------------------------------------

	movePlayer(x: number, y: number, direction: Direction): void {
		if (direction === "left") this.playerBody.scaleX(-1);
		if (direction === "right") this.playerBody.scaleX(1);

		this.moveTween?.finish();
		this.moveTween?.destroy();
		const target = tileCenter(x, y);
		this.moveTween = new Konva.Tween({
			node: this.player,
			duration: 0.09,
			x: target.x,
			y: target.y,
			easing: Konva.Easings.EaseOut,
		});
		this.moveTween.play();
	}

	bumpPlayer(direction: Direction): void {
		const { dx, dy } = DIRECTION_DELTAS[direction];
		if (direction === "left") this.playerBody.scaleX(-1);
		if (direction === "right") this.playerBody.scaleX(1);
		const nudge = new Konva.Tween({
			node: this.playerBody,
			duration: 0.05,
			x: dx * 5,
			y: dy * 5,
			onFinish: () => nudge.reverse(),
			onReset: () => nudge.destroy(),
		});
		nudge.play();
	}

	collectEgg(x: number, y: number, collected: number): void {
		const key = `${x},${y}`;
		const node = this.eggNodes.get(key);
		const center = tileCenter(x, y);
		if (node) {
			this.eggNodes.delete(key);
			node.sparkle.destroy();
			node.egg.moveTo(this.fxLayer);
			node.egg.to({
				y: node.baseY - 18,
				scaleX: 1.8,
				scaleY: 1.8,
				opacity: 0,
				duration: 0.3,
				onFinish: () => node.egg.destroy(),
			});
		}
		this.burst(center.x, center.y, ["#ffe08a", "#bfffe6", "#ffffff"], 10, 26);
		this.floatText(center.x, center.y - 18, `+1 EGG  +${EGG_TIME_BONUS}s`, "#ffe08a");
		this.updateEggCount(collected);
	}

	breakWalls(cells: { x: number; y: number }[]): void {
		for (const cell of cells) {
			const center = tileCenter(cell.x, cell.y);
			this.burst(center.x, center.y, ["#3a7f37", "#5aa651", "#2e6b2e", "#7a4b22"], 9, 30);
		}
		this.shake();
	}

	showAllEggsFound(): void {
		this.allEggsFound = true;
		this.setExitGlow(true);
		this.banner.text("All eggs found! Run for the flag!");
		this.banner.visible(true);
		this.banner.opacity(0);
		this.banner.to({ opacity: 1, duration: 0.25 });
		window.setTimeout(() => {
			if (!this.banner.visible()) return;
			this.banner.to({ opacity: 0, duration: 0.4, onFinish: () => this.banner.visible(false) });
		}, 2200);
	}

	showGo(): void {
		this.goText.moveToTop();
		this.goText.visible(true);
		this.goText.opacity(1);
		this.goText.scale({ x: 0.4, y: 0.4 });
		this.goText.to({
			scaleX: 1.15,
			scaleY: 1.15,
			duration: 0.25,
			easing: Konva.Easings.BackEaseOut,
			onFinish: () => {
				this.goText.to({ opacity: 0, duration: 0.35, onFinish: () => this.goText.visible(false) });
			},
		});
	}

	flashDigNotReady(): void {
		this.digLabel.fill(COLORS.danger);
		window.setTimeout(() => this.digLabel.fill(COLORS.mutedText), 150);
		this.group.getLayer()?.batchDraw();
	}

	startDigCooldown(durationMs: number): void {
		this.digTween?.destroy();
		this.digFill.width(0);
		this.digFill.fill(COLORS.warn);
		this.digTween = new Konva.Tween({
			node: this.digFill,
			duration: durationMs / 1000,
			width: DIG_BAR.width,
			onFinish: () => this.digFill.fill(COLORS.good),
		});
		this.digTween.play();
	}

	updateEggCount(count: number): void {
		this.eggSlots.forEach((slot, i) => {
			const filled = i < count;
			const shell = slot.children[0] as Konva.Ellipse;
			const shine = slot.children[1] as Konva.Ellipse;
			shell.fill(filled ? COLORS.egg : "rgba(255, 255, 255, 0.05)");
			shell.stroke(filled ? COLORS.gold : "rgba(255, 255, 255, 0.3)");
			shell.dash(filled ? [] : [3, 3]);
			shine.visible(filled);
		});
		if (count > this.shownEggCount && this.eggSlots[count - 1]) {
			const slot = this.eggSlots[count - 1];
			slot.scale({ x: 1.7, y: 1.7 });
			slot.to({ scaleX: 1, scaleY: 1, duration: 0.3, easing: Konva.Easings.BackEaseOut });
		}
		this.shownEggCount = count;
		this.eggCountText.text(`${count}/${this.eggSlots.length}`);
		this.eggCountText.fill(count > 0 && count >= this.eggSlots.length ? COLORS.gold : COLORS.text);
		this.group.getLayer()?.batchDraw();
	}

	updateTimer(timeRemaining: number, maxTime: number): void {
		const ratio = Math.max(0, Math.min(1, timeRemaining / maxTime));
		const color = timeRemaining > 15 ? COLORS.good : timeRemaining > 8 ? COLORS.warn : COLORS.danger;
		this.timerFill.width(Math.max(0, TIMER_BAR.width * ratio));
		this.timerFill.fill(color);
		this.timerText.text(`${Math.max(0, timeRemaining)}s`);
		this.timerText.fill(timeRemaining > 8 ? COLORS.text : COLORS.danger);
		if (timeRemaining > 0 && timeRemaining <= 5) {
			this.timerText.scale({ x: 1.35, y: 1.35 });
			this.timerText.to({ scaleX: 1, scaleY: 1, duration: 0.3 });
		}
		this.group.getLayer()?.batchDraw();
	}

	// ------------------------------------------------------------------
	// Effects
	// ------------------------------------------------------------------

	private burst(x: number, y: number, colors: string[], count: number, spread: number): void {
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
			const distance = spread * (0.5 + Math.random() * 0.6);
			const size = 3 + Math.random() * 3;
			const bit = new Konva.Rect({
				x,
				y,
				width: size,
				height: size,
				offsetX: size / 2,
				offsetY: size / 2,
				fill: colors[i % colors.length],
				rotation: Math.random() * 90,
			});
			this.fxLayer.add(bit);
			bit.to({
				x: x + Math.cos(angle) * distance,
				y: y + Math.sin(angle) * distance + 6,
				rotation: bit.rotation() + 180,
				opacity: 0,
				duration: 0.45,
				easing: Konva.Easings.EaseOut,
				onFinish: () => bit.destroy(),
			});
		}
	}

	private floatText(x: number, y: number, text: string, color: string): void {
		const label = new Konva.Text({
			x,
			y,
			text,
			fontSize: 16,
			fontFamily: TITLE_FONT,
			fill: color,
			stroke: "#2a1a08",
			strokeWidth: 1,
		});
		label.offsetX(label.width() / 2);
		this.fxLayer.add(label);
		label.to({ y: y - 30, opacity: 0, duration: 0.9, onFinish: () => label.destroy() });
	}

	private shake(): void {
		const shake = new Konva.Tween({
			node: this.world,
			duration: 0.04,
			x: 4,
			onFinish: () => shake.reverse(),
			onReset: () => shake.destroy(),
		});
		shake.play();
	}

	private setExitGlow(allEggs: boolean): void {
		this.exitGlow.fill(allEggs ? "rgba(255, 211, 107, 0.5)" : "rgba(255, 120, 80, 0.35)");
		this.exitGlow.shadowColor(allEggs ? COLORS.gold : "#ff7a4a");
	}

	private updateFog(time: number): void {
		const center = { x: this.player.x(), y: this.player.y() };
		const flicker = Math.sin(time * 7) * 3 + Math.sin(time * 13) * 2;
		this.fog.fillRadialGradientStartPoint(center);
		this.fog.fillRadialGradientEndPoint(center);
		this.fog.fillRadialGradientEndRadius(LANTERN_RADIUS + flicker);
	}

	private animate(time: number): void {
		this.updateFog(time);
		this.eggNodes.forEach((node) => {
			node.egg.y(node.baseY + Math.sin(time * 2.4 + node.phase) * 1.5);
			node.sparkle.opacity(Math.max(0, Math.sin(time * 2.2 + node.phase)) ** 3);
			node.sparkle.rotation(time * 90);
		});
		const pulse = Math.sin(time * 4);
		this.exitGlow.opacity((this.allEggsFound ? 0.75 : 0.55) + pulse * 0.25);
		this.exitGlow.radius((this.allEggsFound ? 24 : 19) + pulse * 3);
	}

	// ------------------------------------------------------------------
	// Overlays
	// ------------------------------------------------------------------

	showIntro(): void {
		this.introGroup.visible(true);
		this.introGroup.moveToTop();
		this.group.getLayer()?.batchDraw();
	}

	hideIntro(): void {
		this.introGroup.visible(false);
		this.setCursor("default");
		this.group.getLayer()?.batchDraw();
	}

	showResults(results: RaidResults): void {
		const { didWin, eggsCollected, totalEggs, timeLeft, stars } = results;
		this.resultsTitle.text(didWin ? "RAID SUCCESS!" : "TIME'S UP!");
		this.resultsTitle.fill(didWin ? COLORS.gold : COLORS.danger);
		this.resultsStats.text(`Eggs collected: ${eggsCollected} / ${totalEggs}\nTime left: ${timeLeft}s`);
		if (didWin) {
			this.resultsReward.text(
				eggsCollected > 0
					? `+${eggsCollected} egg${eggsCollected === 1 ? "" : "s"} added to your inventory`
					: "You escaped, but with empty pockets",
			);
			this.resultsReward.fill(eggsCollected > 0 ? COLORS.good : COLORS.mutedText);
		} else {
			this.resultsReward.text("The emus woke up and you dropped every egg");
			this.resultsReward.fill("#e9a07a");
		}

		this.resultStars.forEach((star) => {
			star.fill(COLORS.keycap);
			star.stroke("#6b5640");
			star.scale({ x: 1, y: 1 });
		});
		this.resultStars.slice(0, stars).forEach((star, i) => {
			window.setTimeout(() => {
				if (!this.resultsGroup.visible()) return;
				star.fill(COLORS.gold);
				star.stroke("#e0a63a");
				star.scale({ x: 0.3, y: 0.3 });
				star.to({ scaleX: 1, scaleY: 1, duration: 0.35, easing: Konva.Easings.BackEaseOut });
			}, 250 + i * 220);
		});

		this.resultsGroup.visible(true);
		this.resultsGroup.moveToTop();
		this.group.getLayer()?.batchDraw();
	}

	updateReturnCountdown(seconds: number): void {
		this.resultsCountdown.text(`Back to the farm in ${seconds}   (press Enter to skip)`);
		this.group.getLayer()?.batchDraw();
	}

	// ------------------------------------------------------------------
	// View interface
	// ------------------------------------------------------------------

	show(): void {
		this.group.visible(true);
		this.group.moveToTop();
		const layer = this.group.getLayer();
		if (layer && !this.animation) {
			this.animation = new Konva.Animation((frame) => {
				this.animate((frame?.time ?? 0) / 1000);
			}, layer);
		}
		this.animation?.start();
		layer?.batchDraw();
	}

	hide(): void {
		this.animation?.stop();
		this.group.visible(false);
		this.setCursor("default");
		this.group.getLayer()?.batchDraw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
