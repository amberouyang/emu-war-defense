import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	HUNT_AMMO,
	HUNT_DURATION,
	HuntingScreenModel,
} from "../src/screens/HuntingScreen/HuntingScreenModel.ts";

describe("HuntingScreenModel", () => {
	let model: HuntingScreenModel;

	beforeEach(() => {
		vi.useFakeTimers();
		model = new HuntingScreenModel();
		model.reset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("starts with the hunt duration and ammo", () => {
		expect(HUNT_DURATION).toBe(40);
		expect(model.getTimeRemaining()).toBe(HUNT_DURATION);
		expect(model.getAmmo()).toBe(HUNT_AMMO);
		expect(model.canShoot()).toBe(true);
	});

	it("consumes ammo one shot at a time", () => {
		expect(model.consumeAmmo()).toBe(true);
		expect(model.getAmmo()).toBe(HUNT_AMMO - 1);

		model.reset();
		for (let i = 0; i < HUNT_AMMO; i++) {
			expect(model.consumeAmmo()).toBe(true);
		}
		expect(model.getAmmo()).toBe(0);
		expect(model.canShoot()).toBe(false);
		expect(model.consumeAmmo()).toBe(false);
	});

	it("counts down from the hunt duration after the timer starts", () => {
		model.startTimer();
		vi.advanceTimersByTime(5000);
		expect(model.updateTimer()).toBe(HUNT_DURATION - 5);
		expect(model.isTimeUp()).toBe(false);

		vi.advanceTimersByTime(HUNT_DURATION * 1000);
		expect(model.updateTimer()).toBe(0);
		expect(model.isTimeUp()).toBe(true);
	});

	it("pauses and resumes without resetting remaining time", () => {
		model.startTimer();
		vi.advanceTimersByTime(10000);
		model.updateTimer();
		expect(model.getTimeRemaining()).toBe(HUNT_DURATION - 10);

		model.pauseTimer();
		vi.advanceTimersByTime(8000);
		expect(model.updateTimer()).toBe(HUNT_DURATION - 10);

		model.resumeTimer();
		vi.advanceTimersByTime(3000);
		expect(model.updateTimer()).toBe(HUNT_DURATION - 13);
	});

	it("tracks defeated emus", () => {
		expect(model.getDefeat()).toBe(0);
		model.incrementDefeat();
		model.incrementDefeat();
		expect(model.getDefeat()).toBe(2);
	});
});
