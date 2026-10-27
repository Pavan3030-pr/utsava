import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveQueue } from "../src/lib/save-queue";

describe("save queue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("collapses rapid edits into one write with the latest value", async () => {
    const save = vi.fn(async () => {});
    const q = createSaveQueue<number>(save, () => {}, 500);
    q.push(1); q.push(2); q.push(3);
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(3);
  });

  it("flush() writes pending data immediately (tab closing)", async () => {
    const save = vi.fn(async () => {});
    const q = createSaveQueue<string>(save, () => {}, 5000);
    q.push("draft");
    await q.flush();
    expect(save).toHaveBeenCalledWith("draft");
  });

  it("immediate writes skip the debounce and never overlap or reorder", async () => {
    const order: string[] = [];
    let release: () => void = () => {};
    const save = vi.fn(async (v: string) => {
      order.push(`start:${v}`);
      if (v === "a") await new Promise<void>((r) => { release = r; });
      order.push(`end:${v}`);
    });
    const q = createSaveQueue<string>(save, () => {}, 500);
    q.push("a", { immediate: true });
    q.push("b", { immediate: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["start:a"]);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["start:a", "end:a", "start:b", "end:b"]);
  });

  it("reports failures and keeps accepting writes", async () => {
    const onError = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const q = createSaveQueue<number>(save, onError, 10);
    q.push(1);
    await vi.advanceTimersByTimeAsync(20);
    expect(onError).toHaveBeenCalledTimes(1);
    q.push(2);
    await vi.advanceTimersByTimeAsync(20);
    expect(save).toHaveBeenLastCalledWith(2);
  });
});
