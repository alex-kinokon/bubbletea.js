import { describe, expect, test } from "bun:test";

import { parseInput } from "./input.ts";
import type {
  KeyPressMsg,
  MouseClickMsg,
  MouseReleaseMsg,
  MouseWheelMsg,
  PasteMsg,
} from "./messages.ts";

describe("parseInput", () => {
  describe("regular characters", () => {
    test("single ASCII letter", () => {
      const msgs = parseInput(Buffer.from("a"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.type).toBe("keyPress");
      expect(msg.key).toBe("a");
      expect(msg.text).toBe("a");
      expect(msg.code).toBe("a");
    });

    test("uppercase letter", () => {
      const msgs = parseInput(Buffer.from("A"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.key).toBe("A");
      expect(msg.text).toBe("A");
      expect(msg.code).toBe("a");
    });

    test("space", () => {
      const msgs = parseInput(Buffer.from(" "));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.key).toBe(" ");
      expect(msg.code).toBe("space");
    });

    test("number", () => {
      const msgs = parseInput(Buffer.from("5"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.key).toBe("5");
      expect(msg.text).toBe("5");
    });

    test("multiple characters in one chunk", () => {
      const msgs = parseInput(Buffer.from("abc"));
      expect(msgs).toHaveLength(3);
      expect((msgs[0] as KeyPressMsg).key).toBe("a");
      expect((msgs[1] as KeyPressMsg).key).toBe("b");
      expect((msgs[2] as KeyPressMsg).key).toBe("c");
    });

    test("UTF-8 character", () => {
      const msgs = parseInput(Buffer.from("é"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.text).toBe("é");
    });
  });

  describe("control characters", () => {
    test("enter (CR)", () => {
      const msgs = parseInput(Buffer.from([0x0d]));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("enter");
    });

    test("tab", () => {
      const msgs = parseInput(Buffer.from([0x09]));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("tab");
    });

    test("backspace (DEL)", () => {
      const msgs = parseInput(Buffer.from([0x7f]));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("backspace");
    });

    test("ctrl+a", () => {
      const msgs = parseInput(Buffer.from([0x01]));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.key).toBe("ctrl+a");
      expect(msg.code).toBe("a");
      expect(msg.mod.ctrl).toBe(true);
    });

    test("ctrl+c", () => {
      const msgs = parseInput(Buffer.from([0x03]));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.key).toBe("ctrl+c");
      expect(msg.mod.ctrl).toBe(true);
    });

    test("ctrl+z", () => {
      const msgs = parseInput(Buffer.from([0x1a]));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.key).toBe("ctrl+z");
    });
  });

  describe("escape sequences", () => {
    test("standalone escape", () => {
      const msgs = parseInput(Buffer.from([0x1b]));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("escape");
    });

    test("arrow up", () => {
      const msgs = parseInput(Buffer.from("\x1B[A"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("up");
    });

    test("arrow down", () => {
      const msgs = parseInput(Buffer.from("\x1B[B"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("down");
    });

    test("arrow right", () => {
      const msgs = parseInput(Buffer.from("\x1B[C"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("right");
    });

    test("arrow left", () => {
      const msgs = parseInput(Buffer.from("\x1B[D"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("left");
    });

    test("home", () => {
      const msgs = parseInput(Buffer.from("\x1B[H"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("home");
    });

    test("end", () => {
      const msgs = parseInput(Buffer.from("\x1B[F"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("end");
    });

    test("insert", () => {
      const msgs = parseInput(Buffer.from("\x1B[2~"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("insert");
    });

    test("delete", () => {
      const msgs = parseInput(Buffer.from("\x1B[3~"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("delete");
    });

    test("page up", () => {
      const msgs = parseInput(Buffer.from("\x1B[5~"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("pgup");
    });

    test("page down", () => {
      const msgs = parseInput(Buffer.from("\x1B[6~"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("pgdown");
    });

    test("shift+tab", () => {
      const msgs = parseInput(Buffer.from("\x1B[Z"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.code).toBe("tab");
      expect(msg.mod.shift).toBe(true);
    });
  });

  describe("function keys", () => {
    test("F1 (SS3)", () => {
      const msgs = parseInput(Buffer.from("\x1BOP"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("f1");
    });

    test("F2 (SS3)", () => {
      const msgs = parseInput(Buffer.from("\x1BOQ"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("f2");
    });

    test("F3 (SS3)", () => {
      const msgs = parseInput(Buffer.from("\x1BOR"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("f3");
    });

    test("F4 (SS3)", () => {
      const msgs = parseInput(Buffer.from("\x1BOS"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("f4");
    });

    test("F5", () => {
      const msgs = parseInput(Buffer.from("\x1B[15~"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("f5");
    });

    test("F12", () => {
      const msgs = parseInput(Buffer.from("\x1B[24~"));
      expect(msgs).toHaveLength(1);
      expect((msgs[0] as KeyPressMsg).code).toBe("f12");
    });
  });

  describe("modified keys", () => {
    test("shift+up", () => {
      const msgs = parseInput(Buffer.from("\x1B[1;2A"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.code).toBe("up");
      expect(msg.mod.shift).toBe(true);
    });

    test("alt+up", () => {
      const msgs = parseInput(Buffer.from("\x1B[1;3A"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.code).toBe("up");
      expect(msg.mod.alt).toBe(true);
    });

    test("ctrl+up", () => {
      const msgs = parseInput(Buffer.from("\x1B[1;5A"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.code).toBe("up");
      expect(msg.mod.ctrl).toBe(true);
    });

    test("ctrl+shift+up", () => {
      const msgs = parseInput(Buffer.from("\x1B[1;6A"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.code).toBe("up");
      expect(msg.mod.ctrl).toBe(true);
      expect(msg.mod.shift).toBe(true);
    });

    test("alt+a", () => {
      const msgs = parseInput(Buffer.from("\x1Ba"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as KeyPressMsg;
      expect(msg.key).toBe("alt+a");
      expect(msg.mod.alt).toBe(true);
    });
  });

  describe("focus events", () => {
    test("focus in", () => {
      const msgs = parseInput(Buffer.from("\x1B[I"));
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!.type).toBe("focus");
    });

    test("focus out", () => {
      const msgs = parseInput(Buffer.from("\x1B[O"));
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!.type).toBe("blur");
    });
  });

  describe("mouse events (SGR)", () => {
    test("left click at (10, 5)", () => {
      const msgs = parseInput(Buffer.from("\x1B[<0;11;6M"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as MouseClickMsg;
      expect(msg.type).toBe("mouseClick");
      expect(msg.x).toBe(10);
      expect(msg.y).toBe(5);
      expect(msg.button).toBe(1); // MouseLeft
    });

    test("right click", () => {
      const msgs = parseInput(Buffer.from("\x1B[<2;1;1M"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as MouseClickMsg;
      expect(msg.type).toBe("mouseClick");
      expect(msg.button).toBe(3); // MouseRight
    });

    test("mouse release", () => {
      const msgs = parseInput(Buffer.from("\x1B[<0;1;1m"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as MouseReleaseMsg;
      expect(msg.type).toBe("mouseRelease");
    });

    test("wheel up", () => {
      const msgs = parseInput(Buffer.from("\x1B[<64;1;1M"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as MouseWheelMsg;
      expect(msg.type).toBe("mouseWheel");
      expect(msg.button).toBe(4); // MouseWheelUp
    });

    test("wheel down", () => {
      const msgs = parseInput(Buffer.from("\x1B[<65;1;1M"));
      expect(msgs).toHaveLength(1);
      const msg = msgs[0] as MouseWheelMsg;
      expect(msg.type).toBe("mouseWheel");
      expect(msg.button).toBe(5); // MouseWheelDown
    });
  });

  describe("bracketed paste", () => {
    test("paste event", () => {
      const msgs = parseInput(Buffer.from("\x1B[200~Hello, World!\x1B[201~"));
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!.type).toBe("paste");
      expect((msgs[0] as PasteMsg).content).toBe("Hello, World!");
    });
  });
});
