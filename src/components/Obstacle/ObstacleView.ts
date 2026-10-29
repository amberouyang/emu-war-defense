import Konva from "konva";
import { ObstacleModel } from "./ObstacleModel";

export class ObstacleView {
  private shape: Konva.Group;
  private model: ObstacleModel;
  constructor(model: ObstacleModel) {
    this.model = model;
    this.shape = new Konva.Group({ listening: false });
    if (model.type === "rock") {
      this.drawRock();
    } else {
      this.drawBush();
    }
  }

  private drawRock(): void {
    const { x, y, w, h } = this.model;
    this.shape.add(new Konva.Ellipse({
      x: x + w / 2 + 2,
      y: y + h - 2,
      radiusX: w / 2,
      radiusY: 6,
      fill: "rgba(0, 0, 0, 0.28)",
    }));
    this.shape.add(new Konva.Ellipse({
      x: x + w / 2,
      y: y + h / 2,
      radiusX: w / 2,
      radiusY: h / 2,
      fillLinearGradientStartPoint: { x: 0, y: -h / 2 },
      fillLinearGradientEndPoint: { x: 0, y: h / 2 },
      fillLinearGradientColorStops: [0, "#b8bdc2", 1, "#6e747a"],
      stroke: "#4a5056",
      strokeWidth: 2,
    }));
    this.shape.add(new Konva.Ellipse({
      x: x + w * 0.38,
      y: y + h * 0.38,
      radiusX: w * 0.18,
      radiusY: h * 0.1,
      fill: "rgba(255, 255, 255, 0.28)",
    }));
  }

  private drawBush(): void {
    const { x, y, w, h } = this.model;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    this.shape.add(new Konva.Ellipse({
      x: cx,
      y: cy + r * 0.7,
      radiusX: r,
      radiusY: r * 0.28,
      fill: "rgba(0, 0, 0, 0.28)",
    }));
    const blobs = [[-0.45, 0.1, 0.7], [0.4, 0.15, 0.65], [0, -0.25, 0.85]];
    for (const [dx, dy, scale] of blobs) {
      this.shape.add(new Konva.Circle({
        x: cx + dx * r,
        y: cy + dy * r,
        radius: r * scale,
        fill: "#2f7422",
        stroke: "#1b4d16",
        strokeWidth: 1.5,
      }));
      this.shape.add(new Konva.Circle({
        x: cx + dx * r - 2,
        y: cy + dy * r - 3,
        radius: r * scale * 0.45,
        fill: "#4b9a32",
      }));
    }
    for (const [dx, dy] of [[-6, -4], [8, 2], [0, -10], [5, 8]]) {
      this.shape.add(new Konva.Circle({
        x: cx + dx,
        y: cy + dy,
        radius: 2.2,
        fill: "#e0453a",
      }));
    }
  }

  getNode() {
    return this.shape;
  }
}
