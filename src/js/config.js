import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════
window._SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// ═══════════════════════════════════════
// LOGOS (light & dark mode)
// ═══════════════════════════════════════
const LOGO_LIGHT_B64 = `data:image/svg+xml;utf8,<svg width="4000" height="4000" viewBox="0 0 4000 4000" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2215.94 2531.22L2214.04 1881.32L2388.32 1880.81L2390.22 2530.71L2215.94 2531.22Z" fill="%235B21B6"/><path d="M1990.42 2533.28L1988.96 2035.21L2165.8 2034.69L2167.26 2532.76L1990.42 2533.28Z" fill="%235B21B6"/><path d="M1780.25 2533.89L1779.07 2129.8L1940.53 2129.33L1941.72 2533.42L1780.25 2533.89Z" fill="%235B21B6"/><path d="M2489.77 755.701C2230.41 836.936 2075.21 1026.89 2075.9 1263.12C2076.12 1335.81 2078.72 1338.4 2195.49 1322.48C2416.08 1298.47 2643.85 1069.36 2687.27 827.808C2702.57 734.309 2699.97 731.721 2629.88 734.522C2588.35 734.644 2526.08 745.211 2489.77 755.701Z" fill="%235B21B6"/><path d="M1331.32 1413.23C1144.68 1504.63 1038.89 1723 1039.72 2005.96C1041.13 2486.2 1341.14 2991.53 1738.9 3190.25C1871.49 3254.76 1915.64 3262.42 2133.7 3264.38C2419.26 3263.54 2546.33 3219.04 2730.15 3052.36C2849.24 2942.98 2962.88 2742.76 2962.57 2638.92C2962.34 2558.45 2897.41 2550.85 2858.7 2628.84C2804.49 2730.24 2644 2889.07 2545.51 2941.27C2431.46 2998.72 2226.41 3009.7 2241.84 2960.34C2249.58 2942.14 2306.59 2908.23 2368.83 2887.28C2451.81 2858.48 2485.48 2829.82 2490.55 2788.27C2498.17 2731.14 2495.57 2731.15 2308.71 2747.27C2189.33 2758.01 2072.6 2789.5 1997.43 2826.06C1683.79 2985.34 1382.17 2820.08 1220.01 2405.2C1136.3 2187.39 1135.41 1883.67 1217.99 1717.29C1331.52 1480.72 1536.39 1410.03 1811.86 1510.46C1936.6 1556.83 1983.34 1561.88 2053.37 1543.5C2123.4 1522.53 2128.58 1517.32 2081.85 1514.86C2048.09 1512.37 1941.55 1476.34 1842.79 1435.09C1632.24 1342.26 1484.26 1337.5 1331.32 1413.23Z" fill="%235B21B6"/><path d="M2960.1 1748.89C2813.5 1724.54 2778.52 1669.46 2753.49 1538.37C2732.53 1662.76 2700.11 1718.07 2546.83 1750.1C2671.94 1776.93 2726.63 1810.82 2754.71 1956.13C2784.57 1823.93 2823.67 1772.59 2960.1 1748.89Z" fill="%235B21B6" stroke="%23422D18"/></svg>`;
const LOGO_DARK_B64 = `data:image/svg+xml;utf8,<svg width="4000" height="4000" viewBox="0 0 4000 4000" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2215.94 2531.23L2214.03 1881.33L2388.31 1880.82L2390.22 2530.72L2215.94 2531.23Z" fill="%23ECE1D4"/><path d="M1990.42 2533.29L1988.96 2035.22L2165.8 2034.71L2167.26 2532.77L1990.42 2533.29Z" fill="%23ECE1D4"/><path d="M1780.25 2533.91L1779.07 2129.82L1940.53 2129.34L1941.72 2533.43L1780.25 2533.91Z" fill="%23ECE1D4"/><path d="M2489.76 755.701C2230.4 836.936 2075.21 1026.89 2075.9 1263.12C2076.11 1335.81 2078.71 1338.4 2195.49 1322.48C2416.07 1298.47 2643.84 1069.36 2687.26 827.808C2702.57 734.309 2699.96 731.721 2629.88 734.522C2588.34 734.644 2526.07 745.211 2489.76 755.701Z" fill="%23ECE1D4"/><path d="M1331.32 1413.24C1144.68 1504.64 1038.89 1723.01 1039.72 2005.97C1041.12 2486.21 1341.14 2991.54 1738.9 3190.26C1871.48 3254.77 1915.64 3262.43 2133.7 3264.39C2419.25 3263.55 2546.32 3219.05 2730.15 3052.37C2849.24 2942.99 2962.87 2742.77 2962.57 2638.93C2962.33 2558.46 2897.41 2550.86 2858.7 2628.85C2804.49 2730.25 2644 2889.08 2545.51 2941.28C2431.46 2998.73 2226.41 3009.71 2241.84 2960.35C2249.58 2942.15 2306.59 2908.24 2368.83 2887.29C2451.81 2858.49 2485.48 2829.83 2490.55 2788.28C2498.17 2731.15 2495.57 2731.16 2308.71 2747.28C2189.33 2758.02 2072.6 2789.51 1997.43 2826.07C1683.79 2985.35 1382.17 2820.09 1220.01 2405.21C1136.3 2187.4 1135.41 1883.68 1217.99 1717.3C1331.52 1480.73 1536.39 1410.04 1811.85 1510.47C1936.6 1556.84 1983.34 1561.89 2053.37 1543.51C2123.4 1522.54 2128.58 1517.33 2081.85 1514.87C2048.09 1512.38 1941.55 1476.35 1842.78 1435.1C1632.24 1342.27 1484.26 1337.51 1331.32 1413.24Z" fill="%23ECE1D4"/><path d="M2960.1 1748.89C2813.49 1724.54 2778.51 1669.45 2753.48 1538.37C2732.52 1662.75 2700.1 1718.07 2546.83 1750.1C2671.94 1776.93 2726.62 1810.81 2754.71 1956.13C2784.56 1823.92 2823.67 1772.58 2960.1 1748.89Z" fill="%23ECE1D4" stroke="%23422D18"/></svg>`;
function getLogoSrc() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? LOGO_DARK_B64 : LOGO_LIGHT_B64;
}
function updateLogos() {
  const src = getLogoSrc();
  document.querySelectorAll('.app-logo-img').forEach(img => img.src = src);
  // Update favicon and apple-touch-icon
  const faviconEl = document.getElementById('dynamic-favicon');
  const appleIconEl = document.getElementById('dynamic-apple-icon');
  if (faviconEl) faviconEl.href = src;
  if (appleIconEl) appleIconEl.href = src;
  // Update PWA manifest dynamically with correct icon
  try {
    const manifest = {
      name: 'NutrIA',
      short_name: 'NutrIA',
      description: 'Nutrição Inteligente',
      start_url: './',
      display: 'standalone',
      background_color: '#0E0415',
      theme_color: '#422D18',
      icons: [
        { src: LOGO_LIGHT_B64, sizes: '192x192', type: 'image/png' },
        { src: LOGO_LIGHT_B64, sizes: '512x512', type: 'image/png' }
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);
    const manifestEl = document.getElementById('dynamic-manifest');
    if (manifestEl) manifestEl.href = manifestUrl;
  } catch(e) {}
}

window._SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const _CV_COOKIE = 'cv_rt';
const _cookieGet = k => { const m = document.cookie.match('(^|;)\\s*' + k + '=([^;]*)'); return m ? decodeURIComponent(m[2]) : null; };
const _cookieSet = (k,v,d) => { const e = new Date(Date.now()+d*864e5).toUTCString(); document.cookie = k+'='+encodeURIComponent(v)+';expires='+e+';path=/;SameSite=Strict'; };
const _cookieDel = k => { document.cookie = k+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; };

window._createSupabaseClient = createClient;

// Verifica se o storage está disponível (browsers com tracking prevention bloqueiam)
function _storageAvailable() {
  try { localStorage.setItem('__cv_test__','1'); localStorage.removeItem('__cv_test__'); return true; }
  catch(e) { return false; }
}

// Suprime erros de storage no console causados pelo Tracking Prevention
(function() {
  const _warn = console.warn.bind(console);
  console.warn = function(...args) {
    const msg = args[0]?.toString?.() || '';
    if (msg.includes('storage') || msg.includes('localStorage')) return;
    _warn(...args);
  };
  // Substitui localStorage por memória se bloqueado pelo browser
  if (!_storageAvailable()) {
    const _mem = {};
    window.localStorage = {
      getItem: k => _mem[k] ?? null,
      setItem: (k,v) => { _mem[k] = String(v); },
      removeItem: k => { delete _mem[k]; },
      clear: () => { Object.keys(_mem).forEach(k => delete _mem[k]); },
      key: i => Object.keys(_mem)[i] ?? null,
      get length() { return Object.keys(_mem).length; }
    };
  }
})();

const _supabaseUrl = window._SUPABASE_URL;
const _supabaseKey = window._SUPABASE_ANON_KEY;

if (!_supabaseUrl || !_supabaseKey) {
  console.error('[NutrIA] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados.');
}

window._db = window._createSupabaseClient(_supabaseUrl, _supabaseKey, {
  auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true, storageKey:'caloria-verde-auth' }
});
window.supabase = window._db;
globalThis.supabase = window._db;

function getSupabase() {
  return window._db || window.supabase;
}
window.getSupabase = getSupabase;
window.sb = getSupabase;
window.updateLogos = updateLogos;
window.LOGO_LIGHT_B64 = LOGO_LIGHT_B64;
window.LOGO_DARK_B64 = LOGO_DARK_B64;
window._cookieGet = _cookieGet;
window._cookieSet = _cookieSet;
window._cookieDel = _cookieDel;
window._CV_COOKIE = _CV_COOKIE;



