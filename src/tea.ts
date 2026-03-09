/**
 * Core bubbletea.js module.
 *
 * Implements the `Program` class that runs the Elm Architecture event loop.
 */

import type { Readable, Writable } from "node:stream";

import { parseInput } from "./input.ts";
import type { Cmd, Msg } from "./messages.ts";
import {
  type CursorConfig,
  Renderer,
  type MouseMode as RendererMouseMode,
  type ViewData,
} from "./renderer.ts";

/** Controls what mouse events are reported. */
export const MouseMode = {
  None: 0,
  CellMotion: 1,
  AllMotion: 2,
} as const;
export type MouseMode = (typeof MouseMode)[keyof typeof MouseMode];

/** Controls cursor appearance. */
export const CursorShape = {
  Block: 0,
  Underline: 1,
  Bar: 2,
} as const;
export type CursorShape = (typeof CursorShape)[keyof typeof CursorShape];

/**
 * Core interface for bubbletea.js applications.
 *
 * The type parameter `M` is your full message union. For programs that only
 * use built-in messages, omit it and it defaults to `Msg`. For custom
 * messages, define a union and pass it.
 *
 * @example
 * interface TickMsg { type: "tick"; time: Date }
 * type AppMsg = Msg | TickMsg;
 *
 * class Timer implements Model<AppMsg> {
 *   update(msg: AppMsg): [Model<AppMsg>, Cmd<AppMsg> | null] {
 *     switch (msg.type) {
 *       case "keyPress": msg.key;
 *       case "tick": msg.time;
 *     }
 *   }
 * }
 */
export interface Model<M = Msg> {
  init(): Cmd<M> | null;
  update(msg: M): [Model<M>, Cmd<M> | null];
  view(): string | View;
}

/** Describes how the terminal should look. */
export interface View {
  content: string;
  altScreen?: boolean;
  mouseMode?: MouseMode;
  cursor?: CursorConfig | null;
  reportFocus?: boolean;
  windowTitle?: string;
}

/** Configuration options for a `Program`. */
export interface ProgramOptions<M = Msg> {
  input?: Readable | null;
  output?: Writable;
  fps?: number;
  disableRenderer?: boolean;
  disableSignalHandler?: boolean;
  filter?: (model: Model<M>, msg: M) => M | null;
  windowSize?: { width: number; height: number };
}

/** Base error type thrown by `Program`. */
export class ProgramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgramError";
  }
}

/** Error thrown when a program is killed. */
export class ProgramKilledError extends ProgramError {
  constructor(cause?: Error) {
    super("program was killed");
    this.name = "ProgramKilledError";
    if (cause) this.cause = cause;
  }
}

/** Error thrown when a program is interrupted. */
export class ProgramInterruptedError extends ProgramError {
  constructor() {
    super("program was interrupted");
    this.name = "ProgramInterruptedError";
  }
}

const DEFAULT_FPS = 60;
const MAX_FPS = 120;

/**
 * Runs a bubbletea.js application.
 *
 * Generic over the message type to support user-defined messages.
 */
export class Program<M = Msg> {
  private model: Model<M>;
  private readonly opts: ProgramOptions<M>;

  private renderer: Renderer | null = null;
  private readonly msgQueue: M[] = [];
  private running = false;
  private finishing = false;
  private resolveRun: ((model: Model<M>) => void) | null = null;
  private rejectRun: ((err: Error) => void) | null = null;

  private input: Readable | null = null;
  private readonly output: Writable;
  private readonly fps: number;
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private rawModeWasEnabled = false;
  private signalHandlers: Array<{ signal: string; handler: () => void }> = [];
  private resizeHandler: (() => void) | null = null;
  private dataHandler: ((data: Buffer) => void) | null = null;

  private width = 80;
  private height = 24;

  private pendingCommands = 0;

  constructor(model: Model<M>, opts?: ProgramOptions<M>) {
    this.model = model;
    this.opts = opts ?? {};
    this.output = this.opts.output ?? process.stdout;

    let fps = this.opts.fps ?? DEFAULT_FPS;
    if (fps < 1) fps = DEFAULT_FPS;
    if (fps > MAX_FPS) fps = MAX_FPS;
    this.fps = fps;
  }

  async run(): Promise<Model<M>> {
    if (this.running) {
      throw new ProgramError("program is already running");
    }
    this.running = true;
    this.finishing = false;

    try {
      return await this.start();
    } finally {
      this.running = false;
    }
  }

  send(msg: M): void {
    if (!this.running) return;
    this.msgQueue.push(msg);
    this.drainQueue();
  }

  quit(): void {
    this.sendInternal({ type: "quit" });
  }

  kill(): void {
    this.shutdown(true);
  }

  // sendInternal sends a built-in Msg, casting to M.
  // Safe because M always includes built-in Msg types at runtime.
  private sendInternal(msg: Msg): void {
    this.send(msg as M);
  }

  private async start(): Promise<Model<M>> {
    return new Promise<Model<M>>((resolve, reject) => {
      this.resolveRun = resolve;
      this.rejectRun = reject;

      try {
        this.initTerminal();
        this.initRenderer();
        this.initSignals();
        this.initInput();

        this.sendInternal({ type: "windowSize", width: this.width, height: this.height });

        const initCmd = this.model.init();
        if (initCmd) {
          this.executeCmd(initCmd);
        }

        this.renderView();

        const frameDuration = Math.floor(1000 / this.fps);
        this.renderTimer = setInterval(() => {
          if (this.renderer) {
            this.renderer.flush(false);
          }
        }, frameDuration);
      } catch (err) {
        this.shutdown(true);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private initTerminal(): void {
    if (this.opts.windowSize) {
      this.width = this.opts.windowSize.width;
      this.height = this.opts.windowSize.height;
    } else if ("columns" in this.output && "rows" in this.output) {
      const tty = this.output as NodeJS.WriteStream;
      this.width = tty.columns; // default 80;
      this.height = tty.rows; // default 24;
    }

    if (this.opts.input !== null) {
      const stdin = this.opts.input ?? process.stdin;
      if ("setRawMode" in stdin && typeof stdin.setRawMode === "function") {
        this.rawModeWasEnabled = stdin.isRaw;
        if (!this.rawModeWasEnabled) {
          stdin.setRawMode(true);
        }
      }
      this.input = stdin;
    }
  }

  private initRenderer(): void {
    if (this.opts.disableRenderer) return;

    this.renderer = new Renderer(this.output, this.width, this.height);
    this.renderer.start();
  }

  private initSignals(): void {
    if (this.opts.disableSignalHandler) return;

    const sigintHandler = () => {
      this.sendInternal({ type: "interrupt" });
    };
    process.on("SIGINT", sigintHandler);
    this.signalHandlers.push({ signal: "SIGINT", handler: sigintHandler });

    const sigtermHandler = () => {
      this.sendInternal({ type: "quit" });
    };
    process.on("SIGTERM", sigtermHandler);
    this.signalHandlers.push({ signal: "SIGTERM", handler: sigtermHandler });

    this.resizeHandler = () => {
      if ("columns" in this.output && "rows" in this.output) {
        const tty = this.output as NodeJS.WriteStream;
        this.width = tty.columns; // this.width;
        this.height = tty.rows; // this.height;
        if (this.renderer) {
          this.renderer.resize(this.width, this.height);
        }
        this.sendInternal({ type: "windowSize", width: this.width, height: this.height });
      }
    };
    process.on("SIGWINCH", this.resizeHandler);
  }

  private initInput(): void {
    if (!this.input) return;

    this.dataHandler = (data: Buffer) => {
      const msgs = parseInput(data);
      for (const msg of msgs) {
        this.sendInternal(msg);
      }
    };

    this.input.on("data", this.dataHandler);
    if ("resume" in this.input && typeof this.input.resume === "function") {
      this.input.resume();
    }
  }

  private drainQueue(): void {
    while (this.msgQueue.length > 0 && !this.finishing) {
      const msg = this.msgQueue.shift()!;
      this.processMsg(msg);
    }
  }

  private processMsg(msg: M): void {
    if (this.opts.filter) {
      const filtered = this.opts.filter(this.model, msg);
      if (!filtered) return;
      msg = filtered;
    }

    // Handle special internal messages by checking type field.
    const m = msg as unknown as { type: string };
    switch (m.type) {
      case "quit":
        this.shutdown(false);
        return;

      case "interrupt":
        this.finishWithError(new ProgramInterruptedError());
        return;

      case "_batch": {
        const cmds = (msg as unknown as { cmds: Array<Cmd<M>> }).cmds;
        for (const cmd of cmds) {
          this.executeCmd(cmd);
        }
        return;
      }

      case "_sequence": {
        const cmds = (msg as unknown as { cmds: Array<Cmd<M>> }).cmds;
        this.executeSequence(cmds);
        return;
      }

      case "_requestWindowSize":
        this.sendInternal({ type: "windowSize", width: this.width, height: this.height });
        return;

      case "_printLine": {
        const text = (msg as unknown as { text: string }).text;
        if (this.renderer) {
          this.renderer.insertAbove(text);
        }
        return;
      }

      case "clearScreen":
        if (this.renderer) {
          this.renderer.clearScreen();
        }
        break;

      case "windowSize": {
        const ws = msg as unknown as { width: number; height: number };
        if (this.renderer) {
          this.renderer.resize(ws.width, ws.height);
        }
        break;
      }
    }

    const [newModel, cmd] = this.model.update(msg);
    this.model = newModel;

    if (cmd) {
      this.executeCmd(cmd);
    }

    this.renderView();
  }

  private renderView(): void {
    if (!this.renderer) return;

    const viewResult = this.model.view();
    const viewData: ViewData =
      typeof viewResult === "string"
        ? { content: viewResult }
        : {
            content: viewResult.content,
            altScreen: viewResult.altScreen,
            mouseMode: viewResult.mouseMode as unknown as RendererMouseMode,
            cursor: viewResult.cursor,
            reportFocus: viewResult.reportFocus,
            windowTitle: viewResult.windowTitle,
          };

    this.renderer.render(viewData);
  }

  private executeCmd(cmd: Cmd<M>): void {
    this.pendingCommands++;

    try {
      const result = cmd();

      if (result instanceof Promise) {
        result
          .then(msg => {
            this.pendingCommands--;
            if (msg != null) this.send(msg);
          })
          .catch(err => {
            this.pendingCommands--;
            console.error("Command error:", err);
          });
      } else {
        this.pendingCommands--;
        if (result != null) this.send(result);
      }
    } catch (err) {
      this.pendingCommands--;
      console.error("Command error:", err);
    }
  }

  private async executeSequence(cmds: Array<Cmd<M>>): Promise<void> {
    for (const cmd of cmds) {
      if (this.finishing) return;

      try {
        const result = cmd();
        const msg = result instanceof Promise ? await result : result;

        if (msg != null) {
          const m = msg as unknown as { type: string };
          if (m.type === "_batch") {
            const batchCmds = (msg as unknown as { cmds: Array<Cmd<M>> }).cmds;
            await Promise.all(batchCmds.map(c => this.executeSequenceCmd(c)));
          } else if (m.type === "_sequence") {
            const seqCmds = (msg as unknown as { cmds: Array<Cmd<M>> }).cmds;
            await this.executeSequence(seqCmds);
          } else {
            this.send(msg);
          }
        }
      } catch (err) {
        console.error("Sequence command error:", err);
      }
    }
  }

  private async executeSequenceCmd(cmd: Cmd<M>): Promise<void> {
    try {
      const result = cmd();
      const msg = result instanceof Promise ? await result : result;
      if (msg != null) this.send(msg);
    } catch (err) {
      console.error("Command error:", err);
    }
  }

  private shutdown(kill: boolean): void {
    if (this.finishing) return;
    this.finishing = true;

    if (!kill && this.renderer) {
      this.renderView();
      this.renderer.flush(true);
    }

    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = null;
    }

    if (this.renderer) {
      this.renderer.stop(kill);
      this.renderer = null;
    }

    for (const { signal, handler } of this.signalHandlers) {
      process.removeListener(signal, handler);
    }
    this.signalHandlers = [];

    if (this.resizeHandler) {
      process.removeListener("SIGWINCH", this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.input && this.dataHandler) {
      this.input.removeListener("data", this.dataHandler);
      this.dataHandler = null;

      if (
        "setRawMode" in this.input &&
        typeof (this.input as any).setRawMode === "function"
      ) {
        if (!this.rawModeWasEnabled) {
          (this.input as any).setRawMode(false);
        }
      }
      if ("pause" in this.input && typeof this.input.pause === "function") {
        this.input.pause();
      }
    }

    this.output.write("\n");

    if (this.resolveRun) {
      this.resolveRun(this.model);
      this.resolveRun = null;
      this.rejectRun = null;
    }
  }

  private finishWithError(err: Error): void {
    this.finishing = true;

    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = null;
    }

    if (this.renderer) {
      this.renderer.stop(true);
      this.renderer = null;
    }

    for (const { signal, handler } of this.signalHandlers) {
      process.removeListener(signal, handler);
    }
    this.signalHandlers = [];

    if (this.resizeHandler) {
      process.removeListener("SIGWINCH", this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.input && this.dataHandler) {
      this.input.removeListener("data", this.dataHandler);
      this.dataHandler = null;

      if (
        "setRawMode" in this.input &&
        typeof this.input.setRawMode === "function" &&
        !this.rawModeWasEnabled
      ) {
        this.input.setRawMode(false);
      }
      if ("pause" in this.input && typeof this.input.pause === "function") {
        this.input.pause();
      }
    }

    this.output.write("\n");

    if (this.rejectRun) {
      this.rejectRun(err);
      this.resolveRun = null;
      this.rejectRun = null;
    }
  }
}

export type { CursorConfig, ViewData } from "./renderer.ts";

export type { Cmd, Msg } from "./messages.ts";
