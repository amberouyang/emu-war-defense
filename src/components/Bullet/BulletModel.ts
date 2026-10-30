import { DIRECTION_VECTORS, type Direction } from "../../constants";

export class BulletModel {
  x: number;
  y: number;
  speed = 6; // Movement speed per update
  active = true; // Indicates whether the bullet is still valid
  public direction: Direction;

  constructor(
    x: number,
    y: number,
    direction: Direction
  ) {
    // Initialize position and direction
    this.x = x;
    this.y = y;
    this.direction = direction;
  }

  update() {
    // Skip movement if bullet is inactive
    if (!this.active) return;

    const step = DIRECTION_VECTORS[this.direction];
    this.x += step.dx * this.speed;
    this.y += step.dy * this.speed;
  }

  // Mark bullet as inactive
  destroy() {
    this.active = false;
  }

  // Return bounding box for collision detection
  boundingBox() {
    return { x: this.x, y: this.y, w: 8, h: 12 };
  }
}
