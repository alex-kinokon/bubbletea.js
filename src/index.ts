/**
 * bubbletea.js is a terminal UI framework based on The Elm Architecture.
 *
 * This package is a TypeScript port of `charmbracelet/bubbletea`.
 */

// Core types.
export { CursorShape, MouseMode, Program } from "./tea.ts";
export type {
  Cmd,
  CursorConfig,
  Model,
  Msg,
  ProgramOptions,
  View,
  ViewData,
} from "./tea.ts";

// Messages.
export type {
  AnyMouseMsg,
  BlurMsg,
  ClearScreenMsg,
  FocusMsg,
  InterruptMsg,
  KeyPressMsg,
  KeyReleaseMsg,
  MouseClickMsg,
  MouseMotionMsg,
  MouseReleaseMsg,
  MouseWheelMsg,
  PasteMsg,
  QuitMsg,
  ResumeMsg,
  SuspendMsg,
  WindowSizeMsg,
} from "./messages.ts";
export {
  isKeyPress,
  isKeyRelease,
  isMouseClick,
  isMouseMotion,
  isMouseRelease,
  isMouseWheel,
  isWindowSize,
  MouseBackward,
  MouseForward,
  MouseLeft,
  MouseMiddle,
  MouseNone,
  MouseRight,
  MouseWheelDown,
  MouseWheelLeft,
  MouseWheelRight,
  MouseWheelUp,
} from "./messages.ts";

// Key types and constants.
export type { Key, KeyMod } from "./keys.ts";
export {
  formatKey,
  KeyBackspace,
  KeyDelete,
  KeyDown,
  KeyEnd,
  KeyEnter,
  KeyEscape,
  KeyF1,
  KeyF10,
  KeyF11,
  KeyF12,
  KeyF13,
  KeyF14,
  KeyF15,
  KeyF16,
  KeyF17,
  KeyF18,
  KeyF19,
  KeyF2,
  KeyF20,
  KeyF3,
  KeyF4,
  KeyF5,
  KeyF6,
  KeyF7,
  KeyF8,
  KeyF9,
  KeyHome,
  KeyInsert,
  KeyLeft,
  KeyPgDown,
  KeyPgUp,
  KeyRight,
  KeySpace,
  KeyTab,
  KeyUp,
  makeKey,
  noMod,
} from "./keys.ts";

// Commands.
export {
  batch,
  clearScreen,
  every,
  interrupt,
  printf,
  println,
  quit,
  requestWindowSize,
  sequence,
  suspend,
  tick,
} from "./commands.ts";

// Errors.
export { ProgramError, ProgramInterruptedError, ProgramKilledError } from "./tea.ts";
