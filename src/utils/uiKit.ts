import Konva from "konva";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../constants.ts";

export const INK = "#3e2723";
export const GOLD = "#ffd24a";
export const PARCHMENT = "#f8eed6";
const WOOD_STOPS = [0, "#80502a", 1, "#55331a"];

export type ButtonSpec = {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    lip: string;
    enabled?: boolean;
    fontSize?: number;
    badge?: string;
};

/** Chunky 3D game button: a darker lip under a face that lifts on hover and sinks on press. */
export function makeButton(spec: ButtonSpec, onClick: () => void): Konva.Group {
    const enabled = spec.enabled ?? true;
    const group = new Konva.Group({ x: spec.x, y: spec.y, cursor: enabled ? "pointer" : "not-allowed" });
    group.add(new Konva.Rect({
        y: 5,
        width: spec.width,
        height: spec.height,
        cornerRadius: 10,
        fill: enabled ? spec.lip : "#6f777b",
    }));
    const face = new Konva.Group();
    face.add(new Konva.Rect({
        width: spec.width,
        height: spec.height,
        cornerRadius: 10,
        fill: enabled ? spec.color : "#9aa3a8",
        stroke: "rgba(255, 255, 255, 0.35)",
        strokeWidth: 1.5,
    }));
    face.add(new Konva.Rect({
        x: 6,
        y: 4,
        width: spec.width - 12,
        height: spec.height * 0.36,
        cornerRadius: 7,
        fill: "rgba(255, 255, 255, 0.16)",
    }));
    const textX = spec.badge ? 44 : 0;
    if (spec.badge) {
        face.add(new Konva.Circle({ x: 24, y: spec.height / 2, radius: 14, fill: "rgba(255, 255, 255, 0.92)" }));
        face.add(new Konva.Text({
            x: 10,
            y: spec.height / 2 - 8,
            width: 28,
            text: spec.badge,
            fontSize: 16,
            fontFamily: "Arial",
            fontStyle: "bold",
            fill: spec.lip,
            align: "center",
        }));
    }
    face.add(new Konva.Text({
        x: textX,
        width: spec.width - textX - (spec.badge ? 12 : 0),
        height: spec.height,
        text: spec.text,
        fontSize: spec.fontSize ?? 20,
        fontFamily: "Arial",
        fontStyle: "bold",
        fill: "white",
        align: spec.badge ? "left" : "center",
        verticalAlign: "middle",
        letterSpacing: spec.badge ? 0 : 1,
        shadowColor: "rgba(0, 0, 0, 0.45)",
        shadowBlur: 2,
        shadowOffset: { x: 0, y: 1 },
    }));
    group.add(face);

    if (enabled) {
        group.on("mouseenter", () => face.y(-2));
        group.on("mouseleave", () => face.y(0));
        group.on("mousedown touchstart", () => face.y(4));
        group.on("mouseup touchend", () => face.y(-2));
        group.on("click tap", onClick);
    }
    return group;
}

export const woodRect = (config: Konva.RectConfig): Konva.Rect => new Konva.Rect({
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 0, y: config.height ?? 0 },
    fillLinearGradientColorStops: WOOD_STOPS,
    stroke: "#2e1a0b",
    strokeWidth: 3,
    ...config,
});

/** Dimmed backdrop plus a wood framed parchment panel centered on the stage. */
export function createModal(width: number, height: number, onBackdropClick?: () => void): { popup: Konva.Group; x: number; y: number } {
    const popup = new Konva.Group();
    const backdrop = new Konva.Rect({ width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: "rgba(25, 12, 2, 0.62)" });
    backdrop.on("click tap mouseup", (evt) => {
        evt.cancelBubble = true;
        if (evt.type !== "mouseup") onBackdropClick?.();
    });
    popup.add(backdrop);
    const x = (STAGE_WIDTH - width) / 2;
    const y = (STAGE_HEIGHT - height) / 2;
    popup.add(new Konva.Rect({ x: x + 4, y: y + 10, width, height, cornerRadius: 18, fill: "rgba(0, 0, 0, 0.35)" }));
    popup.add(woodRect({ x: x - 8, y: y - 8, width: width + 16, height: height + 16, cornerRadius: 20 }));
    popup.add(new Konva.Rect({ x, y, width, height, cornerRadius: 14, fill: PARCHMENT }));
    return { popup, x, y };
}

/** Red banner with gold lettering that sits across the top edge of a modal. */
export function makeRibbon(centerX: number, y: number, width: number, text: string): Konva.Group {
    const ribbon = new Konva.Group({ listening: false });
    ribbon.add(new Konva.Rect({ x: centerX - width / 2, y, width, height: 44, cornerRadius: 8, fill: "#c0392b", stroke: "#7a1f14", strokeWidth: 3 }));
    ribbon.add(new Konva.Text({
        x: centerX - width / 2,
        y: y + 11,
        width,
        text,
        fontSize: 24,
        fontFamily: "Arial",
        fontStyle: "bold",
        letterSpacing: 3,
        fill: GOLD,
        stroke: "#5a1208",
        strokeWidth: 2,
        fillAfterStrokeEnabled: true,
        align: "center",
    }));
    return ribbon;
}
