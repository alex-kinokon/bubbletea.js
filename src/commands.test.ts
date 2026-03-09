import { describe, expect, test } from "bun:test";

import { batch, every, println, quit, sequence, tick } from "./commands.ts";
import * as commands from "./commands.ts";
import type { BatchMsg, PrintLineMsg, SequenceMsg } from "./messages.ts";

describe("shape", () => {
  test("quit", () => expect(quit()).toEqual({ type: "quit" }));
  test("interrupt", () => expect(commands.interrupt()).toEqual({ type: "interrupt" }));
  test("suspend", () => expect(commands.suspend()).toEqual({ type: "suspend" }));
  test("clearScreen", () =>
    expect(commands.clearScreen()).toEqual({ type: "clearScreen" }));
});

describe("batch", () => {
  test("returns null for empty args", () => {
    expect(batch()).toBeNull();
  });

  test("returns null for all-null args", () => {
    expect(batch(null, null, undefined)).toBeNull();
  });

  test("returns the single cmd directly for one arg", () => {
    const result = batch(quit);
    expect(result).toBe(quit);
  });

  test("returns a BatchMsg for multiple cmds", () => {
    const result = batch(quit, quit);
    expect(result).not.toBeNull();
    const msg = result!() as unknown as BatchMsg;
    expect(msg.type).toBe("_batch");
    expect(msg.cmds).toHaveLength(2);
  });

  test("filters out null cmds", () => {
    const result = batch(null, quit, null);
    expect(result).toBe(quit);
  });
});

describe("sequence", () => {
  test("returns null for empty args", () => {
    expect(sequence()).toBeNull();
  });

  test("returns the single cmd directly for one arg", () => {
    const result = sequence(quit);
    expect(result).toBe(quit);
  });

  test("returns a SequenceMsg for multiple cmds", () => {
    const result = sequence(quit, quit);
    expect(result).not.toBeNull();
    const msg = result!() as unknown as SequenceMsg;
    expect(msg.type).toBe("_sequence");
    expect(msg.cmds).toHaveLength(2);
  });
});

describe("tick", () => {
  test("fires after the given delay", async () => {
    const cmd = tick(50, quit);
    const start = Date.now();
    const msg = await cmd();
    const elapsed = Date.now() - start;
    expect(msg.type).toBe("quit");
    expect(elapsed).toBeGreaterThanOrEqual(40); // allow some variance
  });
});

describe("every", () => {
  test("fires aligned to system clock", async () => {
    const cmd = every(100, quit);
    const msg = await cmd();
    expect(msg.type).toBe("quit");
  });
});

describe("println", () => {
  test("creates a print line command", () => {
    const cmd = println("hello", "world");
    const msg = cmd() as PrintLineMsg;
    expect(msg.type).toBe("_printLine");
    expect(msg.text).toBe("hello world");
  });
});
