// src/hooks/useSecurityProtection.js
import { useEffect, useRef, useState } from 'react';

// Trusted proxy origins — add production domain here when deploying
const TRUSTED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
];

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

const isTrustedIframe = () => {
  if (!isInIframe()) return false;

  try {
    const parentOrigin = window.parent.location.origin;
    return TRUSTED_ORIGINS.includes(parentOrigin);
  } catch (e) {
    // Can't access parent.location — cross-origin.
    // During development, referrer header tells us the parent origin.
    // Also check if our own origin is localhost (we're being proxied).
    const ownOrigin = window.location.origin;
    const isLocalDev = ownOrigin.includes('localhost') ||
                       ownOrigin.includes('127.0.0.1');
    return isLocalDev;
  }
};

export const useSecurityProtection = () => {
  const [isProtected, setIsProtected] = useState(false);
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // ── Iframe origin check ────────────────────────────────────────────
    // NEVER hide the body when inside our trusted KaratCalc proxy.
    // Only block embedding from genuinely untrusted external origins.
    if (isInIframe() && !isTrustedIframe()) {
      document.body.style.display = 'none';
      return; // Don't attach any other listeners either
    }

    // If we're in a trusted iframe, make sure body is visible
    // (in case a previous render hid it)
    document.body.style.display = '';

    // ── Security event handlers ────────────────────────────────────────

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c', 'K', 'k'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (e.ctrlKey && ['s', 'S'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && ['p', 'P'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    const disableSelection = () => {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';
    };

    const preventDragDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventCopy = (e) => {
      e.preventDefault();
      return false;
    };

    // ── DevTools detection ─────────────────────────────────────────────
    // NOTE: When running inside the KaratCalc iframe, DevTools is open on
    // the PARENT window — the outer window dimensions change, not the iframe's.
    // So outerWidth/outerHeight inside the iframe are the iframe's own dimensions
    // and DevTools detection correctly does NOT trigger inside the iframe.
    // For standalone access, this works normally.
    const detectDevTools = () => {
      if (!isMounted) return;
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        setIsProtected(true);
      }
    };

    // Apply protections
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
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
      document.body.style.display = '';

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return { isProtected };
};