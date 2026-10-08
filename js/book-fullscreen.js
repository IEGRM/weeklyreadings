/* Weekly Readings — full screen book (like FlipHTML5).
   Uses the browser Full Screen API when available and a full-window
   layout otherwise (e.g. iPhone Safari, which only allows video in full screen). */
(() => {
  'use strict';
  const shell = document.getElementById('stepRead');
  const btn = document.getElementById('bookFullscreen');
  if (!shell || !btn) return;

  const label = btn.querySelector('span');
  const nativeFS = Boolean(shell.requestFullscreen || shell.webkitRequestFullscreen);
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const isOn = () => shell.classList.contains('is-full');

  function refit() {
    // Let the reader re-fit the page text and the page-curl measure the new size.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  function setUI(on) {
    shell.classList.toggle('is-full', on);
    document.documentElement.classList.toggle('wr-full-lock', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Exit full screen' : 'Full screen';
    label.textContent = on ? 'Exit full screen' : 'Full screen';
    refit();
  }

  async function enter() {
    setUI(true);
    if (!nativeFS) return;
    try {
      if (shell.requestFullscreen) await shell.requestFullscreen({ navigationUI: 'hide' });
      else shell.webkitRequestFullscreen();
    } catch (_) {
      /* Browser refused: the full-window layout is already on. */
    }
  }

  async function exit() {
    if (fsElement()) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else document.webkitExitFullscreen();
      } catch (_) { /* ignore */ }
    }
    setUI(false);
  }

  btn.addEventListener('click', () => (isOn() ? exit() : enter()));

  // Leaving full screen with Esc / the browser's own control.
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (!fsElement() && isOn()) setUI(false);
      else refit();
    });
  });

  // Esc also closes the full-window fallback.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOn() && !fsElement()) setUI(false);
  });
})();
