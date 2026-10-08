# 🔍 Audit Report - NotoProjek (Tata App v5.1.0)

**Generated:** 2026-10-05  
**Repository:** notofpg/NotoProjek  
**Status:** ✅ **Critical Issues Fixed** | 🔴 **PWA Reinstall Issue Identified** | 🟡 **Configuration Warnings**

---

## 📋 Executive Summary

### ✅ FIXED ISSUES
1. **Vercel Deploy Blocking Error** → Resolved
   - ❌ `@google/genai@^0.1.2` (invalid version)
   - ✅ Changed to `@google/generative-ai@^0.21.0` (stable)
   - Status: Deployed to main branch

### 🔴 CRITICAL: PWA Reinstall Bug

**Problem:** User reports PWA cannot be reinstalled after uninstall.

**Root Causes Identified:**
1. **Missing manifest.webmanifest generation** - vite-plugin-pwa generates this but it's not being served with correct headers
2. **Service Worker cache strategy is too aggressive** - `skipWaiting: true` + `clientsClaim: true` can prevent clean reinstalls
3. **Browser cache key mismatch** - Manifest changes not invalidated on uninstall
4. **Missing Cache-Control headers** on manifest and service worker files

### 🟡 Configuration Warnings

1. Service Worker lifecycle (`skipWaiting` + `clientsClaim`) needs refinement
2. `maximumFileSizeToCacheInBytes: 5000000` (5MB) may be too large
3. Missing HTTP headers configuration for PWA installability
4. No error handling for failed PWA registration

---

## 🛠️ DETAILED FINDINGS

### 1. **Dependency Issue** ✅ FIXED

```json
// BEFORE (❌ Invalid)
"@google/genai": "^0.1.2"  // Package not found on npm

// AFTER (✅ Valid)
"@google/generative-ai": "^0.21.0"  // Official stable package
```

**Impact:** Vercel build failures, npm install errors  
**Fix Applied:** Commit `6bb98a7`

---

### 2. **PWA Manifest & Service Worker Configuration** 🔴 CRITICAL

#### Current State:
- ✅ Assets properly configured: `pwa-192x192.png`, `pwa-512x512.png`, etc.
- ✅ Workbox caching strategy is sound
- ✅ Service Worker custom extensions (`sw-custom.js`) properly integrated
- ❌ **Missing: Proper manifest serving headers**
- ❌ **Missing: Cache invalidation on manifest changes**

#### Problem Analysis:

**File:** `vite.config.ts` (line 12-101)
```typescript
VitePWA({
  registerType: 'autoUpdate',  // ⚠️ Issue: Can cause update conflicts
  includeAssets: [...],         // ✅ Correct
  manifest: {...},              // ✅ Correct
  workbox: {
    skipWaiting: true,          // ⚠️ Forces immediate SW takeover
    clientsClaim: true,         // ⚠️ Can break uninstall/reinstall cycle
    cleanupOutdatedCaches: true,// ✅ Good
  }
})
```

#### Why Reinstall Fails:

1. User uninstalls PWA from home screen
2. Browser keeps service worker in some caches
3. `skipWaiting: true` immediately activates new SW
4. Manifest cache key unchanged → Browser thinks it's already installed
5. `beforeinstallprompt` event never fires
6. User cannot reinstall

---

### 3. **Service Worker Lifecycle** 🔴 NEEDS REFINEMENT

**File:** `src/main.tsx` (line 22-72)

✅ **Good:**
- PWA events captured globally (`beforeinstallprompt`, `appinstalled`)
- Custom events dispatched for app coordination
- Periodic sync registered (Android PWA)

❌ **Issues:**
- No error recovery if SW registration fails
- No retry logic for failed PWA prompts
- `registerSW()` called too early (before app hydration complete)

---

### 4. **HTML Meta Tags** 🟡 PARTIAL

**File:** `index.html` (line 1-26)

✅ **Correct:**
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Tata Hidup Mu" />
<link rel="manifest" href="/manifest.webmanifest?v=3" />
```

❌ **Missing:**
```html
<!-- These headers must be set on the server for PWA to reinstall cleanly -->
<meta name="theme-color" content="#020617" />  <!-- ✅ Present but needs dynamic update -->
<link rel="icon" type="image/png" href="/favicon.png?v=3" />  <!-- ✅ Good with version param -->
```

---

### 5. **Vercel/Server Headers** 🔴 NOT CONFIGURED

**Critical for PWA Installability:**

Missing `vercel.json` HTTP headers configuration:

```json
{
  "headers": [
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" },
        { "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/**",
      "headers": [
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

---

## 📊 Issues Summary

| Issue | Severity | Status | Impact |
|-------|----------|--------|--------|
| `@google/genai` version invalid | 🔴 Critical | ✅ Fixed | Vercel deploy blocked |
| PWA reinstall after uninstall fails | 🔴 Critical | 🔧 WIP | Users cannot reinstall app |
| Missing HTTP headers for manifest/SW | 🔴 Critical | ⏳ Pending | May cause install failures |
| `skipWaiting: true` aggressive lifecycle | 🟡 High | ⏳ Pending | Can break uninstall cycle |
| Service Worker registration error handling | 🟡 Medium | ⏳ Pending | Silent failures on restricted env |
| Cache strategy too large (5MB limit) | 🟡 Medium | 📋 Review | May cause cache bloat |
| Missing PWA rollback strategy | 🟡 Medium | ⏳ Pending | No way to recover from bad update |

---

## ✅ RECOMMENDATIONS & FIXES

### Priority 1: PWA Reinstall Fix (CRITICAL)

**Option A: Conservative (Recommended for this app)**

Modify `vite.config.ts`:
```typescript
VitePWA({
  registerType: 'prompt',  // User chooses when to update
  workbox: {
    skipWaiting: false,           // Wait for all clients to close
    clientsClaim: false,          // Let user control SW activation
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
        }
      }
    ]
  }
})
```

**Option B: Aggressive (Keep current, fix reinstall)**

If you want to keep `autoUpdate`, add proper cache invalidation:
```typescript
const query = `?v=${Date.now()}`; // Force cache bust
manifest: {
  ...manifest,
  // Add version to all icon URLs
  icons: manifest.icons.map(icon => ({
    ...icon,
    src: icon.src + query
  }))
}
```

### Priority 2: Fix Vercel HTTP Headers

Update or create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "env": {
    "VITE_GOOGLE_CLIENT_ID": "@VITE_GOOGLE_CLIENT_ID"
  },
  "headers": [
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" },
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/**",
      "headers": [
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

### Priority 3: Service Worker Robustness

Update `src/main.tsx` with error handling:
```typescript
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[Tata PWA] New update available');
        window.dispatchEvent(new CustomEvent('tata_sw_update_available'));
      },
      onOfflineReady() {
        console.log('[Tata PWA] Offline cache ready');
        window.dispatchEvent(new CustomEvent('tata_sw_offline_ready'));
      },
      onRegistered(r) {
        if (!r) {
          console.warn('[Tata PWA] Registration returned null');
          return;
        }
        // Periodic sync setup...
      },
      onRegisterError(e) {
        console.error('[Tata PWA] Registration failed:', e);
        // Emit event for UI to show error
        window.dispatchEvent(new CustomEvent('tata_sw_error', { detail: e }));
      }
    });
    (window as any).__tata_update_sw = updateSW;
  } catch (e) {
    console.error('[Tata PWA] Failed to register SW:', e);
  }
}
```

### Priority 4: Add PWA Reinstall Recovery UI

In App.tsx or SettingsScreen, add:
```typescript
useEffect(() => {
  const handleSWError = (e: any) => {
    console.error('SW registration error:', e.detail);
    // Show toast: "PWA might not work offline. Try refreshing."
  };
  window.addEventListener('tata_sw_error', handleSWError);
  return () => window.removeEventListener('tata_sw_error', handleSWError);
}, []);
```

---

## 🧪 Testing Checklist

Before deploying PWA fixes:

- [ ] **Install Test:** Install PWA on phone → Add to home screen → Works offline
- [ ] **Uninstall Test:** Remove from home screen → Clear browser data → Reinstall → Works
- [ ] **Update Test:** Release new version → PWA shows update prompt → User accepts → Updates successfully
- [ ] **Offline Test:** Go offline → App still functions with cached data
- [ ] **Manifest Test:** Open DevTools → Application → Manifest → Verify all fields present
- [ ] **Service Worker Test:** DevTools → Application → Service Workers → Should show "activated and running"
- [ ] **Cross-Browser Test:** Chrome, Firefox, Safari, Edge on iOS/Android

---

## 📌 Files to Update

1. ✅ `package.json` - **DONE** (v6bb98a7)
2. ⏳ `vite.config.ts` - Need PWA lifecycle fix
3. ⏳ `vercel.json` - Need HTTP headers
4. ⏳ `src/main.tsx` - Need error handling
5. 📋 `src/App.tsx` (optional) - Show PWA status/errors

---

## 📞 Next Steps

1. **Immediate:** Deploy `package.json` fix (already done)
2. **This week:** Apply PWA lifecycle fixes from Priority 1-2
3. **Test:** Full PWA reinstall flow on real device
4. **Deploy:** New fixes to Vercel
5. **Monitor:** Check browser console for PWA errors post-deployment

---

**Report Status:** Ready for action  
**Last Updated:** 2026-10-05  
**Reviewer:** GitHub Copilot Audit Agent
