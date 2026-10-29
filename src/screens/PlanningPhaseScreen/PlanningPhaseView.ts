import Konva from "konva";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants.ts";
import type { DefenseType } from "../../components/DefenseComponent/DefenseModel.ts";
import { EMU_WAR_FACTS, getFactByDefenseType } from "../../data/EmuWarFacts.ts";
import barbedSrc from "../../../assets/barbed.png";
import sandbagSrc from "../../../assets/sandbag.png";
import gunSrc from "../../../assets/gun.png";

export interface View {
	getGroup(): Konva.Group;
	show(): void;
	hide(): void;
}

const DISPLAY = "Arial Black, Arial";
const FONT = "Arial";

const BRIEFING = { x: 110, y: 58, width: 580, height: 290 };
const CTA = { x: STAGE_WIDTH / 2 - 135, y: 440, width: 270, height: 56 };
const TRAY = { x: 110, y: 548, width: 580, height: 136 };
const CARD = { width: 168, height: 96, gap: 14 };

const COLORS = {
	panel: "#22313f",
	panelBorder: "#c8a25a",
	gold: "#ffd23f",
	text: "#f1e6d2",
	muted: "#b8c4cf",
	card: "#3a4c5c",
	cardSelected: "#2f7d46",
	cardEmpty: "#3a3f45",
	good: "#7fd36b",
	danger: "#e5533d",
};

type DefenseInfo = {
	type: DefenseType;
	name: string;
	effect: string;
	hotkey: string;
	icon: string;
};

const DEFENSES: DefenseInfo[] = [
	{ type: "barbed_wire", name: "Barbed Wire", effect: "Slows emus", hotkey: "1", icon: barbedSrc },
	{ type: "sandbag", name: "Sandbag", effect: "Blocks emus", hotkey: "2", icon: sandbagSrc },
	{ type: "machine_gun", name: "Machine Gun", effect: "Auto-shoots", hotkey: "3", icon: gunSrc },
];

type DefenseCard = {
	info: DefenseInfo;
	group: Konva.Group;
	face: Konva.Rect;
	countText: Konva.Text;
	countBadge: Konva.Circle;
	effectText: Konva.Text;
	icon: Konva.Image;
	baseY: number;
};

function loadImage(src: string, onLoad: () => void): HTMLImageElement {
	const image = new Image();
	image.onload = onLoad;
	image.src = src;
	return image;
}

export class PlanningPhaseView implements View {
	private group: Konva.Group;
	private overlay: Konva.Group;
	private tutorialPanel: Konva.Group;
	private defenseSelectionPanel: Konva.Group;
	private startButton: Konva.Group;
	private selectionPanelTitle: Konva.Text | null = null;
	private selectionPanelHint: Konva.Text | null = null;
	private hintPill: Konva.Rect | null = null;
	private dayRibbonText: Konva.Text | null = null;
	private intelText: Konva.Text | null = null;
	private intelBox: Konva.Rect | null = null;
	private ctaFace: Konva.Rect | null = null;
	private tooltip: Konva.Group | null = null;
	private selectedDefenseType: DefenseType | null = null;
	private cards: DefenseCard[] = [];
	private inventory: Record<string, number> = {};
	private onPlaceDefenses: (() => void) | null = null;
	private onDefenseSelected: ((type: DefenseType | null) => void) | null = null;
	private animation: Konva.Animation | null = null;
	private elapsed = 0;
	private day = 1;
	private inPlacement = false;

	constructor() {
		this.group = new Konva.Group({ visible: false, listening: true });
		this.overlay = new Konva.Group({ listening: false });
		this.tutorialPanel = new Konva.Group({ listening: true });
		this.defenseSelectionPanel = new Konva.Group({ listening: true });
		this.startButton = new Konva.Group({ listening: true });

		this.createOverlay();
		this.createTutorialPanel();
		this.createDefenseSelectionPanel();
		this.createStartButton();

		this.group.add(this.overlay);
		this.group.add(this.tutorialPanel);
		this.group.add(this.defenseSelectionPanel);
		this.group.add(this.startButton);

		window.addEventListener("keydown", (e) => this.handleHotkey(e));
	}

	// ------------------------------------------------------------------
	// Construction
	// ------------------------------------------------------------------

	private createOverlay(): void {
		// Clicks pass through to the farm so defenses can be placed during planning.
		this.overlay.add(new Konva.Rect({
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fillRadialGradientStartPoint: { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 },
			fillRadialGradientEndPoint: { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 },
			fillRadialGradientStartRadius: 120,
			fillRadialGradientEndRadius: 560,
			fillRadialGradientColorStops: [0, "rgba(0, 0, 0, 0.55)", 1, "rgba(0, 0, 0, 0.85)"],
			listening: false,
		}));
	}

	private createTutorialPanel(): void {
		const { x, y, width, height } = BRIEFING;

		this.tutorialPanel.add(new Konva.Rect({
			x: x + 6,
			y: y + 8,
			width,
			height,
			fill: "rgba(0, 0, 0, 0.35)",
			cornerRadius: 16,
		}));
		this.tutorialPanel.add(new Konva.Rect({
			x,
			y,
			width,
			height,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: height },
			fillLinearGradientColorStops: [0, "#2b3d4f", 1, "#1b2833"],
			stroke: COLORS.panelBorder,
			strokeWidth: 3,
			cornerRadius: 16,
		}));

		// Day ribbon hanging over the top edge.
		const ribbonWidth = 220;
		this.tutorialPanel.add(new Konva.Rect({
			x: STAGE_WIDTH / 2 - ribbonWidth / 2,
			y: y - 16,
			width: ribbonWidth,
			height: 32,
			fill: "#8f2d1f",
			stroke: "#5a1a10",
			strokeWidth: 2,
			cornerRadius: 6,
		}));
		this.dayRibbonText = new Konva.Text({
			x: STAGE_WIDTH / 2 - ribbonWidth / 2,
			y: y - 16,
			width: ribbonWidth,
			height: 32,
			text: "DAY 1   WAR ROOM",
			fontSize: 15,
			fontFamily: FONT,
			fontStyle: "bold",
			letterSpacing: 3,
			fill: "#fff3d6",
			align: "center",
			verticalAlign: "middle",
		});
		this.tutorialPanel.add(this.dayRibbonText);

		this.tutorialPanel.add(new Konva.Text({
			x,
			y: y + 30,
			width,
			text: "PREPARE YOUR DEFENSES",
			fontSize: 30,
			fontFamily: DISPLAY,
			fill: COLORS.gold,
			align: "center",
			shadowColor: "#000",
			shadowOffsetY: 3,
			shadowBlur: 0,
			shadowOpacity: 0.5,
		}));
		this.tutorialPanel.add(new Konva.Text({
			x,
			y: y + 70,
			width,
			text: "The emus charge as soon as the round starts. Fortify the farm now.",
			fontSize: 15,
			fontFamily: FONT,
			fill: COLORS.muted,
			align: "center",
		}));

		const steps = [
			"Pick a defense from your arsenal below, or press 1, 2, or 3.",
			"Aim at the farm, then press T or click to place it.",
			"Press Place Defenses. When you're ready, hit the green START button.",
		];
		steps.forEach((step, i) => {
			const rowY = y + 102 + i * 36;
			this.tutorialPanel.add(new Konva.Circle({
				x: x + 46,
				y: rowY + 12,
				radius: 14,
				fill: COLORS.gold,
				stroke: "#8a5a12",
				strokeWidth: 2,
			}));
			this.tutorialPanel.add(new Konva.Text({
				x: x + 32,
				y: rowY + 1,
				width: 28,
				height: 24,
				text: String(i + 1),
				fontSize: 16,
				fontFamily: DISPLAY,
				fill: "#3a2408",
				align: "center",
				verticalAlign: "middle",
			}));
			this.tutorialPanel.add(new Konva.Text({
				x: x + 72,
				y: rowY + 3,
				width: width - 100,
				text: step,
				fontSize: 16,
				fontFamily: FONT,
				fill: COLORS.text,
			}));
		});

		// Field intel strip with a rotating historical fact.
		this.intelBox = new Konva.Rect({
			x: x + 22,
			y: y + 212,
			width: width - 44,
			height: 62,
			fill: "rgba(200, 162, 90, 0.12)",
			stroke: "rgba(200, 162, 90, 0.5)",
			strokeWidth: 1,
			dash: [6, 4],
			cornerRadius: 8,
		});
		this.tutorialPanel.add(this.intelBox);
		this.tutorialPanel.add(new Konva.Text({
			x: x + 36,
			y: y + 222,
			text: "FIELD INTEL",
			fontSize: 11,
			fontFamily: FONT,
			fontStyle: "bold",
			letterSpacing: 2,
			fill: COLORS.panelBorder,
		}));
		this.intelText = new Konva.Text({
			x: x + 36,
			y: y + 240,
			width: width - 72,
			text: "",
			fontSize: 12,
			fontFamily: FONT,
			fill: COLORS.text,
			lineHeight: 1.25,
		});
		this.tutorialPanel.add(this.intelText);
	}

	private createDefenseSelectionPanel(): void {
		const { x, y, width, height } = TRAY;

		this.hintPill = new Konva.Rect({
			y: y - 32,
			height: 26,
			fill: "rgba(10, 16, 22, 0.75)",
			cornerRadius: 13,
		});
		this.defenseSelectionPanel.add(this.hintPill);
		this.selectionPanelHint = new Konva.Text({
			y: y - 26,
			text: "",
			fontSize: 13,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: "#e8eef3",
		});
		this.defenseSelectionPanel.add(this.selectionPanelHint);

		this.defenseSelectionPanel.add(new Konva.Rect({
			x,
			y: y + 6,
			width,
			height,
			fill: "rgba(0, 0, 0, 0.35)",
			cornerRadius: 16,
		}));
		this.defenseSelectionPanel.add(new Konva.Rect({
			x,
			y,
			width,
			height,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: height },
			fillLinearGradientColorStops: [0, "#33495b", 1, "#1d2a35"],
			stroke: COLORS.panelBorder,
			strokeWidth: 2,
			cornerRadius: 16,
		}));

		this.selectionPanelTitle = new Konva.Text({
			x,
			y: y + 9,
			width,
			text: "YOUR ARSENAL",
			fontSize: 13,
			fontFamily: FONT,
			fontStyle: "bold",
			letterSpacing: 3,
			fill: COLORS.panelBorder,
			align: "center",
		});
		this.defenseSelectionPanel.add(this.selectionPanelTitle);

		const totalWidth = DEFENSES.length * CARD.width + (DEFENSES.length - 1) * CARD.gap;
		const startX = x + (width - totalWidth) / 2;
		DEFENSES.forEach((info, index) => {
			const card = this.createCard(info, startX + index * (CARD.width + CARD.gap), y + 33);
			this.cards.push(card);
			this.defenseSelectionPanel.add(card.group);
		});
		this.updateHint();
	}

	private createCard(info: DefenseInfo, x: number, y: number): DefenseCard {
		const group = new Konva.Group({ x, y });
		const face = new Konva.Rect({
			width: CARD.width,
			height: CARD.height,
			fill: COLORS.card,
			stroke: "rgba(255, 255, 255, 0.25)",
			strokeWidth: 2,
			cornerRadius: 12,
			shadowColor: COLORS.gold,
			shadowBlur: 0,
			shadowOpacity: 0,
		});
		group.add(face);

		group.add(new Konva.Circle({ x: 35, y: 37, radius: 27, fill: "rgba(241, 230, 210, 0.85)", listening: false }));
		const icon = new Konva.Image({
			x: 12,
			y: 14,
			width: 46,
			height: 46,
			image: loadImage(info.icon, () => this.group.getLayer()?.batchDraw()),
			listening: false,
		});
		group.add(icon);

		group.add(new Konva.Text({
			x: 64,
			y: 18,
			width: CARD.width - 70,
			text: info.name,
			fontSize: 15,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.text,
			listening: false,
		}));
		const effectText = new Konva.Text({
			x: 64,
			y: 40,
			width: CARD.width - 70,
			text: info.effect,
			fontSize: 12,
			fontFamily: FONT,
			fill: COLORS.muted,
			listening: false,
		});
		group.add(effectText);

		// Hotkey keycap.
		group.add(new Konva.Rect({ x: 10, y: CARD.height - 28, width: 22, height: 20, fill: "#1b2630", stroke: "rgba(255,255,255,0.35)", strokeWidth: 1, cornerRadius: 4, listening: false }));
		group.add(new Konva.Text({
			x: 10,
			y: CARD.height - 28,
			width: 22,
			height: 20,
			text: info.hotkey,
			fontSize: 12,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: "#e8eef3",
			align: "center",
			verticalAlign: "middle",
			listening: false,
		}));
		group.add(new Konva.Text({
			x: 38,
			y: CARD.height - 24,
			text: "OWNED",
			fontSize: 10,
			fontFamily: FONT,
			fontStyle: "bold",
			letterSpacing: 1,
			fill: COLORS.muted,
			listening: false,
		}));

		const countBadge = new Konva.Circle({
			x: CARD.width - 22,
			y: CARD.height - 18,
			radius: 14,
			fill: COLORS.gold,
			stroke: "#8a5a12",
			strokeWidth: 2,
			listening: false,
		});
		group.add(countBadge);
		const countText = new Konva.Text({
			x: CARD.width - 40,
			y: CARD.height - 30,
			width: 36,
			height: 24,
			text: "0",
			fontSize: 14,
			fontFamily: DISPLAY,
			fill: "#3a2408",
			align: "center",
			verticalAlign: "middle",
			listening: false,
		});
		group.add(countText);

		const card: DefenseCard = { info, group, face, countText, countBadge, effectText, icon, baseY: y };

		group.on("click tap", () => this.toggleDefense(info.type));
		group.on("mouseenter", () => {
			this.setCursor("pointer");
			if (this.selectedDefenseType !== info.type) group.to({ y: card.baseY - 4, duration: 0.1 });
			this.showTooltip(info.type, x, y);
		});
		group.on("mouseleave", () => {
			this.setCursor("default");
			if (this.selectedDefenseType !== info.type) group.to({ y: card.baseY, duration: 0.1 });
			this.hideTooltip();
		});
		return card;
	}

	private createStartButton(): void {
		const { x, y, width, height } = CTA;
		const button = new Konva.Group({ x: x + width / 2, y: y + height / 2, offsetX: width / 2, offsetY: height / 2 });
		button.add(new Konva.Rect({ y: 6, width, height, fill: "#1e6b34", cornerRadius: 14 }));
		this.ctaFace = new Konva.Rect({
			width,
			height,
			fill: "#2fa956",
			stroke: "#fff3d6",
			strokeWidth: 3,
			cornerRadius: 14,
			shadowColor: COLORS.gold,
			shadowBlur: 12,
			shadowOpacity: 0.8,
		});
		button.add(this.ctaFace);
		button.add(new Konva.Rect({ x: 10, y: 6, width: width - 20, height: 12, fill: "rgba(255,255,255,0.18)", cornerRadius: 6, listening: false }));
		button.add(new Konva.Text({
			width,
			height,
			text: "PLACE DEFENSES",
			fontSize: 22,
			fontFamily: DISPLAY,
			fill: "white",
			align: "center",
			verticalAlign: "middle",
			shadowColor: "#000",
			shadowOffsetY: 2,
			shadowBlur: 0,
			shadowOpacity: 0.35,
			listening: false,
		}));

		button.on("mouseenter", () => {
			this.setCursor("pointer");
			button.to({ scaleX: 1.05, scaleY: 1.05, duration: 0.1 });
		});
		button.on("mouseleave", () => {
			this.setCursor("default");
			button.to({ scaleX: 1, scaleY: 1, duration: 0.1 });
		});
		button.on("click tap", () => {
			button.to({
				scaleX: 0.94,
				scaleY: 0.94,
				duration: 0.06,
				onFinish: () => {
					button.scale({ x: 1, y: 1 });
					this.setCursor("default");
					this.onPlaceDefenses?.();
				},
			});
		});

		this.startButton.add(button);
	}

	// ------------------------------------------------------------------
	// Selection
	// ------------------------------------------------------------------

	private toggleDefense(type: DefenseType): void {
		const next = this.selectedDefenseType === type ? null : type;
		this.selectedDefenseType = next;
		this.refreshCards();
		this.onDefenseSelected?.(next);
		this.updateHint();
		this.group.getLayer()?.batchDraw();
	}

	private handleHotkey(e: KeyboardEvent): void {
		if (!this.group.visible() || e.repeat) return;
		const info = DEFENSES.find((d) => d.hotkey === e.key);
		if (!info) return;
		e.preventDefault();
		this.toggleDefense(info.type);
		const card = this.cards.find((c) => c.info.type === info.type);
		if (card) {
			card.group.scale({ x: 1.08, y: 1.08 });
			card.group.to({ scaleX: 1, scaleY: 1, duration: 0.15 });
		}
	}

	private refreshCards(): void {
		for (const card of this.cards) {
			const selected = card.info.type === this.selectedDefenseType;
			const count = this.inventory[card.info.type] ?? 0;
			const empty = count <= 0;
			card.face.fill(selected ? COLORS.cardSelected : empty ? COLORS.cardEmpty : COLORS.card);
			card.face.stroke(selected ? COLORS.gold : "rgba(255, 255, 255, 0.25)");
			card.face.strokeWidth(selected ? 3 : 2);
			card.face.shadowOpacity(selected ? 0.9 : 0);
			card.icon.opacity(empty ? 0.5 : 1);
			card.countBadge.fill(empty ? "#6b7178" : COLORS.gold);
			card.countText.text(String(count));
			card.effectText.text(empty ? "Buy in the shop" : card.info.effect);
			card.effectText.fill(empty ? "#e9a07a" : COLORS.muted);
			if (!selected) {
				card.group.y(card.baseY);
				card.group.rotation(0);
			}
		}
	}

	private updateHint(): void {
		if (!this.selectionPanelHint || !this.hintPill) return;
		const selected = DEFENSES.find((d) => d.type === this.selectedDefenseType);
		const text = selected
			? `${selected.name} ready. Aim at the farm and press T or click to place.  Esc to cancel.`
			: this.inPlacement
				? "Place your defenses, then press the green START button."
				: "Select a defense to arm it.";
		this.selectionPanelHint.text(text);
		const width = this.selectionPanelHint.width();
		this.selectionPanelHint.x(STAGE_WIDTH / 2 - width / 2);
		this.hintPill.x(STAGE_WIDTH / 2 - width / 2 - 16);
		this.hintPill.width(width + 32);
	}

	setPlacementMode(enabled: boolean): void {
		// In placement mode, keep only the compact defense tray visible so the farm stays bright.
		this.inPlacement = enabled;
		this.overlay.visible(!enabled);
		this.tutorialPanel.visible(!enabled);
		this.startButton.visible(!enabled);
		this.defenseSelectionPanel.visible(true);
		this.defenseSelectionPanel.y(0);
		this.selectionPanelTitle?.text(enabled ? "PLACE YOUR DEFENSES" : "YOUR ARSENAL");
		this.updateHint();
		this.group.getLayer()?.batchDraw();
	}

	setOnPlaceDefenses(handler: () => void): void {
		this.onPlaceDefenses = handler;
	}

	setOnDefenseSelected(handler: (type: DefenseType | null) => void): void {
		this.onDefenseSelected = handler;
	}

	// ------------------------------------------------------------------
	// Tooltip
	// ------------------------------------------------------------------

	private showTooltip(defenseType: DefenseType, x: number, y: number): void {
		this.hideTooltip();

		const fact = getFactByDefenseType(defenseType);
		if (!fact) return;

		const tooltipWidth = 260;
		const tooltipX = Math.min(Math.max(10, x - 46), STAGE_WIDTH - tooltipWidth - 10);
		this.tooltip = new Konva.Group({ x: tooltipX, listening: false });

		const desc = new Konva.Text({
			x: 12,
			y: 30,
			width: tooltipWidth - 24,
			text: fact.description,
			fontSize: 12,
			fontFamily: FONT,
			fill: "#d9e2ea",
			lineHeight: 1.3,
			wrap: "word",
		});
		const tooltipHeight = desc.height() + 42;
		this.tooltip.y(y - tooltipHeight - 12);

		this.tooltip.add(new Konva.Rect({
			width: tooltipWidth,
			height: tooltipHeight,
			fill: "#1b2833",
			stroke: COLORS.panelBorder,
			strokeWidth: 2,
			cornerRadius: 10,
			opacity: 0.97,
		}));
		this.tooltip.add(new Konva.Text({
			x: 12,
			y: 10,
			width: tooltipWidth - 24,
			text: `INTEL: ${fact.title}`,
			fontSize: 13,
			fontFamily: FONT,
			fontStyle: "bold",
			fill: COLORS.gold,
		}));
		this.tooltip.add(desc);

		this.group.add(this.tooltip);
		this.group.getLayer()?.batchDraw();
	}

	private hideTooltip(): void {
		if (this.tooltip) {
			this.tooltip.destroy();
			this.tooltip = null;
			this.group.getLayer()?.batchDraw();
		}
	}

	// ------------------------------------------------------------------
	// State from the controller
	// ------------------------------------------------------------------

	getSelectedDefenseType(): DefenseType | null {
		return this.selectedDefenseType;
	}

	getGroup(): Konva.Group {
		return this.group;
	}

	setDefenseInventory(inventory: Record<string, number>): void {
		this.inventory = { ...inventory };
		this.refreshCards();
		this.group.getLayer()?.batchDraw();
	}

	clearSelection(): void {
		this.selectedDefenseType = null;
		this.refreshCards();
		this.updateHint();
		this.group.getLayer()?.batchDraw();
		this.onDefenseSelected?.(null);
	}

	show(day?: number): void {
		if (day !== undefined) this.day = day;
		this.dayRibbonText?.text(`DAY ${this.day}   WAR ROOM`);
		const fact = EMU_WAR_FACTS[Math.floor(Math.random() * EMU_WAR_FACTS.length)];
		if (this.intelText && this.intelBox) {
			this.intelText.text(fact ? fact.description : "");
			this.intelBox.height(this.intelText.y() + this.intelText.height() + 10 - this.intelBox.y());
		}
		this.group.visible(true);

		const layer = this.group.getLayer();
		if (layer && !this.animation) {
			this.animation = new Konva.Animation((frame) => {
				if (frame) this.animate(frame.timeDiff);
			}, layer);
		}
		this.animation?.start();
	}

	hide(): void {
		this.animation?.stop();
		this.hideTooltip();
		this.setCursor("default");
		this.group.visible(false);
	}

	// ------------------------------------------------------------------
	// Animation
	// ------------------------------------------------------------------

	private animate(dt: number): void {
		this.elapsed += dt / 1000;
		const t = this.elapsed;
		if (this.ctaFace && this.startButton.visible()) {
			this.ctaFace.shadowBlur(12 + Math.sin(t * 4) * 8);
		}
		for (const card of this.cards) {
			if (card.info.type !== this.selectedDefenseType) continue;
			card.group.y(card.baseY - 4 + Math.sin(t * 5) * 2);
			card.face.shadowBlur(14 + Math.sin(t * 5) * 6);
		}
	}

	private setCursor(cursor: string): void {
		const stage = this.group.getStage();
		if (stage) stage.container().style.cursor = cursor;
	}
}
