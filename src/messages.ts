/**
 * All message types for bubbletea.js.
 *
 * Messages use discriminated unions with a `type` field. Match messages in
 * your `update()` function with `switch (msg.type)`.
 */

import type { Key, KeyMod } from "./keys.ts";

/** Signals the program to exit. */
export interface QuitMsg {
  readonly type: "quit";
}

/** Signals the program was interrupted, for example by `Ctrl+C` as a signal. */
export interface InterruptMsg {
  readonly type: "interrupt";
}

/** Signals the program should suspend. */
export interface SuspendMsg {
  readonly type: "suspend";
}

/** Signals the program was resumed from a suspend. */
export interface ResumeMsg {
  readonly type: "resume";
}

/** Reports the terminal dimensions. */
export interface WindowSizeMsg {
  readonly type: "windowSize";
  readonly width: number;
  readonly height: number;
}

/** Represents a key press event. */
export interface KeyPressMsg extends Key {
  readonly type: "keyPress";
}

/** Represents a key release event. */
export interface KeyReleaseMsg extends Key {
  readonly type: "keyRelease";
}

/** Mouse button constants. */
export const MouseNone = 0;
export const MouseLeft = 1;
export const MouseMiddle = 2;
export const MouseRight = 3;
export const MouseWheelUp = 4;
export const MouseWheelDown = 5;
export const MouseWheelLeft = 6;
export const MouseWheelRight = 7;
export const MouseBackward = 8;
export const MouseForward = 9;
export type MouseButton = number;

/** Represents a mouse button click. */
export interface MouseClickMsg {
  readonly type: "mouseClick";
  readonly x: number;
  readonly y: number;
  readonly button: MouseButton;
  readonly mod: KeyMod;
}

/** Represents a mouse button release. */
export interface MouseReleaseMsg {
  readonly type: "mouseRelease";
  readonly x: number;
  readonly y: number;
  readonly button: MouseButton;
  readonly mod: KeyMod;
}

/** Represents a mouse scroll event. */
export interface MouseWheelMsg {
  readonly type: "mouseWheel";
  readonly x: number;
  readonly y: number;
  readonly button: MouseButton;
  readonly mod: KeyMod;
}

/** Represents mouse movement. */
export interface MouseMotionMsg {
  readonly type: "mouseMotion";
  readonly x: number;
  readonly y: number;
  readonly button: MouseButton;
  readonly mod: KeyMod;
}

/** Union of all mouse message types. */
export type AnyMouseMsg =
  | MouseClickMsg
  | MouseMotionMsg
  | MouseReleaseMsg
  | MouseWheelMsg;

/** Sent when the terminal gains focus. */
export interface FocusMsg {
  readonly type: "focus";
}

/** Sent when the terminal loses focus. */
export interface BlurMsg {
  readonly type: "blur";
}

/** Sent when text is pasted via bracketed paste. */
export interface PasteMsg {
  readonly type: "paste";
  readonly content: string;
}

/** Tells the renderer to clear the screen. */
export interface ClearScreenMsg {
  readonly type: "clearScreen";
}

/** Internal message types that are not intended as public API. */
export interface BatchMsg {
  readonly type: "_batch";
  readonly cmds: Cmd[];
}

export interface SequenceMsg {
  readonly type: "_sequence";
  readonly cmds: Cmd[];
}

export interface PrintLineMsg {
  readonly type: "_printLine";
  readonly text: string;
}

export interface RequestWindowSizeMsg {
  readonly type: "_requestWindowSize";
}

/** Internal messages used by the framework. */
type InternalMsg = BatchMsg | PrintLineMsg | RequestWindowSizeMsg | SequenceMsg;

/**
 * Discriminated union of all built-in message types.
 *
 * For programs that only use built-in messages, use `Msg` directly:
 *
 * @example
 * update(msg: Msg): [Model, Cmd | null]
 *
 * To add custom messages, define a union and use `Model<AppMsg>`:
 *
 * @example
 * interface TickMsg { type: "tick"; time: Date }
 * type AppMsg = Msg | TickMsg;
 * class Timer implements Model<AppMsg> { ... }
 */
export type Msg =
  | BlurMsg
  | ClearScreenMsg
  | FocusMsg
  | InternalMsg
  | InterruptMsg
  | KeyPressMsg
  | KeyReleaseMsg
  | MouseClickMsg
  | MouseMotionMsg
  | MouseReleaseMsg
  | MouseWheelMsg
  | PasteMsg
  | QuitMsg
  | ResumeMsg
  | SuspendMsg
  | WindowSizeMsg;

/**
 * IO operation that returns a message when complete.
 *
 * Commands can be synchronous or asynchronous. Generic over the message type
 * to support user-defined messages.
 */
export type Cmd<M = Msg> = () => M | Promise<M>;

/** Type guard for `KeyPressMsg`. */
export function isKeyPress(msg: { type: string }): msg is KeyPressMsg {
  return msg.type === "keyPress";
}

/** Type guard for `KeyReleaseMsg`. */
export function isKeyRelease(msg: { type: string }): msg is KeyReleaseMsg {
  return msg.type === "keyRelease";
}

/** Type guard for `MouseClickMsg`. */
export function isMouseClick(msg: { type: string }): msg is MouseClickMsg {
  return msg.type === "mouseClick";
}

/** Type guard for `MouseReleaseMsg`. */
export function isMouseRelease(msg: { type: string }): msg is MouseReleaseMsg {
  return msg.type === "mouseRelease";
}

/** Type guard for `MouseWheelMsg`. */
export function isMouseWheel(msg: { type: string }): msg is MouseWheelMsg {
  return msg.type === "mouseWheel";
}

/** Type guard for `MouseMotionMsg`. */
export function isMouseMotion(msg: { type: string }): msg is MouseMotionMsg {
  return msg.type === "mouseMotion";
}

/** Type guard for `WindowSizeMsg`. */
export function isWindowSize(msg: { type: string }): msg is WindowSizeMsg {
  return msg.type === "windowSize";
}
