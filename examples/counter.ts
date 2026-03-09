// A simple counter example demonstrating the core bubbletea.js API.
//
// Run with: bun examples/counter.ts

import { Program, quit } from "../src/index.ts";
import type { Cmd, Model, Msg } from "../src/index.ts";

class Counter implements Model {
  count = 0;

  init(): Cmd | null {
    return null;
  }

  update(msg: Msg): [Model, Cmd | null] {
    switch (msg.type) {
      case "keyPress":
        switch (msg.key) {
          case "q":
          case "ctrl+c":
            return [this, quit];
          case "up":
          case "k":
            this.count++;
            break;
          case "down":
          case "j":
            this.count = Math.max(0, this.count - 1);
            break;
        }
        break;
    }
    return [this, null];
  }

  view(): string {
    return [
      "",
      `  Count: ${this.count}`,
      "",
      "  j/down: decrement",
      "  k/up:   increment",
      "  q:      quit",
      "",
    ].join("\n");
  }
}

const p = new Program(new Counter());
await p.run();
