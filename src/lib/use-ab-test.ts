'use client';

import { useEffect, useState } from 'react';

/**
 * 客户端 A/B 测试 hook.
 * 自动调 /api/ab/assign 拿变体, 跟踪 impression (服务端记录).
 *
 * 用法:
 *   const { variant, track } = useABTest('payment_cta_v1');
 *   <button onClick={() => { track('click'); ... }}>...</button>
 */
export function useABTest(experiment: string, path?: string) {
  const [variant, setVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ab/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ experiment, path: path || window.location.pathname }),
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setVariant(data.variant);
        }
      } catch (err) {
        console.error('AB assign failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [experiment, path]);

  const track = async (
    eventType: 'click' | 'conversion',
    extra?: { value?: number; metadata?: Record<string, unknown> }
  ) => {
    if (!variant) return;
    try {
      await fetch('/api/ab/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment,
          variant,
          event_type: eventType,
          value: extra?.value,
          metadata: extra?.metadata,
        }),
        // 不阻塞用户体验
        keepalive: true,
      });
    } catch (err) {
      console.error('AB event failed:', err);
    }
  };

  return { variant, loading, track };
}
