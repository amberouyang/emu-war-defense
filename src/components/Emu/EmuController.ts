import { EmuModel } from "./EmuModel";
import { EmuView } from "./EmuView";
import type { ObstacleController } from "../Obstacle/ObstacleController";
import type { BulletController } from "../Bullet/BulletController";
import {AudioManager} from "../../services/AudioManager";
import { DIRECTION_VECTORS } from "../../constants";

export class EmuController {
  model: EmuModel;
  view: EmuView;
  private audioManager: AudioManager;

  constructor(x: number, y: number, audioManager: AudioManager) {
    // Initialize model and view at position
    this.audioManager = audioManager;
    this.model = new EmuModel(x, y);
    this.view = new EmuView(this.model);
  }

  update(obstacleControllers: ObstacleController[], stageWidth: number, stageHeight: number, gameAreaY: number = 0, gameAreaHeight: number = stageHeight) {
    if (!this.model.active) return;

    const step = DIRECTION_VECTORS[this.model.currentDirection];
    let nextX = this.model.x + step.dx * this.model.speed;
    let nextY = this.model.y + step.dy * this.model.speed;

    const radius = 12;
    const originalNextX = nextX;
    const originalNextY = nextY;

    // Clamp position within game area boundaries (accounting for HUD)
    nextX = Math.max(radius, Math.min(stageWidth - radius, nextX));
    nextY = Math.max(gameAreaY + radius, Math.min(gameAreaY + gameAreaHeight - radius, nextY));

    const hitBoundary = nextX !== originalNextX || nextY !== originalNextY;

    const obstacles = obstacleControllers.map(c => c.getModel());
    const blocked = (x: number, y: number) =>
      obstacles.some((o) => o.collides({ x, y, w: radius * 2, h: radius * 2 }));

    if (hitBoundary) {
      this.model.randomizeDirection();
    } else if (!blocked(nextX, nextY)) {
      this.model.x = nextX;
      this.model.y = nextY;
      this.model.tickDirectionTimer();
    } else if (step.dx !== 0 && !blocked(nextX, this.model.y)) {
      this.model.x = nextX;
      this.model.tickDirectionTimer();
    } else if (step.dy !== 0 && !blocked(this.model.x, nextY)) {
      this.model.y = nextY;
      this.model.tickDirectionTimer();
    } else {
      this.model.randomizeDirection();
    }

    // Update view (position, flash effect, orientation)
    this.view.update();
  }

  // Check collision with bullets; return true if emu is defeated
  checkBulletCollision(bullets: BulletController[]): boolean {
    if (!this.model.active) return false;

    const emuRadius = 12;
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b.isActive()) continue;

      const pos = b.getPosition();
      const dx = pos.x - this.model.x;
      const dy = pos.y - this.model.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < emuRadius + 5) {
        b.destroy();
        this.model.becomeHit();
        
        try {
        console.log("Playing emu sound...");
        this.audioManager.playSfx("emu",1);
        console.log("Sound played successfully");
      } catch (error) {
        console.error("Error playing sound:", error);
      }

        if (!this.model.active) {
          const node = this.view.getGroup();
          node.visible(false);
          node.remove();
          return true;
        } else {
          this.view.update();
          return false;
        }
      }
    }
    return false;
  }

  getGroup() {
    return this.view.getGroup();
  }

  isActive() {
    return this.model.active;
  }
}
