import Konva from "konva";
import type { View } from "../../types.ts";
import { STAGE_HEIGHT, STAGE_WIDTH, CROP_BUY_COST, ItemCosts, GameItem } from "../../constants.ts";
import {
    MAX_DEFENSE_LEVEL,
    DEFENSE_CONFIGS,
    getDefenseStats,
    getDefenseUpgradeCost,
    type UpgradableDefenseType,
} from "../../components/DefenseComponent/DefenseModel.ts";
import backgroundSrc from "../../../assets/background.png";
import stallSrc from "../../../assets/stall.png";
import barbedSrc from "../../../assets/barbed.png";
import sandbagSrc from "../../../assets/sandbag.png";
import gunSrc from "../../../assets/gun.png";
import sproutSrc from "../../../assets/not_grown.png";
import wheatSrc from "../../../assets/fully_grown.png";
import mineSrc from "../../../assets/mine.png";
import { GOLD, INK, PARCHMENT, createModal, makeButton, makeRibbon, woodRect } from "../../utils/uiKit.ts";

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

const images = {
    barbed_wire: loadImage(barbedSrc),
    sandbag: loadImage(sandbagSrc),
    machine_gun: loadImage(gunSrc),
    sprout: loadImage(sproutSrc),
    wheat: loadImage(wheatSrc),
    mine: loadImage(mineSrc),
};

const imageIcon = (image: HTMLImageElement, cx: number, cy: number, size: number): Konva.Image => {
    const node = new Konva.Image({ x: cx - size / 2, y: cy - size / 2, width: size, height: size, image, listening: false });
    if (!image.complete) {
        image.addEventListener("load", () => node.getLayer()?.batchDraw(), { once: true });
    }
    return node;
};

const eggIcon = (cx: number, cy: number, scale = 1): Konva.Group => {
    const egg = new Konva.Group({ x: cx, y: cy, scaleX: scale, scaleY: scale, listening: false });
    egg.add(new Konva.Ellipse({ radiusX: 9, radiusY: 12, fill: "#fbf3e0", stroke: "#b89a6a", strokeWidth: 1.5 }));
    for (const [dx, dy] of [[-3, -4], [3, 1], [-2, 5], [4, -6]]) {
        egg.add(new Konva.Circle({ x: dx, y: dy, radius: 1.3, fill: "#9c8a6a" }));
    }
    egg.add(new Konva.Ellipse({ x: -3, y: -5, radiusX: 2.5, radiusY: 4, fill: "rgba(255, 255, 255, 0.8)" }));
    return egg;
};

const coinIcon = (cx: number, cy: number): Konva.Group => {
    const coin = new Konva.Group({ x: cx, y: cy, listening: false });
    coin.add(new Konva.Circle({ radius: 11, fill: GOLD, stroke: "#8a5a10", strokeWidth: 1.5 }));
    coin.add(new Konva.Circle({ radius: 7.5, stroke: "#d49a1c", strokeWidth: 1 }));
    coin.add(new Konva.Text({ x: -6, y: -7, width: 12, text: "$", fontSize: 14, fontFamily: "Arial", fontStyle: "bold", fill: "#7a4f12", align: "center" }));
    return coin;
};

const sectionLabel = (x: number, y: number, width: number, text: string): Konva.Group => {
    const label = new Konva.Group({ listening: false });
    const title = new Konva.Text({ x, y, text, fontSize: 13, fontFamily: "Arial", fontStyle: "bold", letterSpacing: 3, fill: "#8a5a2b" });
    label.add(title);
    label.add(new Konva.Line({ points: [x + title.width() + 12, y + 7, x + width, y + 7], stroke: "#d9c193", strokeWidth: 2, dash: [6, 4] }));
    return label;
};

const STALL = { x: 90, y: 150, width: 620, height: 489 };
const GAZETTE = { x: 262, y: 300, width: 368, height: 146 };
const BUTTON_X = STAGE_WIDTH / 2 - 150;
const BUTTON_WIDTH = 300;

/**
 * MorningEventsScreenView - Renders the morning events UI
 */
export class MorningEventsScreenView implements View {
    private group: Konva.Group;
    private background: Konva.Image;
    private backgroundAnimation: Konva.Animation | null = null;
    private backgroundPhase = 0;
    private titleText: Konva.Text;
    private moneyText: Konva.Text;
    private cropText: Konva.Text;
    private eggText: Konva.Text;
    private infoHeadline!: Konva.Text;
    private infoText!: Konva.Text;
    private infoFooter!: Konva.Text;
    private dailyQuizButton: Konva.Group;
    private quizBadge: Konva.Group;
    private continueButton: Konva.Group;
    private shopGroup: Konva.Group | null = null;
    private quizGroup: Konva.Group | null = null;
    private quizChoiceHandler: ((index: number) => void) | null = null;
    private shopPurchaseHandler: ((defenseType: string) => void) | null = null;
    private shopUpgradeHandler: ((defenseType: string) => void) | null = null;
    private buyCropHandler: (() => void) | null = null;
    private sellCropHandler: (() => void) | null = null;
    private sellEggHandler: (() => void) | null = null;
    private lanterns: Konva.Group[] = [];
    private swingSigns: Konva.Group[] = [];

    constructor(
        onBuy: () => void,
        onSell: () => void,
        onSellEgg: () => void,
        onContinue: () => void,
        onOpenQuiz?: () => void,
        onSelectQuizChoice?: (index: number) => void,
        onOpenShop?: () => void,
        onPurchaseDefense?: (defenseType: string) => void,
        onUpgradeDefense?: (defenseType: string) => void,
    ) {
        this.group = new Konva.Group({ visible: false });
        this.quizChoiceHandler = onSelectQuizChoice ?? null;
        this.shopPurchaseHandler = onPurchaseDefense ?? null;
        this.shopUpgradeHandler = onUpgradeDefense ?? null;
        this.buyCropHandler = onBuy;
        this.sellCropHandler = onSell;
        this.sellEggHandler = onSellEgg;

        // Background image with subtle float animation
        const bgImage = loadImage(backgroundSrc);
        this.background = new Konva.Image({
            x: -20,
            y: -20,
            width: STAGE_WIDTH + 40,
            height: STAGE_HEIGHT + 40,
            image: bgImage,
            listening: false,
        });
        if (!bgImage.complete) {
            bgImage.onload = () => this.group.getLayer()?.batchDraw();
        }
        this.group.add(this.background);
        this.group.add(new Konva.Rect({
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: STAGE_HEIGHT },
            fillLinearGradientColorStops: [0, "rgba(255, 190, 110, 0.28)", 0.45, "rgba(255, 220, 160, 0)", 1, "rgba(60, 30, 10, 0.3)"],
            listening: false,
        }));

        const stallImage = loadImage(stallSrc);
        this.group.add(new Konva.Ellipse({
            x: STAGE_WIDTH / 2,
            y: STALL.y + STALL.height - 4,
            radiusX: STALL.width / 2,
            radiusY: 18,
            fill: "rgba(40, 20, 5, 0.3)",
            listening: false,
        }));
        this.group.add(new Konva.Image({ ...STALL, image: stallImage, listening: false }));
        if (!stallImage.complete) {
            stallImage.onload = () => this.group.getLayer()?.batchDraw();
        }
        this.drawStallInterior();
        this.drawGazette();
        this.drawCounter();
        this.drawSign();

        this.moneyText = this.createWalletChip(STAGE_WIDTH / 2 - 198, "MONEY", coinIcon(20, 18));
        this.cropText = this.createWalletChip(STAGE_WIDTH / 2 - 60, "CROPS", imageIcon(images.wheat, 20, 18, 30));
        this.eggText = this.createWalletChip(STAGE_WIDTH / 2 + 78, "EGGS", eggIcon(20, 18, 0.95));
        this.titleText = this.group.findOne<Konva.Text>(".dayText")!;

        this.group.add(makeButton({
            x: BUTTON_X,
            y: 466,
            width: BUTTON_WIDTH,
            height: 52,
            text: "OPEN SHOP",
            color: "#f0a020",
            lip: "#a0620a",
            badge: "$",
        }, () => onOpenShop?.()));

        this.dailyQuizButton = makeButton({
            x: BUTTON_X,
            y: 528,
            width: BUTTON_WIDTH,
            height: 52,
            text: "DAILY QUIZ",
            color: "#8e44ad",
            lip: "#5b2470",
            badge: "?",
        }, () => onOpenQuiz?.());
        this.quizBadge = new Konva.Group({ x: BUTTON_WIDTH - 10, y: 2, listening: false });
        this.quizBadge.add(new Konva.Rect({ x: -24, y: -10, width: 48, height: 22, cornerRadius: 11, fill: "#e0453a", stroke: "white", strokeWidth: 2 }));
        this.quizBadge.add(new Konva.Text({ x: -24, y: -5, width: 48, text: "NEW!", fontSize: 12, fontFamily: "Arial", fontStyle: "bold", fill: "white", align: "center" }));
        this.dailyQuizButton.add(this.quizBadge);
        this.dailyQuizButton.visible(false);
        this.group.add(this.dailyQuizButton);

        this.continueButton = makeButton({
            x: BUTTON_X,
            y: 528,
            width: BUTTON_WIDTH,
            height: 52,
            text: "CONTINUE TO FARM",
            color: "#2fa84f",
            lip: "#1b6b31",
        }, onContinue);
        this.group.add(this.continueButton);
    }

    private drawStallInterior(): void {
        const interior = new Konva.Group({ listening: false });
        interior.add(new Konva.Rect({
            x: 132,
            y: 292,
            width: 536,
            height: 352,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: 352 },
            fillLinearGradientColorStops: [0, "rgba(92, 54, 24, 0.55)", 1, "rgba(42, 22, 8, 0.72)"],
        }));
        for (let i = 0; i < 7; i++) {
            interior.add(new Konva.Rect({
                x: 140 + i * 74,
                y: 300,
                width: 68,
                height: 336,
                fill: i % 2 === 0 ? "rgba(120, 72, 32, 0.28)" : "rgba(70, 40, 16, 0.22)",
            }));
        }
        interior.add(woodRect({ x: 148, y: 292, width: 504, height: 16, cornerRadius: 3, strokeWidth: 2 }));
        this.group.add(interior);

        this.drawBunting();
        this.drawLanterns();
        this.drawChalkboard();
        this.drawOpenSign();
    }

    private drawBunting(): void {
        const bunting = new Konva.Group({ listening: false });
        bunting.add(new Konva.Line({ points: [150, 262, 650, 266], stroke: "#5a3a1a", strokeWidth: 2.5 }));
        const colors = ["#c0392b", GOLD, "#fff6df", "#2f6fc4"];
        for (let i = 0; i < 13; i++) {
            const x = 160 + i * 38;
            const y = 262 + (i % 2) * 5;
            bunting.add(new Konva.Line({
                points: [x, y, x + 18, y, x + 9, y + 24],
                closed: true,
                fill: colors[i % colors.length],
                stroke: "#4a2c0a",
                strokeWidth: 1,
            }));
        }
        this.group.add(bunting);
    }

    private drawLanterns(): void {
        const spots: [number, string][] = [
            [176, "#d64535"],
            [288, "#f0a020"],
            [400, "#d64535"],
            [512, "#f0a020"],
            [624, "#d64535"],
        ];
        for (const [x, color] of spots) {
            const lantern = new Konva.Group({ x, y: 244, listening: false });
            lantern.add(new Konva.Line({ points: [0, -16, 0, 2], stroke: "#5a3a1a", strokeWidth: 2 }));
            lantern.add(new Konva.Rect({ x: -7, y: 0, width: 14, height: 5, fill: "#4a2c0a", cornerRadius: 1 }));
            lantern.add(new Konva.Circle({ y: 22, radius: 15, fill: color, stroke: "#6a1c12", strokeWidth: 1.5 }));
            lantern.add(new Konva.Circle({ y: 22, radius: 9, fill: "rgba(255, 230, 140, 0.45)" }));
            lantern.add(new Konva.Circle({ x: -4, y: 16, radius: 3.5, fill: "rgba(255, 255, 255, 0.55)" }));
            this.group.add(lantern);
            this.lanterns.push(lantern);
        }
    }

    private drawChalkboard(): void {
        const board = new Konva.Group({ x: 108, y: 304, listening: false });
        board.add(woodRect({ x: -6, y: -6, width: 144, height: 160, cornerRadius: 8, strokeWidth: 2 }));
        board.add(new Konva.Rect({ width: 132, height: 148, cornerRadius: 6, fill: "#234536", stroke: "#13261d", strokeWidth: 2 }));
        board.add(new Konva.Text({
            x: 6,
            y: 10,
            width: 120,
            text: "TODAY'S PRICES",
            fontSize: 11,
            fontFamily: "Arial",
            fontStyle: "bold",
            letterSpacing: 1,
            fill: "#f4e9c8",
            align: "center",
        }));
        board.add(new Konva.Line({ points: [16, 28, 116, 28], stroke: "#f4e9c8", strokeWidth: 1 }));
        const rows: [string, string][] = [
            ["Crops sell", `$${ItemCosts[GameItem.Crop]}`],
            ["Seeds", `$${CROP_BUY_COST}`],
            ["Eggs", `$${ItemCosts[GameItem.Egg]}`],
            ["Wire", `$${DEFENSE_CONFIGS.barbed_wire.cost}`],
            ["Sandbags", `$${DEFENSE_CONFIGS.sandbag.cost}`],
        ];
        rows.forEach(([name, price], i) => {
            const y = 38 + i * 20;
            board.add(new Konva.Text({ x: 10, y, width: 78, text: name, fontSize: 12, fontFamily: "Georgia", fill: "#e6d7b0" }));
            board.add(new Konva.Text({ x: 70, y, width: 52, text: price, fontSize: 12, fontFamily: "Arial", fontStyle: "bold", fill: GOLD, align: "right" }));
        });
        this.group.add(board);
    }

    private drawOpenSign(): void {
        const sign = new Konva.Group({ x: 668, y: 282, rotation: -7, listening: false });
        sign.add(new Konva.Line({ points: [0, 0, 0, 22], stroke: "#5a3a1a", strokeWidth: 3 }));
        sign.add(new Konva.Rect({ x: -30, y: 20, width: 60, height: 72, cornerRadius: 6, fill: "#1b6b31", stroke: "#0f3d1c", strokeWidth: 3 }));
        sign.add(new Konva.Text({
            x: -30,
            y: 46,
            width: 60,
            text: "OPEN",
            fontSize: 16,
            fontFamily: "Arial",
            fontStyle: "bold",
            letterSpacing: 2,
            fill: GOLD,
            align: "center",
        }));
        this.group.add(sign);
        this.swingSigns.push(sign);
    }

    private drawGazette(): void {
        const gazette = new Konva.Group({ x: GAZETTE.x, y: GAZETTE.y, listening: false });
        gazette.add(woodRect({ x: -10, y: -10, width: GAZETTE.width + 20, height: GAZETTE.height + 20, cornerRadius: 8, strokeWidth: 2 }));
        gazette.add(new Konva.Rect({ x: 3, y: 5, width: GAZETTE.width, height: GAZETTE.height, fill: "#e5d4ae" }));
        gazette.add(new Konva.Rect({ width: GAZETTE.width, height: GAZETTE.height, fill: PARCHMENT, stroke: "#c9a66b", strokeWidth: 1.5 }));
        gazette.add(new Konva.Line({ points: [GAZETTE.width - 28, 0, GAZETTE.width, 0, GAZETTE.width, 28], closed: true, fill: "#efe2c2" }));
        gazette.add(new Konva.Text({
            y: 8,
            width: GAZETTE.width,
            text: "THE MORNING GAZETTE",
            fontSize: 14,
            fontFamily: "Georgia",
            fontStyle: "bold",
            letterSpacing: 1.5,
            fill: INK,
            align: "center",
        }));
        gazette.add(new Konva.Line({ points: [14, 28, GAZETTE.width - 14, 28], stroke: INK, strokeWidth: 2 }));
        gazette.add(new Konva.Line({ points: [14, 32, GAZETTE.width - 14, 32], stroke: INK, strokeWidth: 0.8 }));
        gazette.add(new Konva.Text({
            y: 36,
            width: GAZETTE.width,
            text: "CAMPION, WESTERN AUSTRALIA  •  1932",
            fontSize: 9,
            fontFamily: "Georgia",
            fontStyle: "italic",
            fill: "#7a5a3a",
            align: "center",
        }));
        this.infoHeadline = new Konva.Text({ width: GAZETTE.width, text: "", fontSize: 15, fontFamily: "Georgia", fontStyle: "bold", fill: "#8a2a1a", align: "center" });
        this.infoText = new Konva.Text({ width: GAZETTE.width - 28, x: 14, text: "", fontSize: 14, fontFamily: "Georgia", fill: INK, align: "center", lineHeight: 1.25 });
        this.infoFooter = new Konva.Text({ width: GAZETTE.width, text: "", fontSize: 11, fontFamily: "Georgia", fontStyle: "italic", fill: "#7a5a3a", align: "center" });
        gazette.add(this.infoHeadline, this.infoText, this.infoFooter);
        gazette.add(new Konva.Circle({ x: GAZETTE.width / 2, y: -8, radius: 7, fill: "#d64535", stroke: "#7a1f14", strokeWidth: 1.5 }));
        gazette.add(new Konva.Circle({ x: GAZETTE.width / 2 - 2, y: -10, radius: 2, fill: "rgba(255, 255, 255, 0.7)" }));
        this.group.add(gazette);
    }

    private drawSign(): void {
        const sign = new Konva.Group({ listening: false });
        for (const ropeX of [236, 564]) {
            sign.add(new Konva.Line({ points: [ropeX, 0, ropeX, 18], stroke: "#5a3a1a", strokeWidth: 4 }));
            sign.add(new Konva.Circle({ x: ropeX, y: 4, radius: 4, fill: "#3a2412", stroke: "#a07a4a", strokeWidth: 1 }));
        }
        sign.add(new Konva.Line({
            points: [188, 36, 168, 18, 168, 72, 188, 54],
            closed: true,
            fill: "#4a2a10",
        }));
        sign.add(new Konva.Line({
            points: [612, 36, 632, 18, 632, 72, 612, 54],
            closed: true,
            fill: "#4a2a10",
        }));
        sign.add(woodRect({ x: 188, y: 12, width: 424, height: 62, cornerRadius: 8 }));
        sign.add(new Konva.Line({ points: [198, 43, 602, 43], stroke: "rgba(0, 0, 0, 0.22)", strokeWidth: 1 }));
        for (const nailX of [204, 596]) {
            sign.add(new Konva.Circle({ x: nailX, y: 26, radius: 3.5, fill: "#3a2412", stroke: "#c9a66b", strokeWidth: 1 }));
        }
        sign.add(new Konva.Text({
            y: 24,
            width: STAGE_WIDTH,
            text: "MORNING MARKET",
            fontSize: 30,
            fontFamily: "Arial",
            fontStyle: "bold",
            letterSpacing: 3,
            fill: GOLD,
            stroke: "#4a2c0a",
            strokeWidth: 3,
            fillAfterStrokeEnabled: true,
            align: "center",
        }));
        sign.add(new Konva.Rect({ x: STAGE_WIDTH / 2 - 70, y: 66, width: 140, height: 28, cornerRadius: 14, fill: "#c0392b", stroke: "#7a1f14", strokeWidth: 2 }));
        sign.add(new Konva.Text({
            name: "dayText",
            x: STAGE_WIDTH / 2 - 70,
            y: 72,
            width: 140,
            text: "DAY 1",
            fontSize: 15,
            fontFamily: "Arial",
            fontStyle: "bold",
            letterSpacing: 2,
            fill: "white",
            align: "center",
        }));
        this.group.add(sign);
    }

    private drawCounter(): void {
        const counter = new Konva.Group({ listening: false });
        counter.add(woodRect({ x: 96, y: 640, width: 608, height: 74, cornerRadius: 8 }));
        counter.add(new Konva.Rect({ x: 96, y: 640, width: 608, height: 8, fill: "rgba(255, 220, 170, 0.28)" }));
        counter.add(new Konva.Rect({ x: 118, y: 602, width: 70, height: 44, fill: "#8a5a2b", stroke: "#4a2c0a", strokeWidth: 2, cornerRadius: 3 }));
        counter.add(new Konva.Rect({ x: 124, y: 608, width: 58, height: 8, fill: "#c9a66b" }));
        for (const wx of [210, 248, 286]) {
            counter.add(imageIcon(images.wheat, wx, 618, 54));
        }
        counter.add(new Konva.Ellipse({ x: 360, y: 636, radiusX: 22, radiusY: 16, fill: "#6b4424", stroke: "#3a2412", strokeWidth: 2 }));
        counter.add(new Konva.Ellipse({ x: 360, y: 622, radiusX: 18, radiusY: 14, fill: "#8a5a2b", stroke: "#3a2412", strokeWidth: 2 }));
        counter.add(imageIcon(images.sprout, 400, 618, 40));
        counter.add(imageIcon(images.mine, 440, 622, 34));
        counter.add(new Konva.Ellipse({ x: 620, y: 636, radiusX: 50, radiusY: 11, fill: "#8a5a2b", stroke: "#4a2c0a", strokeWidth: 2 }));
        for (const [ex, ey] of [[594, 624], [620, 616], [646, 624], [608, 632], [634, 632]]) {
            counter.add(eggIcon(ex, ey, 0.95));
        }
        counter.add(new Konva.Rect({ x: 560, y: 632, width: 120, height: 16, cornerRadius: 4, fill: "#a0703c", stroke: "#4a2c0a", strokeWidth: 2 }));
        this.group.add(counter);
    }

    private createWalletChip(x: number, label: string, icon: Konva.Group | Konva.Shape): Konva.Text {
        const chip = new Konva.Group({ x, y: 102, listening: false });
        chip.add(woodRect({ width: 120, height: 38, cornerRadius: 19, strokeWidth: 2 }));
        chip.add(new Konva.Circle({ x: 20, y: 19, radius: 14, fill: "rgba(255, 243, 214, 0.18)" }));
        chip.add(icon);
        chip.add(new Konva.Text({ x: 40, y: 5, text: label, fontSize: 9, fontFamily: "Arial", fontStyle: "bold", letterSpacing: 1, fill: "#d9c28f" }));
        const value = new Konva.Text({ x: 40, y: 16, width: 74, text: "0", fontSize: 17, fontFamily: "Arial", fontStyle: "bold", fill: "#fff3d6", wrap: "none", ellipsis: true });
        chip.add(value);
        this.group.add(chip);
        return value;
    }

    updateDay(day: number): void {
        this.titleText.text(`DAY ${day}`);
        this.group.getLayer()?.draw();
    }

    updateMoney(amount: number): void {
        this.moneyText.text(`$${amount}`);
        this.group.getLayer()?.draw();
    }

    updateInventory(cropCount: number, eggCount: number = 0): void {
        this.cropText.text(`${cropCount}`);
        this.eggText.text(`${eggCount}`);
        this.group.getLayer()?.draw();
    }

    setInfoText(text: string, color: string = INK, _fontSize: number = 16): void {
        const isFact = text.startsWith("Fact:");
        const [first, ...rest] = text.split("\n");
        const footer = rest.join(" ").trim().replace(/^\((.*)\)$/, "$1");
        let headline = "TOWN NOTICE";
        if (isFact) headline = "DID YOU KNOW?";
        else if (first.includes("CORRECT")) headline = "QUIZ CLEARED!";
        else if (first.includes("Incorrect")) headline = "NOT QUITE...";
        this.infoHeadline.text(headline);
        this.infoHeadline.fill(color === INK || isFact ? "#8a2a1a" : color);
        this.infoText.text(first.replace(/^Fact:\s*/, "").replace(/^[✓✗]\s*/, ""));
        this.infoText.fill(isFact ? INK : color);
        this.infoFooter.text(footer);
        this.layoutGazetteCopy();
        this.group.getLayer()?.draw();
    }

    private layoutGazetteCopy(): void {
        const top = 50;
        const bottom = GAZETTE.height - 10;
        const gap = 6;
        const blockHeight = this.infoHeadline.height() + gap + this.infoText.height() + (this.infoFooter.text() ? gap + this.infoFooter.height() : 0);
        let y = top + Math.max(0, (bottom - top - blockHeight) / 2);
        this.infoHeadline.y(y);
        y += this.infoHeadline.height() + gap;
        this.infoText.y(y);
        y += this.infoText.height() + gap;
        this.infoFooter.y(y);
    }

    setDailyQuizButtonVisible(visible: boolean): void {
        this.dailyQuizButton.visible(visible);
        this.continueButton.y(visible ? 590 : 528);
        this.group.getLayer()?.draw();
    }

    showQuizPopup(question: string, choices: string[]): void {
        if (!this.quizChoiceHandler) return;
        this.hideQuizPopup();
        this.hideShopPopup(); // Close shop if open

        const panelWidth = 560;
        const choiceHeight = 48;
        const gapY = 14;
        const qText = new Konva.Text({
            width: panelWidth - 60,
            text: question,
            fontSize: 19,
            fontFamily: "Georgia",
            fontStyle: "bold",
            fill: INK,
            align: "center",
            lineHeight: 1.25,
        });
        const choicesTop = 92 + qText.height() + 20;
        const panelHeight = choicesTop + choices.length * (choiceHeight + gapY) + 14;
        const { popup, x: panelX, y: panelY } = createModal(panelWidth, panelHeight);

        popup.add(makeRibbon(STAGE_WIDTH / 2, panelY - 24, 260, "POP QUIZ!"));

        const reward = new Konva.Group({ x: STAGE_WIDTH / 2 - 130, y: panelY + 34 });
        reward.add(new Konva.Rect({ width: 260, height: 30, cornerRadius: 15, fill: "#efe2c2", stroke: "#c9a66b", strokeWidth: 1.5 }));
        reward.add(imageIcon(images.mine, 22, 15, 22));
        reward.add(new Konva.Text({ x: 40, y: 8, width: 210, text: "Answer right to earn 1 free mine", fontSize: 13, fontFamily: "Arial", fontStyle: "bold", fill: "#6d4c41" }));
        popup.add(reward);

        qText.position({ x: panelX + 30, y: panelY + 82 });
        popup.add(qText);

        const colors = [["#2f80ed", "#1a4f99"], ["#27ae60", "#176b3a"], ["#f2994a", "#a85a16"], ["#e0453a", "#8f231b"]];
        const btnWidth = panelWidth - 80;
        choices.forEach((choice, i) => {
            const [color, lip] = colors[i % colors.length];
            popup.add(makeButton({
                x: STAGE_WIDTH / 2 - btnWidth / 2,
                y: panelY + choicesTop + i * (choiceHeight + gapY),
                width: btnWidth,
                height: choiceHeight,
                text: choice,
                color,
                lip,
                fontSize: 17,
                badge: "ABCD"[i] ?? String(i + 1),
            }, () => this.quizChoiceHandler?.(i)));
        });

        this.group.add(popup);
        this.quizGroup = popup;
        this.group.getLayer()?.draw();
    }

    hideQuizPopup(): void {
        if (this.quizGroup) {
            this.quizGroup.destroy();
            this.quizGroup = null;
            this.group.getLayer()?.draw();
        }
    }

    showShopPopup(
        defenseInventory: Record<string, number>,
        currentMoney: number,
        cropCount: number,
        eggCount: number,
        defenseLevels: Record<UpgradableDefenseType, number>
    ): void {
        this.hideShopPopup();
        this.hideQuizPopup(); // Close quiz if open

        const panelWidth = 740;
        const panelHeight = 590;
        const { popup, x: panelX, y: panelY } = createModal(panelWidth, panelHeight, () => this.hideShopPopup());

        // Header band
        popup.add(woodRect({ x: panelX, y: panelY, width: panelWidth, height: 66, cornerRadius: [14, 14, 0, 0], strokeWidth: 0 }));
        popup.add(new Konva.Text({
            x: panelX + 26,
            y: panelY + 17,
            text: "TOWN MARKET",
            fontSize: 30,
            fontFamily: "Arial",
            fontStyle: "bold",
            letterSpacing: 2,
            fill: GOLD,
            stroke: "#4a2c0a",
            strokeWidth: 3,
            fillAfterStrokeEnabled: true,
        }));
        const wallet: [string, Konva.Group | Konva.Shape][] = [
            [`$${currentMoney}`, coinIcon(18, 17)],
            [`${cropCount}`, imageIcon(images.wheat, 18, 17, 26)],
            [`${eggCount}`, eggIcon(18, 17, 0.85)],
        ];
        wallet.forEach(([value, icon], i) => {
            const chip = new Konva.Group({ x: panelX + 370 + i * 100, y: panelY + 16, listening: false });
            chip.add(new Konva.Rect({ width: 92, height: 34, cornerRadius: 17, fill: "rgba(30, 16, 4, 0.6)", stroke: "#c9a66b", strokeWidth: 1.5 }));
            chip.add(icon);
            chip.add(new Konva.Text({ x: 36, y: 9, width: 52, text: value, fontSize: 17, fontFamily: "Arial", fontStyle: "bold", fill: "#fff3d6", wrap: "none", ellipsis: true }));
            popup.add(chip);
        });
        const closeX = new Konva.Group({ x: panelX + panelWidth - 30, y: panelY + 33, cursor: "pointer" });
        closeX.add(new Konva.Circle({ y: 3, radius: 17, fill: "#8f231b" }));
        closeX.add(new Konva.Circle({ radius: 17, fill: "#e0453a", stroke: "rgba(255, 255, 255, 0.5)", strokeWidth: 1.5 }));
        closeX.add(new Konva.Text({ x: -10, y: -10, width: 20, text: "X", fontSize: 20, fontFamily: "Arial", fontStyle: "bold", fill: "white", align: "center" }));
        closeX.on("click tap", () => this.hideShopPopup());
        popup.add(closeX);

        const innerX = panelX + 24;
        const innerWidth = panelWidth - 48;
        const cardGap = 14;
        const cardWidth = (innerWidth - cardGap * 2) / 3;

        const cardBase = (x: number, y: number, h: number, icon: Konva.Group | Konva.Shape, name: string, desc: string): Konva.Group => {
            const card = new Konva.Group({ x, y });
            card.add(new Konva.Rect({ y: 3, width: cardWidth, height: h, cornerRadius: 12, fill: "#d9c193" }));
            card.add(new Konva.Rect({ width: cardWidth, height: h, cornerRadius: 12, fill: "#fffaf0", stroke: "#d9c193", strokeWidth: 2 }));
            card.add(new Konva.Circle({ x: 38, y: 40, radius: 28, fill: "#efe2c2", stroke: "#c9a66b", strokeWidth: 2 }));
            card.add(icon);
            card.add(new Konva.Text({ x: 76, y: 16, width: cardWidth - 84, text: name, fontSize: 15, fontFamily: "Arial", fontStyle: "bold", fill: INK }));
            card.add(new Konva.Text({ x: 76, y: 37, width: cardWidth - 84, text: desc, fontSize: 11, fontFamily: "Arial", fill: "#7a5a3a", lineHeight: 1.25 }));
            return card;
        };

        // Farm goods
        popup.add(sectionLabel(innerX, panelY + 82, innerWidth, "FARM GOODS"));
        const goods = [
            {
                icon: imageIcon(images.sprout, 38, 40, 46),
                name: "Crop Seeds",
                desc: "Plant fresh wheat on an empty planter.",
                stock: `In storage: ${cropCount}`,
                action: `BUY   $${CROP_BUY_COST}`,
                color: "#27ae60",
                lip: "#176b3a",
                enabled: currentMoney >= CROP_BUY_COST,
                onClick: () => this.buyCropHandler?.(),
            },
            {
                icon: imageIcon(images.wheat, 38, 40, 46),
                name: "Harvested Crops",
                desc: "Sell stored crops for quick cash.",
                stock: `In storage: ${cropCount}`,
                action: `SELL   +$${ItemCosts[GameItem.Crop]}`,
                color: "#f0a020",
                lip: "#a0620a",
                enabled: cropCount > 0,
                onClick: () => this.sellCropHandler?.(),
            },
            {
                icon: eggIcon(38, 40, 1.5),
                name: "Emu Eggs",
                desc: "Trade raided eggs for a big payout.",
                stock: `In storage: ${eggCount}`,
                action: `SELL   +$${ItemCosts[GameItem.Egg]}`,
                color: "#f0a020",
                lip: "#a0620a",
                enabled: eggCount > 0,
                onClick: () => this.sellEggHandler?.(),
            },
        ];
        goods.forEach((item, index) => {
            const card = cardBase(innerX + index * (cardWidth + cardGap), panelY + 104, 140, item.icon, item.name, item.desc);
            card.add(new Konva.Text({ x: 14, y: 78, text: item.stock, fontSize: 12, fontFamily: "Arial", fontStyle: "bold", fill: "#6d4c41" }));
            card.add(makeButton({ x: 12, y: 98, width: cardWidth - 24, height: 32, text: item.action, color: item.color, lip: item.lip, enabled: item.enabled, fontSize: 15 }, item.onClick));
            popup.add(card);
        });

        // Defense supplies
        popup.add(sectionLabel(innerX, panelY + 262, innerWidth, "DEFENSE SUPPLIES"));
        const defenses: { type: UpgradableDefenseType; name: string; description: string }[] = [
            { type: "barbed_wire", name: "Barbed Wire", description: "Slows emus that walk through it." },
            { type: "sandbag", name: "Sandbag Barrier", description: "Blocks emus until it breaks." },
            { type: "machine_gun", name: "Machine Gun Nest", description: "Auto shoots nearby emus." },
        ];
        defenses.forEach((defense, index) => {
            const level = defenseLevels[defense.type];
            const stats = getDefenseStats(defense.type, level);
            const cost = DEFENSE_CONFIGS[defense.type].cost;
            const upgradeCost = level >= MAX_DEFENSE_LEVEL ? null : getDefenseUpgradeCost(defense.type, level);
            const owned = defenseInventory[defense.type] || 0;
            const card = cardBase(
                innerX + index * (cardWidth + cardGap),
                panelY + 284,
                204,
                imageIcon(images[defense.type], 38, 40, 42),
                defense.name,
                defense.description,
            );

            const ownedBadge = new Konva.Group({ x: 56, y: 58, listening: false });
            ownedBadge.add(new Konva.Circle({ radius: 12, fill: owned > 0 ? GOLD : "#cfc4ad", stroke: "#8a5a10", strokeWidth: 1.5 }));
            ownedBadge.add(new Konva.Text({ x: -12, y: -7, width: 24, text: `${owned}`, fontSize: 13, fontFamily: "Arial", fontStyle: "bold", fill: "#4a2c0a", align: "center" }));
            card.add(ownedBadge);

            card.add(new Konva.Text({ x: 14, y: 80, text: `LV ${level}`, fontSize: 13, fontFamily: "Arial", fontStyle: "bold", fill: "#5b2470" }));
            const pipWidth = (cardWidth - 76 - (MAX_DEFENSE_LEVEL - 1) * 2) / MAX_DEFENSE_LEVEL;
            for (let i = 0; i < MAX_DEFENSE_LEVEL; i++) {
                card.add(new Konva.Rect({
                    x: 62 + i * (pipWidth + 2),
                    y: 82,
                    width: pipWidth,
                    height: 9,
                    cornerRadius: 2,
                    fill: i < level ? "#9b51e0" : "#e6dcc6",
                    stroke: i < level ? "#5b2470" : "#d0c2a3",
                    strokeWidth: 1,
                }));
            }
            card.add(new Konva.Text({ x: 14, y: 100, width: cardWidth - 28, text: `Durability ${stats.maxDurability}`, fontSize: 12, fontFamily: "Arial", fill: "#6d4c41" }));
            card.add(new Konva.Text({ x: 14, y: 100, width: cardWidth - 28, text: `Owned ${owned}`, fontSize: 12, fontFamily: "Arial", fontStyle: "bold", fill: "#6d4c41", align: "right" }));

            card.add(makeButton({
                x: 12,
                y: 122,
                width: cardWidth - 24,
                height: 32,
                text: `BUY   $${cost}`,
                color: "#27ae60",
                lip: "#176b3a",
                enabled: currentMoney >= cost,
                fontSize: 15,
            }, () => this.shopPurchaseHandler?.(defense.type)));
            card.add(makeButton({
                x: 12,
                y: 162,
                width: cardWidth - 24,
                height: 30,
                text: upgradeCost === null ? "MAX LEVEL" : `UPGRADE   $${upgradeCost}`,
                color: "#8e44ad",
                lip: "#5b2470",
                enabled: upgradeCost !== null && currentMoney >= upgradeCost,
                fontSize: 13,
            }, () => this.shopUpgradeHandler?.(defense.type)));
            popup.add(card);
        });

        popup.add(new Konva.Text({
            x: panelX,
            y: panelY + 506,
            width: panelWidth,
            text: "Upgrades are permanent and make every defense of that type tougher.",
            fontSize: 12,
            fontFamily: "Georgia",
            fontStyle: "italic",
            fill: "#7a5a3a",
            align: "center",
        }));
        popup.add(makeButton(
            { x: STAGE_WIDTH / 2 - 120, y: panelY + 528, width: 240, height: 44, text: "BACK TO STALL", color: "#7d8a96", lip: "#4b5560", fontSize: 18 },
            () => this.hideShopPopup()
        ));

        this.group.add(popup);
        this.shopGroup = popup;
        this.group.getLayer()?.draw();
    }

    hideShopPopup(): void {
        if (this.shopGroup) {
            this.shopGroup.destroy();
            this.shopGroup = null;
            this.group.getLayer()?.draw();
        }
    }

    show(): void {
        this.group.visible(true);
        this.startBackgroundAnimation();
        this.group.getLayer()?.draw();
    }

    hide(): void {
        this.group.visible(false);
        this.stopBackgroundAnimation();
        this.group.getLayer()?.draw();
    }

    getGroup(): Konva.Group {
        return this.group;
    }

    private startBackgroundAnimation(): void {
        if (this.backgroundAnimation) return;
        const layer = this.group.getLayer();
        if (!layer) return;

        this.backgroundPhase = 0;
        this.backgroundAnimation = new Konva.Animation((frame) => {
            if (!frame) return;
            this.backgroundPhase += frame.timeDiff * 0.0006;
            const offsetX = Math.sin(this.backgroundPhase) * 10;
            const offsetY = Math.cos(this.backgroundPhase * 0.7) * 6;
            this.background.position({
                x: -20 + offsetX,
                y: -20 + offsetY,
            });
            const pulse = 1 + Math.sin(frame.time / 180) * 0.08;
            this.quizBadge.scale({ x: pulse, y: pulse });
            const t = frame.time / 1000;
            this.lanterns.forEach((lantern, i) => {
                lantern.rotation(Math.sin(t * 1.4 + i * 0.9) * 7);
            });
            this.swingSigns.forEach((sign, i) => {
                sign.rotation(-7 + Math.sin(t * 1.1 + i) * 5);
            });
        }, layer);
        this.backgroundAnimation.start();
    }

    private stopBackgroundAnimation(): void {
        this.backgroundAnimation?.stop();
        this.backgroundAnimation = null;
        this.background.position({ x: -20, y: -20 });
    }
}
