import Konva from "konva";
import type { View } from "../../types.ts";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../../constants.ts";
import backgroundSrc from "../../../assets/background.png";
import emuSrc from "../../../assets/Emu.png";

const TITLE_FONT = "Arial Black, Arial";
const FONT = "Arial";

const BUTTON_WIDTH = 300;
const BUTTON_HEIGHT = 72;
const BUTTON_X = STAGE_WIDTH / 2 - BUTTON_WIDTH / 2;
const BUTTON_Y = [268, 362];

const EMU_LANES = [616, 632, 648, 664];
const EMU_SIZE = 74;
const FACT_INTERVAL_MS = 5000;

const FACTS = [
	"In 1932, thousands of emus raided Western Australia's wheat farms.",
	"Emus can sprint at up to 50 km/h.",
	"The army brought machine guns to the Emu War. The emus mostly won.",
	"Emus are the second largest birds in the world, after the ostrich.",
	"Emu eggs are a deep green, not white.",
];

const COLORS = {
	plank: "#7a4a22",
	plankDark: "#4a2a10",
	plankText: "#ffe9b8",
	gold: "#ffd23f",
	pill: "rgba(20, 12, 4, 0.55)",
};

export type ContinueInfo = {
	day: number;
	score: number;
	eggs: number;
};

export type BestRun = {
	score: number;
	days: number;
};

type MenuButton = {
	group: Konva.Group;
	face: Konva.Rect;
	subtitle: Konva.Text;
	onClick: () => void;
};

type RunningEmu = {
	node: Konva.Group;
	sprite: Konva.Image;
	x: number;
	speed: number;
	delay: number;
	phase: number;
	fleeing: boolean;
	hopStart: number;
};

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

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

export class MainMenuScreenView implements View {
	private group: Konva.Group;
	private background: Konva.Image;
	private animation: Konva.Animation | null = null;
	private backgroundPhase = 0;
	private elapsed = 0;

	private title: Konva.Group;
	private buttons: MenuButton[] = [];
	private selectedIndex = 0;
	private cursor: Konva.Group;
	private isPressing = false;

	private bestRunText: Konva.Text;
	private shooBadge: Konva.Group;
	private shooText: Konva.Text;
	private shooCount = 0;

	private factText: Konva.Text;
	private factIndex = 0;
	private factTimer: number | null = null;

	private emuImage: HTMLImageElement;
	private emus: RunningEmu[] = [];
	private wheat: Konva.Group[] = [];

	private onEmuShoo: () => void;

	constructor(
		onNewGameClick: () => void,
		onContinueClick: () => void,
		onEmuShoo: () => void = () => {},
	) {
		this.onEmuShoo = onEmuShoo;
		this.group = new Konva.Group({ visible: true });

		const bgImage = loadImage(backgroundSrc);
		this.background = new Konva.Image({
			x: -20,
			y: -20,
			width: STAGE_WIDTH + 40,
			height: STAGE_HEIGHT + 40,
			image: bgImage,
			listening: false,
		});
		if (bgImage.complete) {
			this.background.image(bgImage);
		} else {
			bgImage.onload = () => {
				this.background.image(bgImage);
				this.group.getLayer()?.batchDraw();
			};
		}
		this.group.add(this.background);

		this.emuImage = loadImage(emuSrc);
		this.emuImage.onload = () => this.group.getLayer()?.batchDraw();

		this.title = this.createTitle();
		this.group.add(this.title);

		this.buttons = [
			this.createButton(0, "NEW GAME", "Start fresh on Day 1", "#3f9b3a", "#24601f", onNewGameClick),
			this.createButton(1, "CONTINUE", "No saved farm yet", "#2f6fc4", "#1a427a", onContinueClick),
		];
		this.cursor = this.createCursor();
		this.group.add(this.cursor);

		this.group.add(this.createPill(STAGE_WIDTH / 2, 470, "Arrow keys to choose      Enter to play      Psst, try clicking the emus", 14));

		this.factText = new Konva.Text({
			x: STAGE_WIDTH / 2 - 310,
			y: 520,
			width: 620,
			text: "",
			fontSize: 15,
			fontFamily: FONT,
			fill: "#fff6df",
			align: "center",
			listening: false,
		});
		this.group.add(new Konva.Rect({
			x: STAGE_WIDTH / 2 - 325,
			y: 508,
			width: 650,
			height: 40,
			fill: COLORS.pill,
			cornerRadius: 20,
			listening: false,
		}));
		this.group.add(this.factText);

		this.bestRunText = new Konva.Text({});
		this.group.add(this.createBestRunBadge());

		this.shooText = new Konva.Text({});
		this.shooBadge = this.createShooBadge();
		this.group.add(this.shooBadge);

		this.createEmus();
		this.createWheat();

		this.setSelected(0);
		this.showFact(0);
	}

	// ------------------------------------------------------------------
	// Construction helpers
	// ------------------------------------------------------------------

	private createTitle(): Konva.Group {
		const title = new Konva.Group({ x: STAGE_WIDTH / 2, y: 0, listening: false });

		const ribbon = new Konva.Group({ y: 80 });
		const ribbonWidth = 320;
		const tail = 18;
		ribbon.add(new Konva.Line({
			points: [-ribbonWidth / 2 - tail, 4, -ribbonWidth / 2 + 6, 4, -ribbonWidth / 2 + 6, 34, -ribbonWidth / 2 - tail, 34, -ribbonWidth / 2 - 10, 19],
			closed: true,
			fill: COLORS.plankDark,
		}));
		ribbon.add(new Konva.Line({
			points: [ribbonWidth / 2 + tail, 4, ribbonWidth / 2 - 6, 4, ribbonWidth / 2 - 6, 34, ribbonWidth / 2 + tail, 34, ribbonWidth / 2 + 10, 19],
			closed: true,
			fill: COLORS.plankDark,
		}));
		ribbon.add(new Konva.Rect({
			x: -ribbonWidth / 2,
			width: ribbonWidth,
			height: 32,
			fill: COLORS.plank,
			stroke: COLORS.plankDark,
			strokeWidth: 2,
			cornerRadius: 4,
		}));
		ribbon.add(new Konva.Text({
			x: -ribbonWidth / 2,
			width: ribbonWidth,
			height: 32,
			text: "THE GREAT EMU WAR OF 1932",
			fontSize: 14,
			fontFamily: FONT,
			fontStyle: "bold",
			letterSpacing: 1,
			fill: COLORS.plankText,
			align: "center",
			verticalAlign: "middle",
		}));
		title.add(ribbon);

		const heading = new Konva.Text({
			y: 118,
			text: "FARM DEFENSE",
			fontSize: 74,
			fontFamily: TITLE_FONT,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: 74 },
			fillLinearGradientColorStops: [0, "#fff3b0", 0.5, COLORS.gold, 1, "#f08a1a"],
			stroke: "#4a2608",
			strokeWidth: 8,
			fillAfterStrokeEnabled: true,
			lineJoin: "round",
			shadowColor: "#2a1404",
			shadowOffsetY: 6,
			shadowBlur: 0,
			shadowOpacity: 0.7,
		});
		heading.offsetX(heading.width() / 2);
		title.add(heading);

		const tagline = new Konva.Text({
			y: 202,
			text: "Defend your wheat. Outlast the emus.",
			fontSize: 20,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: "#fffaf0",
			shadowColor: "#2a1404",
			shadowBlur: 6,
			shadowOpacity: 0.9,
		});
		tagline.offsetX(tagline.width() / 2);
		title.add(tagline);

		return title;
	}

	private createButton(
		index: number,
		label: string,
		subtitle: string,
		color: string,
		lipColor: string,
		onClick: () => void,
	): MenuButton {
		const group = new Konva.Group({
			x: BUTTON_X + BUTTON_WIDTH / 2,
			y: BUTTON_Y[index] + BUTTON_HEIGHT / 2,
			offsetX: BUTTON_WIDTH / 2,
			offsetY: BUTTON_HEIGHT / 2,
		});
		group.add(new Konva.Rect({
			y: 6,
			width: BUTTON_WIDTH,
			height: BUTTON_HEIGHT,
			fill: lipColor,
			cornerRadius: 16,
		}));
		const face = new Konva.Rect({
			width: BUTTON_WIDTH,
			height: BUTTON_HEIGHT,
			fill: color,
			stroke: "#fff3d6",
			strokeWidth: 3,
			cornerRadius: 16,
			shadowColor: COLORS.gold,
			shadowBlur: 0,
			shadowOpacity: 0,
		});
		group.add(face);
		group.add(new Konva.Rect({
			x: 10,
			y: 6,
			width: BUTTON_WIDTH - 20,
			height: 14,
			fill: "rgba(255, 255, 255, 0.18)",
			cornerRadius: 7,
			listening: false,
		}));
		group.add(new Konva.Text({
			y: 12,
			width: BUTTON_WIDTH,
			text: label,
			fontSize: 28,
			fontFamily: TITLE_FONT,
			fill: "white",
			align: "center",
			shadowColor: "#000",
			shadowOffsetY: 2,
			shadowBlur: 0,
			shadowOpacity: 0.35,
			listening: false,
		}));
		const subtitleText = new Konva.Text({
			y: 46,
			width: BUTTON_WIDTH,
			text: subtitle,
			fontSize: 14,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: "rgba(255, 255, 255, 0.85)",
			align: "center",
			listening: false,
		});
		group.add(subtitleText);

		group.on("mouseenter", () => {
			this.setCursorStyle("pointer");
			this.setSelected(index);
		});
		group.on("mouseleave", () => this.setCursorStyle("default"));
		group.on("click tap", () => this.activate(index));

		this.group.add(group);
		return { group, face, subtitle: subtitleText, onClick };
	}

	private createCursor(): Konva.Group {
		const cursor = new Konva.Group({ x: BUTTON_X - 34, y: BUTTON_Y[0] + BUTTON_HEIGHT / 2, listening: false });
		cursor.add(new Konva.Ellipse({
			radiusX: 12,
			radiusY: 15,
			fill: "#2f6f5e",
			stroke: COLORS.gold,
			strokeWidth: 2.5,
		}));
		cursor.add(new Konva.Ellipse({
			x: -4,
			y: -5,
			radiusX: 3.5,
			radiusY: 5.5,
			fill: "rgba(200, 255, 230, 0.6)",
		}));
		return cursor;
	}

	private createPill(centerX: number, y: number, text: string, fontSize: number): Konva.Group {
		const pill = new Konva.Group({ listening: false });
		const label = new Konva.Text({
			y: y + 8,
			text,
			fontSize,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: "#fff6df",
		});
		label.x(centerX - label.width() / 2);
		pill.add(new Konva.Rect({
			x: label.x() - 18,
			y,
			width: label.width() + 36,
			height: fontSize + 16,
			fill: COLORS.pill,
			cornerRadius: (fontSize + 16) / 2,
		}));
		pill.add(label);
		return pill;
	}

	private createPlank(x: number, y: number, width: number, height: number): Konva.Group {
		const plank = new Konva.Group({ x, y, listening: false });
		plank.add(new Konva.Rect({ y: 4, width, height, fill: COLORS.plankDark, cornerRadius: 10 }));
		plank.add(new Konva.Rect({
			width,
			height,
			fill: COLORS.plank,
			stroke: COLORS.plankDark,
			strokeWidth: 2,
			cornerRadius: 10,
		}));
		for (const nx of [8, width - 12]) {
			plank.add(new Konva.Circle({ x: nx + 2, y: height / 2, radius: 2.5, fill: "#c9a46a" }));
		}
		return plank;
	}

	private createBestRunBadge(): Konva.Group {
		const badge = this.createPlank(STAGE_WIDTH - 216, 16, 200, 54);
		badge.add(new Konva.Star({
			x: 34,
			y: 27,
			numPoints: 5,
			innerRadius: 7,
			outerRadius: 15,
			fill: COLORS.gold,
			stroke: "#b8741a",
			strokeWidth: 2,
		}));
		badge.add(new Konva.Text({
			x: 58,
			y: 10,
			text: "BEST RUN",
			fontSize: 12,
			fontFamily: FONT,
			fontStyle: "bold",
			letterSpacing: 2,
			fill: "#e8c890",
		}));
		this.bestRunText = new Konva.Text({
			x: 58,
			y: 26,
			text: "No runs yet",
			fontSize: 17,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.plankText,
		});
		badge.add(this.bestRunText);
		return badge;
	}

	private createShooBadge(): Konva.Group {
		const badge = this.createPlank(16, 16, 176, 54);
		badge.visible(false);
		const emu = new Konva.Image({ image: this.emuImage, x: 12, y: 6, width: 40, height: 40 });
		badge.add(emu);
		badge.add(new Konva.Text({
			x: 58,
			y: 10,
			text: "EMUS SHOOED",
			fontSize: 12,
			fontFamily: FONT,
			fontStyle: "bold",
			letterSpacing: 2,
			fill: "#e8c890",
		}));
		this.shooText = new Konva.Text({
			x: 58,
			y: 26,
			text: "0",
			fontSize: 18,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.plankText,
		});
		badge.add(this.shooText);
		return badge;
	}

	private createEmus(): void {
		EMU_LANES.forEach((laneY, i) => {
			const scale = 0.75 + (i / EMU_LANES.length) * 0.4;
			const node = new Konva.Group({ y: laneY, scaleX: scale, scaleY: scale });
			node.add(new Konva.Ellipse({ y: -2, radiusX: 22, radiusY: 5, fill: "rgba(60, 35, 10, 0.3)", listening: false }));
			const sprite = new Konva.Image({
				image: this.emuImage,
				width: EMU_SIZE,
				height: EMU_SIZE,
				offsetX: EMU_SIZE / 2,
				offsetY: EMU_SIZE,
			});
			node.add(sprite);
			const emu: RunningEmu = {
				node,
				sprite,
				x: 0,
				speed: 0,
				delay: 0,
				phase: Math.random() * Math.PI * 2,
				fleeing: false,
				hopStart: 0,
			};
			this.respawnEmu(emu, i * 1500);
			emu.x = randomBetween(80, STAGE_WIDTH - 80);
			node.x(emu.x);

			node.on("mouseenter", () => this.setCursorStyle("pointer"));
			node.on("mouseleave", () => this.setCursorStyle("default"));
			node.on("click tap", () => this.shooEmu(emu));

			this.group.add(node);
			this.emus.push(emu);
		});
	}

	private createWheat(): void {
		const count = 48;
		for (let i = 0; i < count; i++) {
			const x = (i / (count - 1)) * STAGE_WIDTH + randomBetween(-6, 6);
			const height = randomBetween(30, 58);
			const stalk = new Konva.Group({ x, y: STAGE_HEIGHT + 4, listening: false });
			stalk.add(new Konva.Line({
				points: [0, 0, 0, -height],
				stroke: "#b98a2e",
				strokeWidth: 2,
				lineCap: "round",
			}));
			for (let g = 0; g < 4; g++) {
				for (const side of [-1, 1]) {
					stalk.add(new Konva.Ellipse({
						x: side * 3,
						y: -height + g * 6,
						radiusX: 2.5,
						radiusY: 5,
						rotation: side * 25,
						fill: "#e8c25a",
						stroke: "#a77f26",
						strokeWidth: 0.5,
					}));
				}
			}
			stalk.add(new Konva.Ellipse({ y: -height - 4, radiusX: 2.2, radiusY: 5, fill: "#f0cf6a" }));
			this.group.add(stalk);
			this.wheat.push(stalk);
		}
	}

	// ------------------------------------------------------------------
	// Interaction
	// ------------------------------------------------------------------

	moveSelection(step: number): void {
		const count = this.buttons.length;
		this.setSelected((this.selectedIndex + step + count) % count);
	}

	activateSelected(): void {
		this.activate(this.selectedIndex);
	}

	private setSelected(index: number): void {
		this.selectedIndex = index;
		this.buttons.forEach((button, i) => {
			const selected = i === index;
			button.face.stroke(selected ? COLORS.gold : "#fff3d6");
			button.face.strokeWidth(selected ? 4 : 3);
			button.face.shadowOpacity(selected ? 1 : 0);
			button.group.to({
				scaleX: selected ? 1.05 : 1,
				scaleY: selected ? 1.05 : 1,
				duration: 0.12,
			});
		});
		this.cursor.to({
			x: BUTTON_X - 34,
			y: BUTTON_Y[index] + BUTTON_HEIGHT / 2,
			duration: 0.15,
			easing: Konva.Easings.EaseOut,
		});
	}

	private activate(index: number): void {
		if (this.isPressing) return;
		this.isPressing = true;
		this.setSelected(index);
		const button = this.buttons[index];
		button.group.to({
			scaleX: 0.94,
			scaleY: 0.94,
			duration: 0.07,
			onFinish: () => {
				button.group.to({
					scaleX: 1.05,
					scaleY: 1.05,
					duration: 0.07,
					onFinish: () => {
						this.isPressing = false;
						this.setCursorStyle("default");
						button.onClick();
					},
				});
			},
		});
	}

	private shooEmu(emu: RunningEmu): void {
		if (emu.fleeing || emu.delay > 0) return;
		emu.fleeing = true;
		emu.speed *= 3;
		emu.hopStart = this.elapsed;

		this.shooCount++;
		this.shooText.text(String(this.shooCount));
		if (!this.shooBadge.visible()) {
			this.shooBadge.visible(true);
			this.shooBadge.opacity(0);
			this.shooBadge.to({ opacity: 1, duration: 0.25 });
		}
		this.shooText.scale({ x: 1.5, y: 1.5 });
		this.shooText.to({ scaleX: 1, scaleY: 1, duration: 0.25, easing: Konva.Easings.BackEaseOut });

		const squawk = new Konva.Text({
			x: emu.x,
			y: emu.node.y() - EMU_SIZE * emu.node.scaleY() - 10,
			text: Math.random() < 0.5 ? "SQUAWK!" : "BWAAK!",
			fontSize: 22,
			fontFamily: TITLE_FONT,
			fill: "#fff3b0",
			stroke: "#4a2608",
			strokeWidth: 4,
			fillAfterStrokeEnabled: true,
			rotation: randomBetween(-10, 10),
			listening: false,
		});
		squawk.offsetX(squawk.width() / 2);
		this.group.add(squawk);
		squawk.to({ y: squawk.y() - 36, opacity: 0, duration: 0.8, onFinish: () => squawk.destroy() });

		this.onEmuShoo();
	}

	private respawnEmu(emu: RunningEmu, delay: number): void {
		emu.x = STAGE_WIDTH + randomBetween(60, 220);
		emu.speed = randomBetween(70, 140);
		emu.delay = delay;
		emu.fleeing = false;
		emu.node.x(emu.x);
		emu.sprite.y(0);
		emu.sprite.rotation(0);
	}

	private setCursorStyle(cursor: string): void {
		const stage = this.group.getStage();
		if (stage) stage.container().style.cursor = cursor;
	}

	// ------------------------------------------------------------------
	// State from the controller
	// ------------------------------------------------------------------

	setContinueInfo(info: ContinueInfo | null): void {
		const button = this.buttons[1];
		if (info) {
			button.subtitle.text(`Day ${info.day}   ${info.score} pts   ${info.eggs} eggs`);
			button.face.fill("#2f6fc4");
		} else {
			button.subtitle.text("No saved farm yet");
			button.face.fill("#5b6b7f");
		}
		this.setSelected(info ? 1 : 0);
	}

	setBestRun(best: BestRun | null): void {
		this.bestRunText.text(best ? `Day ${best.days}   ${best.score} pts` : "No runs yet");
	}

	// ------------------------------------------------------------------
	// Animation
	// ------------------------------------------------------------------

	private animate(dt: number): void {
		this.elapsed += dt / 1000;
		const t = this.elapsed;

		this.backgroundPhase += dt * 0.0006;
		this.background.position({
			x: -20 + Math.sin(this.backgroundPhase) * 10,
			y: -20 + Math.cos(this.backgroundPhase * 0.7) * 6,
		});

		this.title.y(Math.sin(t * 1.6) * 4);
		this.cursor.offsetX(Math.sin(t * 6) * 4);

		const selected = this.buttons[this.selectedIndex];
		selected.face.shadowBlur(12 + Math.sin(t * 5) * 8);

		for (const stalk of this.wheat) {
			stalk.rotation(Math.sin(t * 1.4 + stalk.x() * 0.03) * 5);
		}

		for (const emu of this.emus) {
			if (emu.delay > 0) {
				emu.delay -= dt;
				continue;
			}
			emu.x -= (emu.speed * dt) / 1000;
			emu.node.x(emu.x);

			const stride = t * (emu.speed / 9) + emu.phase;
			let lift = Math.abs(Math.sin(stride)) * 6;
			if (emu.fleeing) {
				const hop = (t - emu.hopStart) / 0.35;
				if (hop < 1) lift += Math.sin(hop * Math.PI) * 34;
			}
			emu.sprite.y(-lift);
			emu.sprite.rotation(emu.fleeing ? -12 : Math.sin(stride) * 4);

			if (emu.x < -EMU_SIZE) {
				this.respawnEmu(emu, randomBetween(600, 3500));
			}
		}
	}

	private showFact(index: number): void {
		this.factIndex = index % FACTS.length;
		this.factText.text(`Did you know? ${FACTS[this.factIndex]}`);
		this.factText.y(528 - this.factText.height() / 2);
	}

	private rotateFact(): void {
		this.factText.to({
			opacity: 0,
			duration: 0.3,
			onFinish: () => {
				this.showFact(this.factIndex + 1);
				this.factText.to({ opacity: 1, duration: 0.3 });
			},
		});
	}

	// ------------------------------------------------------------------
	// View interface
	// ------------------------------------------------------------------

	show(): void {
		this.group.visible(true);
		this.isPressing = false;
		const layer = this.group.getLayer();
		if (layer && !this.animation) {
			this.animation = new Konva.Animation((frame) => {
				if (frame) this.animate(frame.timeDiff);
			}, layer);
		}
		this.animation?.start();
		if (this.factTimer === null) {
			this.factTimer = window.setInterval(() => this.rotateFact(), FACT_INTERVAL_MS);
		}
		layer?.draw();
	}

	hide(): void {
		this.group.visible(false);
		this.animation?.stop();
		if (this.factTimer !== null) {
			clearInterval(this.factTimer);
			this.factTimer = null;
		}
		this.setCursorStyle("default");
		this.group.getLayer()?.draw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
