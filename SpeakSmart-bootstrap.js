/*  SpeakSmart Loading Animation Hijack - Simple Version */
(function () {
  if (window.__speakSmartPatched) return;
  window.__speakSmartPatched = true;

  console.log('SpeakSmart loading hijack ready');

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
    flickIdx: null
  };

  // Animation constants
  var FLASH_MS = 90;
  var GAP_MS = 240;

  /* -----------------------------------------------------------------------
   *  Brain Animation Functions
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
   *  Create SpeakSmart Loading Animation
   * -------------------------------------------------------------------- */
  function createSpeakSmartLoader() {
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
      console.log('SpeakSmart loader image not found, continuing with animation only');
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

    brainState.canvas = canvas;
    brainState.overlay = brainOverlay;

    return brainOverlay;
  }

  /* -----------------------------------------------------------------------
   *  Simple Hijack Function
   * -------------------------------------------------------------------- */
  function hijackLoadingAnimation(captivateLoader) {
    console.log('Hijacking Captivate loading animation');

    // Skip if it's already our overlay
    if (captivateLoader.className && captivateLoader.className.includes('speaksmart-brain-overlay')) {
      return;
    }

    try {
      var speakSmartLoader = createSpeakSmartLoader();
      captivateLoader.parentNode.replaceChild(speakSmartLoader, captivateLoader);
      startBrainAnimation(brainState.canvas);
      console.log('SpeakSmart loading animation active');
    } catch (error) {
      console.log('Failed to hijack loading animation:', error.message);
    }
  }

  /* -----------------------------------------------------------------------
   *  Watch for Captivate Loading Animation
   * -------------------------------------------------------------------- */
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        
        // Look for the Captivate loading overlay
        if (node.id === 'pronunciation-loading-overlay') {
          hijackLoadingAnimation(node);
        }
      });
    });
  });

  /* -----------------------------------------------------------------------
   *  Initialize
   * -------------------------------------------------------------------- */
  function init() {
    if (document.body) {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      console.log('SpeakSmart loading hijack monitoring active');
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }
  }

  init();
})();