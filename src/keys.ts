/** Key types and constants. */

/** Represents modifier key state. */
export interface KeyMod {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
}

export const noMod: KeyMod = { shift: false, alt: false, ctrl: false, meta: false };

/** Represents a key event. */
export interface Key {
  /** Full string representation such as `"a"`, `"ctrl+c"`, or `"up"`. */
  readonly key: string;
  /** Printable character data. Empty for special keys. */
  readonly text: string;
  /** Base key code without modifiers such as `"a"`, `"enter"`, or `"up"`. */
  readonly code: string;
  /** Modifier key state. */
  readonly mod: KeyMod;
  /** Whether this is a key repeat event. */
  readonly isRepeat: boolean;
}

/** Special key code constants. */
export const KeyUp = "up";
export const KeyDown = "down";
export const KeyRight = "right";
export const KeyLeft = "left";
export const KeyHome = "home";
export const KeyEnd = "end";
export const KeyPgUp = "pgup";
export const KeyPgDown = "pgdown";
export const KeyInsert = "insert";
export const KeyDelete = "delete";
export const KeyBackspace = "backspace";
export const KeyTab = "tab";
export const KeyEnter = "enter";
export const KeyEscape = "escape";
export const KeySpace = "space";

/** Function key constants. */
export const KeyF1 = "f1";
export const KeyF2 = "f2";
export const KeyF3 = "f3";
export const KeyF4 = "f4";
export const KeyF5 = "f5";
export const KeyF6 = "f6";
export const KeyF7 = "f7";
export const KeyF8 = "f8";
export const KeyF9 = "f9";
export const KeyF10 = "f10";
export const KeyF11 = "f11";
export const KeyF12 = "f12";
export const KeyF13 = "f13";
export const KeyF14 = "f14";
export const KeyF15 = "f15";
export const KeyF16 = "f16";
export const KeyF17 = "f17";
export const KeyF18 = "f18";
export const KeyF19 = "f19";
export const KeyF20 = "f20";

/** Builds the full key string representation with modifiers. */
export function formatKey(code: string, mod: KeyMod): string {
  const parts: string[] = [];
  if (mod.ctrl) parts.push("ctrl");
  if (mod.alt) parts.push("alt");
  if (mod.shift) parts.push("shift");
  if (mod.meta) parts.push("meta");
  parts.push(code);
  return parts.join("+");
}

/** Creates a `Key` object. */
export function makeKey(
  code: string,
  mod: KeyMod = noMod,
  text = "",
  isRepeat = false
): Key {
  // If there's printable text and no modifiers (except shift), use the text as the key string.
  const hasNonShiftMod = mod.ctrl || mod.alt || mod.meta;
  const keyStr = text && !hasNonShiftMod ? text : formatKey(code, mod);
  return { key: keyStr, text, code, mod, isRepeat };
}
