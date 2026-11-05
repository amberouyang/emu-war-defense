import { GameOverScreenModel, type LeaderboardEntry } from '../src/screens/GameOverScreen/GameOverScreenModel';
import { describe, expect, beforeEach, it } from "vitest";

describe('GameOverScreenModel', () => {
    let model: GameOverScreenModel;

    beforeEach(() => {
        model = new GameOverScreenModel();
    });

    it('should initialize with default values', () => {
        expect(model.getFinalScore()).toBe(0);
        expect(model.getSurvivalDays()).toBe(0);
        expect(model.getLeaderboard()).toEqual([]);
    });

    it('should correctly set and get final results', () => {
        const score = 500;
        const days = 10;
        model.setFinalResults(days, score, true, 30);
        expect(model.getFinalScore()).toBe(score);
        expect(model.getSurvivalDays()).toBe(days);
        expect(model.didWin()).toBe(true);
        expect(model.getCropsHarvested()).toBe(30);
    });

    it('should correctly set and get leaderboard entries', () => {
        const mockLeaderboard: LeaderboardEntry[] = [
            { name: 'Alice', score: 100, survivalDays: 5, timestamp: '1/1/2024' },
            { name: 'Bob', score: 90, survivalDays: 4, timestamp: '1/1/2024' },
        ];
        model.setLeaderboard(mockLeaderboard);
        expect(model.getLeaderboard()).toEqual(mockLeaderboard);
    });
});