/** Keyboard/mouse input capture for the planet explorer */

import type { InputFrame } from "./types";

export class InputManager {
  private keys = new Set<string>();
  private _enabled = true;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.keys.clear();
  }

  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) this.keys.clear();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this._enabled) return;
    // Prevent default for game keys
    const key = e.key.toLowerCase();
    if (["w", "a", "s", "d", " ", "e", "1", "2", "3", "4"].includes(key)) {
      e.preventDefault();
    }
    this.keys.add(key);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  /** Read current input state and reset one-shot flags */
  getFrame(): InputFrame {
    let dx = 0;
    let dy = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy = -1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy = 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx = -1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx = 1;

    const attack = this.keys.has(" "); // spacebar
    const mine = this.keys.has("e");

    let skill = -1;
    if (this.keys.has("1")) skill = 0;
    else if (this.keys.has("2")) skill = 1;
    else if (this.keys.has("3")) skill = 2;
    else if (this.keys.has("4")) skill = 3;

    return { dx, dy, attack, mine, skill };
  }
}
