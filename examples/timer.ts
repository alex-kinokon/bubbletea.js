// Timer example demonstrating tick commands and custom message types.
//
// Run with: bun examples/timer.ts

import { Program, quit, tick } from "../src/index.ts";
import type { Cmd, Model, Msg } from "../src/index.ts";

// Define a custom message type.
interface TickMsg {
  readonly type: "tick";
  readonly time: Date;
}

// Combine built-in messages with your custom ones.
type AppMsg = Msg | TickMsg;

function doTick(): Cmd<AppMsg> {
  return tick(1000, (t): AppMsg => ({ type: "tick", time: t }));
}

// Use Model<AppMsg> to get full switch narrowing for both built-in and custom messages.
class Timer implements Model<AppMsg> {
  seconds = 0;
  quitting = false;

  init(): Cmd<AppMsg> | null {
    return doTick();
  }

  update(msg: AppMsg): [Model<AppMsg>, Cmd<AppMsg> | null] {
    switch (msg.type) {
      case "keyPress":
        // msg is narrowed to KeyPressMsg here.
        if (msg.key === "q" || msg.key === "ctrl+c") {
          this.quitting = true;
          return [this, quit];
        }
        break;
      case "tick":
        // msg is narrowed to TickMsg here.
        this.seconds++;
        return [this, doTick()];
    }
    return [this, null];
  }

  view(): string {
    if (this.quitting) return `Timer stopped at ${this.seconds}s\n`;

    const mins = Math.floor(this.seconds / 60);
    const secs = this.seconds % 60;
    const time = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    return ["", `  Elapsed: ${time}`, "", "  Press q to quit.", ""].join("\n");
  }
}

const p = new Program(new Timer());
await p.run();
