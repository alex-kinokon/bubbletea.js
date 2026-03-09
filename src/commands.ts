/**
 * Built-in commands for bubbletea.js.
 *
 * Commands are functions that return messages, synchronously or asynchronously.
 * Return them from `init()` or `update()` to perform side effects.
 */

import type { Cmd, Msg } from "./messages.ts";

/**
 * quit returns a QuitMsg, telling the program to exit.
 * Use as a Cmd: return [model, quit]
 */
export function quit(): Msg {
  return { type: "quit" };
}

/** Returns an `InterruptMsg`. */
export function interrupt(): Msg {
  return { type: "interrupt" };
}

/** Returns a `SuspendMsg`. */
export function suspend(): Msg {
  return { type: "suspend" };
}

/** Returns a `ClearScreenMsg`. */
export function clearScreen(): Msg {
  return { type: "clearScreen" };
}

/**
 * Requests the current window size.
 *
 * The result is delivered as a `WindowSizeMsg`.
 */
export function requestWindowSize(): Msg {
  return { type: "_requestWindowSize" };
}

/**
 * Runs multiple commands concurrently.
 *
 * Results are delivered in no particular order.
 *
 * @example
 * return [model, batch(fetchUsers, fetchPosts)]
 */
export function batch<M = Msg>(...cmds: Array<Cmd<M> | null | undefined>): Cmd<M> | null {
  const valid = cmds.filter((c): c is Cmd<M> => c != null);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0]!;
  return (() => ({ type: "_batch", cmds: valid })) as Cmd<M>;
}

/**
 * Runs multiple commands one at a time, in order.
 *
 * @example
 * return [model, sequence(saveFile, closeEditor)]
 */
export function sequence<M = Msg>(
  ...cmds: Array<Cmd<M> | null | undefined>
): Cmd<M> | null {
  const valid = cmds.filter((c): c is Cmd<M> => c != null);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0]!;
  return (() => ({ type: "_sequence", cmds: valid })) as Cmd<M>;
}

/**
 * Fires once after the given number of milliseconds.
 *
 * The callback receives the current `Date` and should return a message.
 * `tick` sends a single message. To create a recurring tick, return another
 * `tick` command from `update()` when you receive the tick message.
 *
 * @example
 * interface TickMsg { type: "tick"; time: Date }
 * type AppMsg = Msg | TickMsg;
 *
 * function doTick(): Cmd<AppMsg> {
 *   return tick(1000, (t) => ({ type: "tick", time: t }));
 * }
 *
 * // In update, return another tick to keep ticking:
 * // case "tick":
 * //   return [model, doTick()];
 */
export function tick<M = Msg>(ms: number, fn: (time: Date) => M): Cmd<M> {
  return () =>
    new Promise<M>(resolve => {
      setTimeout(() => resolve(fn(new Date())), ms);
    });
}

/**
 * Fires in sync with the system clock at the given interval.
 *
 * Useful for synchronized ticking such as clock displays. Like `tick`, `every`
 * sends a single message. Return another `every` command from `update()` to
 * keep ticking.
 */
export function every<M = Msg>(ms: number, fn: (time: Date) => M): Cmd<M> {
  return () =>
    new Promise<M>(resolve => {
      const now = Date.now();
      const next = Math.ceil(now / ms) * ms;
      const delay = next - now || ms;
      setTimeout(() => resolve(fn(new Date())), delay);
    });
}

/**
 * Prints a line above the program output.
 *
 * The text persists across renders.
 */
export function println(...args: unknown[]): Cmd {
  return () => ({
    type: "_printLine",
    text: args.map(String).join(" "),
  });
}

/** Prints a formatted line above the program output. */
export function printf(template: string, ...args: unknown[]): Cmd {
  let i = 0;
  const text = template.replace(/%[%dfsv]/g, match => {
    if (match === "%%") return "%";
    return String(args[i++]);
  });
  return () => ({ type: "_printLine", text });
}
