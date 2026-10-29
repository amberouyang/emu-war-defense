import Konva from "konva";
import { PlayerModel } from "./PlayerModel";

// PlayerView: Renders player on canvas and updates appearance
export class PlayerView {
  private group: Konva.Group;
  private body: Konva.Circle;
  private gun: Konva.Rect;
  private model: PlayerModel;

  constructor(model: PlayerModel) {
    this.model = model;

    this.group = new Konva.Group({ x: model.x, y: model.y });
    this.group.add(new Konva.Ellipse({
      y: 16,
      radiusX: 14,
      radiusY: 5,
      fill: "rgba(0, 0, 0, 0.28)",
      listening: false,
    }));

    this.body = new Konva.Circle({
      radius: 13,
      fillLinearGradientStartPoint: { x: 0, y: -13 },
      fillLinearGradientEndPoint: { x: 0, y: 13 },
      fillLinearGradientColorStops: [0, "#4a8fd4", 1, "#1f4f93"],
      stroke: "#12345c",
      strokeWidth: 1.5,
    });
    this.group.add(this.body);
    this.group.add(new Konva.Circle({
      y: -8,
      radius: 7,
      fill: "#f0c9a0",
      stroke: "#b88962",
      strokeWidth: 1,
    }));

    this.group.add(new Konva.Ellipse({
      y: -13,
      radiusX: 11,
      radiusY: 3.5,
      fill: "#6b4424",
      stroke: "#3a2412",
      strokeWidth: 1,
    }));
    this.group.add(new Konva.Ellipse({
      y: -17,
      radiusX: 6.5,
      radiusY: 4,
      fill: "#8a5a2b",
      stroke: "#3a2412",
      strokeWidth: 1,
    }));

    this.gun = new Konva.Rect({
      width: 22,
      height: 6,
      fill: "#3a3f45",
      stroke: "#1b1e22",
      strokeWidth: 1,
      cornerRadius: 2,
      offsetX: 2,
      offsetY: 3,
    });
    this.group.add(this.gun);
  }

  // Update position, gun rotation, and movement color
  update() {
    this.group.position({ x: this.model.x, y: this.model.y });
    const angleMap = { up: -90, right: 0, down: 90, left: 180 };
    this.gun.rotation(angleMap[this.model.direction]);
    this.gun.fill(this.model.isMoving ? "#8d939a" : "#3a3f45");
  }

  // Get Konva group node for rendering
  getGroup() {
    return this.group;
  }
}
