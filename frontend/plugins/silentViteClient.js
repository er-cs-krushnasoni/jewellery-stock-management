// plugins/silentViteClient.js
// Place this file in: frontend/plugins/silentViteClient.js

export function silentViteClientPlugin() {
    return {
      name: 'silent-vite-client',
      transform(code, id) {
        // Only modify the Vite client file
        if (id.includes('@vite/client') || id.includes('vite/dist/client')) {
          // Replace console.debug calls with empty functions
          code = code.replace(
            /console\.debug\(\[vite\].*?\);?/g,
            '(() => {})()'
          );
          
          // Replace console.info calls with empty functions
          code = code.replace(
            /console\.info\(\s*\[vite\].*?\);?/g,
            '(() => {})()'
          );
          
          // Replace the specific "connecting..." and "connected." logs
          code = code.replace(
            /console\.debug\(`\[vite\] connecting\.\.\.\`\);?/g,
            ''
          );
          
          code = code.replace(
            /console\.debug\(`\[vite\] connected\.\`\);?/g,
            ''
          );
          
          return {
            code,
            map: null
          };
        }
      }
    };
  }