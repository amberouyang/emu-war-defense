import Konva from "konva";
import type { View } from "../../types";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import { GOLD, INK, PARCHMENT, makeButton, makeRibbon, woodRect } from "../../utils/uiKit.ts";
import backgroundSrc from "../../../assets/background.png";
import emuSrc from "../../../assets/Emu.png";

const loadImage = (src: string): HTMLImageElement => {
  const image = typeof Image !== "undefined" ? new Image() : document.createElement("img") as HTMLImageElement;
  image.src = src;
  return image;
};

export class HuntingIntroScreenView implements View {
  private group: Konva.Group;

  constructor(onStart: () => void) {
    this.group = new Konva.Group({ visible: false });

    const bg = loadImage(backgroundSrc);
    this.group.add(new Konva.Image({ width: STAGE_WIDTH, height: STAGE_HEIGHT, image: bg, listening: false }));
    if (!bg.complete) bg.onload = () => this.group.getLayer()?.batchDraw();
    this.group.add(new Konva.Rect({
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 0, y: STAGE_HEIGHT },
      fillLinearGradientColorStops: [0, "rgba(20, 40, 20, 0.55)", 1, "rgba(20, 12, 4, 0.72)"],
      listening: false,
    }));

    const panelWidth = 560;
    const panelHeight = 470;
    const x = (STAGE_WIDTH - panelWidth) / 2;
    const y = 96;
    this.group.add(new Konva.Rect({ x: x + 4, y: y + 10, width: panelWidth, height: panelHeight, cornerRadius: 18, fill: "rgba(0,0,0,0.35)", listening: false }));
    this.group.add(woodRect({ x: x - 8, y: y - 8, width: panelWidth + 16, height: panelHeight + 16, cornerRadius: 20, listening: false }));
    this.group.add(new Konva.Rect({ x, y, width: panelWidth, height: panelHeight, cornerRadius: 14, fill: PARCHMENT, listening: false }));
    this.group.add(makeRibbon(STAGE_WIDTH / 2, y - 24, 280, "EMU HUNT"));

    const emu = loadImage(emuSrc);
    this.group.add(new Konva.Circle({ x: STAGE_WIDTH / 2, y: y + 78, radius: 36, fill: "#efe2c2", stroke: "#c9a66b", strokeWidth: 3, listening: false }));
    this.group.add(new Konva.Image({ x: STAGE_WIDTH / 2 - 28, y: y + 50, width: 56, height: 56, image: emu, listening: false }));
    if (!emu.complete) emu.onload = () => this.group.getLayer()?.batchDraw();

    this.group.add(new Konva.Text({
      x,
      y: y + 122,
      width: panelWidth,
      text: "A mob is nesting in the scrub. Hunt them down before they scatter.",
      fontSize: 16,
      fontFamily: "Georgia",
      fill: INK,
      align: "center",
      listening: false,
    }));

    const rows: [string, string][] = [
      ["WASD / ARROWS", "Move through the scrub"],
      ["SPACE", "Shoot. Each emu takes 3 hits"],
      ["ROCKS & BUSHES", "Block your path and your shots"],
      ["1:00  /  100 AMMO", "Clear the nest before either runs out"],
    ];
    rows.forEach(([key, desc], i) => {
      const rowY = y + 168 + i * 48;
      this.group.add(new Konva.Rect({ x: x + 36, y: rowY, width: panelWidth - 72, height: 40, cornerRadius: 10, fill: "#fffaf0", stroke: "#d9c193", strokeWidth: 1.5, listening: false }));
      this.group.add(new Konva.Rect({ x: x + 48, y: rowY + 7, width: 168, height: 26, cornerRadius: 6, fill: "#3e2723", listening: false }));
      this.group.add(new Konva.Text({ x: x + 48, y: rowY + 12, width: 168, text: key, fontSize: 12, fontFamily: "Arial", fontStyle: "bold", fill: GOLD, align: "center", listening: false }));
      this.group.add(new Konva.Text({ x: x + 228, y: rowY + 12, width: 280, text: desc, fontSize: 15, fontFamily: "Arial", fill: INK, listening: false }));
    });

    this.group.add(makeButton(
      { x: STAGE_WIDTH / 2 - 130, y: y + 372, width: 260, height: 56, text: "START HUNT", color: "#2fa84f", lip: "#1b6b31", fontSize: 22 },
      onStart
    ));
  }

  show(): void {
    this.group.visible(true);
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
