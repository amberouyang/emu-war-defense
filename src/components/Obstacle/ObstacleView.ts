import Konva from "konva";
import { ObstacleModel } from "./ObstacleModel";

const seededRandom = (seed: number) => {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

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
		const cx = x + w / 2;
		const cy = y + h / 2;
		const rand = seededRandom(Math.floor(x * 17 + y * 31 + w * 13 + h * 7));
		const sides = 6 + Math.floor(rand() * 3);

		// Flat top-down slab that stays inside the collision box so it matches blocking.
		const body = this.jaggedPoints(cx, cy, w * 0.48, h * 0.46, sides, rand, 0.82, 0.98);
		const highlight = this.jaggedPoints(
			cx - w * 0.1,
			cy - h * 0.08,
			w * 0.22,
			h * 0.16,
			5,
			rand,
			0.7,
			0.95,
		);

		// Soft contact shadow tucked under the stone (not floating below it)
		const shadow = body.map((value, index) => (
			index % 2 === 0 ? value + 2 : value + 3
		));
		this.shape.add(new Konva.Line({
			points: shadow,
			closed: true,
			fill: "rgba(0, 0, 0, 0.28)",
			listening: false,
		}));

		// Main rock body fills the footprint players bump into
		this.shape.add(new Konva.Line({
			points: body,
			closed: true,
			fillLinearGradientStartPoint: { x: cx - w / 2, y: cy - h / 2 },
			fillLinearGradientEndPoint: { x: cx + w / 2, y: cy + h / 2 },
			fillLinearGradientColorStops: [0, "#b9bec4", 0.55, "#858b92", 1, "#5c636a"],
			stroke: "#3a4046",
			strokeWidth: 2,
			lineJoin: "round",
		}));

		// Slight rim shade on the south-east edge so it still feels solid
		this.shape.add(new Konva.Line({
			points: body,
			closed: true,
			fillLinearGradientStartPoint: { x: cx - w / 3, y: cy - h / 3 },
			fillLinearGradientEndPoint: { x: cx + w / 2, y: cy + h / 2 },
			fillLinearGradientColorStops: [0, "rgba(255,255,255,0)", 0.55, "rgba(255,255,255,0)", 1, "rgba(20,24,28,0.35)"],
			listening: false,
		}));

		this.shape.add(new Konva.Line({
			points: highlight,
			closed: true,
			fill: "rgba(255, 255, 255, 0.18)",
			listening: false,
		}));

		const crackCount = 1 + Math.floor(rand() * 2);
		for (let i = 0; i < crackCount; i++) {
			const angle = rand() * Math.PI * 2;
			const len = (0.16 + rand() * 0.2) * Math.min(w, h);
			const sx = cx + (rand() - 0.5) * w * 0.28;
			const sy = cy + (rand() - 0.5) * h * 0.28;
			this.shape.add(new Konva.Line({
				points: [
					sx,
					sy,
					sx + Math.cos(angle) * len,
					sy + Math.sin(angle) * len,
				],
				stroke: "rgba(35, 40, 45, 0.5)",
				strokeWidth: 1.3,
				lineCap: "round",
				listening: false,
			}));
		}
	}

	private jaggedPoints(
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		sides: number,
		rand: () => number,
		minScale: number,
		maxScale: number,
	): number[] {
		const points: number[] = [];
		const start = -Math.PI / 2 + (rand() - 0.5) * 0.35;
		for (let i = 0; i < sides; i++) {
			const angle = start + (i / sides) * Math.PI * 2;
			const scale = minScale + rand() * (maxScale - minScale);
			points.push(cx + Math.cos(angle) * rx * scale);
			points.push(cy + Math.sin(angle) * ry * scale);
		}
		return points;
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
