/**
 * Dynamic loader for Google Identity Services (GIS) client script.
 * 
 * Privacy-First & Offline-First:
 * The script https://accounts.google.com/gsi/client is NEVER loaded on initial app launch.
 * It is loaded dynamically (once only) ONLY when the user explicitly triggers Google Sign-In
 * or opens the login modal.
 */

let gisLoadPromise: Promise<boolean> | null = null;

export function isGoogleGisAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.accounts?.id);
}

export function loadGoogleGisScript(timeoutMs = 12000): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // If already loaded and initialized on window
  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }

  if (gisLoadPromise) {
    return gisLoadPromise;
  }

  gisLoadPromise = new Promise<boolean>((resolve, reject) => {
    // Check if script tag already exists in the document
    const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
    let script = document.querySelector<HTMLScriptElement>(`script[src*="accounts.google.com/gsi/client"]`);

    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    timer = setTimeout(() => {
      cleanup();
      gisLoadPromise = null;
      reject(new Error('TIMEOUT_GIS'));
    }, timeoutMs);

    if (script) {
      if (window.google?.accounts?.id) {
        cleanup();
        resolve(true);
        return;
      }

      script.addEventListener('load', () => {
        cleanup();
        resolve(true);
      }, { once: true });

      script.addEventListener('error', (err) => {
        cleanup();
        gisLoadPromise = null;
        reject(err);
      }, { once: true });

      return;
    }

    script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      cleanup();
      resolve(true);
    };

    script.onerror = (err) => {
      cleanup();
      gisLoadPromise = null;
      script?.remove();
      reject(new Error('OFFLINE_OR_NETWORK_ERROR'));
    };

    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export function resetGisLoadPromise(): void {
  gisLoadPromise = null;
  const script = document.querySelector(`script[src*="accounts.google.com/gsi/client"]`);
  if (script) {
    script.remove();
  }
}
