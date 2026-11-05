import { GameIntroModel } from "./GameIntroScreenModel";
import { GameIntroView } from "./GameIntroScreenView";
import type { ScreenSwitcher } from "../../types";

export class GameIntroController {
  private model: GameIntroModel;
  private view: GameIntroView;
  private screenSwitcher: ScreenSwitcher;
  private currentPage: number = 0;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(screenSwitcher: ScreenSwitcher) {
    this.model = new GameIntroModel();
    this.view = new GameIntroView(
      () => this.nextPage(),
      () => this.previousPage(),
      () => this.completeIntro(),
    );
    this.screenSwitcher = screenSwitcher;

    // Do not render or setup input immediately in constructor,
    // wait for show() to be called.
    this.view.hide();
  }

  show(): void {
    this.currentPage = 0;
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
    if (this.currentPage < this.model.getPageCount() - 1) {
      this.currentPage++;
      this.renderCurrentPage();
    } else {
      this.completeIntro();
    }
  }

  private previousPage(): void {
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
          this.completeIntro();
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

  private completeIntro(): void {
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
