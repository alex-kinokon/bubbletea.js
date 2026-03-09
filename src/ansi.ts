/** ANSI escape code constants and helpers for terminal control. */

export const ESC = "\x1B";
export const CSI = `${ESC}[`;
export const OSC = `${ESC}]`;
export const DCS = `${ESC}P`;
export const SS3 = `${ESC}O`;

/** Hides the terminal cursor. */
export const hideCursor = `${CSI}?25l`;
/** Shows the terminal cursor. */
export const showCursor = `${CSI}?25h`;
export const requestCursorPosition = `${CSI}6n`;
/** Moves the cursor to the given zero-based row and column. */
export function moveCursor(row: number, col: number): string {
  return `${CSI}${row + 1};${col + 1}H`;
}
/** Moves the cursor up by `n` rows. */
export function moveCursorUp(n: number): string {
  return n > 0 ? `${CSI}${n}A` : "";
}
/** Moves the cursor down by `n` rows. */
export function moveCursorDown(n: number): string {
  return n > 0 ? `${CSI}${n}B` : "";
}
export const saveCursorPosition = `${ESC}7`;
export const restoreCursorPosition = `${ESC}8`;
/** Sets the terminal cursor style. */
export function setCursorStyle(style: number): string {
  return `${CSI}${style} q`;
}

/** Clears the entire screen and homes the cursor. */
export const clearScreenSeq = `${CSI}2J${CSI}H`;
export const clearLine = `${CSI}2K`;
export const clearToEndOfLine = `${CSI}K`;
export const clearToEndOfScreen = `${CSI}J`;

/** Switches to the alternate screen buffer. */
export const enterAltScreen = `${CSI}?1049h`;
/** Returns to the main screen buffer. */
export const exitAltScreen = `${CSI}?1049l`;

/** Enables cell-motion mouse reporting. */
export const enableMouseCellMotion = `${CSI}?1002h`;
export const disableMouseCellMotion = `${CSI}?1002l`;
export const enableMouseAllMotion = `${CSI}?1003h`;
export const disableMouseAllMotion = `${CSI}?1003l`;
export const enableMouseSGR = `${CSI}?1006h`;
export const disableMouseSGR = `${CSI}?1006l`;

/** Enables bracketed paste mode. */
export const enableBracketedPaste = `${CSI}?2004h`;
/** Disables bracketed paste mode. */
export const disableBracketedPaste = `${CSI}?2004l`;

/** Enables terminal focus reporting. */
export const enableFocusReporting = `${CSI}?1004h`;
/** Disables terminal focus reporting. */
export const disableFocusReporting = `${CSI}?1004l`;

/** Begins a synchronized terminal update. */
export const beginSyncUpdate = `${CSI}?2026h`;
/** Ends a synchronized terminal update. */
export const endSyncUpdate = `${CSI}?2026l`;

/** Sets the scrolling region using zero-based top and bottom rows. */
export function setScrollRegion(top: number, bottom: number): string {
  return `${CSI}${top + 1};${bottom + 1}r`;
}
export const resetScrollRegion = `${CSI}r`;

/** Inserts one line at the cursor position. */
export const insertLine = `${CSI}L`;
/** Inserts `n` lines at the cursor position. */
export function insertLines(n: number): string {
  return `${CSI}${n}L`;
}
export const deleteLine = `${CSI}M`;

/** Sets the terminal window title. */
export function setWindowTitle(title: string): string {
  return `${OSC}2;${title}${ESC}\\`;
}

/** Full terminal reset sequence. */
export const resetTerminal = `${ESC}c`;
/** Resets terminal text attributes. */
export const resetAttributes = `${CSI}0m`;
