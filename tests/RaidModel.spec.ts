import { describe, expect, it } from "vitest";
import {
	MINIGAME_DURATION,
	RaidModel,
	TILE_TYPE,
} from "../src/screens/RaidScreen/RaidModel.ts";

describe("RaidModel", () => {
	it("starts the egg raid with a short timer", () => {
		const model = new RaidModel();
		expect(MINIGAME_DURATION).toBe(7);
		expect(model.timeRemaining).toBe(7);
		expect(model.playerPosition).toEqual({ x: 1, y: 1 });
	});

	it("resets eggs and rebuilds an empty maze", () => {
		const model = new RaidModel();
		model.eggsCollected = 3;
		model.totalEggs = 5;
		model.timeRemaining = 1;
		model.reset();

		expect(model.eggsCollected).toBe(0);
		expect(model.totalEggs).toBe(0);
		expect(model.timeRemaining).toBe(MINIGAME_DURATION);
		expect(model.mazeLayout.length).toBe(15);
		expect(model.mazeLayout[0].every((tile) => tile === TILE_TYPE.PATH)).toBe(true);
	});

	it("awards stars only when the player escapes with eggs", () => {
		const model = new RaidModel();
		model.totalEggs = 5;

		expect(model.getStarRating(false)).toBe(0);

		model.eggsCollected = 0;
		expect(model.getStarRating(true)).toBe(0);

		model.eggsCollected = 2;
		expect(model.getStarRating(true)).toBe(1);

		model.eggsCollected = 3;
		expect(model.getStarRating(true)).toBe(2);

		model.eggsCollected = 5;
		expect(model.hasAllEggs()).toBe(true);
		expect(model.getStarRating(true)).toBe(3);
	});
});
