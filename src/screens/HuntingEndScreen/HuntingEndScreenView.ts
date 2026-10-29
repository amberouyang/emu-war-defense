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

export class HuntingEndScreenView implements View {
  private group: Konva.Group;
  private titleText: Konva.Text;
  private messageText: Konva.Text;
  private emusKilledText: Konva.Text;
  private ribbonLabel: Konva.Text;

  constructor(onContinue: () => void) {
    this.group = new Konva.Group({ visible: false });

    const bg = loadImage(backgroundSrc);
    this.group.add(new Konva.Image({ width: STAGE_WIDTH, height: STAGE_HEIGHT, image: bg, listening: false }));
    if (!bg.complete) bg.onload = () => this.group.getLayer()?.batchDraw();
    this.group.add(new Konva.Rect({
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 0, y: STAGE_HEIGHT },
      fillLinearGradientColorStops: [0, "rgba(40, 12, 20, 0.72)", 1, "rgba(20, 10, 4, 0.82)"],
      listening: false,
    }));

    const panelWidth = 520;
    const panelHeight = 360;
    const x = (STAGE_WIDTH - panelWidth) / 2;
    const y = 150;
    this.group.add(new Konva.Rect({ x: x + 4, y: y + 10, width: panelWidth, height: panelHeight, cornerRadius: 18, fill: "rgba(0,0,0,0.35)", listening: false }));
    this.group.add(woodRect({ x: x - 8, y: y - 8, width: panelWidth + 16, height: panelHeight + 16, cornerRadius: 20, listening: false }));
    this.group.add(new Konva.Rect({ x, y, width: panelWidth, height: panelHeight, cornerRadius: 14, fill: PARCHMENT, listening: false }));

    this.group.add(makeRibbon(STAGE_WIDTH / 2, y - 24, 300, " "));
    this.ribbonLabel = new Konva.Text({
      x: STAGE_WIDTH / 2 - 150,
      y: y - 13,
      width: 300,
      text: "NEST REPORT",
      fontSize: 24,
      fontFamily: "Arial",
      fontStyle: "bold",
      letterSpacing: 3,
      fill: GOLD,
      stroke: "#5a1208",
      strokeWidth: 2,
      fillAfterStrokeEnabled: true,
      align: "center",
      listening: false,
    });
    this.group.add(this.ribbonLabel);

    const emu = loadImage(emuSrc);
    this.group.add(new Konva.Circle({ x: STAGE_WIDTH / 2, y: y + 78, radius: 34, fill: "#efe2c2", stroke: "#c9a66b", strokeWidth: 3, listening: false }));
    this.group.add(new Konva.Image({ x: STAGE_WIDTH / 2 - 26, y: y + 52, width: 52, height: 52, image: emu, listening: false }));
    if (!emu.complete) emu.onload = () => this.group.getLayer()?.batchDraw();

    this.titleText = new Konva.Text({
      x,
      y: y + 124,
      width: panelWidth,
      text: "HUNT OVER",
      fontSize: 32,
      fontFamily: "Arial",
      fontStyle: "bold",
      letterSpacing: 2,
      fill: INK,
      align: "center",
    });
    this.group.add(this.titleText);

    this.messageText = new Konva.Text({
      x: x + 40,
      y: y + 168,
      width: panelWidth - 80,
      text: "",
      fontSize: 18,
      fontFamily: "Georgia",
      fontStyle: "italic",
      fill: "#6d4c41",
      align: "center",
    });
    this.group.add(this.messageText);

    this.emusKilledText = new Konva.Text({
      x,
      y: y + 208,
      width: panelWidth,
      text: "Emus downed: 0",
      fontSize: 22,
      fontFamily: "Arial",
      fontStyle: "bold",
      fill: "#8a5a10",
      align: "center",
    });
    this.group.add(this.emusKilledText);

    this.group.add(makeButton(
      { x: STAGE_WIDTH / 2 - 130, y: y + 262, width: 260, height: 56, text: "BACK TO FARM", color: "#2fa84f", lip: "#1b6b31", fontSize: 20 },
      onContinue
    ));
  }

  updateEmusKilled(count: number, reason: "ammo" | "time" | "victory"): void {
    if (reason === "victory") {
      this.ribbonLabel.text("NEST CLEARED");
      this.titleText.text("HUNT COMPLETE");
      this.titleText.fill("#1b6b31");
      this.messageText.text("Every emu in the scrub is down. The farm is safer tonight.");
    } else if (reason === "ammo") {
      this.ribbonLabel.text("OUT OF AMMO");
      this.titleText.text("HUNT OVER");
      this.titleText.fill("#8f231b");
      this.messageText.text("The rifle clicked empty. A few emus got away.");
    } else {
      this.ribbonLabel.text("TIME'S UP");
      this.titleText.text("HUNT OVER");
      this.titleText.fill("#8f231b");
      this.messageText.text("Dusk closed in. The remaining emus melted into the bush.");
    }

    this.emusKilledText.text(`Emus downed: ${count}`);
    this.group.getLayer()?.draw();
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
