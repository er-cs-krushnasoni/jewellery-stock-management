export const blockConsoleInIframe = () => {
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  if (isInIframe) {
    const noop = () => {};

    const consoleMethods = [
      'log', 'info', 'warn', 'error', 'debug', 'trace',
      'dir', 'dirxml', 'table', 'group', 'groupEnd',
      'groupCollapsed', 'clear', 'count', 'countReset',
      'time', 'timeEnd', 'timeLog', 'timeStamp',
      'profile', 'profileEnd', 'assert'
    ];

    // Step 1: Replace all methods on the existing console object directly.
    // Do NOT use Object.defineProperty + Proxy — that causes infinite recursion
    // because the Proxy's own get trap internally accesses console again.
    consoleMethods.forEach(method => {
      try {
        Object.defineProperty(console, method, {
          value: noop,
          writable: false,
          configurable: false,
        });
      } catch (e) {
        // Fallback if defineProperty not allowed
        try { console[method] = noop; } catch (_) {}
      }
    });

    // Step 2: Suppress global errors silently (prevents red errors in parent devtools)
    window.onerror = () => true;
    window.onunhandledrejection = () => true;
  }
};

// Auto-execute
blockConsoleInIframe();