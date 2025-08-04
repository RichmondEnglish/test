/* =========================================================================
 *  SpeakSmart Bootstrap  —  drop-in replacement
 *  – Single-load guard for both bootstrap and reading bundle
 *  – Preserves brain-loader animation hijack
 * ========================================================================= */
(function () {
  /* ------------------------------------------------------
   *  Global bootstrap guard
   * --------------------------------------------------- */
  if (window.__SPEAKSMART_BOOTSTRAP_LOADED__) return;
  window.__SPEAKSMART_BOOTSTRAP_LOADED__ = true;

  /* ------------------------------------------------------
   *  Constants
   * --------------------------------------------------- */
  const READING_BUNDLE_URL = 'https://gentle-oasis-39918-1e4e956035a8.herokuapp.com/speaksmart-reading-gpt.js';   // adjust path if needed
  const FLASH_MS = 90;
  const GAP_MS   = 240;

  /* ------------------------------------------------------
   *  State buckets
   * --------------------------------------------------- */
  const brainState = {
    animationId : null,
    canvas      : null,
    overlay     : null,
    paths       : [],
    phases      : [],
    speeds      : [],
    widths      : [],
    lastFlash   : -Infinity,
    flickIdx    : null
  };

  /* =========================================================================
   *  Utility helpers
   * ========================================================================= */
  const rand   = (a, b) => Math.random() * (b - a) + a;
  const rotate = (pt, pivot, deg) => {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const dx = pt.x - pivot.x;
    const dy = pt.y - pivot.y;
    return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c };
  };
  const spline = (ctx, pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2;
      const my = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  };

  /* =========================================================================
   *  Brain path pre-compute
   * ========================================================================= */
  function setupBrainPaths () {
    const W = 200, H = 230, sizeFactor = 0.65, s = 0.4 * sizeFactor;
    const scale = p => ({ x: p.x * s, y: p.y * s });

    const baseLeftTop = [
      {x:140,y:55},{x:95,y:80},{x:140,y:105},{x:95,y:130},{x:140,y:155}
    ];
    const baseLeftBot = [
      {x:145,y:180},{x:95,y:220},{x:140,y:255},{x:105,y:295}
    ];
    const baseRightBot = [
      {x:360,y:175},{x:410,y:220},{x:360,y:255},{x:390,y:295}
    ];

    const leftTop  = baseLeftTop.map(scale).map(p => ({x:p.x-40, y:p.y-10}));
    const leftBot  = baseLeftBot.map(scale).map(p=>({x:p.x-40,y:p.y-42}));
    const rightTop = leftTop.map( p => ({x:W-p.x, y:p.y}) );
    const rightBot = baseRightBot.map(scale).map(p=>({x:p.x-40,y:p.y-42}))
                                  .map(p=>({x:W-p.x,y:p.y}));

    const bottomLeft  = leftBot .map(p=>rotate(p,{x:70 ,y:100}, 10));
    const bottomRight = rightBot.map(p=>rotate(p,{x:130,y:100},-10));

    brainState.paths   = [leftTop, bottomLeft, rightTop, bottomRight];
    brainState.phases  = brainState.paths.map(()=>rand(0,Math.PI*2));
    brainState.speeds  = brainState.paths.map(()=>rand(2.5,5.0));
    brainState.widths  = brainState.paths.map(()=>rand(8,11));
  }

  /* =========================================================================
   *  Animation driver
   * ========================================================================= */
  function startBrainAnimation (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    setupBrainPaths();

    const draw = ms => {
      const t = ms / 1000;

      if (ms - brainState.lastFlash > FLASH_MS + GAP_MS) {
        brainState.flickIdx  = Math.floor(Math.random() * brainState.paths.length);
        brainState.lastFlash = ms;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      brainState.paths.forEach((pts,i)=>{
        let pulse = (Math.sin(t * brainState.speeds[i] + brainState.phases[i])+1)/2;
        if (i === brainState.flickIdx && ms - brainState.lastFlash < FLASH_MS) pulse = 1.25;

        const base = 25, peak = 78;
        ctx.strokeStyle = `hsl(191,60%,${base+(peak-base)*pulse}%)`;
        ctx.lineWidth   = brainState.widths[i] + 3*pulse;
        spline(ctx, pts);
      });

      if (brainState.canvas === canvas) brainState.animationId = requestAnimationFrame(draw);
    };

    brainState.animationId = requestAnimationFrame(draw);
  }

  /* =========================================================================
   *  DOM constructors
   * ========================================================================= */
  function createSpeakSmartLoader () {
    const overlay = document.createElement('div');
    overlay.id        = 'pronunciation-loading-overlay';
    overlay.className = 'speaksmart-brain-overlay';
    Object.assign(overlay.style,{
      position:'fixed',inset:'0',display:'flex',justifyContent:'center',
      alignItems:'center',background:'transparent',zIndex:'9999',
      pointerEvents:'none'
    });

    const holder = document.createElement('div');
    Object.assign(holder.style,{position:'relative',width:'480px',background:'transparent'});

    const img = document.createElement('img');
    img.src   = 'SpeakSmart-loader.png';
    img.style.width = '100%';
    img.onerror = () => console.log('SpeakSmart loader image missing; proceeding with animation only');
    holder.appendChild(img);

    const canvas = document.createElement('canvas');
    canvas.id   = 'brainCanvas';
    canvas.width  = 200;
    canvas.height = 230;
    Object.assign(canvas.style,{
      position:'absolute',left:'50%',top:'35px',width:'200px',height:'230px',
      marginLeft:'-100px',background:'transparent',
      clipPath:'path("M 20 5 Q 60 -15 100 5 Q 140 -15 180 5 Q 200 55 170 100 Q 200 145 180 195 Q 140 225 100 215 Q 60 225 20 195 Q -5 145 20 100 Q -5 55 20 5 Z")'
    });
    holder.appendChild(canvas);
    overlay.appendChild(holder);

    brainState.canvas  = canvas;
    brainState.overlay = overlay;
    return overlay;
  }

  /* =========================================================================
   *  Hijack Captivate loading animation
   * ========================================================================= */
  function hijackLoadingAnimation (captivateLoader) {
    console.log('Hijacking Captivate loading animation');
    if (captivateLoader.className && captivateLoader.className.includes('speaksmart-brain-overlay')) return;

    try {
      const speakSmartLoader = createSpeakSmartLoader();
      captivateLoader.parentNode.replaceChild(speakSmartLoader, captivateLoader);
      startBrainAnimation(brainState.canvas);
      console.log('SpeakSmart loading animation active');
    } catch (err) {
      console.log('Failed to hijack loading animation:', err.message);
    }
  }

  /* =========================================================================
   *  Mutation Observer to detect the Captivate loader
   * ========================================================================= */
  const observer = new MutationObserver(muts => {
    muts.forEach(m=>{
      m.addedNodes.forEach(node=>{
        if (node.nodeType===1 && node.id==='pronunciation-loading-overlay') hijackLoadingAnimation(node);
      });
    });
  });

  /* =========================================================================
   *  Reading-bundle loader (single-load guard)
   * ========================================================================= */
  function loadReadingBundle () {
    if (window.__SPEAKSMART_READING_LOADED__) return;

    const s = document.createElement('script');
    s.src = `${READING_BUNDLE_URL}?cb=${Date.now()}`;
    s.setAttribute('data-speaksmart-reading','true');
    s.onload = () => console.log('SpeakSmart reading bundle loaded');
    document.head.appendChild(s);

    window.__SPEAKSMART_READING_LOADED__ = true;
  }

  /* =========================================================================
   *  Initialise bootstrap
   * ========================================================================= */
  function init () {
    loadReadingBundle();

    if (document.body) {
      observer.observe(document.body,{childList:true,subtree:true});
      console.log('SpeakSmart loading hijack monitoring active');
    }
  }

  /* =========================================================================
   *  Kick-off
   * ========================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
