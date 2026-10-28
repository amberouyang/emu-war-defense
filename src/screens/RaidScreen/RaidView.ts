import Konva from "konva";
import type { View } from "../../types";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import { TILE_TYPE, MAZE_WIDTH, MAZE_HEIGHT } from "./RaidModel";

// Integer tile size so the maze maps to exact pixels (20x15 @ 40px = 800x600).
const TILE_SIZE = 40;
const MAZE_PIXEL_WIDTH = MAZE_WIDTH * TILE_SIZE;
const MAZE_PIXEL_HEIGHT = MAZE_HEIGHT * TILE_SIZE;
const MAZE_OFFSET_Y = (STAGE_HEIGHT - MAZE_PIXEL_HEIGHT) / 2;

const TILE_COLORS: Record<number, string> = {
	[TILE_TYPE.PATH]: "#8B4513",
	[TILE_TYPE.WALL]: "#348C31",
	[TILE_TYPE.START]: "#90EE90",
	[TILE_TYPE.EXIT]: "#FF6347",
	[TILE_TYPE.EGG]: "#8B4513",
};

function hexToRgb(hex: string): [number, number, number] {
	const value = parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const TILE_RGB: Record<number, [number, number, number]> = {
	[TILE_TYPE.PATH]: hexToRgb(TILE_COLORS[TILE_TYPE.PATH]),
	[TILE_TYPE.WALL]: hexToRgb(TILE_COLORS[TILE_TYPE.WALL]),
	[TILE_TYPE.START]: hexToRgb(TILE_COLORS[TILE_TYPE.START]),
	[TILE_TYPE.EXIT]: hexToRgb(TILE_COLORS[TILE_TYPE.EXIT]),
	[TILE_TYPE.EGG]: hexToRgb(TILE_COLORS[TILE_TYPE.EGG]),
};

function tileRgb(type: number): [number, number, number] {
	return TILE_RGB[type] ?? TILE_RGB[TILE_TYPE.PATH];
}

function drawMazeToContext(
	ctx: CanvasRenderingContext2D,
	layout: number[][],
): void {
	ctx.imageSmoothingEnabled = false;

	// Write each pixel exactly once so no tile seams can appear.
	const imageData = ctx.createImageData(MAZE_PIXEL_WIDTH, MAZE_PIXEL_HEIGHT);
	const { data } = imageData;

	for (let y = 0; y < MAZE_HEIGHT; y++) {
		for (let x = 0; x < MAZE_WIDTH; x++) {
			const type = layout[y][x];
			const tileType =
				type === TILE_TYPE.EGG ? TILE_TYPE.PATH : type;
			const [r, g, b] = tileRgb(tileType);
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
			if (layout[y][x] !== TILE_TYPE.EGG) continue;

			const cx = x * TILE_SIZE + TILE_SIZE / 2;
			const cy = y * TILE_SIZE + TILE_SIZE / 2;
			ctx.fillStyle = "#FFFACD";
			ctx.beginPath();
			ctx.ellipse(
				cx,
				cy,
				TILE_SIZE / 4,
				TILE_SIZE / 3,
				0,
				0,
				Math.PI * 2,
			);
			ctx.fill();
		}
	}

	ctx.fillStyle = "rgba(25, 25, 112, 0.3)";
	ctx.fillRect(0, 0, MAZE_PIXEL_WIDTH, MAZE_PIXEL_HEIGHT);
}

export class RaidView implements View {
	private group: Konva.Group;
	private timerText: Konva.Text;
	private eggCountText: Konva.Text;
	private player: Konva.Rect;
	private mazeGroup: Konva.Group;
	private mazeShape: Konva.Shape | null = null;
	private mazeLayout: number[][] = [];
	
	// Popups
	private popupGroup: Konva.Group;
	private popupText: Konva.Text;
	private popupBg: Konva.Rect;

	// Intro Screen
	private introGroup: Konva.Group;

	constructor(onIntroStartClick: () => void) {
		this.group = new Konva.Group({ visible: false });

		// Opaque backdrop so nothing white bleeds through at tile seams.
		this.group.add(new Konva.Rect({
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "#2a1f14",
			listening: false,
		}));

		this.mazeGroup = new Konva.Group({ y: MAZE_OFFSET_Y });
		this.group.add(this.mazeGroup);

		// Timer UI
		this.timerText = new Konva.Text({
			x: STAGE_WIDTH - 150,
			y: 10,
			text: "Time: 30",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
		});
		this.group.add(this.timerText);

		// Egg Count UI
		this.eggCountText = new Konva.Text({
			x: 20,
			y: 10,
			text: "Eggs: 0",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
		});
		this.group.add(this.eggCountText);

		// Player
		this.player = new Konva.Rect({
			x: 0,
			y: 0,
			width: TILE_SIZE * 0.7,
			height: TILE_SIZE * 0.7,
			fill: "#4169E1",
		});
		this.group.add(this.player);

		// --- End Game Popup Group ---
		this.popupGroup = new Konva.Group({
			x: STAGE_WIDTH / 2 - 200,
			y: STAGE_HEIGHT / 2 - 100,
			visible: false,
		});
		this.popupBg = new Konva.Rect({
			width: 400,
			height: 200,
			fill: "black",
			stroke: "white",
			strokeWidth: 4,
			cornerRadius: 10,
			shadowColor: "black",
			shadowBlur: 10,
			shadowOpacity: 0.5,
		});
		this.popupText = new Konva.Text({
			width: 400,
			height: 200,
			text: "",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			align: "center",
			verticalAlign: "middle",
			padding: 20,
		});
		this.popupGroup.add(this.popupBg);
		this.popupGroup.add(this.popupText);
		this.group.add(this.popupGroup);

		// --- Intro Screen Group ---
		this.introGroup = new Konva.Group({ visible: false });
		
		// Intro Background (Dark Overlay)
		const introBg = new Konva.Rect({
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "rgba(0, 0, 0, 0.90)", // Slightly darker for readability
		});
		this.introGroup.add(introBg);

		// Intro Text (Moved UP to y: 30 to make room)
		const introText = new Konva.Text({
			x: STAGE_WIDTH / 2,
			y: 30, 
			text: "NIGHT RAID\n\nInfiltrate the Emu Nest!\n\nControls:\n[W, A, S, D] to Move\n[SPACE] to Break Walls\n\nCollect 5 Eggs and reach the RED EXIT\nbefore time runs out!",
			fontSize: 28,
			fontFamily: "Arial",
			fill: "white",
			align: "center",
			lineHeight: 1.5,
		});
		introText.offsetX(introText.width() / 2);
		this.introGroup.add(introText);

		// Start Button (Moved DOWN to y: 480 to avoid overlap)
		const startBtnGroup = new Konva.Group({
			x: STAGE_WIDTH / 2 - 100,
			y: 480,
		});
		const startBtnRect = new Konva.Rect({
			width: 200,
			height: 60,
			fill: "green",
			cornerRadius: 10,
			stroke: "white",
			strokeWidth: 2,
			cursor: "pointer",
		});
		const startBtnText = new Konva.Text({
			width: 200,
			height: 60,
			text: "START RAID",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			align: "center",
			verticalAlign: "middle",
			listening: false,
		});
		
		startBtnGroup.add(startBtnRect);
		startBtnGroup.add(startBtnText);
		startBtnRect.on("click", onIntroStartClick);
		
		startBtnRect.on("mouseenter", () => {
			const stage = this.group.getStage();
			if (stage) stage.container().style.cursor = "pointer";
		});
		startBtnRect.on("mouseleave", () => {
			const stage = this.group.getStage();
			if (stage) stage.container().style.cursor = "default";
		});

		this.introGroup.add(startBtnGroup);
		this.group.add(this.introGroup);
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
			this.mazeGroup.add(this.mazeShape);
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

		this.mazeGroup.getLayer()?.batchDraw();
	}

	updatePlayerPosition(x: number, y: number): void {
		this.player.x(x * TILE_SIZE + (TILE_SIZE - this.player.width()) / 2);
		this.player.y(
			MAZE_OFFSET_Y + y * TILE_SIZE + (TILE_SIZE - this.player.height()) / 2,
		);
		this.group.getLayer()?.draw();
	}

	updateTimer(t: number): void {
		this.timerText.text(`Time: ${t}`);
		this.group.getLayer()?.draw();
	}

	updateEggCount(c: number): void {
		this.eggCountText.text(`Eggs: ${c}`);
		this.group.getLayer()?.draw();
	}

	showEndPopup(message: string): void {
		this.popupText.text(message);
		this.popupGroup.visible(true);
		this.popupGroup.moveToTop();
		this.group.getLayer()?.draw();
	}

	// --- Intro Screen Methods ---
	showIntro(): void {
		this.introGroup.visible(true);
		this.introGroup.moveToTop();
		this.group.getLayer()?.draw();
	}

	hideIntro(): void {
		this.introGroup.visible(false);
		this.group.getLayer()?.draw();
	}

	show(): void {
		this.group.visible(true);
		this.popupGroup.visible(false);
		this.group.moveToTop();
		this.group.getLayer()?.draw();
	}

	hide(): void {
		this.group.visible(false);
		this.group.getLayer()?.draw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}