/**
 * Terminal input parser.
 *
 * Parses raw bytes from stdin in raw mode into typed messages.
 */

import { type KeyMod, makeKey, noMod } from "./keys.ts";
import {
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
  KeyTab,
  KeyUp,
} from "./keys.ts";
import type { Msg } from "./messages.ts";
import {
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

/**
 * Decode modifier parameter from escape sequence.
 * Parameter is 1-based: 1=none, 2=shift, 3=alt, 4=shift+alt, 5=ctrl, etc.
 */
function decodeMod(param: number): KeyMod {
  const n = param - 1;
  return {
    shift: (n & 1) !== 0,
    alt: (n & 2) !== 0,
    ctrl: (n & 4) !== 0,
    meta: (n & 8) !== 0,
  };
}

/** Map from control character to Ctrl+letter. */
const ctrlKeyMap = new Map<number, string>([
  [0, "space"], // ctrl+space / ctrl+@
  // 1-26: ctrl+a through ctrl+z handled below
  [27, KeyEscape],
  // 28-31 are ctrl+\ ctrl+] ctrl+^ ctrl+_
]);

/** Map from CSI final byte to key code. */
const csiKeyMap = new Map<string, string>([
  ["A", KeyUp],
  ["B", KeyDown],
  ["C", KeyRight],
  ["D", KeyLeft],
  ["H", KeyHome],
  ["F", KeyEnd],
  ["P", KeyF1],
  ["Q", KeyF2],
  ["R", KeyF3], // Note: also cursor position response, disambiguated by context
  ["S", KeyF4],
  ["Z", KeyTab], // shift+tab
]);

// Map from CSI numeric parameter + tilde to key code.
const csiTildeMap = new Map<number, string>([
  [1, KeyHome],
  [2, KeyInsert],
  [3, KeyDelete],
  [4, KeyEnd],
  [5, KeyPgUp],
  [6, KeyPgDown],
  [7, KeyHome],
  [8, KeyEnd],
  [11, KeyF1],
  [12, KeyF2],
  [13, KeyF3],
  [14, KeyF4],
  [15, KeyF5],
  [17, KeyF6],
  [18, KeyF7],
  [19, KeyF8],
  [20, KeyF9],
  [21, KeyF10],
  [23, KeyF11],
  [24, KeyF12],
  [25, KeyF13],
  [26, KeyF14],
  [28, KeyF15],
  [29, KeyF16],
  [31, KeyF17],
  [32, KeyF18],
  [33, KeyF19],
  [34, KeyF20],
]);

/** SS3 key map (ESC O ...). */
const ss3KeyMap = new Map<string, string>([
  ["P", KeyF1],
  ["Q", KeyF2],
  ["R", KeyF3],
  ["S", KeyF4],
  ["A", KeyUp],
  ["B", KeyDown],
  ["C", KeyRight],
  ["D", KeyLeft],
  ["H", KeyHome],
  ["F", KeyEnd],
]);

function keyPress(code: string, mod: KeyMod = noMod, text = ""): Msg {
  return { type: "keyPress", ...makeKey(code, mod, text) };
}

/**
 * Parses a single input chunk from stdin into an array of messages.
 *
 * A single read from stdin may contain multiple events.
 */
export function parseInput(data: Buffer): Msg[] {
  const msgs: Msg[] = [];
  let i = 0;

  while (i < data.length) {
    const byte = data[i]!;

    // ESC sequence
    if (byte === 0x1b) {
      // Check if it's just ESC (no more data or timeout)
      if (i + 1 >= data.length) {
        msgs.push(keyPress(KeyEscape));
        i++;
        continue;
      }

      const next = data[i + 1]!;

      // CSI sequence: ESC [
      if (next === 0x5b) {
        const result = parseCSI(data, i + 2);
        if (result) {
          msgs.push(result.msg);
          i = result.end;
          continue;
        }
      }

      // SS3 sequence: ESC O
      if (next === 0x4f && i + 2 < data.length) {
        const ch = String.fromCharCode(data[i + 2]!);
        const code = ss3KeyMap.get(ch);
        if (code) {
          msgs.push(keyPress(code));
          i += 3;
          continue;
        }
      }

      // Alt+key: ESC followed by a regular character
      if (next >= 0x20 && next < 0x7f) {
        const ch = String.fromCharCode(next);
        const mod: KeyMod = { shift: false, alt: true, ctrl: false, meta: false };
        if (next === 0x20) {
          msgs.push(keyPress("space", mod, " "));
        } else {
          msgs.push(keyPress(ch.toLowerCase(), mod, ch));
        }
        i += 2;
        continue;
      }

      // Alt+ctrl+key: ESC followed by a control character
      if (next >= 1 && next <= 26) {
        const ch = String.fromCharCode(next + 96); // a-z
        const mod: KeyMod = { shift: false, alt: true, ctrl: true, meta: false };
        msgs.push(keyPress(ch, mod));
        i += 2;
        continue;
      }

      // Unknown ESC sequence, treat as ESC
      msgs.push(keyPress(KeyEscape));
      i++;
      continue;
    }

    // Control characters
    if (byte < 0x20) {
      switch (byte) {
        case 0x0d:
          // Enter
          msgs.push(keyPress(KeyEnter));
          break;

        case 0x09:
          // Tab
          msgs.push(keyPress(KeyTab));
          break;

        case 0x08:
          // Backspace (some terminals)
          msgs.push(keyPress(KeyBackspace));
          break;

        case 0x00:
          // Ctrl+Space
          msgs.push(
            keyPress("space", {
              shift: false,
              alt: false,
              ctrl: true,
              meta: false,
            })
          );

          break;

        default:
          if (byte >= 1 && byte <= 26) {
            // Ctrl+A through Ctrl+Z
            const ch = String.fromCharCode(byte + 96); // a-z
            msgs.push(
              keyPress(ch, {
                shift: false,
                alt: false,
                ctrl: true,
                meta: false,
              })
            );
          } else {
            const name = ctrlKeyMap.get(byte);
            if (name) {
              msgs.push(keyPress(name));
            }
          }
      }
      i++;
      continue;
    }

    // DEL (backspace on most terminals)
    if (byte === 0x7f) {
      msgs.push(keyPress(KeyBackspace));
      i++;
      continue;
    }

    // Regular printable ASCII or multi-byte UTF-8
    if (byte >= 0x20) {
      // Determine how many bytes this character takes (UTF-8)
      let charLen = 1;
      if (byte >= 0xc0 && byte < 0xe0) charLen = 2;
      else if (byte >= 0xe0 && byte < 0xf0) charLen = 3;
      else if (byte >= 0xf0 && byte < 0xf8) charLen = 4;

      if (i + charLen <= data.length) {
        const text = data.subarray(i, i + charLen).toString("utf-8");
        const code = text.length === 1 ? text.toLowerCase() : text;
        if (text === " ") {
          msgs.push(keyPress("space", noMod, " "));
        } else {
          msgs.push(keyPress(code, noMod, text));
        }
        i += charLen;
      } else {
        // Incomplete UTF-8 sequence, skip
        i++;
      }
      continue;
    }

    i++;
  }

  return msgs;
}

interface ParseResult {
  msg: Msg;
  end: number;
}

/** Parse a CSI sequence starting after "ESC [". */
function parseCSI(data: Buffer, start: number): ParseResult | null {
  let i = start;

  // Check for mouse SGR: ESC [ <
  if (i < data.length && data[i] === 0x3c) {
    return parseSGRMouse(data, i + 1);
  }

  // Check for focus events: ESC [ I (focus in) or ESC [ O (focus out)
  if (i < data.length && data[i] === 0x49) {
    return { msg: { type: "focus" }, end: i + 1 };
  }
  if (i < data.length && data[i] === 0x4f) {
    return { msg: { type: "blur" }, end: i + 1 };
  }

  // Collect parameters (digits and semicolons)
  let params = "";
  while (i < data.length) {
    const ch = data[i]!;
    if ((ch >= 0x30 && ch <= 0x39) || ch === 0x3b) {
      params += String.fromCharCode(ch);
      i++;
    } else {
      break;
    }
  }

  if (i >= data.length) return null;

  const finalByte = String.fromCharCode(data[i]!);
  i++;

  // Bracketed paste: CSI 200 ~ (start) or CSI 201 ~ (end)
  if (finalByte === "~") {
    const parts = params.split(";");
    const num = parseInt(parts[0] ?? "", 10);

    if (num === 200) {
      // Bracketed paste start - collect until CSI 201 ~
      return parseBracketedPaste(data, i);
    }

    if (num === 201) {
      // Stray paste end, ignore
      return null;
    }

    const mod = parts.length > 1 ? decodeMod(parseInt(parts[1]!, 10)) : noMod;
    const code = csiTildeMap.get(num);
    if (code) {
      return { msg: keyPress(code, mod), end: i };
    }

    return null;
  }

  // shift+tab: CSI Z
  if (finalByte === "Z") {
    return {
      msg: keyPress(KeyTab, {
        shift: true,
        alt: false,
        ctrl: false,
        meta: false,
      }),
      end: i,
    };
  }

  // Standard CSI keys (arrows, home, end, etc.)
  const code = csiKeyMap.get(finalByte);
  if (code) {
    const parts = params.split(";");
    let mod = noMod;
    if (parts.length > 1) {
      mod = decodeMod(parseInt(parts[1]!, 10));
    }
    return { msg: keyPress(code, mod), end: i };
  }

  return null;
}

/** Parse SGR mouse event: ESC [ < Cb ; Cx ; Cy M/m */
function parseSGRMouse(data: Buffer, start: number): ParseResult | null {
  let i = start;
  let params = "";

  while (i < data.length) {
    const ch = data[i]!;
    if ((ch >= 0x30 && ch <= 0x39) || ch === 0x3b) {
      params += String.fromCharCode(ch);
      i++;
    } else {
      break;
    }
  }

  if (i >= data.length) return null;

  const finalByte = data[i]!;
  i++;

  // M = press/motion, m = release
  if (finalByte !== 0x4d && finalByte !== 0x6d) return null;

  const isRelease = finalByte === 0x6d;
  const parts = params.split(";");
  if (parts.length < 3) return null;

  const cb = parseInt(parts[0]!, 10);
  const x = parseInt(parts[1]!, 10) - 1; // Convert to 0-based
  const y = parseInt(parts[2]!, 10) - 1;

  const mod: KeyMod = {
    shift: (cb & 4) !== 0,
    alt: (cb & 8) !== 0,
    ctrl: (cb & 16) !== 0,
    meta: false,
  };

  const isMotion = (cb & 32) !== 0;
  const isWheel = (cb & 64) !== 0;
  const buttonBits = cb & 3;

  if (isWheel) {
    const button =
      buttonBits === 0
        ? MouseWheelUp
        : buttonBits === 1
          ? MouseWheelDown
          : buttonBits === 2
            ? MouseWheelLeft
            : MouseWheelRight;
    return {
      msg: { type: "mouseWheel", x, y, button, mod },
      end: i,
    };
  }

  let button: number;
  switch (buttonBits) {
    case 0:
      button = MouseLeft;
      break;

    case 1:
      button = MouseMiddle;
      break;

    case 2:
      button = MouseRight;
      break;

    default:
      button = MouseNone;
  } // button 3 = no button (in some modes)

  // Additional buttons from higher bits
  if ((cb & 128) !== 0) {
    if (buttonBits === 0) {
      button = MouseBackward;
    } else if (buttonBits === 1) {
      button = MouseForward;
    }
  }

  if (isRelease) {
    return {
      msg: { type: "mouseRelease", x, y, button, mod },
      end: i,
    };
  }

  if (isMotion) {
    return {
      msg: { type: "mouseMotion", x, y, button, mod },
      end: i,
    };
  }

  return {
    msg: { type: "mouseClick", x, y, button, mod },
    end: i,
  };
}

/** Parse bracketed paste content (after CSI 200 ~). */
function parseBracketedPaste(data: Buffer, start: number): ParseResult | null {
  // Look for ESC [ 201 ~ to end the paste
  const endSeq = Buffer.from("\x1B[201~");
  let i = start;

  while (i + endSeq.length <= data.length) {
    if (data.subarray(i, i + endSeq.length).equals(endSeq)) {
      const content = data.subarray(start, i).toString("utf-8");
      return {
        msg: { type: "paste", content },
        end: i + endSeq.length,
      };
    }
    i++;
  }

  // End sequence not found in this chunk - return what we have
  // In a real implementation you'd buffer across reads, but this covers most cases
  const content = data.subarray(start).toString("utf-8");
  return {
    msg: { type: "paste", content },
    end: data.length,
  };
}
