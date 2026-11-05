import Konva from "konva";
import type { View } from "../../types";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import { HUNT_AMMO, HUNT_DURATION } from "../HuntingScreen/HuntingScreenModel";
import backgroundSrc from "../../../assets/background.png";
import emuSrc from "../../../assets/Emu.png";

const TITLE_FONT = "Bangers, Impact, Arial Black, sans-serif";
const BODY_FONT = "Nunito, Trebuchet MS, sans-serif";

const COLORS = {
	panel: "#1f2e18",
	panelEdge: "#c8a25a",
	text: "#f3ead2",
	muted: "#b7c4a0",
	gold: "#ffd36b",
	leaf: "#6fbf4a",
	keycap: "#2a3a22",
	keyStroke: "#9bb56a",
};

const PANEL = { x: 80, y: 28, width: 640, height: 644 };
const CONTENT_LEFT = PANEL.x + 48;
const CONTENT_WIDTH = PANEL.width - 96;

const loadImage = (src: string): HTMLImageElement => {
	const image = typeof Image !== "undefined" ? new Image() : document.createElement("img") as HTMLImageElement;
	image.src = src;
	return image;
};

const createKeycap = (x: number, y: number, width: number, label: string): Konva.Group => {
	const group = new Konva.Group({ x, y, listening: false });
	group.add(new Konva.Rect({
		y: 4,
		width,
		height: 40,
		cornerRadius: 8,
		fill: "#121a10",
	}));
	group.add(new Konva.Rect({
		width,
		height: 40,
		cornerRadius: 8,
		fill: COLORS.keycap,
		stroke: COLORS.keyStroke,
		strokeWidth: 2,
	}));
	group.add(new Konva.Text({
		width,
		height: 40,
		text: label,
		fontSize: label.length > 4 ? 15 : 18,
		fontFamily: BODY_FONT,
		fontStyle: "800",
		fill: COLORS.gold,
		align: "center",
		verticalAlign: "middle",
	}));
	return group;
};

export class HuntingIntroScreenView implements View {
	private group: Konva.Group;
	private content: Konva.Group;
	private title: Konva.Text;
	private startButton: Konva.Group;
	private emuBadge: Konva.Group;
	private anim: Konva.Animation | null = null;
	private readonly emuHomeY = 148;

	constructor(onStart: () => void) {
		this.group = new Konva.Group({ visible: false });
		this.content = new Konva.Group();

		const bg = loadImage(backgroundSrc);
		this.group.add(new Konva.Image({ width: STAGE_WIDTH, height: STAGE_HEIGHT, image: bg, listening: false }));
		if (!bg.complete) bg.onload = () => this.group.getLayer()?.batchDraw();
		this.group.add(new Konva.Rect({
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: STAGE_HEIGHT },
			fillLinearGradientColorStops: [0, "rgba(18, 42, 28, 0.72)", 0.55, "rgba(28, 48, 20, 0.78)", 1, "rgba(12, 18, 8, 0.88)"],
			listening: false,
		}));

		this.content.add(new Konva.Rect({
			...PANEL,
			cornerRadius: 28,
			fill: COLORS.panel,
			stroke: COLORS.panelEdge,
			strokeWidth: 3,
			shadowColor: "#000",
			shadowBlur: 28,
			shadowOpacity: 0.55,
			listening: false,
		}));
		this.content.add(new Konva.Rect({
			x: PANEL.x + 12,
			y: PANEL.y + 12,
			width: PANEL.width - 24,
			height: PANEL.height - 24,
			cornerRadius: 22,
			stroke: "rgba(111, 191, 74, 0.28)",
			strokeWidth: 2,
			listening: false,
		}));

		this.title = new Konva.Text({
			x: CONTENT_LEFT,
			y: 48,
			width: CONTENT_WIDTH,
			text: "EMU HUNT",
			fontSize: 56,
			fontFamily: TITLE_FONT,
			fill: COLORS.gold,
			align: "center",
			letterSpacing: 3,
			stroke: "#2a1804",
			strokeWidth: 5,
			fillAfterStrokeEnabled: true,
			shadowColor: "#6fbf4a",
			shadowBlur: 18,
			shadowOpacity: 0.55,
			listening: false,
		});
		this.content.add(this.title);

		this.emuBadge = new Konva.Group({ x: STAGE_WIDTH / 2, y: this.emuHomeY });
		this.emuBadge.add(new Konva.Circle({
			radius: 34,
			fillLinearGradientStartPoint: { x: 0, y: -34 },
			fillLinearGradientEndPoint: { x: 0, y: 34 },
			fillLinearGradientColorStops: [0, "#3f6b2e", 1, "#1d3418"],
			stroke: COLORS.gold,
			strokeWidth: 3,
			shadowColor: "#6fbf4a",
			shadowBlur: 14,
			shadowOpacity: 0.45,
		}));
		const emu = loadImage(emuSrc);
		this.emuBadge.add(new Konva.Image({ x: -24, y: -24, width: 48, height: 48, image: emu, listening: false }));
		if (!emu.complete) emu.onload = () => this.group.getLayer()?.batchDraw();
		this.content.add(this.emuBadge);

		this.content.add(new Konva.Text({
			x: CONTENT_LEFT,
			y: 196,
			width: CONTENT_WIDTH,
			text: "A mob is nesting in the scrub.\nClear every emu before time or ammo runs out.",
			fontSize: 16,
			fontFamily: BODY_FONT,
			fontStyle: "600",
			fill: COLORS.text,
			align: "center",
			lineHeight: 1.25,
			listening: false,
		}));

		this.content.add(new Konva.Text({
			x: CONTENT_LEFT,
			y: 248,
			width: CONTENT_WIDTH,
			text: "CONTROLS",
			fontSize: 14,
			fontFamily: BODY_FONT,
			fontStyle: "800",
			letterSpacing: 4,
			fill: COLORS.leaf,
			align: "center",
			listening: false,
		}));

		this.content.add(createKeycap(248, 274, 42, "W"));
		this.content.add(createKeycap(198, 320, 42, "A"));
		this.content.add(createKeycap(248, 320, 42, "S"));
		this.content.add(createKeycap(298, 320, 42, "D"));
		this.content.add(createKeycap(430, 320, 160, "SPACE"));

		this.content.add(new Konva.Text({
			x: 170,
			y: 372,
			width: 200,
			text: "Move  ·  or arrow keys",
			fontSize: 14,
			fontFamily: BODY_FONT,
			fontStyle: "700",
			fill: COLORS.text,
			align: "center",
			listening: false,
		}));
		this.content.add(new Konva.Text({
			x: 400,
			y: 372,
			width: 220,
			text: "Shoot  ·  3 hits per emu",
			fontSize: 14,
			fontFamily: BODY_FONT,
			fontStyle: "700",
			fill: COLORS.text,
			align: "center",
			listening: false,
		}));

		this.content.add(new Konva.Text({
			x: CONTENT_LEFT,
			y: 410,
			width: CONTENT_WIDTH,
			text: "OBJECTIVE",
			fontSize: 14,
			fontFamily: BODY_FONT,
			fontStyle: "800",
			letterSpacing: 4,
			fill: COLORS.leaf,
			align: "center",
			listening: false,
		}));

		const durationLabel = `${Math.floor(HUNT_DURATION / 60)}:${(HUNT_DURATION % 60).toString().padStart(2, "0")}`;
		const objectives: { draw: (g: Konva.Group) => void; text: string }[] = [
			{
				draw: (g) => {
					g.add(new Konva.Circle({ radius: 10, fill: "#3a2412", stroke: COLORS.gold, strokeWidth: 2 }));
					g.add(new Konva.Circle({ x: 0, y: -1, radius: 4, fill: COLORS.gold }));
				},
				text: `Clear the mob before ${durationLabel} runs out`,
			},
			{
				draw: (g) => {
					g.add(new Konva.Ellipse({ radiusX: 12, radiusY: 8, fill: "#6b7a4a", stroke: "#314022", strokeWidth: 1.5 }));
					g.add(new Konva.Circle({ x: -4, y: -2, radius: 3, fill: "#8fa86a" }));
				},
				text: "Rocks and bushes block movement and shots",
			},
			{
				draw: (g) => {
					g.add(new Konva.Rect({ x: -10, y: -4, width: 18, height: 8, cornerRadius: 3, fill: "#c9a66b", stroke: "#5a4020", strokeWidth: 1.5 }));
					g.add(new Konva.Circle({ x: 10, y: 0, radius: 4, fill: "#ff8a4a" }));
				},
				text: `${HUNT_AMMO} ammo. Make every shot count`,
			},
		];
		objectives.forEach((objective, i) => {
			const rowY = 440 + i * 32;
			const icon = new Konva.Group({ x: CONTENT_LEFT + 18, y: rowY + 10, listening: false });
			objective.draw(icon);
			this.content.add(icon);
			this.content.add(new Konva.Text({
				x: CONTENT_LEFT + 44,
				y: rowY + 2,
				width: CONTENT_WIDTH - 56,
				text: objective.text,
				fontSize: 16,
				fontFamily: BODY_FONT,
				fontStyle: "600",
				fill: COLORS.text,
				listening: false,
			}));
		});

		// Last objective ends ~440+64+20 = 524. Leave a clear gap before the CTA.
		this.startButton = this.createStartButton(onStart);
		this.content.add(this.startButton);
		this.content.add(new Konva.Text({
			x: CONTENT_LEFT,
			y: 612,
			width: CONTENT_WIDTH,
			text: "or press Enter",
			fontSize: 13,
			fontFamily: BODY_FONT,
			fontStyle: "600",
			fill: COLORS.muted,
			align: "center",
			listening: false,
		}));

		this.group.add(this.content);
	}

	private createStartButton(onStart: () => void): Konva.Group {
		const width = 280;
		const height = 56;
		const button = new Konva.Group({
			x: STAGE_WIDTH / 2,
			y: 568,
			offsetX: width / 2,
			offsetY: height / 2,
		});
		button.add(new Konva.Rect({
			y: 5,
			width,
			height,
			cornerRadius: 14,
			fill: "#145224",
		}));
		button.add(new Konva.Rect({
			width,
			height,
			cornerRadius: 14,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: height },
			fillLinearGradientColorStops: [0, "#58d36a", 1, "#2fa84f"],
			stroke: "#fff3d6",
			strokeWidth: 2,
		}));
		button.add(new Konva.Text({
			width,
			height,
			text: "START HUNT",
			fontSize: 28,
			fontFamily: TITLE_FONT,
			fill: "#ffffff",
			align: "center",
			verticalAlign: "middle",
			letterSpacing: 2,
			shadowColor: "#145224",
			shadowBlur: 0,
			shadowOffsetY: 2,
			shadowOpacity: 0.8,
			listening: false,
		}));
		button.on("click tap", onStart);
		button.on("mouseenter", () => {
			const stage = this.group.getStage();
			if (stage) stage.container().style.cursor = "pointer";
			button.to({ scaleX: 1.06, scaleY: 1.06, duration: 0.12 });
		});
		button.on("mouseleave", () => {
			const stage = this.group.getStage();
			if (stage) stage.container().style.cursor = "default";
			button.to({ scaleX: 1, scaleY: 1, duration: 0.12 });
		});
		return button;
	}

	show(): void {
		this.group.visible(true);
		this.title.opacity(0);
		this.title.scale({ x: 1.35, y: 1.35 });
		this.title.to({
			opacity: 1,
			scaleX: 1,
			scaleY: 1,
			duration: 0.4,
			easing: Konva.Easings.BackEaseOut,
		});
		this.emuBadge.scale({ x: 0.6, y: 0.6 });
		this.emuBadge.to({
			scaleX: 1,
			scaleY: 1,
			duration: 0.35,
			easing: Konva.Easings.EaseOut,
		});
		this.startButton.scale({ x: 0.92, y: 0.92 });
		this.startButton.to({
			scaleX: 1,
			scaleY: 1,
			duration: 0.25,
			easing: Konva.Easings.BackEaseOut,
		});

		this.anim?.stop();
		this.anim = new Konva.Animation((frame) => {
			if (!frame) return;
			const bob = Math.sin(frame.time / 280) * 3;
			this.emuBadge.y(this.emuHomeY + bob);
		}, this.group.getLayer());
		this.anim.start();
		this.group.getLayer()?.draw();
	}

	hide(): void {
		this.anim?.stop();
		this.anim = null;
		this.group.visible(false);
		this.group.getLayer()?.draw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
