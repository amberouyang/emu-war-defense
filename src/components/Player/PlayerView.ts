import Konva from "konva";
import { PlayerModel } from "./PlayerModel";
import { DIRECTION_ANGLE } from "../../constants";

/**
 * Little farmer figure for the emu hunt: walks with swinging legs when moving,
 * leans into a run, and aims the rifle in the facing direction.
 */
export class PlayerView {
	private group: Konva.Group;
	private figure: Konva.Group;
	private leftLeg: Konva.Group;
	private rightLeg: Konva.Group;
	private leftArm: Konva.Rect;
	private rightArm: Konva.Rect;
	private gunBarrel: Konva.Rect;
	private gun: Konva.Group;
	private model: PlayerModel;
	private walkPhase = 0;

	constructor(model: PlayerModel) {
		this.model = model;
		this.group = new Konva.Group({ x: model.x, y: model.y });

		this.group.add(new Konva.Ellipse({
			y: 16,
			radiusX: 12,
			radiusY: 4.5,
			fill: "rgba(0, 0, 0, 0.3)",
			listening: false,
		}));

		this.figure = new Konva.Group();
		this.group.add(this.figure);

		this.leftLeg = this.createLeg(-5);
		this.rightLeg = this.createLeg(5);
		this.figure.add(this.leftLeg);
		this.figure.add(this.rightLeg);

		this.figure.add(new Konva.Rect({
			x: -8,
			y: -10,
			width: 16,
			height: 14,
			cornerRadius: 4,
			fillLinearGradientStartPoint: { x: 0, y: -10 },
			fillLinearGradientEndPoint: { x: 0, y: 4 },
			fillLinearGradientColorStops: [0, "#4a8fd4", 1, "#1f4f93"],
			stroke: "#12345c",
			strokeWidth: 1.2,
		}));

		this.leftArm = new Konva.Rect({
			x: -11,
			y: -8,
			width: 4,
			height: 10,
			cornerRadius: 2,
			fill: "#f0c9a0",
			stroke: "#b88962",
			strokeWidth: 0.8,
			offsetX: 2,
			offsetY: 0,
		});
		this.rightArm = new Konva.Rect({
			x: 11,
			y: -8,
			width: 4,
			height: 10,
			cornerRadius: 2,
			fill: "#f0c9a0",
			stroke: "#b88962",
			strokeWidth: 0.8,
			offsetX: 2,
			offsetY: 0,
		});
		this.figure.add(this.leftArm);
		this.figure.add(this.rightArm);

		this.figure.add(new Konva.Circle({
			y: -16,
			radius: 7,
			fill: "#f0c9a0",
			stroke: "#b88962",
			strokeWidth: 1,
		}));
		this.figure.add(new Konva.Circle({ x: -2.5, y: -17, radius: 1.1, fill: "#3a2412" }));
		this.figure.add(new Konva.Circle({ x: 2.5, y: -17, radius: 1.1, fill: "#3a2412" }));

		this.figure.add(new Konva.Ellipse({
			y: -20,
			radiusX: 11,
			radiusY: 3.2,
			fill: "#6b4424",
			stroke: "#3a2412",
			strokeWidth: 1,
		}));
		this.figure.add(new Konva.Ellipse({
			y: -24,
			radiusX: 6.5,
			radiusY: 4,
			fill: "#8a5a2b",
			stroke: "#3a2412",
			strokeWidth: 1,
		}));
		this.figure.add(new Konva.Rect({
			x: -6.5,
			y: -22,
			width: 13,
			height: 3,
			fill: "#4a2c0a",
		}));

		this.gun = new Konva.Group();
		this.gunBarrel = new Konva.Rect({
			width: 24,
			height: 5,
			fill: "#3a3f45",
			stroke: "#1b1e22",
			strokeWidth: 1,
			cornerRadius: 2,
			offsetX: 2,
			offsetY: 2.5,
		});
		this.gun.add(this.gunBarrel);
		this.gun.add(new Konva.Rect({
			x: 4,
			y: 1,
			width: 5,
			height: 7,
			fill: "#5c4030",
			stroke: "#2e1a0b",
			strokeWidth: 0.8,
			cornerRadius: 1,
			offsetX: 2,
			offsetY: 0,
		}));
		this.group.add(this.gun);
	}

	private createLeg(hipX: number): Konva.Group {
		const leg = new Konva.Group({ x: hipX, y: 2 });
		leg.add(new Konva.Rect({
			width: 5,
			height: 11,
			cornerRadius: 2,
			fill: "#5c4030",
			stroke: "#3a2412",
			strokeWidth: 1,
			offsetX: 2.5,
		}));
		leg.add(new Konva.Rect({
			x: -3.5,
			y: 10,
			width: 7,
			height: 3.5,
			cornerRadius: 1.5,
			fill: "#2e1a0b",
		}));
		return leg;
	}

	update(): void {
		this.group.position({ x: this.model.x, y: this.model.y });

		const dir = this.model.direction;
		const faceLeft = dir.includes("left");
		this.figure.scaleX(faceLeft ? -1 : 1);

		let tilt = 0;
		if (dir.includes("up")) tilt = -8;
		else if (dir.includes("down")) tilt = 8;

		if (this.model.isMoving) {
			this.walkPhase += 0.42;
			const swing = Math.sin(this.walkPhase) * 22;
			const armSwing = Math.sin(this.walkPhase) * 16;
			const bob = Math.abs(Math.sin(this.walkPhase)) * -2.4;
			this.leftLeg.rotation(swing);
			this.rightLeg.rotation(-swing);
			this.leftArm.rotation(-armSwing);
			this.rightArm.rotation(armSwing);
			this.figure.y(bob);
			this.figure.rotation(tilt + (faceLeft ? 6 : -6));
			this.gunBarrel.fill("#8d939a");
		} else {
			this.walkPhase = 0;
			this.leftLeg.rotation(4);
			this.rightLeg.rotation(-4);
			this.leftArm.rotation(8);
			this.rightArm.rotation(-6);
			this.figure.y(0);
			this.figure.rotation(tilt);
			this.gunBarrel.fill("#3a3f45");
		}

		this.gun.rotation(DIRECTION_ANGLE[this.model.direction]);
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
