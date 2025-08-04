/**
 * SpeakSmart Bootstrap – loader-hijack-only
 * ----------------------------------------
 * • Replaces Adobe Captivate’s default spinning loader with a branded pulse bubble.  
 * • Does NOT inject speaksmart-reading-gpt.js or touch any other logic.  
 * • Idempotent: if included twice it simply returns.  
 * • Safe: never re-defines tryAutoplay or any global from the main bundle.
 */

(function speakSmartBootstrap () {
  /* ──────────────────────────────── *
   *  1. Single-run guard
   * ──────────────────────────────── */
  if (window.__SPEAKSMART_BOOTSTRAP_LOADED__) return;
  window.__SPEAKSMART_BOOTSTRAP_LOADED__ = true;

  /* ──────────────────────────────── *
   *  2. Helper: log prefix
   * ──────────────────────────────── */
  const log = (...msg) => console.info('SpeakSmart-bootstrap:', ...msg);

  /* ──────────────────────────────── *
   *  3. Inject CSS for the custom loader
   * ──────────────────────────────── */
  const css = /* css */`
      @keyframes ssPulse{
        0%{transform:scale(1);opacity:.9}
       50%{transform:scale(1.15);opacity:1}
      100%{transform:scale(1);opacity:.9}
      }
      .ss-loader{
        width:120px;height:120px;border-radius:50%;
        background:radial-gradient(circle at 30% 30%,#5B9BD5 0%,#4285F4 100%);
        box-shadow:0 0 20px rgba(0,0,0,.25);
        animation:ssPulse 1.2s ease-in-out infinite;
        position:relative;
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-family:"Comic Sans MS",sans-serif;
        font-size:18px;font-weight:bold;text-align:center;
        pointer-events:none;
      }`;

  const styleTag = document.createElement('style');
  styleTag.id = 'ss-loader-style';
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  /* ──────────────────────────────── *
   *  4. Function that swaps Captivate’s
   *     loader for the SpeakSmart bubble
   * ──────────────────────────────── */
  function hijackLoader () {
    // Captivate HTML5 output usually creates #dv_preload.
    // Fallback classes added for older templates.
    const preload =
      document.querySelector('#dv_preload, .Preloader, .loaderBackground');
    if (!preload) return false;           // not in DOM yet

    preload.innerHTML = '';               // remove Captivate spinner
    preload.style.cssText =
      'display:flex!important;justify-content:center;align-items:center;';
    preload.classList.add('ss-loader');
    preload.textContent = 'Loading...';

    log('Hijacked Captivate loading animation');
    return true;
  }

  /* ──────────────────────────────── *
   *  5. Try immediately; if loader
   *     isn’t in DOM yet, observe
   * ──────────────────────────────── */
  if (!hijackLoader()) {
    const obs = new MutationObserver(() => {
      if (hijackLoader()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  log('monitoring active – waiting for Captivate loader');
})();
