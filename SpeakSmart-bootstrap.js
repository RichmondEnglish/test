/**
 * SpeakSmart Bootstrap – loader-hijack-only
 * ----------------------------------------
 * • Replaces Adobe Captivate's default spinning loader with a branded pulse bubble.  
 * • Does NOT inject speaksmart-reading-gpt.js or touch any other logic.  
 * • Idempotent: if included twice it simply returns.  
 * • Safe: never re-defines tryAutoplay or any global from the main bundle.
 */
(function speakSmartBootstrap() {
  /* ──────────────────────────────── *
   *  1. Single-run guard
   * ──────────────────────────────── */
  if (window.__SPEAKSMART_BOOTSTRAP_LOADED__) return;
  window.__SPEAKSMART_BOOTSTRAP_LOADED__ = true;

  /* ──────────────────────────────── *
   *  2. Helper: log prefix
   * ──────────────────────────────── */
  const log = (...msg) => console.info('SpeakSmart-bootstrap:', ...msg);
  
  log('Initializing loader hijack system');

  /* ──────────────────────────────── *
   *  3. Inject CSS for the custom loader
   * ──────────────────────────────── */
  const css = /* css */`
    @keyframes ssPulse {
      0% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); opacity: 0.9; }
    }
    
    .ss-loader {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #5B9BD5 0%, #4285F4 100%);
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
      animation: ssPulse 1.2s ease-in-out infinite;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: "Comic Sans MS", sans-serif;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      pointer-events: none;
    }
    
    .ss-loader::before {
      content: "🧠";
      font-size: 48px;
      line-height: 1;
    }
    
    .ss-loader-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(255, 255, 255, 0.9);
      z-index: 9999;
      pointer-events: none;
    }
  `;

  const styleTag = document.createElement('style');
  styleTag.id = 'ss-loader-style';
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  /* ──────────────────────────────── *
   *  4. Function that swaps Captivate's
   *     loader for the SpeakSmart bubble
   * ──────────────────────────────── */
  function replaceLoader(captivateLoader) {
    if (!captivateLoader || !captivateLoader.parentNode) {
      log('Loader element not found or already replaced');
      return false;
    }

    // Skip if it's already our custom loader
    if (captivateLoader.classList.contains('ss-loader-container')) {
      log('Ignoring our own loader');
      return false;
    }

    try {
      // Create SpeakSmart loader container
      const ssContainer = document.createElement('div');
      ssContainer.className = 'ss-loader-container';
      ssContainer.id = captivateLoader.id || 'pronunciation-loading-overlay';
      
      // Create the pulsing loader
      const ssLoader = document.createElement('div');
      ssLoader.className = 'ss-loader';
      
      ssContainer.appendChild(ssLoader);
      
      // Replace the original loader
      captivateLoader.parentNode.replaceChild(ssContainer, captivateLoader);
      
      log('Successfully replaced Captivate loader with SpeakSmart bubble');
      return true;
    } catch (error) {
      log('Failed to replace loader:', error.message);
      return false;
    }
  }

  /* ──────────────────────────────── *
   *  5. DOM Observer for loader detection
   * ──────────────────────────────── */
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        
        // Check if this is the Captivate loader
        if (node.id === 'pronunciation-loading-overlay' || 
            node.classList.contains('loading-overlay') ||
            (node.querySelector && node.querySelector('[id*="loading"], [class*="loading"], [class*="spinner"]'))) {
          
          // Small delay to ensure the element is fully rendered
          setTimeout(() => {
            if (node.parentNode) {
              replaceLoader(node);
            }
          }, 10);
        }
        
        // Also check for loaders in the added subtree
        if (node.querySelector) {
          const loaders = node.querySelectorAll('#pronunciation-loading-overlay, [class*="loading"], [class*="spinner"]');
          loaders.forEach(loader => {
            if (!loader.classList.contains('ss-loader-container')) {
              setTimeout(() => replaceLoader(loader), 10);
            }
          });
        }
      });
    });
  });

  /* ──────────────────────────────── *
   *  6. Backup polling for missed loaders
   * ──────────────────────────────── */
  function pollForLoaders() {
    const commonSelectors = [
      '#pronunciation-loading-overlay',
      '[class*="loading-overlay"]',
      '[class*="spinner"]',
      '[id*="loading"]'
    ];
    
    commonSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (!element.classList.contains('ss-loader-container')) {
          replaceLoader(element);
        }
      });
    });
  }

  /* ──────────────────────────────── *
   *  7. Initialize monitoring system
   * ──────────────────────────────── */
  function startMonitoring() {
    if (document.body) {
      // Start DOM observer
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Initial check for existing loaders
      pollForLoaders();
      
      // Periodic backup polling (less aggressive)
      setInterval(pollForLoaders, 500);
      
      log('Monitoring system active');
    } else {
      // Wait for DOM to be ready
      document.addEventListener('DOMContentLoaded', startMonitoring);
    }
  }

  /* ──────────────────────────────── *
   *  8. Enhanced detection for pronunciation events
   * ──────────────────────────────── */
  
  // Listen for pronunciation-related events
  document.addEventListener('click', function(event) {
    const target = event.target;
    if (target && (
      target.classList.contains('pronunciation-button') ||
      target.getAttribute('aria-label')?.includes('pronunciation') ||
      target.textContent?.toLowerCase().includes('pronounce')
    )) {
      log('Pronunciation trigger detected, preparing for loader');
      // Start more aggressive polling for a short period
      let pollCount = 0;
      const aggressivePoll = setInterval(() => {
        pollForLoaders();
        pollCount++;
        if (pollCount > 20) { // Stop after 2 seconds
          clearInterval(aggressivePoll);
        }
      }, 100);
    }
  });

  // Start the monitoring system
  startMonitoring();
  
  log('SpeakSmart loader hijack system ready');
})();