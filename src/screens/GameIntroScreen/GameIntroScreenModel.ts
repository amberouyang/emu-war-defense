import { CROP_WIN_GOAL } from "../../constants.ts";

export class GameIntroModel {
  private pages: string[] = [
    "THE GREAT EMU WAR\n\n\nIn 1932, Australia faced an unusual conflict.\n\nFollowing World War I, many Australian veterans had been given farmland in Western Australia to settle and grow wheat.",
    "THE GREAT DEPRESSION\n\n\nWhen the Great Depression hit, wheat prices plummeted.\n\nFarmers struggled to make ends meet, but then disaster struck, an invasion of 20,000 emus!",
    "THE EMU INVASION\n\n\nAfter breeding season, emus migrated inland in massive numbers, searching for water.\n\nThey trampled crops, broke through fences, and destroyed the farmers' livelihoods.",
    "MILITARY INTERVENTION\n\n\nDesperate farmers asked the government for help.\n\nIn October 1932, the Australian military deployed soldiers with machine guns to combat the emus.",
    "THE EMUS FIGHT BACK\n\n\nThe emus proved to be surprisingly effective opponents!\n\nThey could run at 30 mph, scattered when shot at, and worked in groups. The soldiers found them nearly impossible to hit.",
    "AN EMBARRASSING DEFEAT\n\n\nAfter weeks of failed attempts, the military withdrew.\n\nThe emus had won! This became known as 'The Great Emu War', one of the few wars Australia officially lost.",
    `YOUR MISSION\n\n\nNow it's your turn to defend the farm.\n\nPlant wheat, protect it from emu raids, and harvest ${CROP_WIN_GOAL} crops to keep the settlement going.\n\nHit that harvest goal to win.`,
    `CONTROLS & HOW TO PLAY\n\n\nClick an empty planter to plant wheat. Click fully grown crops to harvest them.\n\nBefore a raid, pick a defense and press T to place it. Press M to drop a mine.\n\nTrack your harvest in the crop counter at the top. The right number is your progress toward ${CROP_WIN_GOAL}. Keep at least one crop alive!`
  ];

  getPage(index: number): string {
    return this.pages[index];
  }

  getPageCount(): number {
    return this.pages.length;
  }
}
