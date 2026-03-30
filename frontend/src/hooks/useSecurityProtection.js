// src/hooks/useSecurityProtection.js
import { useEffect, useRef, useState } from 'react';

// Build trusted origins from env — works for local, tunnel, and production
const buildTrustedOrigins = () => {
  const origins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
  ];

  // Add KaratCalc origin from env if set (covers tunnel + production)
  const karatcalcOrigin = import.meta.env.VITE_KARATCALC_ORIGIN;
  if (karatcalcOrigin && !origins.includes(karatcalcOrigin)) {
    origins.push(karatcalcOrigin);
  }

  return origins;
};

const TRUSTED_ORIGINS = buildTrustedOrigins();

const isInIframe = () => {
  try { return window.self !== window.top; } catch (e) { return true; }
};

const isTrustedIframe = () => {
  if (!isInIframe()) return false;

  try {
    const parentOrigin = window.parent.location.origin;
    return TRUSTED_ORIGINS.includes(parentOrigin);
  } catch (e) {
    // Cross-origin parent — can't read parent.location.origin
    // This happens in tunnel/production. Check if our own origin
    // is localhost (dev) or matches a known trusted pattern.
    const ownOrigin = window.location.origin;
    const isLocalDev = ownOrigin.includes('localhost') || ownOrigin.includes('127.0.0.1');
    // In tunnel/production the stock app's own origin is the tunnel/prod URL,
    // but since it's being proxied it's actually running at the KaratCalc origin.
    // The safest check: trust if VITE_KARATCALC_ORIGIN is set (env-configured system)
    const isConfiguredSystem = !!import.meta.env.VITE_KARATCALC_ORIGIN;
    return isLocalDev || isConfiguredSystem;
  }
};

export const useSecurityProtection = () => {
  const [isProtected, setIsProtected] = useState(false);
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // ── Iframe trust check ───────────────────────────────────────────
    if (isInIframe() && !isTrustedIframe()) {
      document.body.style.display = 'none';
      return;
    }

    // Ensure body is visible (in case previous render hid it)
    document.body.style.display = '';

    // ── Security handlers ────────────────────────────────────────────
    const handleContextMenu = (e) => { e.preventDefault(); return false; };

    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c', 'K', 'k'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U'].includes(e.key))
      ) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.ctrlKey && ['s', 'S'].includes(e.key)) { e.preventDefault(); return false; }
      if (e.ctrlKey && ['p', 'P'].includes(e.key)) { e.preventDefault(); return false; }
    };

    const disableSelection = () => {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';
    };

    const preventDragDrop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
    const preventCopy = (e) => { e.preventDefault(); return false; };

    const detectDevTools = () => {
      if (!isMounted) return;
      const w = window.outerWidth - window.innerWidth > 160;
      const h = window.outerHeight - window.innerHeight > 160;
      if (w || h) setIsProtected(true);
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false });
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    document.addEventListener('dragstart', preventDragDrop, { capture: true, passive: false });
    document.addEventListener('drop', preventDragDrop, { capture: true, passive: false });
    document.addEventListener('copy', preventCopy, { capture: true, passive: false });
    document.addEventListener('cut', preventCopy, { capture: true, passive: false });
    document.addEventListener('paste', preventCopy, { capture: true, passive: false });

    disableSelection();
    checkIntervalRef.current = setInterval(detectDevTools, 1000);

    return () => {
      isMounted = false;
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('dragstart', preventDragDrop, { capture: true });
      document.removeEventListener('drop', preventDragDrop, { capture: true });
      document.removeEventListener('copy', preventCopy, { capture: true });
      document.removeEventListener('cut', preventCopy, { capture: true });
      document.removeEventListener('paste', preventCopy, { capture: true });
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.display = '';
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, []);

  return { isProtected };
};