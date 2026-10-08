/* =========================================================
   PAGE CURL ENGINE — Weekly Readings
   Realistic paper fold that follows the finger (phones) or
   mouse (desktop). The fold line is recalculated every frame,
   so the page bends diagonally, casts shadows and shows its
   back side, like a real book.

   Works on top of weekly-reader.js (uses its globals: state,
   el, renderCurrentReadingPage, autoFitReadingPageText,
   stopSpeech, playPageFlipSound). It never changes the page
   data logic: it only animates between two rendered pages.
   ========================================================= */
(() => {
  'use strict';

  const INTERACTIVE = 'button, select, input, textarea, a, label, .vocab-word, .vocab-tooltip, .flip-audio-bar';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wideLayout = window.matchMedia('(min-width: 721px)');

  let host = null;      // #flipPage
  let curl = null;      // active turn session
  let gesture = null;   // pointer down, direction not decided yet
  let rafId = 0;
  let peek = null;      // desktop hover: corner lifted a little
  let peekRaf = 0;

  /* ---------- small helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Soft start, gentle landing (matches the ~1 s turn of FlipHTML5-style books).
  const easeInOut = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const minIndex = () => (state.hasCover ? -1 : 0);
  const maxIndex = () => state.readingPages.length - 1;
  const canGo = dir => {
    const t = state.currentPageIndex + (dir === 'next' ? 1 : -1);
    return t >= minIndex() && t <= maxIndex();
  };
  const isCoverShown = () => state.currentPageIndex === -1 && state.hasCover;

  function rectIn(node) {
    const r = node.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
  }

  function div(cls) {
    const d = document.createElement('div');
    d.className = cls;
    return d;
  }

  function polygon(pts) {
    if (!pts || pts.length < 3) return 'polygon(0 0, 0 0, 0 0)';
    return 'polygon(' + pts.map(p => `${p[0].toFixed(2)}px ${p[1].toFixed(2)}px`).join(',') + ')';
  }

  // Sutherland–Hodgman: keep the part of `poly` where sign*((X-M)·n) >= 0.
  function clipHalfPlane(poly, n, M, sign) {
    const out = [];
    const f = p => ((p[0] - M.x) * n.x + (p[1] - M.y) * n.y) * sign;
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const fa = f(a);
      const fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) {
        const t = fa / (fa - fb);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return out;
  }

  // A long gradient strip whose left edge lies on a line (point M0, normal n0).
  function placeStrip(strip, M0, n0, length, gradient) {
    const huge = 6000;
    const angle = Math.atan2(n0.y, n0.x) * 180 / Math.PI;
    strip.style.width = `${Math.max(1, length).toFixed(1)}px`;
    strip.style.height = `${huge}px`;
    strip.style.transform = `translate(${M0.x.toFixed(2)}px, ${M0.y.toFixed(2)}px) rotate(${angle.toFixed(3)}deg) translateY(${-huge / 2}px)`;
    strip.style.background = gradient;
  }

  /* ---------- page snapshots ---------- */
  function snapshot(node) {
    if (!node) return null;
    const rect = rectIn(node);
    if (rect.w < 2 || rect.h < 2) return null;
    const scroller = node.querySelector ? node.querySelector('.reading-scroll-area') : null;
    return {
      rect,
      clone: node.cloneNode(true),
      scrollTop: scroller ? scroller.scrollTop : 0,
    };
  }

  function mount(snap, parent, frame, offsetX) {
    const c = snap.clone;
    c.removeAttribute('hidden');
    c.setAttribute('aria-hidden', 'true');
    c.classList.remove('page-changing');
    const x = offsetX !== undefined ? offsetX : snap.rect.x - frame.x;
    Object.assign(c.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${snap.rect.y - frame.y}px`,
      width: `${snap.rect.w}px`,
      height: `${snap.rect.h}px`,
      minHeight: '0',
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      transform: 'none',
      animation: 'none',
      transition: 'none',
    });
    parent.appendChild(c);
    const scroller = c.querySelector ? c.querySelector('.reading-scroll-area') : null;
    if (scroller) scroller.scrollTop = snap.scrollTop;
    return c;
  }

  // Captures what is visible right now: cover, two-page spread, or single sheet.
  function captureView() {
    if (isCoverShown()) {
      return { kind: 'cover', sheet: snapshot(el.coverImage) };
    }
    if (wideLayout.matches) {
      return {
        kind: 'spread',
        left: snapshot(el.spreadView.querySelector('.illustration-page')),
        right: snapshot(el.readingFramePage),
      };
    }
    return { kind: 'sheet', sheet: snapshot(el.spreadView) };
  }

  function renderSilently(index) {
    stopSpeech();
    state.currentPageIndex = index;
    renderCurrentReadingPage();
    if (el.spreadView) el.spreadView.classList.remove('page-changing');
    if (typeof autoFitReadingPageText === 'function') autoFitReadingPageText();
  }

  /* ---------- session setup ---------- */
  function beginTurn(dir) {
    const fromIndex = state.currentPageIndex;
    const toIndex = fromIndex + (dir === 'next' ? 1 : -1);

    const before = captureView();
    renderSilently(toIndex);
    const after = captureView();

    const spreadMode = before.kind === 'spread' && after.kind === 'spread' &&
      before.left && before.right && after.left && after.right;

    let frame;
    let front;
    let back = null;
    let backOffset = 0;
    const unders = [];

    if (spreadMode) {
      // Hinge = the spine between the two pages.
      const L = after.left.rect;
      const R = after.right.rect;
      const spine = (L.x + L.w + R.x) / 2;
      frame = { x: spine, y: R.y, w: R.x + R.w - spine, h: R.h };
      if (dir === 'next') {
        front = before.right;       // old right page lifts...
        back = after.left;          // ...its back is the new left page
        unders.push(before.left);   // old left page stays until covered
      } else {
        front = after.right;        // new right page comes back...
        back = before.left;         // ...its back is the old left page
        unders.push(before.right);  // old right page is covered progressively
      }
      backOffset = back.rect.x - frame.x + frame.w;
    } else {
      // Single sheet (phones) or cover. Back side is plain paper.
      const turning = dir === 'next' ? before : after;
      front = turning.kind === 'spread' ? null : turning.sheet;
      if (!front) {
        // Desktop cover transitions: the turning sheet is the cover.
        front = (before.kind === 'cover' ? before : after).sheet;
      }
      if (!front) { renderSilently(fromIndex); return null; }
      frame = { ...front.rect };
      if (dir === 'prev') {
        if (before.kind === 'spread') { unders.push(before.left, before.right); }
        else unders.push(before.sheet);
      }
    }

    if (!front || !frame || frame.w < 20 || frame.h < 20) {
      // Nothing measurable: undo the silent render and let the caller do a plain change.
      renderSilently(fromIndex);
      return null;
    }

    const stage = div('pc-stage');
    Object.assign(stage.style, {
      left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.w}px`, height: `${frame.h}px`,
    });

    const underLayer = div('pc-under');
    unders.filter(Boolean).forEach(s => mount(s, underLayer, frame));
    stage.appendChild(underLayer);

    if (spreadMode) {
      const spine = div('pc-spine');
      stage.appendChild(spine);
    }

    const reveal = div('pc-reveal');
    const revealStrip = div('pc-strip');
    reveal.appendChild(revealStrip);
    stage.appendChild(reveal);

    const frontLayer = div('pc-front');
    mount(front, frontLayer, frame);
    const frontStrip = div('pc-strip');
    frontLayer.appendChild(frontStrip);
    stage.appendChild(frontLayer);

    const flapWrap = div('pc-flap-wrap');
    const flap = div(back ? 'pc-flap' : 'pc-flap pc-paper');
    Object.assign(flap.style, { width: `${frame.w}px`, height: `${frame.h}px` });
    if (back) mount(back, flap, frame, backOffset);
    const flapStrip = div('pc-strip');
    flap.appendChild(flapStrip);
    flapWrap.appendChild(flap);
    stage.appendChild(flapWrap);

    host.appendChild(stage);
    host.classList.add('pc-turning');
    document.body.classList.add('pc-no-select');

    const W = frame.w;
    const H = frame.h;
    return {
      dir, fromIndex, toIndex, spreadMode, frame, W, H,
      stage, reveal, revealStrip, frontLayer, frontStrip, flap, flapWrap, flapStrip,
      cy: H, P: { x: dir === 'next' ? W : -W, y: H }, target: null, anim: null,
      dragging: false, pointerId: null, samples: [],
    };
  }

  /* ---------- geometry for one frame ---------- */
  function draw(s, Pin) {
    const W = s.W;
    const H = s.H;
    const cy = s.cy;

    let px = Math.min(Pin.x, W);
    let py = clamp(Pin.y, -0.12 * H, 1.12 * H);

    // The page is glued to the spine: keep the corner within reach.
    const anchors = [
      [{ x: 0, y: cy }, W],
      [{ x: 0, y: H - cy }, Math.hypot(W, H)],
    ];
    anchors.forEach(([a, r]) => {
      const dx = px - a.x;
      const dy = py - a.y;
      const d = Math.hypot(dx, dy);
      if (d > r) { px = a.x + dx * r / d; py = a.y + dy * r / d; }
    });
    s.P = { x: px, y: py };

    const C = { x: W, y: cy };
    const vx = C.x - px;
    const vy = C.y - py;
    const dist = Math.hypot(vx, vy);

    if (dist < 0.75) {
      s.frontLayer.style.clipPath = 'none';
      s.flapWrap.style.visibility = 'hidden';
      s.reveal.style.visibility = 'hidden';
      s.frontStrip.style.opacity = '0';
      return;
    }

    s.flapWrap.style.visibility = 'visible';
    s.reveal.style.visibility = 'visible';
    s.frontStrip.style.opacity = '1';

    const n = { x: vx / dist, y: vy / dist };               // fold normal (towards the lifted corner)
    const M = { x: (C.x + px) / 2, y: (C.y + py) / 2 };      // a point on the fold line
    const rect = [[0, 0], [W, 0], [W, H], [0, H]];
    const folded = clipHalfPlane(rect, n, M, 1);
    const visible = clipHalfPlane(rect, n, M, -1);
    const progress = clamp((W - px) / (2 * W), 0, 1);
    const lifted = clamp(dist / (0.55 * W), 0, 1);

    // 1) Front of the page: only the part that is still flat.
    s.frontLayer.style.clipPath = polygon(visible);
    placeStrip(s.frontStrip, M, { x: -n.x, y: -n.y }, Math.min(64, dist * 0.35),
      `linear-gradient(90deg, rgba(40,26,10,${(0.20 * lifted).toFixed(3)}) 0%, rgba(40,26,10,${(0.06 * lifted).toFixed(3)}) 35%, rgba(40,26,10,0) 100%)`);

    // 2) Shadow the lifted sheet casts on the page underneath.
    s.reveal.style.clipPath = polygon(folded);
    const shade = 0.46 * lifted * (1 - progress * 0.55);
    placeStrip(s.revealStrip, M, n, clamp(dist * 0.55, 18, W * 0.6),
      `linear-gradient(90deg, rgba(30,18,6,${shade.toFixed(3)}) 0%, rgba(30,18,6,${(shade * 0.35).toFixed(3)}) 30%, rgba(30,18,6,0) 100%)`);

    // 3) Back of the page: the folded part reflected across the fold line.
    //    Local coords are pre-mirrored so the back content reads correctly.
    const nx = n.x;
    const ny = n.y;
    const md = M.x * nx + M.y * ny;
    const a = -(1 - 2 * nx * nx);
    const b = 2 * nx * ny;
    const c = -2 * nx * ny;
    const d = 1 - 2 * ny * ny;
    const e = W * (1 - 2 * nx * nx) + 2 * md * nx;
    const f = -2 * nx * ny * W + 2 * md * ny;
    s.flap.style.transform = `matrix(${a.toFixed(6)},${b.toFixed(6)},${c.toFixed(6)},${d.toFixed(6)},${e.toFixed(2)},${f.toFixed(2)})`;
    s.flap.style.clipPath = polygon(folded.map(p => [W - p[0], p[1]]));

    // Curvature light on the back side: dark crease, bright bend, soft fade.
    const flapLen = Math.max(dist / 2, 1);
    placeStrip(s.flapStrip, { x: W - M.x, y: M.y }, { x: -nx, y: ny }, flapLen,
      'linear-gradient(90deg, rgba(60,40,15,.22) 0%, rgba(255,255,255,.55) 7%, rgba(255,255,255,.18) 30%, rgba(90,62,26,.10) 85%, rgba(90,62,26,.16) 100%)');
  }

  /* ---------- animation loop ---------- */
  function tick(now) {
    rafId = 0;
    const s = curl;
    if (!s) return;

    if (s.anim) {
      const A = s.anim;
      const t = clamp((now - A.t0) / A.dur, 0, 1);
      const k = A.ease(t);
      const x = A.from.x + (A.to.x - A.from.x) * k;
      const y = A.from.y + (A.to.y - A.from.y) * k + A.lift * Math.sin(Math.PI * k);
      draw(s, { x, y });
      if (t >= 1) { finish(A.commit); return; }
    } else if (s.target) {
      // Slight inertia so the paper feels like it has weight.
      const P = s.P;
      const nx = P.x + (s.target.x - P.x) * 0.5;
      const ny = P.y + (s.target.y - P.y) * 0.5;
      draw(s, { x: nx, y: ny });
    }
    rafId = requestAnimationFrame(tick);
  }

  function run() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function animateTo(commit, opts = {}) {
    const s = curl;
    const W = s.W;
    const endX = s.dir === 'next' ? (commit ? -W : W) : (commit ? W : -W);
    const from = { ...s.P };
    const to = { x: endX, y: s.cy };
    const travel = Math.abs(to.x - from.x) / (2 * W);
    const liftBase = opts.lift !== undefined ? opts.lift : 0.30;   // corner rises in an arc
    const liftSign = s.cy > s.H / 2 ? -1 : 1;
    s.target = null;
    const speed = reduceMotion.matches ? 0.6 : 1;   // system asks for less motion: quicker turn
    s.anim = {
      from, to, commit,
      t0: performance.now(),
      dur: (opts.dur || (320 + 620 * travel)) * speed,
      ease: opts.ease || easeOut,
      lift: liftSign * liftBase * Math.min(s.H, 1.4 * W) * travel,
    };
    if (commit) {
      try { playPageFlipSound(); } catch (_) {}
    }
    run();
  }

  function teardown() {
    if (!curl) return;
    curl.stage.remove();
    host.classList.remove('pc-turning', 'pc-dragging');
    document.body.classList.remove('pc-no-select');
    curl = null;
  }

  function finish(commit) {
    const s = curl;
    if (!s) return;
    if (!commit) {
      renderSilently(s.fromIndex);   // go back under the (still flat) page
    }
    teardown();
    preloadNeighbours();
    if (commit) {
      const top = host.getBoundingClientRect().top;
      if (top < -4) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function abort() {
    dropPeek();
    if (!curl) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    teardown();
  }

  /* ---------- automatic turn (buttons, arrows, taps) ---------- */
  function turn(dir, opts = {}) {
    if (curl) return true;                  // a turn is already running
    dropPeek();
    if (!host || !canGo(dir)) return false;
    const s = beginTurn(dir);
    if (!s) return false;
    curl = s;
    if (opts.top !== undefined) {
      s.cy = opts.top ? 0 : s.H;            // clicked near the top corner: turn from the top
    } else {
      // Use the corner that is on screen (tall phone sheets).
      const r = host.getBoundingClientRect();
      const bottomOnScreen = r.top + s.frame.y + s.H < window.innerHeight + 40;
      s.cy = bottomOnScreen ? s.H : 0;
    }
    s.P = { x: dir === 'next' ? s.W : -s.W, y: s.cy };
    // Continue from a corner already lifted by the mouse (no jump).
    if (opts.from && dir === 'next') s.P = { ...opts.from };
    draw(s, s.P);
    animateTo(true, { dur: opts.from ? 900 : 1000, ease: easeInOut, lift: 0.42 });
    return true;
  }

  /* ---------- pointer interaction ---------- */
  /* Where is the pointer?  side = page under it, edge = outer part of that
     page (click to turn), corner = outer corner (desktop hover peel). */
  function hitInfo(e) {
    const x = e.clientX;
    const y = e.clientY;
    const inside = r => y >= r.top && y <= r.bottom && x >= r.left && x <= r.right;
    const info = { side: null, edge: false, corner: false, top: false };
    const cornerOf = (r, outerX) => {
      const nearX = Math.abs(x - outerX) <= Math.max(60, r.width * 0.2);
      const nearY = y <= r.top + r.height * 0.3 || y >= r.bottom - r.height * 0.3;
      info.top = y < r.top + r.height / 2;
      return nearX && nearY;
    };

    if (isCoverShown()) {
      const r = el.coverImage.getBoundingClientRect();
      if (!inside(r)) return info;
      info.side = 'right';
      info.edge = true;                         // click anywhere on the cover opens it
      info.corner = cornerOf(r, r.right);
      return info;
    }
    if (!el.spreadView || el.spreadView.hidden) return info;

    if (wideLayout.matches) {
      const L = el.spreadView.querySelector('.illustration-page').getBoundingClientRect();
      const R = el.readingFramePage.getBoundingClientRect();
      if (inside(R)) {
        info.side = 'right';
        info.edge = x >= R.right - R.width * 0.35;
        info.corner = cornerOf(R, R.right);
      } else if (inside(L)) {
        info.side = 'left';
        info.edge = x <= L.left + L.width * 0.35;
        info.corner = cornerOf(L, L.left);
      }
      return info;
    }
    const S = el.spreadView.getBoundingClientRect();
    if (!inside(S)) return info;
    info.side = x >= S.left + S.width / 2 ? 'right' : 'left';
    info.edge = x >= S.right - S.width * 0.24 || x <= S.left + S.width * 0.24;
    info.top = y < S.top + S.height / 2;
    return info;
  }

  /* ---------- desktop hover: lift the corner a little ---------- */
  function buildPeek(side) {
    let frontNode;
    let frame;
    let mirrored = false;
    if (isCoverShown()) {
      if (side !== 'right') return null;
      frontNode = el.coverImage;
      frame = rectIn(frontNode);
    } else if (wideLayout.matches && el.spreadView && !el.spreadView.hidden) {
      const Ln = el.spreadView.querySelector('.illustration-page');
      const L = rectIn(Ln);
      const R = rectIn(el.readingFramePage);
      const spine = (L.x + L.w + R.x) / 2;
      if (side === 'right') {
        frontNode = el.readingFramePage;
        frame = { x: spine, y: R.y, w: R.x + R.w - spine, h: R.h };
      } else {
        frontNode = Ln;
        frame = { x: L.x, y: L.y, w: spine - L.x, h: L.h };
        mirrored = true;                         // hinge on the right: draw mirrored
      }
    } else {
      return null;                               // phones have no hover
    }
    const snap = snapshot(frontNode);
    if (!snap || frame.w < 20) return null;

    const stage = div('pc-stage');
    Object.assign(stage.style, {
      left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.w}px`, height: `${frame.h}px`,
    });
    if (mirrored) stage.style.transform = 'scaleX(-1)';

    // Under the lifted corner: a plain page.
    const under = div('pc-under');
    const paper = div('pc-paper pc-under-paper');
    const localX = mirrored ? frame.x + frame.w - (snap.rect.x + snap.rect.w) : snap.rect.x - frame.x;
    Object.assign(paper.style, {
      position: 'absolute', left: `${localX}px`, top: `${snap.rect.y - frame.y}px`,
      width: `${snap.rect.w}px`, height: `${snap.rect.h}px`,
    });
    under.appendChild(paper);
    stage.appendChild(under);

    const reveal = div('pc-reveal');
    const revealStrip = div('pc-strip');
    reveal.appendChild(revealStrip);
    stage.appendChild(reveal);

    const frontLayer = div('pc-front');
    const clone = mount(snap, frontLayer, frame, localX);
    if (mirrored) clone.style.transform = 'scaleX(-1)';
    const frontStrip = div('pc-strip');
    frontLayer.appendChild(frontStrip);
    stage.appendChild(frontLayer);

    const flapWrap = div('pc-flap-wrap');
    const flap = div('pc-flap pc-paper');
    Object.assign(flap.style, { width: `${frame.w}px`, height: `${frame.h}px` });
    const flapStrip = div('pc-strip');
    flap.appendChild(flapStrip);
    flapWrap.appendChild(flap);
    stage.appendChild(flapWrap);
    host.appendChild(stage);

    const W = frame.w;
    const H = frame.h;
    return {
      side, mirrored, frame, W, H, cy: H, P: { x: W, y: H }, target: { x: W, y: H }, leaving: false,
      stage, reveal, revealStrip, frontLayer, frontStrip, flap, flapWrap, flapStrip,
    };
  }

  function aimPeek(e, top) {
    const pk = peek;
    const hr = host.getBoundingClientRect();
    let lx = e.clientX - hr.left - pk.frame.x;
    if (pk.mirrored) lx = pk.W - lx;
    const ly = e.clientY - hr.top - pk.frame.y;
    const cy = top ? 0 : pk.H;
    if (cy !== pk.cy) { pk.cy = cy; pk.P = { x: pk.W, y: cy }; }
    const base = clamp(pk.W * 0.13, 46, 110);
    const sign = cy === pk.H ? -1 : 1;
    // The corner leans towards the mouse, like online flipbooks.
    pk.target = {
      x: pk.W - base + clamp((lx - pk.W) * 0.45, -base * 1.2, 0),
      y: cy + sign * base * 0.7 + clamp((ly - cy) * 0.25, -base * 0.6, base * 0.6),
    };
  }

  function peekLoop() {
    peekRaf = 0;
    const pk = peek;
    if (!pk) return;
    const nx = pk.P.x + (pk.target.x - pk.P.x) * 0.22;
    const ny = pk.P.y + (pk.target.y - pk.P.y) * 0.22;
    draw(pk, { x: nx, y: ny });
    if (pk.leaving && Math.hypot(pk.P.x - pk.W, pk.P.y - pk.cy) < 1.2) { dropPeek(); return; }
    peekRaf = requestAnimationFrame(peekLoop);
  }

  function showPeek(side, e, top) {
    if (curl) return;
    if (peek && peek.side !== side) dropPeek();
    if (!peek) {
      peek = buildPeek(side);
      if (!peek) return;
      peek.cy = top ? 0 : peek.H;
      peek.P = { x: peek.W, y: peek.cy };
      draw(peek, peek.P);
    }
    peek.leaving = false;
    aimPeek(e, top);
    if (!peekRaf) peekRaf = requestAnimationFrame(peekLoop);
  }

  function leavePeek() {
    if (!peek) return;
    peek.leaving = true;
    peek.target = { x: peek.W, y: peek.cy };
    if (!peekRaf) peekRaf = requestAnimationFrame(peekLoop);
  }

  function dropPeek() {
    if (peekRaf) cancelAnimationFrame(peekRaf);
    peekRaf = 0;
    if (peek) peek.stage.remove();
    peek = null;
  }

  function onPointerDown(e) {
    if (curl || !state.readingPages.length) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest(INTERACTIVE)) return;
    const info = hitInfo(e);
    let lifted = null;
    if (peek && !peek.mirrored) lifted = { P: { ...peek.P }, cy: peek.cy, side: peek.side };
    gesture = {
      id: e.pointerId, type: e.pointerType, sx: e.clientX, sy: e.clientY,
      t: performance.now(), side: info.side, edge: info.edge, top: info.top, lifted,
    };
    if (e.pointerType === 'mouse' && info.side) e.preventDefault();
  }

  function startDrag(dir, e) {
    dropPeek();
    const s = beginTurn(dir);
    if (!s) { gesture = null; return; }
    curl = s;

    const hostRect = host.getBoundingClientRect();
    const sx = gesture.sx - hostRect.left - s.frame.x;
    const sy = gesture.sy - hostRect.top - s.frame.y;
    s.cy = sy > s.H / 2 ? s.H : 0;
    s.origin = { x: gesture.sx, y: gesture.sy };
    s.corner = { x: dir === 'next' ? s.W : -s.W, y: s.cy };

    if (s.spreadMode) {
      // Two-page book: the corner follows the pointer exactly.
      s.absolute = true;
      s.scaleX = 1;
      s.scaleY = 0.6;
    } else if (gesture.type === 'mouse') {
      s.absolute = false;
      s.scaleX = 1.6;
      s.scaleY = 0.5 * Math.min(1, (1.3 * s.W) / s.H);
    } else {
      const reach = dir === 'next' ? sx : s.W - sx;
      s.scaleX = clamp((2 * s.W) / Math.max(reach, 0.4 * s.W), 1.4, 3);
      s.scaleY = 0.5 * Math.min(1, (1.3 * s.W) / s.H);
    }

    s.dragging = true;
    s.pointerId = e.pointerId;
    s.P = { ...s.corner };
    // Continue smoothly from the corner the mouse had already lifted.
    const lifted = gesture.lifted;
    if (lifted && dir === 'next' && lifted.side === 'right') {
      s.cy = lifted.cy;
      s.corner = { x: s.W, y: s.cy };
      s.P = { ...lifted.P };
    }
    draw(s, s.P);
    followPointer(e);
    host.classList.add('pc-dragging');
    try { host.setPointerCapture(e.pointerId); } catch (_) {}
    gesture = null;
    run();
  }

  function followPointer(e) {
    const s = curl;
    const dx = e.clientX - s.origin.x;
    const dy = e.clientY - s.origin.y;
    if (s.absolute) {
      const hr = host.getBoundingClientRect();
      s.target = { x: e.clientX - hr.left - s.frame.x, y: s.corner.y + dy * s.scaleY };
    } else {
      s.target = { x: s.corner.x + dx * s.scaleX, y: s.corner.y + dy * s.scaleY };
    }
    const now = performance.now();
    s.samples.push({ x: e.clientX, t: now });
    while (s.samples.length > 2 && now - s.samples[0].t > 110) s.samples.shift();
  }

  function onPointerMove(e) {
    if (curl && curl.dragging) {
      if (e.pointerId !== curl.pointerId) return;
      followPointer(e);
      e.preventDefault();
      return;
    }

    if (!gesture) {
      // Desktop: grab cursor on the pages + lifted corner when hovering a corner.
      if (e.pointerType === 'mouse' && !curl) {
        const info = hitInfo(e);
        const dir = info.side === 'right' ? 'next' : info.side === 'left' ? 'prev' : null;
        const ok = Boolean(dir && canGo(dir));
        host.classList.toggle('pc-grab', ok);
        if (ok && info.corner) showPeek(info.side, e, info.top);
        else leavePeek();
      }
      return;
    }
    if (e.pointerId !== gesture.id) return;

    const dx = e.clientX - gesture.sx;
    const dy = e.clientY - gesture.sy;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

    if (Math.abs(dx) > Math.abs(dy) * 1.15) {
      const dir = dx < 0 ? 'next' : 'prev';
      // Mouse: drag the right page to go forward, the left page to go back.
      if (gesture.type === 'mouse' &&
          !((dir === 'next' && gesture.side === 'right') || (dir === 'prev' && gesture.side === 'left'))) {
        gesture = null;
        return;
      }
      if (!canGo(dir)) { gesture = null; return; }
      e.preventDefault();
      startDrag(dir, e);
    } else {
      gesture = null; // vertical intent: let the page scroll
    }
  }

  function release(cancelled) {
    const s = curl;
    s.dragging = false;
    host.classList.remove('pc-dragging');
    try { host.releasePointerCapture(s.pointerId); } catch (_) {}

    let v = 0;
    if (s.samples.length >= 2) {
      const a = s.samples[0];
      const b = s.samples[s.samples.length - 1];
      v = (b.x - a.x) / Math.max(1, b.t - a.t); // px per ms
    }
    const progress = clamp((s.W - s.P.x) / (2 * s.W), 0, 1);
    let commit;
    if (s.dir === 'next') commit = v < -0.35 || (v <= 0.35 && progress > 0.3);
    else commit = v > 0.35 || (v >= -0.35 && progress < 0.7);
    if (cancelled) commit = s.dir === 'next' ? progress > 0.5 : progress < 0.5;
    animateTo(commit);
  }

  function onPointerUp(e) {
    if (curl && curl.dragging && e.pointerId === curl.pointerId) {
      release(false);
      return;
    }
    if (gesture && e.pointerId === gesture.id) {
      const moved = Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy);
      const quick = performance.now() - gesture.t < 500;
      const side = gesture.side;
      const edge = gesture.edge;
      const top = gesture.top;
      const lifted = gesture.lifted;
      gesture = null;
      if (!(moved < 10 && quick && side && edge)) leavePeek();
      if (moved < 10 && quick && side && edge) {
        const dir = side === 'right' ? 'next' : 'prev';
        if (canGo(dir)) {
          const opts = e.pointerType === 'mouse' ? { top } : {};
          if (lifted && lifted.side === side && dir === 'next') { opts.from = lifted.P; opts.top = lifted.cy === 0; }
          if (!turn(dir, opts)) changeReadingPage(state.currentPageIndex + (dir === 'next' ? 1 : -1));
        }
      }
    }
  }

  function onPointerCancel(e) {
    if (curl && curl.dragging && e.pointerId === curl.pointerId) release(true);
    gesture = null;
  }

  /* ---------- preload next/previous illustrations ---------- */
  function preloadNeighbours() {
    if (!state || !state.readingPages) return;
    [state.currentPageIndex + 1, state.currentPageIndex - 1, state.currentPageIndex + 2].forEach(i => {
      const p = state.readingPages[i];
      if (p && p.image) {
        const img = new Image();
        img.decoding = 'async';
        img.src = p.image;
      }
    });
  }

  function attach(flipPage) {
    host = flipPage;
    if (!host || !window.PointerEvent) return false;
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerCancel);
    host.addEventListener('pointerleave', () => { host.classList.remove('pc-grab'); leavePeek(); });
    host.addEventListener('dragstart', e => e.preventDefault());

    // New week/grade or a resize while turning: drop the animation safely.
    [el.weekSelect, el.gradeSelect].forEach(s => s && s.addEventListener('change', abort));
    window.addEventListener('resize', () => { if (curl && !curl.dragging) abort(); });

    // Preload as soon as a new page or cover is shown.
    const watch = new MutationObserver(preloadNeighbours);
    [el.pageIllustration, el.coverImage].forEach(n => n && watch.observe(n, { attributes: true, attributeFilter: ['src'] }));
    return true;
  }

  window.PageCurl = { attach, turn, abort, isBusy: () => Boolean(curl) };
})();
