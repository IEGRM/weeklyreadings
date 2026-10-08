/* Weekly Readings — highlights the current step in the sticky navigator. */
(() => {
  'use strict';
  const nav = document.querySelector('.wr-steps');
  if (!nav || !('IntersectionObserver' in window)) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  function setActive(id) {
    links.forEach(a => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'step');
        // keep the active step visible on narrow screens
        const l = a.offsetLeft, r = l + a.offsetWidth;
        if (l < nav.scrollLeft || r > nav.scrollLeft + nav.clientWidth) nav.scrollTo({ left: l - 8, behavior: 'smooth' });
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(visible[0].target.id);
  }, { rootMargin: '-35% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
  setActive(sections[0] ? sections[0].id : '');
})();
