'use client';

import { useEffect } from 'react';

/** Registers the offline service worker once, on the client. No-op on browsers
 *  without SW support (or when served over plain http off-localhost). */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
  }, []);
  return null;
}
