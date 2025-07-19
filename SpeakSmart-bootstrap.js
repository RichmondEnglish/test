/*  SpeakSmart Race-Condition-Proof Bootstrap with Audio Protection */
(function () {
  if (window.__speakSmartPatched) return;
  window.__speakSmartPatched = true;

  console.log('SpeakSmart robust bootstrap loaded with audio protection');

  // ========================================================
  // AUDIO CONTEXT PROTECTION SYSTEM
  // ========================================================
  const originalAudioContext = window.AudioContext || window.webkitAudioContext;
  const activeAudioContexts = new Set();
  
  if (originalAudioContext) {
    window.AudioContext = window.webkitAudioContext = function(...args) {
      const ctx = new originalAudioContext(...args);
      activeAudioContexts.add(ctx);
      
      // Prevent premature closure that interferes with main script
      const originalClose = ctx.close;
      ctx.close = function() {
        console.log('🔊 AudioContext close intercepted by bootstrap');
        // Only close if explicitly allowed by main script
        if (window.PronCheckerState?.allowAudioContextClose) {
          activeAudioContexts.delete(ctx);
          console.log('🔊 AudioContext close allowed');
          return originalClose.call(ctx);
        }
        console.log('🔊 AudioContext close prevented to avoid interference');
        return Promise.resolve();
      };
      
      return ctx;
    };
  }

  // ========================================================
  // CLEANUP PROTECTION SYSTEM
  // ========================================================
  function protectMainScript() {
    // Prevent aggressive cleanup during initialization
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay, ...args) {
      // Add safety delays to cleanup functions
      if (fn && fn.toString && (fn.toString().includes('cleanup') || fn.toString().includes('forceCleanup'))) {
        console.log('🛡️ Bootstrap: Adding safety delay to cleanup function');
        delay = Math.max(delay || 0, 150);
      }
      return originalSetTimeout.call(window, fn, delay, ...args);
    };
    
    // Protect critical intervals
    const originalClearInterval = window.clearInterval;
    window.clearInterval = function(id) {
      if (window.PronCheckerState?.heartbeatInterval === id) {
        console.log('🛡️ Bootstrap: Protected heartbeat interval from clearing');
        return;
      }
      return originalClearInterval.call(window, id);
    };
  }

  // Brain animation state
  var brainState = {
    animationId: null,
    canvas: null,
    overlay: null,
    paths: [],
    phases: [],
    speeds: [],
    widths: [],
    lastFlash: -Infinity,
    flickIdx: null,
    isReplacing: false,
    prebuiltOverlay: null
  };

  // Animation constants
  var FLASH_MS = 90;
  var GAP_MS = 240;

  /* -----------------------------------------------------------------------
   *  Perfect Brain Animation (ES5 compatible)
   * -------------------------------------------------------------------- */
  function rand(a, b) {
    return Math.random() * (b - a) + a;
  }

  function rotate(pt, pivot, deg) {
    var r = deg * Math.PI / 180;
    var c = Math.cos(r);
    var s = Math.sin(r);
    var dx = pt.x - pivot.x;
    var dy = pt.y - pivot.y;
    return {
      x: pivot.x + dx * c - dy * s,
      y: pivot.y + dx * s + dy * c
    };
  }

  function spline(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      var mx = (pts[i - 1].x + pts[i].x) / 2;
      var my = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  function setupBrainPaths() {
    var W = 200;
    var H = 230;
    var sizeFactor = 0.65;
    var s = 0.4 * sizeFactor;
    
    function scale(p) {
      return { x: p.x * s, y: p.y * s };
    }

    var baseLeftTop = [
      { x: 140, y: 55 }, { x: 95, y: 80 }, { x: 140, y: 105 }, 
      { x: 95, y: 130 }, { x: 140, y: 155 }
    ];
    var baseLeftBot = [
      { x: 145, y: 180 }, { x: 95, y: 220 }, { x: 140, y: 255 }, { x: 105, y: 295 }
    ];
    var baseRightBot = [
      { x: 360, y: 175 }, { x: 410, y: 220 }, { x: 360, y: 255 }, { x: 390, y: 295 }
    ];

    var leftTop = baseLeftTop.map(scale).map(function(p) {
      return { x: p.x - 40, y: p.y - 10 };
    });
    var leftBot = baseLeftBot.map(scale).map(function(p) {
      return { x: p.x - 40, y: p.y - 42 };
    });
    var rightTop = leftTop.map(function(p) {
      return { x: W - p.x, y: p.y };
    });
    var rightBot = baseRightBot.map(scale).map(function(p) {
      return { x: p.x - 40, y: p.y - 42 };
    }).map(function(p) {
      return { x: W - p.x, y: p.y };
    });

    var bottomLeft = leftBot.map(function(p) {
      return rotate(p, { x: 70, y: 100 }, 10);
    });
    var bottomRight = rightBot.map(function(p) {
      return rotate(p, { x: 130, y: 100 }, -10);
    });

    brainState.paths = [leftTop, bottomLeft, rightTop, bottomRight];

    var targetCenters = [
      { x: 67, y: 143 }, { x: 60, y: 188 }, 
      { x: 125, y: 143 }, { x: 132, y: 188 }
    ];

    var offsets = brainState.paths.map(function(pts, i) {
      var xs = pts.map(function(p) { return p.x; });
      var ys = pts.map(function(p) { return p.y; });
      var cx = (Math.min.apply(Math, xs) + Math.max.apply(Math, xs)) / 2;
      var cy = (Math.min.apply(Math, ys) + Math.max.apply(Math, ys)) / 2;
      return {
        x: targetCenters[i].x - cx,
        y: targetCenters[i].y - cy
      };
    });

    brainState.paths = brainState.paths.map(function(orig, i) {
      return orig.map(function(p) {
        return {
          x: p.x + offsets[i].x,
          y: p.y + offsets[i].y
        };
      });
    });

    brainState.phases = brainState.paths.map(function() { return rand(0, Math.PI * 2); });
    brainState.speeds = brainState.paths.map(function() { return rand(2.5, 5.0); });
    brainState.widths = brainState.paths.map(function() { return rand(8, 11); });
  }

  function startBrainAnimation(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setupBrainPaths();

    function draw(ms) {
      var t = ms / 1000;

      if (ms - brainState.lastFlash > FLASH_MS + GAP_MS) {
        brainState.flickIdx = Math.floor(Math.random() * brainState.paths.length);
        brainState.lastFlash = ms;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      brainState.paths.forEach(function(pts, i) {
        var pulse = (Math.sin(t * brainState.speeds[i] + brainState.phases[i]) + 1) / 2;

        if (i === brainState.flickIdx && ms - brainState.lastFlash < FLASH_MS) {
          pulse = 1.25;
        }

        var base = 25;
        var peak = 78;
        var light = base + (peak - base) * pulse;
        ctx.strokeStyle = 'hsl(191, 60%, ' + light + '%)';
        ctx.lineWidth = brainState.widths[i] + 3 * pulse;
        spline(ctx, pts);
      });

      if (brainState.canvas === canvas) {
        brainState.animationId = requestAnimationFrame(draw);
      }
    }

    brainState.animationId = requestAnimationFrame(draw);
  }

  /* -----------------------------------------------------------------------
   *  PRE-BUILD STRATEGY: Create overlay BEFORE it's needed
   * -------------------------------------------------------------------- */
  function buildBrainOverlay() {
    console.log('Pre-building brain overlay for instant swap');

    var brainOverlay = document.createElement('div');
    brainOverlay.id = 'pronunciation-loading-overlay';
    brainOverlay.className = 'speaksmart-brain-overlay';
    
    brainOverlay.style.position = 'fixed';
    brainOverlay.style.top = '0';
    brainOverlay.style.left = '0';
    brainOverlay.style.right = '0';
    brainOverlay.style.bottom = '0';
    brainOverlay.style.display = 'flex';
    brainOverlay.style.justifyContent = 'center';
    brainOverlay.style.alignItems = 'center';
    brainOverlay.style.background = 'transparent';
    brainOverlay.style.zIndex = '9999';
    brainOverlay.style.pointerEvents = 'none';

    var loaderDiv = document.createElement('div');
    loaderDiv.style.position = 'relative';
    loaderDiv.style.width = '480px';
    loaderDiv.style.background = 'transparent';

    var img = document.createElement('img');
    img.src = 'SpeakSmart-loader.png';
    img.style.width = '100%';
    img.style.display = 'block';
    img.onerror = function() { 
      console.log('Brain loader background image not found, proceeding without it');
    };
    loaderDiv.appendChild(img);

    var canvas = document.createElement('canvas');
    canvas.id = 'brainCanvas';
    canvas.width = 200;
    canvas.height = 230;
    canvas.style.position = 'absolute';
    canvas.style.left = '50%';
    canvas.style.top = '35px';
    canvas.style.width = '200px';
    canvas.style.height = '230px';
    canvas.style.marginLeft = '-100px';
    canvas.style.background = 'transparent';
    
    var clipPath = 'path("M 20 5 Q 60 -15 100 5 Q 140 -15 180 5 Q 200 55 170 100 Q 200 145 180 195 Q 140 225 100 215 Q 60 225 20 195 Q -5 145 20 100 Q -5 55 20 5 Z")';
    canvas.style.clipPath = clipPath;

    loaderDiv.appendChild(canvas);
    brainOverlay.appendChild(loaderDiv);

    // Store references for instant activation
    brainState.prebuiltOverlay = brainOverlay;
    brainState.canvas = canvas;

    return brainOverlay;
  }

  /* -----------------------------------------------------------------------
   *  PROTECTED REPLACEMENT STRATEGY: Add delays to prevent interference
   * -------------------------------------------------------------------- */
  function protectedReplacement(grayCircle) {
    console.log('Attempting PROTECTED replacement of gray circle');

    // Quick validation
    if (!grayCircle || !grayCircle.parentNode) {
      console.log('Gray circle already gone, protected replacement aborted');
      return false;
    }

    // Skip if it's our own overlay
    if (grayCircle.className && grayCircle.className.includes('speaksmart-brain-overlay')) {
      console.log('Ignoring our own brain overlay');
      return false;
    }

    // Mark as being replaced to prevent multiple attempts
    if (brainState.isReplacing) {
      console.log('Replacement already in progress, skipping');
      return false;
    }
    brainState.isReplacing = true;

    try {
      // Use pre-built overlay for faster swap
      var brainOverlay = brainState.prebuiltOverlay;
      if (!brainOverlay) {
        brainOverlay = buildBrainOverlay();
      }

      // CRITICAL: Add protective delay to prevent race conditions
      setTimeout(function() {
        try {
          // Double-check the element still exists
          if (!grayCircle.parentNode) {
            console.log('Gray circle removed during delay, aborting replacement');
            brainState.isReplacing = false;
            return;
          }

          grayCircle.parentNode.replaceChild(brainOverlay, grayCircle);
          
          brainState.overlay = brainOverlay;
          startBrainAnimation(brainState.canvas);
          
          console.log('PROTECTED brain replacement successful!');
          
          // Pre-build next overlay for subsequent attempts
          setTimeout(function() {
            if (!brainState.prebuiltOverlay || brainState.prebuiltOverlay === brainOverlay) {
              buildBrainOverlay();
            }
            brainState.isReplacing = false;
          }, 200);
          
        } catch (error) {
          console.log('Protected replacement failed during execution:', error.message);
          brainState.isReplacing = false;
        }
      }, 150); // 150ms protective delay
      
      return true;
    } catch (error) {
      console.log('Protected replacement failed:', error.message);
      brainState.isReplacing = false;
      return false;
    }
  }

  /* -----------------------------------------------------------------------
   *  PROACTIVE MARKETING TRIGGER: Show animation when pronunciation starts
   * -------------------------------------------------------------------- */
  function showMarketingBrainAnimation() {
    // Only if we don't already have a brain overlay active
    if (brainState.overlay && brainState.overlay.parentNode) {
      console.log('Brain animation already active, skipping marketing trigger');
      return;
    }

    console.log('Proactive marketing brain animation triggered');
    
    var brainOverlay = buildBrainOverlay();
    document.body.appendChild(brainOverlay);
    
    brainState.overlay = brainOverlay;
    startBrainAnimation(brainState.canvas);
    
    // Marketing display duration - keep it visible for impact
    setTimeout(function() {
      console.log('Marketing brain animation auto-cleanup after display duration');
      if (brainState.overlay === brainOverlay && brainState.overlay.parentNode) {
        cleanup();
      }
    }, 1800); // 1.8 seconds for marketing impact
  }

  // Watch for pronunciation process starting (trigger for fast-loading scenarios)
  var originalConsoleLog = console.log;
  console.log = function() {
    originalConsoleLog.apply(console, arguments);
    
    // Detect when pronunciation starts but we missed the gray circle
    var message = Array.prototype.slice.call(arguments).join(' ');
    if (message.includes('Starting pronunciation process') || 
        message.includes('Loading animation displayed')) {
      
      // Small delay to see if normal replacement worked
      setTimeout(function() {
        if (!brainState.overlay || !brainState.overlay.parentNode) {
          console.log('No brain animation detected after pronunciation start - triggering marketing display');
          showMarketingBrainAnimation();
        }
      }, 300); // Increased delay for safety
    }
  };

  /* -----------------------------------------------------------------------
   *  BACKUP MONITORING STRATEGY: Continuously watch for brief appearances
   * -------------------------------------------------------------------- */
  var monitoringInterval = null;
  
  function startBackupMonitoring() {
    if (monitoringInterval) return;
    
    console.log('Starting backup monitoring for missed gray circles');
    
    monitoringInterval = setInterval(function() {
      var grayCircle = document.getElementById('pronunciation-loading-overlay');
      
      if (grayCircle && (!grayCircle.className || !grayCircle.className.includes('speaksmart-brain-overlay'))) {
        console.log('Backup monitor caught gray circle!');
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        
        if (protectedReplacement(grayCircle)) {
          // Success - restart monitoring for next time
          setTimeout(startBackupMonitoring, 1500);
        } else {
          // Failed - try again soon
          setTimeout(startBackupMonitoring, 300);
        }
      }
    }, 20); // Slightly slower monitoring to reduce interference
  }

  function stopBackupMonitoring() {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
      console.log('Backup monitoring stopped');
    }
  }

  /* -----------------------------------------------------------------------
   *  ENHANCED DOM OBSERVER: Multi-level watching with protection
   * -------------------------------------------------------------------- */
  var primaryObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        
        if (node.id === 'pronunciation-loading-overlay') {
          // Use protected replacement with delay
          setTimeout(function() {
            if (protectedReplacement(node)) {
              // Success - start backup monitoring for subsequent attempts
              setTimeout(startBackupMonitoring, 800);
            } else {
              // Failed - start aggressive backup monitoring immediately
              startBackupMonitoring();
            }
          }, 50); // Small delay to let DOM settle
        }
      });

      m.removedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        
        if (node.id === 'pronunciation-loading-overlay') {
          if (node === brainState.overlay) {
            console.log('Brain overlay removed - cleaning up');
            cleanup();
          } else {
            console.log('Gray circle removed - preparing for next attempt');
            // Start monitoring in case another appears soon
            setTimeout(startBackupMonitoring, 200);
          }
        }
      });
    });
  });

  // Secondary observer on document.documentElement for broader coverage
  var secondaryObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        
        // Look for the target element in the added subtree
        if (node.id === 'pronunciation-loading-overlay') {
          setTimeout(function() {
            protectedReplacement(node);
          }, 75);
        } else if (node.querySelector) {
          var grayCircle = node.querySelector('#pronunciation-loading-overlay:not(.speaksmart-brain-overlay)');
          if (grayCircle) {
            setTimeout(function() {
              protectedReplacement(grayCircle);
            }, 100);
          }
        }
      });
    });
  });

  function cleanup() {
    console.log('Cleaning up brain animation');
    
    stopBackupMonitoring();
    
    if (brainState.animationId) {
      cancelAnimationFrame(brainState.animationId);
    }
    
    if (brainState.overlay && brainState.overlay.parentNode) {
      brainState.overlay.parentNode.removeChild(brainState.overlay);
    }

    // Reset state but keep prebuilt overlay for next attempt
    brainState.animationId = null;
    brainState.canvas = null;
    brainState.overlay = null;
    brainState.paths = [];
    brainState.phases = [];
    brainState.speeds = [];
    brainState.widths = [];
    brainState.lastFlash = -Infinity;
    brainState.flickIdx = null;
    brainState.isReplacing = false;
    
    // Rebuild overlay for next attempt
    setTimeout(function() {
      buildBrainOverlay();
    }, 300);
    
    console.log('Cleanup complete - ready for next attempt');
  }

  /* -----------------------------------------------------------------------
   *  INITIALIZATION: Start all monitoring systems with protection
   * -------------------------------------------------------------------- */
  function startAllMonitoring() {
    if (document.body) {
      // Initialize protection systems first
      protectMainScript();
      
      // Primary observer on body
      primaryObserver.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      // Secondary observer on documentElement for broader coverage
      secondaryObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      
      // Pre-build first overlay
      buildBrainOverlay();
      
      console.log('Multi-layer monitoring system active with protection');
    } else {
      document.addEventListener('DOMContentLoaded', startAllMonitoring);
    }
  }

  // Initialize the robust system with protection
  startAllMonitoring();
  
  console.log('SpeakSmart race-condition-proof bootstrap with audio protection ready');
})();