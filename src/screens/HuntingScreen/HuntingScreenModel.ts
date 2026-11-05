export const HUNT_DURATION = 40;
export const HUNT_AMMO = 100;

export class HuntingScreenModel {
  private defeat = 0;
  private timeRemaining = HUNT_DURATION;
  private startTime: number = 0;
  private ammo = HUNT_AMMO;

  reset(): void {
    this.defeat = 0;
    this.timeRemaining = HUNT_DURATION;
    this.startTime = 0;
    this.ammo = HUNT_AMMO;
  }

  incrementDefeat(): void {
    this.defeat++;
  }

  getDefeat(): number {
    return this.defeat;
  }

  getAmmo(): number {
    return this.ammo;
  }

  canShoot(): boolean {
    return this.ammo > 0;
  }

  consumeAmmo(): boolean {
    if (this.ammo > 0) {
      this.ammo--;
      return true;
    }
    return false;
  }

  addAmmo(amount: number): void {
    this.ammo += amount;
  }

  startTimer(): void {
    this.startTime = Date.now();
  }

  updateTimer(): number {
    if (this.startTime === 0) return this.timeRemaining;

    const elapsed = (Date.now() - this.startTime) / 1000;
    this.timeRemaining = Math.max(0, HUNT_DURATION - elapsed);
    return this.timeRemaining;
  }

  pauseTimer(): void {
    this.updateTimer();
    this.startTime = 0;
  }

  resumeTimer(): void {
    const elapsed = Math.max(0, HUNT_DURATION - this.timeRemaining);
    this.startTime = Date.now() - elapsed * 1000;
  }

  stopTimer(): void {
    this.startTime = 0;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  isTimeUp(): boolean {
    return this.timeRemaining <= 0;
  }
}
