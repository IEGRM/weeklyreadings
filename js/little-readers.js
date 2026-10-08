/* =========================================================
   LITTLE READERS — shelf + flipbook reader
   Books come from data/little-readers-links.js
   ========================================================= */
(() => {
  'use strict';

  const ALLOWED_HOST = 'app.artistly.ai';
  const ALLOWED_PATH = /^\/flipbook\/[A-Za-z0-9-]+\/?$/;   // needs the book ID after /flipbook/
  const GRADES = [1, 2, 3, 4, 5];
  const PERIODS = [1, 2, 3];
  const GRADE_COLORS = {
    1: { c: '#ffb524', d: '#b87700', t: '#fff1cf' },
    2: { c: '#ff5c8d', d: '#c2275a', t: '#ffe1ea' },
    3: { c: '#2fbf71', d: '#17864b', t: '#dcf6e7' },
    4: { c: '#2e7cf6', d: '#1b55b3', t: '#dde9ff' },
    5: { c: '#8a5cf5', d: '#5a33b7', t: '#ebe3ff' },
  };

  const $ = id => document.getElementById(id);
  const books = Array.isArray(window.LITTLE_READERS_BOOKS) ? window.LITTLE_READERS_BOOKS : [];
  const view = { grade: 1, period: 1 };
  let lastTrigger = null;

  /* Only https://app.artistly.ai/flipbook/... links are accepted. */
  function safeLink(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const url = new URL(raw.trim());
      if (url.protocol !== 'https:' || url.hostname !== ALLOWED_HOST || !ALLOWED_PATH.test(url.pathname)) {
        console.warn('[Little Readers] Link ignored (not an Artistly flipbook):', raw);
        return null;
      }
      url.username = '';
      url.password = '';
      return url.href;
    } catch (_) {
      console.warn('[Little Readers] Invalid link ignored:', raw);
      return null;
    }
  }

  function booksFor(grade, period) {
    return books
      .filter(b => Number(b.grade) === grade && Number(b.period) === period)
      .sort((a, b) => Number(a.reading) - Number(b.reading));
  }

  function readyCount(grade, period) {
    return booksFor(grade, period).filter(b => safeLink(b.link)).length;
  }

  /* ---------- remember the choice (hash > storage) ---------- */
  function readStart() {
    const m = /^#g([1-5])(?:p([1-3]))?$/.exec(location.hash);
    if (m) return { grade: Number(m[1]), period: Number(m[2] || 1) };
    try {
      const g = Number(localStorage.getItem('lr_grade'));
      const p = Number(localStorage.getItem('lr_period'));
      if (GRADES.includes(g)) return { grade: g, period: PERIODS.includes(p) ? p : 1 };
    } catch (_) { /* storage blocked */ }
    return { grade: 1, period: 1 };
  }

  function saveChoice() {
    try {
      localStorage.setItem('lr_grade', String(view.grade));
      localStorage.setItem('lr_period', String(view.period));
    } catch (_) { /* storage blocked */ }
    const hash = `#g${view.grade}p${view.period}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  /* ---------- rendering ---------- */
  function applyGradeColors() {
    const col = GRADE_COLORS[view.grade];
    const root = document.documentElement.style;
    root.setProperty('--grade', col.c);
    root.setProperty('--grade-deep', col.d);
    root.setProperty('--grade-tint', col.t);
  }

  function syncTabs(container, attr, value) {
    container.querySelectorAll('[role="tab"]').forEach(tab => {
      const on = Number(tab.dataset[attr]) === value;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
  }

  function icon(name) {
    const paths = {
      book: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5zM13 4h5.5c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5H13z',
      lock: 'M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z',
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', paths[name]);
    svg.appendChild(p);
    return svg;
  }

  function bookCard(book) {
    const link = safeLink(book.link);
    const li = document.createElement('li');
    const card = document.createElement(link ? 'button' : 'div');
    card.className = `lr-book ${link ? 'is-ready' : 'is-soon'}`;

    const cover = document.createElement('span');
    cover.className = `lr-cover pat-${((Number(book.reading) - 1) % 4) + 1}`;
    const num = document.createElement('span');
    num.className = 'lr-num';
    num.textContent = String(book.reading);
    const title = document.createElement('span');
    title.className = 'lr-cover-title';
    title.textContent = String(book.title || `Reading ${book.reading}`);
    cover.append(num, title);

    const foot = document.createElement('span');
    foot.className = 'lr-book-foot';
    const label = document.createElement('span');
    label.textContent = link ? 'Read now' : 'Coming soon';
    foot.append(icon(link ? 'book' : 'lock'), label);

    card.append(cover, foot);

    if (link) {
      card.type = 'button';
      card.setAttribute('aria-label', `Read ${title.textContent}, reading ${book.reading}`);
      card.addEventListener('click', () => openReader(book, link, card));
    } else {
      card.setAttribute('aria-label', `${title.textContent}, coming soon`);
    }
    li.appendChild(card);
    return li;
  }

  function render() {
    applyGradeColors();
    syncTabs($('gradeTabs'), 'grade', view.grade);
    syncTabs($('periodTabs'), 'period', view.period);

    $('shelfTitle').textContent = `Grade ${view.grade} books`;
    $('periodTabs').querySelectorAll('.lr-period').forEach(tab => {
      const p = Number(tab.dataset.period);
      const total = booksFor(view.grade, p).length;
      tab.querySelector('small').textContent = `${readyCount(view.grade, p)}/${total}`;
      tab.setAttribute('aria-label', `Period ${p}, ${readyCount(view.grade, p)} of ${total} books ready`);
    });

    const list = $('bookList');
    if (!books.length) {
      // The links file has a typo (usually a missing quote): tell the teacher.
      const msg = document.createElement('li');
      msg.className = 'lr-empty';
      msg.textContent = 'The books list could not be loaded. Teacher: check data/little-readers-links.js (every link needs its two quotes).';
      list.replaceChildren(msg);
    } else {
      list.replaceChildren(...booksFor(view.grade, view.period).map(bookCard));
    }
    saveChoice();
  }

  /* ---------- tabs with keyboard support ---------- */
  function wireTabs(container, attr, onPick) {
    container.addEventListener('click', e => {
      const tab = e.target.closest('[role="tab"]');
      if (!tab) return;
      onPick(Number(tab.dataset[attr]));
    });
    container.addEventListener('keydown', e => {
      const tabs = [...container.querySelectorAll('[role="tab"]')];
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      onPick(Number(next.dataset[attr]));
      next.focus();
    });
  }

  /* ---------- reader ---------- */
  function openReader(book, link, trigger) {
    const dialog = $('reader');
    const frame = $('readerFrame');
    lastTrigger = trigger;

    $('readerTitle').textContent = String(book.title || '');
    $('readerMeta').textContent = `Grade ${book.grade}, Period ${book.period}, Reading ${book.reading}`;
    $('readerNewTab').href = link;
    frame.title = String(book.title || 'Flipbook');
    $('readerLoading').hidden = false;

    if (typeof dialog.showModal !== 'function') {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    frame.src = link;
    dialog.showModal();
    document.documentElement.classList.add('lr-locked');
    $('readerClose').focus();
  }

  function closeReader() {
    const dialog = $('reader');
    if (dialog.open) dialog.close();
  }

  function onReaderClosed() {
    const frame = $('readerFrame');
    frame.src = 'about:blank';           // stops any sound inside the flipbook
    document.documentElement.classList.remove('lr-locked');
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  /* ---------- start ---------- */
  function init() {
    if (!books.length) {
      console.warn('[Little Readers] data/little-readers-links.js did not load (check its quotes and commas).');
    }
    const start = readStart();
    view.grade = start.grade;
    view.period = start.period;

    wireTabs($('gradeTabs'), 'grade', g => { view.grade = g; render(); });
    wireTabs($('periodTabs'), 'period', p => { view.period = p; render(); });

    $('readerClose').addEventListener('click', closeReader);
    $('reader').addEventListener('close', onReaderClosed);
    $('reader').addEventListener('click', e => { if (e.target === $('reader')) closeReader(); });
    $('readerFrame').addEventListener('load', () => {
      if ($('readerFrame').src !== 'about:blank') $('readerLoading').hidden = true;
    });

    window.addEventListener('hashchange', () => {
      const s = readStart();
      if (s.grade !== view.grade || s.period !== view.period) {
        view.grade = s.grade;
        view.period = s.period;
        render();
      }
    });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
