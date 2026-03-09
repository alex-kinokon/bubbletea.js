// Alt screen example demonstrating full-screen mode with mouse support.
//
// Run with: bun examples/altscreen.ts

import { MouseMode, Program, quit } from "../src/index.ts";
import type { Cmd, Model, Msg, View } from "../src/index.ts";

class FullScreenApp implements Model {
  width = 80;
  height = 24;
  mouseX = 0;
  mouseY = 0;
  clicks = 0;

  init(): Cmd | null {
    return null;
  }

  update(msg: Msg): [Model, Cmd | null] {
    switch (msg.type) {
      case "keyPress":
        if (msg.key === "q" || msg.key === "ctrl+c" || msg.key === "escape") {
          return [this, quit];
        }
        break;
      case "windowSize":
        this.width = msg.width;
        this.height = msg.height;
        break;
      case "mouseClick":
        this.mouseX = msg.x;
        this.mouseY = msg.y;
        this.clicks++;
        break;
      case "mouseMotion":
        this.mouseX = msg.x;
        this.mouseY = msg.y;
        break;
    }
    return [this, null];
  }

  view(): View {
    const lines: string[] = [];
    const title = " bubbletea.js - Alt Screen Demo ";
    const padding = Math.max(0, Math.floor((this.width - title.length) / 2));
    lines.push(
      " ".repeat(padding) + title,
      "",
      `  Window: ${this.width}x${this.height}`,
      `  Mouse:  (${this.mouseX}, ${this.mouseY})`,
      `  Clicks: ${this.clicks}`,
      "",
      "  Press q or ESC to quit."
    );

    // Pad to fill screen.
    while (lines.length < this.height) {
      lines.push("");
    }

    return {
      content: lines.join("\n"),
      altScreen: true,
      mouseMode: MouseMode.AllMotion,
    };
  }
}

const p = new Program(new FullScreenApp());
await p.run();
