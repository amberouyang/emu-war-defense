import Konva from "konva";
import { EmuModel } from "./EmuModel";
import emuSrc from "../../../assets/Emu.png";

const emuImage = typeof Image !== "undefined" ? Object.assign(new Image(), { src: emuSrc }) : (document.createElement("img") as HTMLImageElement);

export class EmuView {
  private group: Konva.Group;
  private sprite: Konva.Image;
  private flash: Konva.Circle;
  private pips: Konva.Circle[] = [];
  private model: EmuModel;
  private facing = 1;

  constructor(model: EmuModel) {
    this.model = model;

    this.group = new Konva.Group({ x: model.x, y: model.y });
    this.group.add(new Konva.Ellipse({
      y: 14,
      radiusX: 12,
      radiusY: 4,
      fill: "rgba(0, 0, 0, 0.28)",
      listening: false,
    }));

    this.sprite = new Konva.Image({
      image: emuImage,
      width: 32,
      height: 32,
      offsetX: 16,
      offsetY: 16,
    });
    if (!emuImage.complete) {
      emuImage.addEventListener("load", () => this.sprite.getLayer()?.batchDraw(), { once: true });
    }
    this.group.add(this.sprite);

    this.flash = new Konva.Circle({
      radius: 16,
      fill: "rgba(255, 80, 70, 0.45)",
      visible: false,
      listening: false,
    });
    this.group.add(this.flash);

    for (let i = 0; i < 3; i++) {
      const pip = new Konva.Circle({
        x: -10 + i * 10,
        y: -22,
        radius: 3.5,
        fill: "#58d36a",
        stroke: "#1b6b31",
        strokeWidth: 1,
        listening: false,
      });
      this.pips.push(pip);
      this.group.add(pip);
    }

    this.update();
  }

  // Update position, visibility, flashing, and facing
  update() {
    if (this.model.currentDirection === "left") this.facing = 1;
    if (this.model.currentDirection === "right") this.facing = -1;
    this.sprite.scaleX(this.facing);

    if (this.model.flashTimer > 0) {
      this.model.flashTimer--;
      this.flash.visible(this.model.flashTimer % 4 < 2);
    } else {
      this.flash.visible(false);
    }

    const remaining = Math.max(0, this.model.maxHits - this.model.hitCount);
    this.pips.forEach((pip, i) => {
      const on = i < remaining;
      pip.fill(on ? "#58d36a" : "#6b7178");
      pip.stroke(on ? "#1b6b31" : "#3a3f45");
    });

    this.group.position({ x: this.model.x, y: this.model.y });
    this.group.visible(this.model.active);
  }

  getGroup() {
    return this.group;
  }
}
