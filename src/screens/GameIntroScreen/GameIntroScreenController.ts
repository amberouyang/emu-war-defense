import { GameIntroModel } from "./GameIntroScreenModel";
import { GameIntroView } from "./GameIntroScreenView";
import type { ScreenSwitcher } from "../../types";

export class GameIntroController {
  private model: GameIntroModel;
  private view: GameIntroView;
  private screenSwitcher: ScreenSwitcher;
  private currentPage: number = 0;
  private showingCombatTip = false;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(screenSwitcher: ScreenSwitcher) {
    this.model = new GameIntroModel();
    this.view = new GameIntroView(
      () => this.nextPage(),
      () => this.previousPage(),
      () => this.openCombatTip(),
    );
    this.screenSwitcher = screenSwitcher;

    // Do not render or setup input immediately in constructor,
    // wait for show() to be called.
    this.view.hide();
  }

  show(): void {
    this.currentPage = 0;
    this.showingCombatTip = false;
    this.renderCurrentPage();
    this.setupInput();
    this.view.show();
  }

  hide(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    this.view.hide();
  }

  // Method to return the view's group, used by App
  getView(): GameIntroView {
    return this.view;
  }

  private renderCurrentPage(): void {
    const text = this.model.getPage(this.currentPage);
    const isLastPage = this.currentPage === this.model.getPageCount() - 1;
    const totalPages = this.model.getPageCount();

    this.view.renderPage(text, isLastPage, this.currentPage, totalPages);
  }

  private nextPage(): void {
    if (this.showingCombatTip) {
      this.completeIntro();
      return;
    }
    if (this.currentPage < this.model.getPageCount() - 1) {
      this.currentPage++;
      this.renderCurrentPage();
    } else {
      this.openCombatTip();
    }
  }

  private previousPage(): void {
    if (this.showingCombatTip) {
      this.backFromCombatTip();
      return;
    }
    if (this.currentPage === 0) return;
    this.currentPage--;
    this.renderCurrentPage();
  }

  private setupInput(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
    }

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.code) {
        case "Escape":
          e.preventDefault();
          if (this.showingCombatTip) {
            this.completeIntro();
          } else {
            this.openCombatTip();
          }
          break;
        case "Space":
        case "Enter":
        case "ArrowRight":
          e.preventDefault(); // Prevent page scrolling
          this.nextPage();
          break;
        case "ArrowLeft":
        case "Backspace":
          e.preventDefault();
          this.previousPage();
          break;
      }
    };

    window.addEventListener("keydown", this.keydownHandler);
  }

  private openCombatTip(): void {
    this.showingCombatTip = true;
    this.view.showCombatTip(
      () => this.completeIntro(),
      () => this.backFromCombatTip(),
    );
  }

  private backFromCombatTip(): void {
    this.showingCombatTip = false;
    this.currentPage = this.model.getPageCount() - 1;
    this.renderCurrentPage();
  }

  private completeIntro(): void {
    this.showingCombatTip = false;
    this.screenSwitcher.switchToScreen({ type: "farm", newgame: true });
  }

  destroy(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    this.view.destroy();
  }
}
