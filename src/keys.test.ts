import { describe, expect, test } from "bun:test";

import { formatKey, makeKey, noMod } from "./keys.ts";

describe("formatKey", () => {
  test("plain key", () => {
    expect(formatKey("a", noMod)).toBe("a");
  });

  test("ctrl+key", () => {
    expect(formatKey("c", { shift: false, alt: false, ctrl: true, meta: false })).toBe(
      "ctrl+c"
    );
  });

  test("ctrl+shift+key", () => {
    expect(formatKey("a", { shift: true, alt: false, ctrl: true, meta: false })).toBe(
      "ctrl+shift+a"
    );
  });

  test("all modifiers", () => {
    expect(formatKey("x", { shift: true, alt: true, ctrl: true, meta: true })).toBe(
      "ctrl+alt+shift+meta+x"
    );
  });
});

describe("makeKey", () => {
  test("printable character with no modifiers uses text as key", () => {
    const key = makeKey("a", noMod, "a");
    expect(key.key).toBe("a");
    expect(key.text).toBe("a");
    expect(key.code).toBe("a");
  });

  test("printable character with shift only uses text as key", () => {
    const key = makeKey("a", { shift: true, alt: false, ctrl: false, meta: false }, "A");
    expect(key.key).toBe("A");
    expect(key.text).toBe("A");
  });

  test("ctrl+key uses formatted key string", () => {
    const key = makeKey("c", { shift: false, alt: false, ctrl: true, meta: false });
    expect(key.key).toBe("ctrl+c");
    expect(key.text).toBe("");
    expect(key.code).toBe("c");
    expect(key.mod.ctrl).toBe(true);
  });

  test("special key uses formatted key string", () => {
    const key = makeKey("enter", noMod);
    expect(key.key).toBe("enter");
    expect(key.text).toBe("");
    expect(key.code).toBe("enter");
  });
});
