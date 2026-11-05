// src/screens/Game2Screen/Game2ScreenController.ts
import { ScreenController } from "../../types";
import type { ScreenSwitcher } from "../../types";
import { HUNT_DURATION, HuntingScreenModel } from "./HuntingScreenModel";
import { HuntingScreenView } from "./HuntingScreenView";
import { PlayerController } from "../../components/Player/PlayerController";
import { ObstacleController } from "../../components/Obstacle/ObstacleController";
import { EmuController } from "../../components/Emu/EmuController";
import { BulletController } from "../../components/Bullet/BulletController";
import { STAGE_WIDTH, STAGE_HEIGHT, GAME_AREA_HEIGHT, GAME_AREA_Y } from "../../constants";
import { getSafeSpawnPosition } from "../../utils/getSafeSpawnPosition";
import { AudioManager } from "../../services/AudioManager";
import { GameStatusController } from "../../controllers/GameStatusController";

export class HuntingScreenController extends ScreenController {
  private model: HuntingScreenModel;
  private view: HuntingScreenView;
  private screenSwitcher: ScreenSwitcher;
  private running = false;
  private paused = false;
  private countingDown = false;
  private audioManager : AudioManager;
  private status: GameStatusController ;

  // controllers & models
  private playerController!: PlayerController;
  private obstacleControllers: ObstacleController[] = [];
  private emuControllers: EmuController[] = [];
  private bulletControllers: BulletController[] = [];

  private keys: Set<string> = new Set();

  constructor(screenSwitcher: ScreenSwitcher, audioManager: AudioManager, status: GameStatusController ) {
    super();
    this.screenSwitcher = screenSwitcher;
    this.model = new HuntingScreenModel();
    this.view = new HuntingScreenView();
    this.view.setPauseHandlers(
      () => this.pauseHunt(),
      () => this.resumeHunt(),
      () => this.leaveHunt(),
    );
    this.audioManager = audioManager;
    this.status = status;
  }

  getView(): HuntingScreenView {
    return this.view;
  }

  startHuntingGame() {
    this.resetGame();
    this.view.updateAmmo(this.model.getAmmo());
    this.view.updateDefeat(this.emuControllers.length);
    this.view.updateTimer(this.model.getTimeRemaining());
    this.view.hidePauseOverlay();
    this.view.show();
    this.running = false;
    this.paused = false;
    this.countingDown = true;
    this.keys.clear();

    // attach keyboard
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    this.view.showStartCountdown(HUNT_DURATION, () => this.beginHuntAfterCountdown());
  }

  private beginHuntAfterCountdown(): void {
    if (!this.countingDown) {
      return;
    }
    this.countingDown = false;
    this.running = true;
    this.paused = false;
    this.model.startTimer();
    this.audioManager.playSfx("run", 0.45);
    this.gameLoop();
  }

  override hide(): void {
    this.countingDown = false;
    this.view.hideStartCountdown();
    super.hide();
  }

  private cleanup(){
    this.playerController?.getGroup().destroy();
    
    this.obstacleControllers.forEach((oc) => oc.getNode().destroy());
    this.obstacleControllers = [];

    this.emuControllers.forEach((ec) => ec.getGroup().destroy());
    this.emuControllers = [];

    this.bulletControllers.forEach((bc) => bc.getGroup().destroy());
    this.bulletControllers = [];
  }

  private resetGame() {
    // reset model
    this.cleanup();
    this.model.reset();
    
    // Spread rocks and bushes so they don't stack on each other.
    for (let i = 0; i < 12; i++) {
      const isRock = i < 6;
      const w = isRock ? 40 + Math.random() * 40 : 30 + Math.random() * 30;
      const h = isRock ? 40 + Math.random() * 40 : w;
      const oc = this.placeObstacle(isRock ? "rock" : "bush", w, h);
      if (!oc) {
        continue;
      }
      this.obstacleControllers.push(oc);
      this.view.getGroup().add(oc.getNode());
    }
  

    // spawn player safely (offset by HUD height)
    
    const playerPos = getSafeSpawnPosition(this.obstacleControllers, 30, 30, GAME_AREA_Y, GAME_AREA_HEIGHT);
    this.playerController = new PlayerController(playerPos.x, playerPos.y, this.audioManager);
    this.view.getGroup().add(this.playerController.getGroup());

    // spawn emus safely (offset by HUD height)
    this.emuControllers = [];
    const emuCount = Math.floor(Math.random() * 11) + 10; // Random between 10 and 20
    for (let i = 0; i < emuCount; i++) {
      const emuPos = getSafeSpawnPosition(this.obstacleControllers, 24, 24, GAME_AREA_Y, GAME_AREA_HEIGHT);
      const ec = new EmuController(emuPos.x, emuPos.y, this.audioManager);
      this.emuControllers.push(ec);
      this.view.getGroup().add(ec.getGroup());
    }
  }

  private placeObstacle(
    type: "rock" | "bush",
    w: number,
    h: number,
    padding: number = 22,
  ): ObstacleController | null {
    const existing = this.obstacleControllers.map((c) => c.getModel());
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = 16 + Math.random() * Math.max(1, STAGE_WIDTH - w - 32);
      const y = GAME_AREA_Y + 16 + Math.random() * Math.max(1, GAME_AREA_HEIGHT - h - 32);
      const overlaps = existing.some((o) => !(
        x + w + padding <= o.x
        || o.x + o.w + padding <= x
        || y + h + padding <= o.y
        || o.y + o.h + padding <= y
      ));
      if (!overlaps) {
        return new ObstacleController(x, y, w, h, type);
      }
    }
    return null;
  }

  private onKeyDown(e: KeyboardEvent) {
    // capture arrow keys and space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space", "Escape"].includes(e.key) || e.code === "Space") {
      e.preventDefault();
    }
    if (this.countingDown) {
      return;
    }
    if (e.key === "Escape") {
      if (this.paused) {
        this.resumeHunt();
      } else {
        this.pauseHunt();
      }
      return;
    }
    if (this.paused) {
      return;
    }
    this.keys.add(e.key);
    // handle space fire on keydown so repeated fires possible with key repeat
    if (e.code === "Space" && this.model.canShoot()) {
      if (this.model.consumeAmmo()) {
        const bullet = this.playerController.shoot();
        this.bulletControllers.push(bullet);
        this.view.getGroup().add(bullet.getGroup());
        this.view.updateAmmo(this.model.getAmmo());
        this.audioManager.playSfx("shoot",0.3);
      }
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key);
  }

  private pauseHunt(): void {
    if (!this.running || this.paused || this.countingDown) {
      return;
    }
    this.paused = true;
    this.keys.clear();
    this.model.pauseTimer();
    this.playerController?.stopAllSounds();
    this.view.showPauseOverlay();
  }

  private resumeHunt(): void {
    if (!this.paused || !this.running) {
      return;
    }
    this.paused = false;
    this.model.resumeTimer();
    this.view.hidePauseOverlay();
    this.gameLoop();
  }

  private leaveHunt(): void {
    this.paused = false;
    this.running = false;
    this.countingDown = false;
    this.keys.clear();
    this.model.stopTimer();
    this.view.hideStartCountdown();
    this.playerController?.stopAllSounds();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.status.incrementScore(this.model.getDefeat() * 1);
    this.view.hidePauseOverlay();
    this.screenSwitcher.switchToScreen({ type: "farm", newgame: false });
  }

  private gameLoop = () => {
    if (!this.running || this.paused) return;

    // update timer
    this.model.updateTimer();
    this.view.updateTimer(this.model.getTimeRemaining());
    this.view.updateAmmo(this.model.getAmmo());

    // Check if ammo is out
    if (this.model.getAmmo() === 0 && this.running) {
      this.endGame("ammo");
      return;
    }

    // Check if time is up
    if (this.model.isTimeUp() && this.running) {
      this.endGame("time");
      return;
    }

    // update player (with adjusted boundaries for game area)
    this.playerController.update(this.keys, this.obstacleControllers, STAGE_WIDTH, STAGE_HEIGHT, GAME_AREA_Y, GAME_AREA_HEIGHT);

    // update bullets
    this.bulletControllers.forEach((b) => b.update(this.obstacleControllers, STAGE_WIDTH, STAGE_HEIGHT));
    this.bulletControllers = this.bulletControllers.filter((b) => b.isActive());

    // update emus (with adjusted boundaries for game area)
    this.emuControllers.forEach((e) =>
      e.update(this.obstacleControllers, STAGE_WIDTH, STAGE_HEIGHT, GAME_AREA_Y, GAME_AREA_HEIGHT)
    );

    // check collisions (bullets -> emus)
    this.emuControllers = this.emuControllers.filter((emu) => {
      if (!emu.isActive()) return false;
      const died = emu.checkBulletCollision(this.bulletControllers);
      if (died) {
        this.model.incrementDefeat();
      }
      return emu.isActive();
    });
    
    // Update emus left count
    this.view.updateDefeat(this.emuControllers.length);

    // remove inactive bullets from scene (their views remain hidden)
    this.bulletControllers = this.bulletControllers.filter((b) => b.isActive());

    // Check if all emus are defeated
    if (this.emuControllers.length === 0 && this.running) {
      this.endGame("victory");
      return;
    }

    this.view.batchDraw();

    if (this.running) {
      requestAnimationFrame(this.gameLoop);
    }
  };

  endGame(reason: "ammo" | "time" | "victory" = "victory") {
    this.running = false;
    this.paused = false;
    this.countingDown = false;
    this.keys.clear();
    this.model.stopTimer();
    this.view.hideStartCountdown();
    if (this.playerController) {
      this.playerController.stopAllSounds();
    }
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.status.incrementScore(this.model.getDefeat() * 1);
    this.screenSwitcher.switchToScreen({
      type: "minigame2_end",
      emusKilled: this.model.getDefeat(),
      reason: reason,
    });
  }
}
