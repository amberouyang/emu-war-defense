import Konva from "konva";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import emuSrc from "../../../assets/Emu.png";
import gunSrc from "../../../assets/gun.png";
import bulletSrc from "../../../assets/bullet.png";
import fenceSrc from "../../../assets/fence.png";
import grownSrc from "../../../assets/fully_grown.png";
import sproutSrc from "../../../assets/not_grown.png";

const SERIF = "Georgia";
const DISPLAY = "Arial Black, Arial";

const PANEL = { x: 50, y: 36, width: STAGE_WIDTH - 100, height: STAGE_HEIGHT - 72 };
const TRAIL = { left: 110, right: STAGE_WIDTH - 110, y: 88 };
const PHOTO = { x: 596, y: 336, width: 240, height: 284 };
const BUTTON_Y = PANEL.y + PANEL.height - 92;
const TYPE_MS_PER_CHAR = 9;
const MAX_TYPE_MS = 1100;

const COLORS = {
	ink: "#2f2114",
	body: "#3f3022",
	accent: "#8f2d1f",
	accentLight: "#d98933",
	tag: "#8b5a2b",
	stamp: "#b3261e",
	paperTop: "#f3e9cc",
	paperBottom: "#d8c59f",
	muted: "#7a6448",
};

type PageArt = {
	stamp: string;
	caption: string;
	draw: (scene: Konva.Group, width: number, height: number) => void;
};

const imageCache = new Map<string, HTMLImageElement>();

function getImage(src: string): HTMLImageElement {
	let image = imageCache.get(src);
	if (!image) {
		image = new Image();
		image.src = src;
		imageCache.set(src, image);
	}
	return image;
}

/** Konva image that keeps the source aspect ratio inside a max box, anchored at its bottom center. */
function fittedImage(src: string, x: number, y: number, maxWidth: number, maxHeight: number, extra: Partial<Konva.ImageConfig> = {}): Konva.Image {
	const image = getImage(src);
	const node = new Konva.Image({ image, x, y, listening: false, ...extra });
	const fit = () => {
		const ratio = Math.min(maxWidth / (image.naturalWidth || 1), maxHeight / (image.naturalHeight || 1));
		const width = (image.naturalWidth || maxWidth) * ratio;
		const height = (image.naturalHeight || maxHeight) * ratio;
		node.size({ width, height });
		node.offset({ x: width / 2, y: height });
		node.getLayer()?.batchDraw();
	};
	if (image.complete && image.naturalWidth) fit();
	else image.addEventListener("load", fit, { once: true });
	return node;
}

function drawSkyAndGround(scene: Konva.Group, width: number, height: number, sky: [string, string], ground: string, horizon = 0.68): void {
	scene.add(new Konva.Rect({
		width,
		height,
		fillLinearGradientStartPoint: { x: 0, y: 0 },
		fillLinearGradientEndPoint: { x: 0, y: height },
		fillLinearGradientColorStops: [0, sky[0], 1, sky[1]],
	}));
	scene.add(new Konva.Rect({ y: height * horizon, width, height: height * (1 - horizon), fill: ground }));
}

function drawKeycap(scene: Konva.Group, x: number, y: number, width: number, label: string): void {
	scene.add(new Konva.Rect({ x, y: y + 4, width, height: 34, fill: "#1d140c", cornerRadius: 6 }));
	scene.add(new Konva.Rect({ x, y, width, height: 34, fill: "#3a2c20", stroke: "#c8a25a", strokeWidth: 2, cornerRadius: 6 }));
	scene.add(new Konva.Text({
		x,
		y,
		width,
		height: 34,
		text: label,
		fontSize: 15,
		fontFamily: "Arial",
		fontStyle: "bold",
		fill: "#ffe9b8",
		align: "center",
		verticalAlign: "middle",
	}));
}

const PAGE_ART: PageArt[] = [
	{
		stamp: "1932",
		caption: "Wheat country, Western Australia",
		draw: (scene, w, h) => {
			drawSkyAndGround(scene, w, h, ["#8cc3d9", "#f3dca2"], "#c99a45");
			scene.add(new Konva.Circle({ x: w - 36, y: 34, radius: 18, fill: "#ffe08a" }));
			[0.2, 0.5, 0.8].forEach((fx, i) => scene.add(fittedImage(grownSrc, w * fx, h - 10 - (i % 2) * 6, 62, 78)));
		},
	},
	{
		stamp: "CRISIS",
		caption: "Wheat prices crash",
		draw: (scene, w, h) => {
			scene.add(new Konva.Rect({ width: w, height: h, fill: "#efe4c8" }));
			for (let gy = 30; gy < h; gy += 30) {
				scene.add(new Konva.Line({ points: [0, gy, w, gy], stroke: "rgba(80, 60, 30, 0.15)", strokeWidth: 1 }));
			}
			scene.add(new Konva.Line({
				points: [16, 40, 52, 56, 80, 48, 112, 96, 140, 88, 176, 140],
				stroke: COLORS.stamp,
				strokeWidth: 4,
				lineCap: "round",
				lineJoin: "round",
			}));
			scene.add(new Konva.Line({ points: [166, 128, 178, 142, 160, 146], stroke: COLORS.stamp, strokeWidth: 4, lineCap: "round", lineJoin: "round" }));
			scene.add(new Konva.Text({ x: 14, y: 10, text: "WHEAT $", fontSize: 14, fontFamily: "Arial", fontStyle: "bold", fill: COLORS.ink }));
			scene.add(fittedImage(sproutSrc, 40, h - 8, 44, 44));
		},
	},
	{
		stamp: "INVASION",
		caption: "Around 20,000 hungry emus",
		draw: (scene, w, h) => {
			drawSkyAndGround(scene, w, h, ["#f2b46b", "#f7dfb0"], "#b9833c", 0.72);
			const flock = [
				{ x: 0.82, y: 0.78, size: 52 },
				{ x: 0.58, y: 0.84, size: 70 },
				{ x: 0.3, y: 0.92, size: 96 },
			];
			for (const emu of flock) scene.add(fittedImage(emuSrc, w * emu.x, h * emu.y, emu.size, emu.size));
		},
	},
	{
		stamp: "DEPLOYED",
		caption: "Soldiers arrive with machine guns",
		draw: (scene, w, h) => {
			drawSkyAndGround(scene, w, h, ["#9fb7a4", "#dfe3c4"], "#7c6a3c", 0.74);
			scene.add(fittedImage(gunSrc, w * 0.4, h - 8, 120, 110));
			scene.add(fittedImage(bulletSrc, w * 0.82, h * 0.42, 40, 26, { rotation: 0 }));
		},
	},
	{
		stamp: "EVASIVE",
		caption: "Nearly impossible to hit",
		draw: (scene, w, h) => {
			drawSkyAndGround(scene, w, h, ["#f2c98a", "#f8e6bf"], "#c08a3e", 0.74);
			for (const [x, y] of [[30, 60], [70, 40], [50, 96]]) {
				scene.add(fittedImage(bulletSrc, x, y, 30, 20));
			}
			[[0.62, 0.9, 80], [0.86, 0.84, 58]].forEach(([fx, fy, size]) => {
				scene.add(fittedImage(emuSrc, w * fx, h * fy, size, size));
			});
			for (const y of [104, 118, 132]) {
				scene.add(new Konva.Line({ points: [w * 0.88, y, w - 2, y], stroke: "rgba(90, 50, 20, 0.5)", strokeWidth: 2, lineCap: "round" }));
			}
		},
	},
	{
		stamp: "RETREAT",
		caption: "The military withdraws",
		draw: (scene, w, h) => {
			drawSkyAndGround(scene, w, h, ["#6f7f99", "#c9b7a0"], "#8a6a3c", 0.76);
			scene.add(new Konva.Line({ points: [w * 0.45, h * 0.86, w * 0.45, h * 0.18], stroke: "#4a3a28", strokeWidth: 4, lineCap: "round" }));
			scene.add(new Konva.Rect({ x: w * 0.45, y: h * 0.18, width: 62, height: 40, fill: "#f6f1e6", stroke: "#bcb2a0", strokeWidth: 1 }));
			scene.add(fittedImage(emuSrc, w * 0.82, h - 6, 60, 60));
		},
	},
	{
		stamp: "TOP SECRET",
		caption: "Your farm. Your rules.",
		draw: (scene, w, h) => {
			drawSkyAndGround(scene, w, h, ["#8cc3d9", "#e9f0d0"], "#b98a3e", 0.66);
			scene.add(fittedImage(fenceSrc, w * 0.5, h * 0.9, w, 70));
			[0.25, 0.5, 0.75].forEach((fx) => scene.add(fittedImage(grownSrc, w * fx, h - 4, 46, 58)));
			scene.add(fittedImage(emuSrc, w * 0.88, h * 0.66, 40, 40));
		},
	},
	{
		stamp: "READY",
		caption: "Field manual",
		draw: (scene, w, h) => {
			scene.add(new Konva.Rect({ width: w, height: h, fill: "#2a1f16" }));
			drawKeycap(scene, 24, 52, 64, "CLICK");
			drawKeycap(scene, 24, 100, 34, "T");
			drawKeycap(scene, 24, 148, 34, "M");
			const label = (y: number, text: string) => scene.add(new Konva.Text({
				x: 100,
				y,
				width: w - 108,
				text,
				fontSize: 13,
				fontFamily: "Arial",
				fontStyle: "bold",
				fill: "#f1e6d2",
			}));
			label(62, "Plant and harvest");
			label(110, "Place a defense");
			label(158, "Deploy a mine");
		},
	},
];

type Button = { group: Konva.Group; label: Konva.Text };

export class GameIntroView {
	private group: Konva.Group;
	private textNode: Konva.Text | null = null;

	private onNext: () => void;
	private onBack: () => void;
	private onSkip: () => void;

	private lastPage = 0;
	private typeTimer: number | null = null;
	private animation: Konva.Animation | null = null;
	private elapsed = 0;
	private pulseNode: Konva.Circle | null = null;
	private nextGlow: Konva.Rect | null = null;
	private motes: { node: Konva.Circle; speed: number; drift: number }[] = [];

	constructor(onNext: () => void = () => {}, onBack: () => void = () => {}, onSkip: () => void = () => {}) {
		this.onNext = onNext;
		this.onBack = onBack;
		this.onSkip = onSkip;
		this.group = new Konva.Group({
			visible: false,
		});
	}

	getGroup(): Konva.Group {
		return this.group;
	}

	show(): void {
		this.group.show();
		const layer = this.group.getLayer();
		if (layer && !this.animation) {
			this.animation = new Konva.Animation((frame) => {
				if (frame) this.animate(frame.timeDiff);
			}, layer);
		}
		this.animation?.start();
		layer?.draw();
	}

	hide(): void {
		this.stopTyping();
		this.animation?.stop();
		this.setCursor("default");
		this.group.hide();
		this.group.getLayer()?.draw();
	}

	renderPage(text: string, isLastPage: boolean, currentPage: number, totalPages: number): void {
		const { title, body } = this.parsePageContent(text);
		const previousPage = this.lastPage;
		const isForward = currentPage >= previousPage;
		this.lastPage = currentPage;

		this.stopTyping();
		this.group.destroyChildren();
		this.motes = [];

		this.drawBackdrop();
		this.drawPanel();
		this.drawTrail(currentPage, previousPage, totalPages);

		const chapterTag = new Konva.Text({
			x: 92,
			y: 122,
			text: `CHAPTER ${currentPage + 1} OF ${totalPages}   ${isLastPage ? "FIELD MANUAL" : currentPage >= totalPages - 2 ? "MISSION BRIEFING" : "HISTORICAL BRIEFING"}`,
			fontSize: 13,
			fontStyle: "bold",
			fontFamily: SERIF,
			fill: COLORS.tag,
			letterSpacing: 2,
		});
		this.group.add(chapterTag);

		this.group.add(new Konva.Line({
			points: [92, 146, STAGE_WIDTH - 92, 146],
			stroke: "rgba(94, 66, 32, 0.3)",
			strokeWidth: 2,
			listening: false,
		}));

		const content = new Konva.Group({ x: isForward ? 36 : -36, opacity: 0 });
		this.group.add(content);

		const titleNode = new Konva.Text({
			x: 92,
			y: 164,
			width: 390,
			text: title,
			fontSize: 30,
			fontStyle: "bold",
			fontFamily: SERIF,
			fill: COLORS.ink,
			lineHeight: 1.1,
		});
		content.add(titleNode);

		this.textNode = new Konva.Text({
			x: 94,
			y: titleNode.y() + titleNode.height() + 24,
			width: 372,
			text: "",
			fontSize: 20,
			fontFamily: SERIF,
			fill: COLORS.body,
			lineHeight: 1.45,
		});
		content.add(this.textNode);

		const art = PAGE_ART[currentPage] ?? PAGE_ART[PAGE_ART.length - 1];
		content.add(this.createPhoto(art));
		const stamp = this.createStamp(art.stamp);
		this.group.add(stamp);

		this.drawButtons(currentPage, isLastPage);

		this.group.add(new Konva.Text({
			y: PANEL.y + PANEL.height - 28,
			width: STAGE_WIDTH,
			text: "Space or Right arrow: next      Left arrow: back      Esc: skip briefing",
			fontSize: 12,
			fontFamily: "Arial",
			fill: COLORS.muted,
			align: "center",
			listening: false,
		}));

		content.to({ x: 0, opacity: 1, duration: 0.25, easing: Konva.Easings.EaseOut });
		this.slamStamp(stamp);
		this.typeBody(body);

		this.group.getLayer()?.batchDraw();
	}

	destroy(): void {
		this.stopTyping();
		this.animation?.stop();
		this.group.destroy();
	}

	// ------------------------------------------------------------------
	// Layout pieces
	// ------------------------------------------------------------------

	private drawBackdrop(): void {
		this.group.add(new Konva.Rect({
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: STAGE_WIDTH, y: STAGE_HEIGHT },
			fillLinearGradientColorStops: [0, "#13211f", 0.5, "#20473d", 1, "#7a5d2c"],
			listening: false,
		}));
		this.group.add(new Konva.Circle({
			x: STAGE_WIDTH - 110,
			y: 96,
			radius: 150,
			fillRadialGradientStartRadius: 10,
			fillRadialGradientEndRadius: 150,
			fillRadialGradientColorStops: [0, "rgba(255, 215, 128, 0.5)", 1, "rgba(255, 215, 128, 0)"],
			listening: false,
		}));
		for (let i = 0; i < 18; i++) {
			const node = new Konva.Circle({
				x: Math.random() * STAGE_WIDTH,
				y: Math.random() * STAGE_HEIGHT,
				radius: 1 + Math.random() * 2,
				fill: "rgba(255, 228, 160, 0.5)",
				listening: false,
			});
			this.group.add(node);
			this.motes.push({ node, speed: 8 + Math.random() * 14, drift: Math.random() * Math.PI * 2 });
		}
	}

	private drawPanel(): void {
		this.group.add(new Konva.Rect({
			...PANEL,
			x: PANEL.x + 8,
			y: PANEL.y + 10,
			fill: "rgba(0, 0, 0, 0.3)",
			cornerRadius: 26,
			listening: false,
		}));
		this.group.add(new Konva.Rect({
			...PANEL,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: PANEL.height },
			fillLinearGradientColorStops: [0, COLORS.paperTop, 1, COLORS.paperBottom],
			stroke: "#6c5330",
			strokeWidth: 2,
			cornerRadius: 26,
			listening: false,
		}));
		// Paper clip holding the dossier together.
		this.group.add(new Konva.Rect({
			x: PANEL.x + 12,
			y: PANEL.y - 14,
			width: 22,
			height: 52,
			stroke: "#8d8f94",
			strokeWidth: 4,
			cornerRadius: 11,
			listening: false,
		}));
	}

	private drawTrail(currentPage: number, previousPage: number, totalPages: number): void {
		const nodeX = (i: number) => TRAIL.left + ((TRAIL.right - TRAIL.left) * i) / Math.max(1, totalPages - 1);

		this.group.add(new Konva.Line({
			points: [TRAIL.left, TRAIL.y, TRAIL.right, TRAIL.y],
			stroke: "rgba(143, 45, 31, 0.25)",
			strokeWidth: 4,
			dash: [8, 8],
			lineCap: "round",
			listening: false,
		}));
		const progress = new Konva.Line({
			points: [TRAIL.left, TRAIL.y, nodeX(previousPage), TRAIL.y],
			stroke: COLORS.accent,
			strokeWidth: 5,
			lineCap: "round",
			listening: false,
		});
		this.group.add(progress);
		progress.to({ points: [TRAIL.left, TRAIL.y, nodeX(currentPage), TRAIL.y], duration: 0.35, easing: Konva.Easings.EaseInOut });

		for (let i = 0; i < totalPages; i++) {
			const x = nodeX(i);
			if (i < currentPage) {
				this.group.add(new Konva.Circle({ x, y: TRAIL.y, radius: 9, fill: COLORS.accent, listening: false }));
				this.group.add(new Konva.Line({
					points: [x - 4, TRAIL.y, x - 1, TRAIL.y + 3, x + 4, TRAIL.y - 3],
					stroke: "#fff3d6",
					strokeWidth: 2,
					lineCap: "round",
					lineJoin: "round",
					listening: false,
				}));
			} else if (i === currentPage) {
				this.pulseNode = new Konva.Circle({
					x,
					y: TRAIL.y,
					radius: 14,
					fill: "rgba(217, 137, 51, 0.35)",
					listening: false,
				});
				this.group.add(this.pulseNode);
				this.group.add(new Konva.Circle({ x, y: TRAIL.y, radius: 10, fill: COLORS.accentLight, stroke: "#fff3d6", strokeWidth: 2.5, listening: false }));
			} else {
				this.group.add(new Konva.Circle({
					x,
					y: TRAIL.y,
					radius: 8,
					fill: "#efe2bf",
					stroke: "rgba(143, 45, 31, 0.35)",
					strokeWidth: 2,
					listening: false,
				}));
			}
		}

		// Farm flag waiting at the end of the trail.
		const flagX = TRAIL.right + 24;
		this.group.add(new Konva.Line({ points: [flagX, TRAIL.y + 10, flagX, TRAIL.y - 18], stroke: "#4a3a28", strokeWidth: 3, lineCap: "round", listening: false }));
		this.group.add(new Konva.Line({
			points: [flagX, TRAIL.y - 18, flagX + 20, TRAIL.y - 12, flagX, TRAIL.y - 5],
			closed: true,
			fill: currentPage === totalPages - 1 ? "#3f9b3a" : COLORS.accent,
			listening: false,
		}));

		const walker = fittedImage(emuSrc, nodeX(previousPage), TRAIL.y - 8, 38, 38);
		this.group.add(walker);
		if (previousPage !== currentPage) {
			walker.to({ x: nodeX(currentPage), duration: 0.35, easing: Konva.Easings.EaseInOut });
			walker.to({
				y: TRAIL.y - 22,
				duration: 0.17,
				easing: Konva.Easings.EaseOut,
				onFinish: () => walker.to({ y: TRAIL.y - 8, duration: 0.17, easing: Konva.Easings.EaseIn }),
			});
		}
		// The sprite faces left, so flip it while it walks forward along the trail.
		if (currentPage >= previousPage) walker.scaleX(-1);
	}

	private createPhoto(art: PageArt): Konva.Group {
		const photo = new Konva.Group({ x: PHOTO.x, y: PHOTO.y, rotation: 3, listening: false });
		photo.add(new Konva.Rect({
			x: -PHOTO.width / 2,
			y: -PHOTO.height / 2,
			width: PHOTO.width,
			height: PHOTO.height,
			fill: "#fbf7ee",
			cornerRadius: 4,
			shadowColor: "#2a1a08",
			shadowBlur: 12,
			shadowOffsetY: 6,
			shadowOpacity: 0.35,
		}));
		const sceneWidth = PHOTO.width - 24;
		const sceneHeight = 196;
		const scene = new Konva.Group({
			x: -sceneWidth / 2,
			y: -PHOTO.height / 2 + 12,
			clip: { x: 0, y: 0, width: sceneWidth, height: sceneHeight },
		});
		art.draw(scene, sceneWidth, sceneHeight);
		photo.add(scene);
		photo.add(new Konva.Text({
			x: -PHOTO.width / 2 + 10,
			y: PHOTO.height / 2 - 66,
			width: PHOTO.width - 20,
			text: art.caption,
			fontSize: 15,
			fontStyle: "italic",
			fontFamily: SERIF,
			fill: "#4b3a2b",
			align: "center",
			lineHeight: 1.2,
		}));
		// Tape strip at the top of the photo.
		photo.add(new Konva.Rect({
			x: -34,
			y: -PHOTO.height / 2 - 10,
			width: 68,
			height: 20,
			fill: "rgba(240, 225, 170, 0.75)",
			rotation: -4,
		}));
		return photo;
	}

	private createStamp(label: string): Konva.Group {
		const text = new Konva.Text({
			text: label,
			fontSize: 20,
			fontFamily: DISPLAY,
			fill: COLORS.stamp,
			letterSpacing: 2,
		});
		const width = text.width() + 24;
		const height = text.height() + 14;
		text.position({ x: -width / 2 + 12, y: -height / 2 + 7 });
		const stamp = new Konva.Group({
			x: PHOTO.x + 62,
			y: PHOTO.y - PHOTO.height / 2 + 26,
			rotation: -14,
			opacity: 0,
			listening: false,
		});
		stamp.add(new Konva.Rect({
			x: -width / 2,
			y: -height / 2,
			width,
			height,
			stroke: COLORS.stamp,
			strokeWidth: 3,
			cornerRadius: 6,
			fill: "rgba(255, 245, 230, 0.35)",
		}));
		stamp.add(text);
		return stamp;
	}

	private slamStamp(stamp: Konva.Group): void {
		stamp.scale({ x: 2.2, y: 2.2 });
		window.setTimeout(() => {
			if (!stamp.getParent()) return;
			stamp.to({
				scaleX: 1,
				scaleY: 1,
				opacity: 0.88,
				duration: 0.18,
				easing: Konva.Easings.EaseIn,
				onFinish: () => this.shake(),
			});
		}, 260);
	}

	private shake(): void {
		const tween = new Konva.Tween({
			node: this.group,
			duration: 0.05,
			x: 3,
			y: 2,
			onFinish: () => tween.reverse(),
			onReset: () => tween.destroy(),
		});
		tween.play();
	}

	private drawButtons(currentPage: number, isLastPage: boolean): void {
		if (currentPage > 0) {
			this.group.add(this.createButton(92, BUTTON_Y, 120, 52, "BACK", "#8a7556", "#5a4a33", this.onBack, "left").group);
		}

		const skip = new Konva.Text({
			x: 232,
			y: BUTTON_Y + 18,
			text: isLastPage ? "" : "Skip briefing",
			fontSize: 15,
			fontFamily: SERIF,
			fontStyle: "italic",
			fill: COLORS.muted,
			textDecoration: "underline",
		});
		skip.on("mouseenter", () => {
			this.setCursor("pointer");
			skip.fill(COLORS.accent);
		});
		skip.on("mouseleave", () => {
			this.setCursor("default");
			skip.fill(COLORS.muted);
		});
		skip.on("click tap", () => this.onSkip());
		this.group.add(skip);

		const width = isLastPage ? 250 : 190;
		const next = this.createButton(
			STAGE_WIDTH - 92 - width,
			BUTTON_Y,
			width,
			52,
			isLastPage ? "DEPLOY TO FARM" : "NEXT",
			isLastPage ? "#3f9b3a" : COLORS.accent,
			isLastPage ? "#24601f" : "#5a1a10",
			this.onNext,
			"right",
		);
		this.nextGlow = next.group.findOne<Konva.Rect>(".face") ?? null;
		this.group.add(next.group);
	}

	private createButton(
		x: number,
		y: number,
		width: number,
		height: number,
		label: string,
		color: string,
		lipColor: string,
		onClick: () => void,
		arrow: "left" | "right",
	): Button {
		const group = new Konva.Group({ x: x + width / 2, y: y + height / 2, offsetX: width / 2, offsetY: height / 2 });
		group.add(new Konva.Rect({ y: 5, width, height, fill: lipColor, cornerRadius: 14 }));
		group.add(new Konva.Rect({
			name: "face",
			width,
			height,
			fill: color,
			stroke: "#fff3d6",
			strokeWidth: 2,
			cornerRadius: 14,
			shadowColor: "#ffd23f",
			shadowBlur: 0,
			shadowOpacity: 0,
		}));
		const text = new Konva.Text({
			width,
			height,
			text: label,
			fontSize: 20,
			fontFamily: DISPLAY,
			fill: "white",
			align: "center",
			verticalAlign: "middle",
			listening: false,
		});
		group.add(text);

		const textWidth = text.measureSize(label).width;
		const arrowX = arrow === "right" ? width / 2 + textWidth / 2 + 14 : width / 2 - textWidth / 2 - 14;
		const dir = arrow === "right" ? 1 : -1;
		group.add(new Konva.Line({
			points: [arrowX - dir * 5, height / 2 - 7, arrowX + dir * 5, height / 2, arrowX - dir * 5, height / 2 + 7],
			closed: true,
			fill: "white",
			listening: false,
		}));

		group.on("mouseenter", () => {
			this.setCursor("pointer");
			group.to({ scaleX: 1.05, scaleY: 1.05, duration: 0.1 });
		});
		group.on("mouseleave", () => {
			this.setCursor("default");
			group.to({ scaleX: 1, scaleY: 1, duration: 0.1 });
		});
		group.on("click tap", () => {
			group.to({
				scaleX: 0.94,
				scaleY: 0.94,
				duration: 0.06,
				onFinish: () => {
					this.setCursor("default");
					onClick();
				},
			});
		});
		return { group, label: text };
	}

	// ------------------------------------------------------------------
	// Animation
	// ------------------------------------------------------------------

	private typeBody(body: string): void {
		if (!this.textNode) return;
		const node = this.textNode;
		const duration = Math.min(MAX_TYPE_MS, body.length * TYPE_MS_PER_CHAR);
		const start = performance.now();
		const tick = () => {
			const progress = Math.min(1, (performance.now() - start) / duration);
			node.text(body.slice(0, Math.ceil(body.length * progress)));
			node.getLayer()?.batchDraw();
			if (progress >= 1) this.stopTyping();
		};
		tick();
		this.typeTimer = window.setInterval(tick, 16);
	}

	private stopTyping(): void {
		if (this.typeTimer !== null) {
			clearInterval(this.typeTimer);
			this.typeTimer = null;
		}
	}

	private animate(dt: number): void {
		this.elapsed += dt / 1000;
		const t = this.elapsed;
		if (this.pulseNode) {
			const pulse = (Math.sin(t * 4) + 1) / 2;
			this.pulseNode.radius(13 + pulse * 6);
			this.pulseNode.opacity(0.6 - pulse * 0.4);
		}
		this.nextGlow?.shadowBlur(10 + Math.sin(t * 5) * 6);
		this.nextGlow?.shadowOpacity(0.8);
		for (const mote of this.motes) {
			let y = mote.node.y() - (mote.speed * dt) / 1000;
			if (y < -5) y = STAGE_HEIGHT + 5;
			mote.node.y(y);
			mote.node.x(mote.node.x() + Math.sin(t + mote.drift) * 0.15);
		}
	}

	private setCursor(cursor: string): void {
		const stage = this.group.getStage();
		if (stage) stage.container().style.cursor = cursor;
	}

	private parsePageContent(text: string): { title: string; body: string } {
		const [titleLine, ...rest] = text.split("\n").filter((line) => line.trim().length > 0);
		return {
			title: titleLine ?? "",
			body: rest.join("\n\n"),
		};
	}
}
