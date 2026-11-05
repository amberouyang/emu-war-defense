import { ScreenController } from "../../types";
import type { ScreenSwitcher } from "../../types";
import { HuntingIntroScreenView } from "./HuntingIntroScreenView";

export class HuntingIntroScreenController extends ScreenController {
  private view: HuntingIntroScreenView;
  private screenSwitcher: ScreenSwitcher;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(screenSwitcher: ScreenSwitcher) {
    super();
    this.screenSwitcher = screenSwitcher;
    this.view = new HuntingIntroScreenView(() => this.handleStartClick());
  }

  getView(): HuntingIntroScreenView {
    return this.view;
  }

  override show(): void {
    super.show();
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      this.handleStartClick();
    };
    window.addEventListener("keydown", this.keydownHandler);
  }

  override hide(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    super.hide();
  }

  private handleStartClick(): void {
    this.screenSwitcher.switchToScreen({ type: "minigame2" });
  }
}
