/**
 * Terminal renderer for bubbletea.js.
 *
 * Implements a line-diff based renderer that minimizes terminal writes.
 */
import type { Writable } from "node:stream";

import {
  beginSyncUpdate,
  clearLine,
  clearScreenSeq,
  clearToEndOfScreen,
  disableBracketedPaste,
  disableFocusReporting,
  disableMouseAllMotion,
  disableMouseCellMotion,
  disableMouseSGR,
  enableBracketedPaste,
  enableFocusReporting,
  enableMouseAllMotion,
  enableMouseCellMotion,
  enableMouseSGR,
  endSyncUpdate,
  enterAltScreen,
  exitAltScreen,
  hideCursor,
  moveCursor,
  setCursorStyle,
  setWindowTitle,
  showCursor,
} from "./ansi.ts";

/** Mouse reporting modes used by the renderer. */
export const enum MouseMode {
  None,
  CellMotion,
  AllMotion,
}

/** Cursor placement and styling for a rendered view. */
export interface CursorConfig {
  x: number;
  y: number;
  shape?: CursorShape;
  blink?: boolean;
}

/** Cursor shapes supported by the renderer. */
export const enum CursorShape {
  Block,
  Underline,
  Bar,
}

/** Full renderer input for a single frame. */
export interface ViewData {
  content: string;
  altScreen?: boolean;
  mouseMode?: MouseMode;
  cursor?: CursorConfig | null;
  reportFocus?: boolean;
  windowTitle?: string;
}

/** Writes diffed terminal updates to the output stream. */
export class Renderer {
  private readonly output: Writable;
  private width: number;
  private height: number;

  private prevLines: string[] = [];
  private curAltScreen = false;
  private curMouseMode: MouseMode = MouseMode.None;
  private curFocusReporting = false;
  private curBracketedPaste = true;
  private curWindowTitle = "";
  private lastView: ViewData | null = null;

  private pendingView: ViewData | null = null;
  private dirty = false;
  private syncUpdates = false;
  private started = false;

  constructor(output: Writable, width: number, height: number) {
    this.output = output;
    this.width = width;
    this.height = height;
  }

  start(): void {
    this.started = true;
    this.write(hideCursor);
    this.write(enableBracketedPaste);
  }

  stop(kill: boolean): void {
    if (!this.started) return;
    this.started = false;

    if (!kill) {
      this.flush(true);
    }

    this.close();
  }

  close(): void {
    // Restore terminal state
    if (this.curAltScreen) {
      this.write(exitAltScreen);
      this.curAltScreen = false;
    }
    if (this.curMouseMode !== MouseMode.None) {
      this.write(this.mouseTransition(this.curMouseMode, MouseMode.None));
      this.curMouseMode = MouseMode.None;
    }
    if (this.curFocusReporting) {
      this.write(disableFocusReporting);
      this.curFocusReporting = false;
    }
    if (this.curBracketedPaste) {
      this.write(disableBracketedPaste);
      this.curBracketedPaste = false;
    }
    this.write(showCursor);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(view: ViewData): void {
    this.pendingView = view;
    this.dirty = true;
  }

  clearScreen(): void {
    this.write(clearScreenSeq);
    this.prevLines = [];
  }

  insertAbove(text: string): void {
    if (this.curAltScreen) return;

    // Move to the first line of the current output, insert text above it,
    // then re-render below.
    const lines = this.prevLines;
    if (lines.length > 0) {
      // Move cursor up to the top of the current render
      this.write(`\x1B[${lines.length}A`);
    }
    // Insert the line
    this.write(`\r${text}\n`);
    // Re-render from current position
    this.prevLines = [];
    this.dirty = true;
  }

  setSyncUpdates(enabled: boolean): void {
    this.syncUpdates = enabled;
  }

  flush(closing: boolean): void {
    if (!this.dirty && !closing) return;
    if (!this.pendingView && !closing) return;

    const view = this.pendingView ?? this.lastView;
    if (!view) return;

    this.lastView = view;
    this.pendingView = null;
    this.dirty = false;

    let buf = "";

    if (this.syncUpdates) {
      buf += beginSyncUpdate;
    }

    // Handle alt screen transitions
    const wantAltScreen = view.altScreen ?? false;
    if (wantAltScreen !== this.curAltScreen) {
      if (wantAltScreen) {
        buf += enterAltScreen;
        this.prevLines = [];
      } else {
        buf += exitAltScreen;
        this.prevLines = [];
      }
      this.curAltScreen = wantAltScreen;
    }

    // Handle mouse mode transitions
    const wantMouseMode = view.mouseMode ?? MouseMode.None;
    if (wantMouseMode !== this.curMouseMode) {
      buf += this.mouseTransition(this.curMouseMode, wantMouseMode);
      this.curMouseMode = wantMouseMode;
    }

    // Handle focus reporting transitions
    const wantFocus = view.reportFocus ?? false;
    if (wantFocus !== this.curFocusReporting) {
      buf += wantFocus ? enableFocusReporting : disableFocusReporting;
      this.curFocusReporting = wantFocus;
    }

    // Handle window title
    if (view.windowTitle && view.windowTitle !== this.curWindowTitle) {
      buf += setWindowTitle(view.windowTitle);
      this.curWindowTitle = view.windowTitle;
    }

    // Diff and render content
    const content = view.content;
    const newLines = content.split("\n");

    // Limit lines to terminal height in alt screen mode
    const maxLines = this.curAltScreen ? this.height : newLines.length;
    const displayLines = newLines.slice(0, maxLines);

    if (this.prevLines.length === 0) {
      // First render or after clear: write everything
      buf += "\r"; // Go to beginning of line
      for (let i = 0; i < displayLines.length; i++) {
        buf += displayLines[i];
        if (i < displayLines.length - 1) {
          buf += "\r\n";
        }
      }
      buf += clearToEndOfScreen;
    } else {
      // Diff-based update: move cursor up to the start of previous output
      const prevCount = this.prevLines.length;
      if (prevCount > 1) {
        buf += `\x1B[${prevCount - 1}A`;
      }
      buf += "\r";

      for (let i = 0; i < Math.max(displayLines.length, this.prevLines.length); i++) {
        const newLine = displayLines[i] ?? "";
        const oldLine = this.prevLines[i] ?? "";

        if (i > 0) {
          buf += "\r\n";
        }

        if (newLine !== oldLine || i >= this.prevLines.length) {
          buf += newLine;
          // Clear the rest of the line if the new line is shorter
          if (newLine.length < this.stripAnsi(oldLine).length) {
            buf += clearLine.slice(2); // \x1b[K (clear to end of line)
          }
          buf += "\x1B[K"; // clear to end of line to be safe
        } else {
          // Line unchanged, move down
          buf += `\x1B[${newLine.length}C`; // skip over unchanged content
        }
      }

      // Clear remaining old lines
      if (displayLines.length < this.prevLines.length) {
        buf += clearToEndOfScreen;
      }
    }

    this.prevLines = displayLines;

    // Handle cursor
    const cursor = view.cursor;
    if (cursor) {
      buf += moveCursor(cursor.y, cursor.x);
      const style = encodeCursorStyle(
        cursor.shape ?? CursorShape.Block,
        cursor.blink ?? true
      );
      buf += setCursorStyle(style);
      buf += showCursor;
    } else {
      buf += hideCursor;
    }

    if (this.syncUpdates) {
      buf += endSyncUpdate;
    }

    if (buf.length > 0) {
      this.write(buf);
    }
  }

  private mouseTransition(from: MouseMode, to: MouseMode): string {
    let buf = "";
    // Disable old mode
    if (from === MouseMode.CellMotion) {
      buf += disableMouseCellMotion + disableMouseSGR;
    } else if (from === MouseMode.AllMotion) {
      buf += disableMouseAllMotion + disableMouseSGR;
    }
    // Enable new mode
    if (to === MouseMode.CellMotion) {
      buf += enableMouseCellMotion + enableMouseSGR;
    } else if (to === MouseMode.AllMotion) {
      buf += enableMouseAllMotion + enableMouseSGR;
    }
    return buf;
  }

  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[\d;]*[a-z]/gi, "");
  }

  private write(data: string): void {
    this.output.write(data);
  }
}

function encodeCursorStyle(shape: CursorShape, blink: boolean): number {
  const base = shape * 2 + 1;
  return blink ? base : base + 1;
}
