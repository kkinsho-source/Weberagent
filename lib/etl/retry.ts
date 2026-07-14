/**
 * 簡易重試：指數退避
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: {
    retries?: number;
    baseMs?: number;
    label?: string;
    shouldRetry?: (err: unknown) => boolean;
  }
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 800;
  const label = opts?.label ?? 'op';
  const shouldRetry =
    opts?.shouldRetry ??
    ((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      // 網路 / 5xx / 暫時性
      return /fetch|network|timeout|ECONN|HTTP 5|429/i.test(msg);
    });

  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (attempt >= retries || !shouldRetry(err)) break;
      const delay = baseMs * Math.pow(2, attempt);
      console.warn(
        `[retry] ${label} attempt ${attempt + 1}/${retries} failed, wait ${delay}ms`,
        err instanceof Error ? err.message : err
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
