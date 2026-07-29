'use client';

import { useEffect, useState } from 'react';

const PREFIX = 'radar-pref-v1:';

/** R11：讀寫 localStorage 偏好（掛載後才讀，避免 SSR 水合不一致） */
export function useRadarPref<T>(key: string, defaultValue: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      /* keep default */
    }
    setReady(true);
  }, [key]);

  const set = (v: T | ((p: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return [value, set, ready];
}
