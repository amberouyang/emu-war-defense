import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameIntroController } from "../src/screens/GameIntroScreen/GameIntroScreenController";
import type { ScreenSwitcher } from "../src/types";

// Mock the View
const renderPageMock = vi.fn();
const showMock = vi.fn();
const hideMock = vi.fn();
const destroyMock = vi.fn();
const showCombatTipMock = vi.fn();

vi.mock("../src/screens/GameIntroScreen/GameIntroScreenView", () => {
    return {
        GameIntroView: vi.fn().mockImplementation(() => ({
            renderPage: renderPageMock,
            showCombatTip: showCombatTipMock,
            show: showMock,
            hide: hideMock,
            destroy: destroyMock,
        })),
    };
});

describe("GameIntroController", () => {
    let controller: GameIntroController;
    let screenSwitcherMock: ScreenSwitcher;

    beforeEach(() => {
        vi.clearAllMocks();
        screenSwitcherMock = {
            switchToScreen: vi.fn(),
        };
        controller = new GameIntroController(screenSwitcherMock);
    });

    afterEach(() => {
        controller.destroy();
    });

    it("should show the first page when show() is called", () => {
        controller.show();
        expect(showMock).toHaveBeenCalled();
        expect(renderPageMock).toHaveBeenCalledWith(expect.any(String), false, 0, expect.any(Number));
    });

    it("should advance to the next page when Space is pressed", () => {
        controller.show();

        // Simulate Space key press
        const spaceEvent = new KeyboardEvent("keydown", { code: "Space" });
        window.dispatchEvent(spaceEvent);

        expect(renderPageMock).toHaveBeenLastCalledWith(expect.any(String), false, 1, expect.any(Number));
    });

    it("should open the combat tip after the last briefing page", () => {
        controller.show();

        // 8 briefing pages: indexes 0..7
        for (let i = 0; i < 7; i++) {
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
        }

        // On last briefing page, Space opens the tip instead of the farm
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));

        expect(showCombatTipMock).toHaveBeenCalled();
        expect(screenSwitcherMock.switchToScreen).not.toHaveBeenCalled();
    });

    it("should open the combat tip when Escape is pressed during the briefing", () => {
        controller.show();

        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));

        expect(showCombatTipMock).toHaveBeenCalled();
        expect(screenSwitcherMock.switchToScreen).not.toHaveBeenCalled();
    });

    it("should switch to farm from the combat tip", () => {
        controller.show();
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));

        const onContinue = showCombatTipMock.mock.calls[0][0] as () => void;
        onContinue();

        expect(screenSwitcherMock.switchToScreen).toHaveBeenCalledWith({ type: "farm", newgame: true });
    });

    it("should clean up event listeners on hide", () => {
        controller.show();
        controller.hide();

        expect(hideMock).toHaveBeenCalled();

        // Reset mocks to ensure no further calls are recorded
        vi.clearAllMocks();

        // Trigger key events
        const spaceEvent = new KeyboardEvent("keydown", { code: "Space" });
        window.dispatchEvent(spaceEvent);

        expect(renderPageMock).not.toHaveBeenCalled();
        expect(screenSwitcherMock.switchToScreen).not.toHaveBeenCalled();
    });
});
