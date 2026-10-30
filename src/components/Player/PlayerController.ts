import { PlayerModel } from "./PlayerModel";
import { PlayerView } from "./PlayerView";
import type { ObstacleController } from "../Obstacle/ObstacleController";
import { BulletController } from "../Bullet/BulletController";
import {AudioManager} from "../../services/AudioManager";
import type { Direction } from "../../constants";

// PlayerController: Handles player input, movement, collision, and shooting
export class PlayerController {
  model: PlayerModel;
  view: PlayerView;
  private audioManager: AudioManager;

  constructor(x: number, y: number,audioManager: AudioManager) {
    // Initialize player model and view
    this.model = new PlayerModel(x, y);
    this.view = new PlayerView(this.model);
    this.audioManager = audioManager;
  }

  // Update player position based on input keys and obstacles
  update(keys: Set<string>, obstacleControllers: ObstacleController[], stageWidth: number, stageHeight: number, gameAreaY: number = 0, gameAreaHeight: number = stageHeight) {
    const speed = this.model.speed;
    let dx = 0,
      dy = 0;
    const wasMoving = this.model.isMoving; 
    this.model.isMoving = false;

    // Process movement keys (WASD and arrows), including diagonals
    const up = keys.has("w") || keys.has("W") || keys.has("ArrowUp");
    const down = keys.has("s") || keys.has("S") || keys.has("ArrowDown");
    const left = keys.has("a") || keys.has("A") || keys.has("ArrowLeft");
    const right = keys.has("d") || keys.has("D") || keys.has("ArrowRight");
    if (up) dy -= 1;
    else if (down) dy += 1;
    if (left) dx -= 1;
    else if (right) dx += 1;
    if (dx !== 0 || dy !== 0) {
      this.model.isMoving = true;
      this.model.direction = this.facingFromAxes(dx, dy);
      const length = Math.hypot(dx, dy);
      dx = (dx / length) * speed;
      dy = (dy / length) * speed;
    }

    // Calculate next position
    let nextX = this.model.x + dx;
    let nextY = this.model.y + dy;

    // Player bounding box is 30x30, so radius is 15
    const radius = 15;

    // Clamp position within game area boundaries (accounting for HUD)
    nextX = Math.max(radius, Math.min(stageWidth - radius, nextX));
    nextY = Math.max(gameAreaY + radius, Math.min(gameAreaY + gameAreaHeight - radius, nextY));

    // Check for obstacle collisions, sliding on one axis if a diagonal is blocked
    const obstacles = obstacleControllers.map(c => c.getModel());
    const canStand = (x: number, y: number) => !obstacles.some((o) => o.collides({ x, y, w: 30, h: 30 }));
    if (canStand(nextX, nextY)) {
      this.model.x = nextX;
      this.model.y = nextY;
    } else if (dx !== 0 && canStand(nextX, this.model.y)) {
      this.model.x = nextX;
    } else if (dy !== 0 && canStand(this.model.x, nextY)) {
      this.model.y = nextY;
    }

    const isCurrentlyMoving = this.model.isMoving;

    if (isCurrentlyMoving && !wasMoving) {
      // Start sound: Player was NOT moving, but is now moving.
      this.audioManager.startSfxLoop("run",1);
    } else if (!isCurrentlyMoving && wasMoving) {
      // Stop sound: Player WAS moving, but is now stopped (keys released or blocked).
      this.audioManager.stopSfxLoop();
    }

    // Update view to match model
    this.view.update();
  }

  private facingFromAxes(dx: number, dy: number): Direction {
    if (dy < 0 && dx < 0) return "up-left";
    if (dy < 0 && dx > 0) return "up-right";
    if (dy > 0 && dx < 0) return "down-left";
    if (dy > 0 && dx > 0) return "down-right";
    if (dy < 0) return "up";
    if (dy > 0) return "down";
    if (dx < 0) return "left";
    return "right";
  }

  // Shoot a bullet from the player's current position and direction
  shoot(): BulletController {
    return new BulletController(
      this.model.x,
      this.model.y,
      this.model.direction
    );
  }

  // Get Konva group node for rendering
  getGroup() {
    return this.view.getGroup();
  }

  // Get current player position
  getPosition() {
    return { x: this.model.x, y: this.model.y };
  }
  stopAllSounds() {
    // If the game is ending, forcefully stop the running sound loop.
    this.audioManager.stopSfxLoop(); 
}
}
