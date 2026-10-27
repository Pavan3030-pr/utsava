/**
 * Latest-wins, serialised, debounced saver.
 * Rapid edits (ticking ten checklist boxes, typing an expense) collapse into one write, writes never
 * overlap or land out of order, and `flush()` guarantees nothing is lost when the tab is closing.
 */
export interface SaveQueue<T> {
  push(value: T, opts?: { immediate?: boolean }): void;
  flush(): Promise<void>;
}

export function createSaveQueue<T>(
  save: (value: T) => Promise<void>,
  onError: (err: unknown) => void,
  delayMs = 500,
): SaveQueue<T> {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  const run = (): Promise<void> => {
    timer = null;
    const job = pending;
    pending = null;
    if (!job) return chain;
    chain = chain.then(() => save(job.value)).catch(onError);
    return chain;
  };

  return {
    push(value, opts) {
      pending = { value };
      if (timer) clearTimeout(timer);
      if (opts?.immediate) void run();
      else timer = setTimeout(run, delayMs);
    },
    flush() {
      if (timer) clearTimeout(timer);
      return run();
    },
  };
}
