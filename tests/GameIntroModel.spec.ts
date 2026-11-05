import { describe, expect, it } from "vitest";
import { CROP_WIN_GOAL } from "../src/constants.ts";
import { GameIntroModel } from "../src/screens/GameIntroScreen/GameIntroScreenModel.ts";

describe("GameIntroModel", () => {
	it("includes the harvest goal in the mission and controls pages", () => {
		const model = new GameIntroModel();
		const mission = model.getPage(6);
		const controls = model.getPage(7);

		expect(mission.toLowerCase()).toContain(`harvest ${CROP_WIN_GOAL} crops`);
		expect(controls).toContain(String(CROP_WIN_GOAL));
		expect(controls.toLowerCase()).not.toContain("hud");
		expect(model.getPageCount()).toBe(8);
	});
});
