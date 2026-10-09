import { useEffect } from 'react';

/**
 * Student pages par DevTools shortcuts / copy / right-click ko rokta hai.
 * NOTE: ye sirf deterrent hai, 100% security nahi.
 * Window-size se DevTools detect karna jaan-boojh kar hataya hai, kyunki usse
 * asli students ko galat block ho jaata tha (zoom, sidebar, display scaling).
 */
export const useAntiInspect = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = (e.key || '').toLowerCase();
      const blocked =
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        (mod && ['c', 'v', 'x', 'p', 'u', 's', 'a'].includes(k)) ||
        (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k));
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const stop = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('contextmenu', stop, true);
    document.addEventListener('copy', stop, true);
    document.addEventListener('cut', stop, true);
    document.addEventListener('paste', stop, true);
    document.addEventListener('dragstart', stop, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('contextmenu', stop, true);
      document.removeEventListener('copy', stop, true);
      document.removeEventListener('cut', stop, true);
      document.removeEventListener('paste', stop, true);
      document.removeEventListener('dragstart', stop, true);
    };
  }, [enabled]);
};
