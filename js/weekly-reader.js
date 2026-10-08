const state = {
  catalog: null,
  currentWeekData: null,
  currentGradeId: '6',
  currentWeek: null,
  selectedVoice: null,
  speechRate: 0.95,
  sentenceWordOffsets: [],
  allWordElements: [],
  allSentenceElements: [],
  vocabularyMap: new Map(),
  speechCancelled: false,
  currentAutoTooltip: null,
  selectedWordChip: null,
  currentGameTemplate: '',
  currentSentenceIdx: -1,
  ttsFallbackTimer: null,
  readingPages: [],
  currentPageIndex: 0,
  hasCover: false,
  coverImage: '',
  readingFrame: '',
  touchStartX: 0,
  touchStartY: 0,
  audioContext: null,
  touchDragActive: false,
  touchDragDirection: '',
  curlPointerId: null,
  curlActive: false,
  curlDirection: '',
  curlCorner: 'bottom',
  curlStartX: 0,
  curlStartY: 0,
  curlPageWidth: 0,
  curlPageHeight: 0,
  curlOnCover: false,
};

const el = {};

function $(id) { return document.getElementById(id); }

function plainTextFromHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent.replace(/\s+/g, ' ').trim();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeKey(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
}

async function init() {
  bindDom();
  await loadCatalog();
  populateSelectors();
  setupListeners();
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
  await loadCurrentSelection();
  startCamera();
}

function bindDom() {
  [
    'weekSelect','gradeSelect','readingTitleDisplay','readingMeta','programBadge','readingHeading','readingSubheading',
    'imageDisplay','textContent','vocabularyContent','quizContent','scoreButton','clearButton','scoreFeedback',
    'ttsPlay','ttsPause','ttsResume','ttsStop','voiceSelect','ttsSpeedRange','ttsSpeedLabel','ttsSyncStatus',
    'readingGameContainer','checkAnswers','resetGame','gameScore','screenshotButton','timestamp','evidenceTitleField','cameraBox',
    'flipPrev','flipNext','flipPrevMobile','flipNextMobile','flipPageIndicator','flipPageIndicatorMobile','flipPage','pageIllustration',
    'coverView','coverImage','spreadView','readingFramePage','readingFrameImage','readingTtsBar','readingScrollArea'
  ].forEach(id => el[id] = $(id));
}

async function loadCatalog() {
  const response = await fetch('../data/catalog.json?v=20260923-15weeks', { cache: 'no-store' });
  state.catalog = await response.json();
}

function populateSelectors() {
  const weeks = state.catalog.weeklyReadings.availableWeeks;
  const savedWeek = localStorage.getItem('wr_week');
  const savedGrade = localStorage.getItem('wr_grade');
  el.weekSelect.innerHTML = weeks.map(week => `<option value="${week}">Week ${week}</option>`).join('');
  el.gradeSelect.innerHTML = state.catalog.weeklyReadings.grades.map(g => `<option value="${g.id}">${g.label}</option>`).join('');
  el.weekSelect.value = weeks.includes(Number(savedWeek)) ? String(savedWeek) : String(state.catalog.weeklyReadings.defaultWeek);
  state.currentGradeId = state.catalog.weeklyReadings.grades.some(g => g.id === savedGrade) ? savedGrade : state.currentGradeId;
  el.gradeSelect.value = state.currentGradeId;
}

function setupListeners() {
  el.weekSelect.addEventListener('change', loadCurrentSelection);
  el.gradeSelect.addEventListener('change', loadCurrentSelection);
  el.ttsPlay.addEventListener('click', startSpeech);
  el.ttsPause.addEventListener('click', pauseSpeech);
  el.ttsResume.addEventListener('click', resumeSpeech);
  el.ttsStop.addEventListener('click', stopSpeech);
  el.voiceSelect.addEventListener('change', () => {
    const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    state.selectedVoice = voices.find(v => v.name === el.voiceSelect.value) || state.selectedVoice;
  });
  el.ttsSpeedRange.addEventListener('input', () => {
    state.speechRate = parseFloat(el.ttsSpeedRange.value);
    el.ttsSpeedLabel.textContent = state.speechRate.toFixed(2) + 'x';
  });
  el.scoreButton.addEventListener('click', calculateScore);
  el.clearButton.addEventListener('click', clearQuiz);
  el.checkAnswers.addEventListener('click', checkPracticeAnswers);
  el.resetGame.addEventListener('click', buildPracticeChallenge);
  el.screenshotButton.addEventListener('click', takeScreenshot);

  if (el.flipPrev) el.flipPrev.addEventListener('click', prevReadingPage);
  if (el.flipNext) el.flipNext.addEventListener('click', nextReadingPage);
  if (el.flipPrevMobile) el.flipPrevMobile.addEventListener('click', prevReadingPage);
  if (el.flipNextMobile) el.flipNextMobile.addEventListener('click', nextReadingPage);

  if (el.flipPage) {
    if (window.PageCurl && window.PageCurl.attach(el.flipPage)) {
      // Realistic page curl (js/page-curl.js) handles drag, swipe and tap.
    } else if (window.PointerEvent) {
      el.flipPage.addEventListener('pointerdown', handleCurlPointerDown);
      el.flipPage.addEventListener('pointermove', handleCurlPointerMove);
      el.flipPage.addEventListener('pointerup', handleCurlPointerUp);
      el.flipPage.addEventListener('pointercancel', handleCurlPointerCancel);
      el.flipPage.addEventListener('pointerleave', handleCurlPointerHoverLeave);
    } else {
      // Fallback for very old browsers.
      el.flipPage.addEventListener('touchstart', handlePageTouchStart, { passive: true });
      el.flipPage.addEventListener('touchmove', handlePageTouchMove, { passive: false });
      el.flipPage.addEventListener('touchend', handlePageTouchEnd, { passive: true });
      el.flipPage.addEventListener('touchcancel', cancelPageTouch, { passive: true });
    }
  }

  window.addEventListener('resize', () => {
    if (state.currentPageIndex >= 0) window.requestAnimationFrame(autoFitReadingPageText);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') prevReadingPage();
    if (event.key === 'ArrowRight') nextReadingPage();
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.vocab-tooltip') && !event.target.closest('.vocab-word')) {
      closeManualTooltips();
    }
  });
}

async function loadCurrentSelection() {
  stopSpeech();
  state.currentWeek = el.weekSelect.value;
  state.currentGradeId = el.gradeSelect.value;
  localStorage.setItem('wr_week', state.currentWeek);
  localStorage.setItem('wr_grade', state.currentGradeId);

  const response = await fetch(`../data/weekly/week${String(state.currentWeek).padStart(2,'0')}.json?v=20260923-15weeks`, { cache: 'no-store' });
  state.currentWeekData = await response.json();
  const gradeData = getCurrentGradeData();
  renderHero(gradeData);
  renderReading(gradeData);
  renderVocabulary(gradeData);
  renderQuiz(gradeData);
  buildPracticeChallenge();
  resetResultFeedback();
  el.evidenceTitleField.value = gradeData.title;
}

function getCurrentGradeData() {
  return state.currentWeekData.grades[state.currentGradeId];
}

function renderHero(gradeData) {
  el.readingTitleDisplay.textContent = gradeData.title;
  el.readingMeta.textContent = `${gradeData.label} • Week ${state.currentWeek}`;
  el.readingHeading.textContent = gradeData.title;
  el.readingSubheading.textContent = `${gradeData.label} • Week ${state.currentWeek}`;
  el.programBadge.textContent = gradeData.label;

  state.coverImage = gradeData.cover || '';
  state.readingFrame = gradeData.readingFrame || '';
  state.hasCover = Boolean(state.coverImage);

  // Legacy compatibility element kept in the DOM but never shown.
  if (el.imageDisplay) {
    el.imageDisplay.removeAttribute('src');
    el.imageDisplay.alt = '';
    el.imageDisplay.hidden = true;
  }

  if (el.coverImage) {
    if (state.coverImage) {
      el.coverImage.src = state.coverImage;
      el.coverImage.alt = `${gradeData.title} cover`;
    } else {
      el.coverImage.removeAttribute('src');
    }
  }

  if (el.readingFrameImage) {
    if (state.readingFrame) el.readingFrameImage.src = state.readingFrame;
    else el.readingFrameImage.removeAttribute('src');
  }

  const evidenceTitleDisplay = document.getElementById('evidenceTitleDisplay');
  if (evidenceTitleDisplay) {
    evidenceTitleDisplay.textContent = gradeData.title.toUpperCase();
  }
}

function buildReadingPages(gradeData) {
  if (!Array.isArray(gradeData.pages) || gradeData.pages.length === 0) {
    throw new Error(`Invalid reading data for Grade ${gradeData.grade}: pages[] is required.`);
  }

  return gradeData.pages.map((page, index) => {
    if (!Array.isArray(page.sentences) || page.sentences.length === 0) {
      throw new Error(`Invalid page ${index + 1}: sentences[] is required.`);
    }

    return {
      page: page.page || (index + 1),
      image: page.image || '',
      artDirection: page.artDirection || '',
      sentences: page.sentences
    };
  });
}

function estimateWordCountForPage(page) {
  if (!page || !Array.isArray(page.sentences)) return 0;
  return page.sentences.reduce((total, sentence) => total + plainTextFromHTML(sentence.html || '').split(/\s+/).filter(Boolean).length, 0);
}

function autoFitReadingPageText() {
  if (!el.textContent || !el.readingScrollArea || !el.readingFramePage || state.currentPageIndex < 0) return;

  const page = state.readingPages[state.currentPageIndex];
  const wordCount = estimateWordCountForPage(page);
  const viewportWidth = window.innerWidth || 1024;

  let maxFont = viewportWidth <= 430 ? 0.98 : viewportWidth <= 720 ? 1.02 : 1.08;
  let minFont = viewportWidth <= 430 ? 0.82 : viewportWidth <= 720 ? 0.86 : 0.90;
  let font = maxFont;

  if (wordCount > 95) font -= 0.08;
  if (wordCount > 120) font -= 0.06;
  font = Math.max(minFont, font);

  let lineHeight = 1.54;
  if (wordCount > 95) lineHeight = 1.49;
  if (wordCount > 120) lineHeight = 1.44;

  el.readingFramePage.style.setProperty('--page-font-size', `${font.toFixed(3)}rem`);
  el.readingFramePage.style.setProperty('--page-line-height', `${lineHeight}`);
  el.readingFramePage.style.setProperty('--page-letter-spacing', wordCount > 120 ? '-0.01em' : '0');

  // Fine-grained fit: shrink slightly until the text fits without internal scrolling.
  let guard = 0;
  while (el.readingScrollArea.scrollHeight > el.readingScrollArea.clientHeight + 2 && font > minFont && guard < 18) {
    font -= 0.02;
    lineHeight = Math.max(1.34, lineHeight - 0.012);
    el.readingFramePage.style.setProperty('--page-font-size', `${font.toFixed(3)}rem`);
    el.readingFramePage.style.setProperty('--page-line-height', `${lineHeight.toFixed(3)}`);
    guard += 1;
  }

  // If there is lots of empty room, grow a bit for short pages.
  while (el.readingScrollArea.scrollHeight < el.readingScrollArea.clientHeight * 0.83 && font < maxFont && guard < 28) {
    font += 0.02;
    lineHeight = Math.min(1.58, lineHeight + 0.008);
    el.readingFramePage.style.setProperty('--page-font-size', `${font.toFixed(3)}rem`);
    el.readingFramePage.style.setProperty('--page-line-height', `${lineHeight.toFixed(3)}`);
    if (el.readingScrollArea.scrollHeight > el.readingScrollArea.clientHeight + 2) {
      font -= 0.02;
      lineHeight = Math.max(1.34, lineHeight - 0.008);
      el.readingFramePage.style.setProperty('--page-font-size', `${font.toFixed(3)}rem`);
      el.readingFramePage.style.setProperty('--page-line-height', `${lineHeight.toFixed(3)}`);
      break;
    }
    guard += 1;
  }
}

function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!state.audioContext) state.audioContext = new Ctx();
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume().catch(() => {});
  }
  return state.audioContext;
}

function playPageFlipSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Gentle paper "whoosh" using short filtered noise.
  const duration = 0.12;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1100, now);
  filter.Q.setValueAtTime(0.8, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.065, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // Soft low thump to make the turn feel tactile.
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.018, now + 0.012);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  osc.connect(oscGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
  osc.start(now);
  osc.stop(now + 0.085);
}

function renderCurrentReadingPage() {
  const isCover = state.currentPageIndex === -1 && state.hasCover;

  if (el.coverView) el.coverView.hidden = !isCover;
  if (el.spreadView) el.spreadView.hidden = isCover;

  if (isCover) {
    // The cover is a visual opening page. TTS starts once Page 1 is opened.
    el.textContent.innerHTML = '';
    state.allWordElements = [];
    state.allSentenceElements = [];
    state.sentenceWordOffsets = [];
    updatePageControls();
    return;
  }

  const currentPage = state.readingPages[state.currentPageIndex] || { sentences: [], image: '' };
  const pageSentences = currentPage.sentences || [];

  el.textContent.innerHTML = pageSentences.map((sentence, idx) => {
    return `<span class="sentence-span" data-sentence-idx="${idx}">${renderSentenceTokens(sentence.html)}</span>`;
  }).join(' ');

  if (el.pageIllustration) {
    if (currentPage.image) {
      el.pageIllustration.src = currentPage.image;
      el.pageIllustration.alt = `${getCurrentGradeData().title} - page ${state.currentPageIndex + 1}`;
    } else {
      el.pageIllustration.removeAttribute('src');
      el.pageIllustration.alt = '';
    }
  }

  if (el.readingFrameImage) {
    if (state.readingFrame) el.readingFrameImage.src = state.readingFrame;
    else el.readingFrameImage.removeAttribute('src');
  }

  if (el.readingScrollArea) el.readingScrollArea.scrollTop = 0;

  attachVocabularyEvents();
  buildWordIndex();
  updatePageControls();
  requestAnimationFrame(autoFitReadingPageText);

  // Small page-change cue; no heavy 3D animation that could disturb TTS.
  if (el.spreadView) {
    el.spreadView.classList.remove('page-changing');
    void el.spreadView.offsetWidth;
    el.spreadView.classList.add('page-changing');
  }
}

function updatePageControls() {
  const totalPages = state.readingPages.length || 1;
  const isCover = state.currentPageIndex === -1 && state.hasCover;
  const pageNumber = state.currentPageIndex + 1;
  const label = isCover ? 'Cover' : `Page ${pageNumber} of ${totalPages}`;

  if (el.flipPageIndicator) el.flipPageIndicator.textContent = label;
  if (el.flipPageIndicatorMobile) el.flipPageIndicatorMobile.textContent = label;

  const isFirst = isCover || (!state.hasCover && state.currentPageIndex <= 0);
  const isLast = !isCover && state.currentPageIndex >= totalPages - 1;

  if (el.flipPrev) el.flipPrev.disabled = isFirst;
  if (el.flipNext) el.flipNext.disabled = isLast;
  if (el.flipPrevMobile) el.flipPrevMobile.disabled = isFirst;
  if (el.flipNextMobile) el.flipNextMobile.disabled = isLast;
}

function changeReadingPage(nextIndex) {
  const minIndex = state.hasCover ? -1 : 0;
  const maxIndex = state.readingPages.length - 1;

  if (nextIndex < minIndex || nextIndex > maxIndex || nextIndex === state.currentPageIndex) {
    return;
  }

  stopSpeech();
  state.currentPageIndex = nextIndex;
  renderCurrentReadingPage();
  playPageFlipSound();

  if (el.flipPage) {
    el.flipPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function nextReadingPage() {
  if (window.PageCurl && window.PageCurl.turn('next')) return;
  changeReadingPage(state.currentPageIndex + 1);
}

function prevReadingPage() {
  if (window.PageCurl && window.PageCurl.turn('prev')) return;
  changeReadingPage(state.currentPageIndex - 1);
}

function clearCurlClasses() {
  if (!el.spreadView) return;
  el.spreadView.classList.remove(
    'curl-next','curl-prev','curl-top','curl-bottom','curl-snap',
    'curl-finish-next','curl-finish-prev','is-curling',
    'corner-next-ready','corner-prev-ready'
  );
  el.spreadView.style.removeProperty('--curl-progress');
  el.spreadView.style.removeProperty('--curl-y');
  el.spreadView.style.removeProperty('--curl-z');
}

function resetCurlState() {
  clearCurlClasses();
  state.curlPointerId = null;
  state.curlActive = false;
  state.curlDirection = '';
  state.curlCorner = 'bottom';
  state.curlStartX = 0;
  state.curlStartY = 0;
  state.curlPageWidth = 0;
  state.curlPageHeight = 0;
  state.curlOnCover = false;
  if (el.coverView) {
    el.coverView.style.removeProperty('transform');
    el.coverView.style.removeProperty('filter');
    el.coverView.style.removeProperty('box-shadow');
    el.coverView.style.removeProperty('transition');
    el.coverView.style.removeProperty('transform-origin');
  }
}

function getCurlHit(event) {
  if (!el.flipPage) return null;
  if (event.target.closest('button, select, input, .vocab-word, .vocab-tooltip')) return null;

  const x = event.clientX;
  const y = event.clientY;
  const edge = event.pointerType === 'touch' ? 92 : 72;
  const cornerRatio = event.pointerType === 'touch' ? 0.36 : 0.31;

  // COVER: allow a forward page curl from the right-hand corners.
  if (state.currentPageIndex === -1 && state.hasCover && el.coverView && !el.coverView.hidden) {
    const r = el.coverView.getBoundingClientRect();
    const inEdge = x >= r.right - edge && x <= r.right + 12 && y >= r.top && y <= r.bottom;
    const inTop = y <= r.top + r.height * cornerRatio;
    const inBottom = y >= r.bottom - r.height * cornerRatio;
    if (inEdge && (inTop || inBottom)) {
      return { direction:'next', corner:inBottom ? 'bottom' : 'top', rect:r, cover:true };
    }
    return null;
  }

  if (!el.spreadView || state.currentPageIndex < 0) return null;

  const illustrationPage = el.spreadView.querySelector('.illustration-page');
  const readingPage = el.readingFramePage;
  if (!illustrationPage || !readingPage) return null;

  const minIndex = state.hasCover ? -1 : 0;
  const maxIndex = state.readingPages.length - 1;
  const canNext = state.currentPageIndex < maxIndex;
  const canPrev = state.currentPageIndex > minIndex;
  if (canNext) {
    const r = readingPage.getBoundingClientRect();
    const inEdge = x >= r.right - edge && x <= r.right + 10 && y >= r.top && y <= r.bottom;
    const inTop = y <= r.top + r.height * cornerRatio;
    const inBottom = y >= r.bottom - r.height * cornerRatio;
    if (inEdge && (inTop || inBottom)) {
      return { direction:'next', corner:inBottom ? 'bottom' : 'top', rect:r };
    }
  }

  if (canPrev) {
    const r = illustrationPage.getBoundingClientRect();
    const inEdge = x <= r.left + edge && x >= r.left - 10 && y >= r.top && y <= r.bottom;
    const inTop = y <= r.top + r.height * cornerRatio;
    const inBottom = y >= r.bottom - r.height * cornerRatio;
    if (inEdge && (inTop || inBottom)) {
      return { direction:'prev', corner:inBottom ? 'bottom' : 'top', rect:r };
    }
  }

  return null;
}

function handleCurlPointerDown(event) {
  const hit = getCurlHit(event);
  if (!hit) return;

  state.curlPointerId = event.pointerId;
  state.curlActive = true;
  state.curlDirection = hit.direction;
  state.curlCorner = hit.corner;
  state.curlStartX = event.clientX;
  state.curlStartY = event.clientY;
  state.curlPageWidth = Math.max(hit.rect.width, 220);
  state.curlPageHeight = Math.max(hit.rect.height, 300);
  state.curlOnCover = Boolean(hit.cover);

  if (el.flipPage.setPointerCapture) {
    try { el.flipPage.setPointerCapture(event.pointerId); } catch (_) {}
  }

  clearCurlClasses();
  if (state.curlOnCover) {
    el.coverView.style.transformOrigin = 'left center';
    el.coverView.style.transition = 'none';
    el.coverView.style.transform = 'perspective(1600px) rotateY(-1deg)';
    el.coverView.style.filter = 'brightness(.995)';
    el.coverView.style.boxShadow = '-4px 0 10px rgba(69,46,20,.08)';
  } else {
    el.spreadView.classList.add('is-curling', hit.direction === 'next' ? 'curl-next' : 'curl-prev', hit.corner === 'bottom' ? 'curl-bottom' : 'curl-top');
    el.spreadView.style.setProperty('--curl-progress', '0.015');
    el.spreadView.style.setProperty('--curl-y', '0px');
    el.spreadView.style.setProperty('--curl-z', '0deg');
  }
  event.preventDefault();
}

function handleCurlPointerMove(event) {
  if (!el.flipPage) return;

  // Desktop hover: show grab cursor only when the pointer is over a usable corner.
  if (!state.curlActive) {
    el.spreadView?.classList.remove('corner-next-ready','corner-prev-ready');
    if (el.coverView) el.coverView.style.cursor = '';
    const hit = getCurlHit(event);
    if (hit) {
      if (hit.cover && el.coverView) el.coverView.style.cursor = 'grab';
      else el.spreadView?.classList.add(hit.direction === 'next' ? 'corner-next-ready' : 'corner-prev-ready');
    }
    return;
  }

  if (event.pointerId !== state.curlPointerId) return;

  const dx = event.clientX - state.curlStartX;
  const dy = event.clientY - state.curlStartY;
  const signedDx = state.curlDirection === 'next' ? -dx : dx;
  const progress = Math.max(0.015, Math.min(0.97, signedDx / state.curlPageWidth));

  // The dragged corner follows the finger slightly vertically, creating a real paper-curl feel.
  const maxY = state.curlPageHeight * 0.18;
  const yShift = Math.max(-maxY, Math.min(maxY, dy * 0.46));
  const verticalNorm = Math.max(-1, Math.min(1, dy / (state.curlPageHeight * 0.42)));
  const cornerSign = state.curlCorner === 'bottom' ? 1 : -1;
  const directionSign = state.curlDirection === 'next' ? -1 : 1;
  const z = verticalNorm * cornerSign * directionSign * 5.5 * progress;

  if (state.curlOnCover) {
    const angle = Math.min(86, 4 + progress * 82);
    const lift = Math.min(18, Math.abs(yShift) * 0.18);
    el.coverView.style.transform = `perspective(1600px) translateY(${(yShift*0.08).toFixed(1)}px) rotateY(${-angle.toFixed(1)}deg) rotateZ(${z.toFixed(2)}deg)`;
    el.coverView.style.filter = `brightness(${(1 - progress * 0.12).toFixed(3)})`;
    el.coverView.style.boxShadow = `${(-10 - progress*24).toFixed(1)}px 0 ${Math.round(18 + progress*34)}px rgba(69,46,20,${(0.10 + progress*0.18).toFixed(3)})`;
  } else {
    el.spreadView.style.setProperty('--curl-progress', progress.toFixed(3));
    el.spreadView.style.setProperty('--curl-y', `${yShift.toFixed(1)}px`);
    el.spreadView.style.setProperty('--curl-z', `${z.toFixed(2)}deg`);
  }
  event.preventDefault();
}

function finishCurlTurn(direction) {
  if (state.curlOnCover && el.coverView) {
    el.coverView.style.transition = 'transform .30s ease-in, filter .30s ease-in, box-shadow .30s ease-in';
    el.coverView.style.transformOrigin = 'left center';
    el.coverView.style.transform = 'perspective(1600px) rotateY(-88deg)';
    el.coverView.style.filter = 'brightness(.84)';
    el.coverView.style.boxShadow = '-34px 0 46px rgba(69,46,20,.24)';
    setTimeout(() => {
      resetCurlState();
      changeReadingPage(0);
    }, 305);
    return;
  }
  if (!el.spreadView) return;
  const nextIndex = state.currentPageIndex + (direction === 'next' ? 1 : -1);
  const minIndex = state.hasCover ? -1 : 0;
  const maxIndex = state.readingPages.length - 1;
  if (nextIndex < minIndex || nextIndex > maxIndex) {
    resetCurlState();
    return;
  }

  el.spreadView.classList.remove('curl-snap');
  el.spreadView.classList.add(direction === 'next' ? 'curl-finish-next' : 'curl-finish-prev');
  setTimeout(() => {
    resetCurlState();
    changeReadingPage(nextIndex);
  }, 305);
}

function handleCurlPointerUp(event) {
  if (!state.curlActive || event.pointerId !== state.curlPointerId) return;

  const dx = event.clientX - state.curlStartX;
  const signedDx = state.curlDirection === 'next' ? -dx : dx;
  const progress = Math.max(0, signedDx / Math.max(state.curlPageWidth, 1));
  const shouldTurn = progress >= 0.18 || signedDx >= 72;
  const direction = state.curlDirection;

  if (el.flipPage.releasePointerCapture) {
    try { el.flipPage.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  if (shouldTurn) {
    finishCurlTurn(direction);
  } else if (state.curlOnCover && el.coverView) {
    el.coverView.style.transition = 'transform .24s ease, filter .24s ease, box-shadow .24s ease';
    el.coverView.style.transform = 'perspective(1600px) rotateY(0deg)';
    el.coverView.style.filter = 'brightness(1)';
    el.coverView.style.boxShadow = '';
    setTimeout(resetCurlState, 250);
  } else {
    el.spreadView.classList.add('curl-snap');
    el.spreadView.style.setProperty('--curl-progress', '0');
    el.spreadView.style.setProperty('--curl-y', '0px');
    el.spreadView.style.setProperty('--curl-z', '0deg');
    setTimeout(resetCurlState, 290);
  }
  event.preventDefault();
}

function handleCurlPointerCancel(event) {
  if (!state.curlActive) return;
  if (state.curlOnCover && el.coverView) {
    el.coverView.style.transition = 'transform .24s ease, filter .24s ease';
    el.coverView.style.transform = 'perspective(1600px) rotateY(0deg)';
    el.coverView.style.filter = 'brightness(1)';
    setTimeout(resetCurlState, 250);
    return;
  }
  el.spreadView?.classList.add('curl-snap');
  el.spreadView?.style.setProperty('--curl-progress', '0');
  setTimeout(resetCurlState, 290);
}

function handleCurlPointerHoverLeave() {
  if (!state.curlActive) {
    el.spreadView?.classList.remove('corner-next-ready','corner-prev-ready');
    if (el.coverView) el.coverView.style.cursor = '';
  }
}

function resetPageTurnVisual() {
  if (!el.spreadView) return;
  el.spreadView.classList.remove('drag-turn-next', 'drag-turn-prev', 'turn-snap-back', 'turn-commit-next', 'turn-commit-prev');
  el.spreadView.style.removeProperty('--turn-progress');
  state.touchDragActive = false;
  state.touchDragDirection = '';
}

function handlePageTouchStart(event) {
  // Do not start a page swipe from an interactive control or a vocabulary word.
  if (event.target.closest('button, select, input, .vocab-word, .vocab-tooltip')) {
    state.touchStartX = 0;
    state.touchStartY = 0;
    resetPageTurnVisual();
    return;
  }

  const touch = event.changedTouches?.[0];
  if (!touch) return;
  state.touchStartX = touch.clientX;
  state.touchStartY = touch.clientY;
  state.touchDragActive = false;
  state.touchDragDirection = '';
  if (el.spreadView) {
    el.spreadView.classList.remove('turn-snap-back', 'turn-commit-next', 'turn-commit-prev');
    el.spreadView.style.setProperty('--turn-progress', '0');
  }
}

function handlePageTouchMove(event) {
  if (!state.touchStartX && !state.touchStartY) return;
  if (!el.spreadView || state.currentPageIndex < 0) return; // cover still swipes normally

  const touch = event.changedTouches?.[0] || event.touches?.[0];
  if (!touch) return;

  const deltaX = touch.clientX - state.touchStartX;
  const deltaY = touch.clientY - state.touchStartY;

  // Preserve vertical page scrolling until horizontal intent is clear.
  if (!state.touchDragActive) {
    if (Math.abs(deltaX) < 12) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
    state.touchDragActive = true;
    state.touchDragDirection = deltaX < 0 ? 'next' : 'prev';
  }

  const minIndex = state.hasCover ? -1 : 0;
  const maxIndex = state.readingPages.length - 1;
  const canGoNext = state.currentPageIndex < maxIndex;
  const canGoPrev = state.currentPageIndex > minIndex;

  if ((state.touchDragDirection === 'next' && !canGoNext) ||
      (state.touchDragDirection === 'prev' && !canGoPrev)) {
    return;
  }

  event.preventDefault();

  const pageWidth = Math.max(el.spreadView.getBoundingClientRect().width / 2, 220);
  const progress = Math.min(0.92, Math.max(0, Math.abs(deltaX) / pageWidth));
  el.spreadView.style.setProperty('--turn-progress', progress.toFixed(3));
  el.spreadView.classList.toggle('drag-turn-next', state.touchDragDirection === 'next');
  el.spreadView.classList.toggle('drag-turn-prev', state.touchDragDirection === 'prev');
}

function handlePageTouchEnd(event) {
  if (!state.touchStartX && !state.touchStartY) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;

  const deltaX = touch.clientX - state.touchStartX;
  const deltaY = touch.clientY - state.touchStartY;
  const direction = deltaX < 0 ? 'next' : 'prev';
  const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
  const shouldTurn = Math.abs(deltaX) >= 60 && horizontalIntent;

  state.touchStartX = 0;
  state.touchStartY = 0;

  if (!shouldTurn) {
    if (el.spreadView && state.touchDragActive) {
      el.spreadView.classList.add('turn-snap-back');
      el.spreadView.style.setProperty('--turn-progress', '0');
      setTimeout(resetPageTurnVisual, 220);
    } else {
      resetPageTurnVisual();
    }
    return;
  }

  const nextIndex = state.currentPageIndex + (direction === 'next' ? 1 : -1);
  const minIndex = state.hasCover ? -1 : 0;
  const maxIndex = state.readingPages.length - 1;
  if (nextIndex < minIndex || nextIndex > maxIndex) {
    resetPageTurnVisual();
    return;
  }

  if (el.spreadView && state.currentPageIndex >= 0) {
    el.spreadView.classList.remove('drag-turn-next', 'drag-turn-prev');
    el.spreadView.classList.add(direction === 'next' ? 'turn-commit-next' : 'turn-commit-prev');
    setTimeout(() => {
      resetPageTurnVisual();
      changeReadingPage(nextIndex);
    }, 190);
  } else {
    resetPageTurnVisual();
    changeReadingPage(nextIndex);
  }
}

function cancelPageTouch() {
  state.touchStartX = 0;
  state.touchStartY = 0;
  resetPageTurnVisual();
}

function renderReading(gradeData) {
  state.vocabularyMap = new Map();
  gradeData.vocabulary.forEach(item => state.vocabularyMap.set(normalizeKey(item.word), item.definition));

  state.readingPages = buildReadingPages(gradeData);
  state.currentPageIndex = state.hasCover ? -1 : 0;
  renderCurrentReadingPage();
}

function renderSentenceTokens(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  let out = '';

  function appendTokensFromText(text, vocabDefinition = null, phrase = '') {
    const tokens = text.match(/\S+|\s+/g) || [];
    tokens.forEach(token => {
      if (/^\s+$/.test(token)) {
        out += token;
      } else {
        const cls = ['word-unit'];
        const definitionAttr = vocabDefinition ? ` data-definition="${escapeHtml(vocabDefinition)}" data-phrase="${escapeHtml(phrase)}"` : '';
        if (vocabDefinition) cls.push('vocab-word');
        out += `<span class="${cls.join(' ')}"${definitionAttr}>${escapeHtml(token)}</span>`;
      }
    });
  }

  Array.from(container.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendTokensFromText(node.textContent);
    } else if (node.nodeName === 'BR') {
      out += '<br>';
    } else {
      const phrase = node.textContent.replace(/\s+/g, ' ').trim();
      const definition = state.vocabularyMap.get(normalizeKey(phrase)) || null;
      appendTokensFromText(node.textContent, definition, phrase);
    }
  });
  return out;
}

function attachVocabularyEvents() {
  document.querySelectorAll('.vocab-word').forEach(span => {
    span.addEventListener('click', (event) => {
      event.stopPropagation();
      showManualTooltip(event.currentTarget);
    });
  });
}

function buildWordIndex() {
  state.allWordElements = Array.from(document.querySelectorAll('#textContent .word-unit'));
  state.allSentenceElements = Array.from(document.querySelectorAll('#textContent .sentence-span'));
  state.sentenceWordOffsets = [];
  let offset = 0;
  state.allSentenceElements.forEach(sentenceEl => {
    const words = Array.from(sentenceEl.querySelectorAll('.word-unit'));
    state.sentenceWordOffsets.push({
      start: offset,
      count: words.length,
      text: sentenceEl.textContent.replace(/\s+/g, ' ').trim(),
      element: sentenceEl,
    });
    offset += words.length;
  });
}

function renderVocabulary(gradeData) {
  el.vocabularyContent.innerHTML = gradeData.vocabulary.map(item => `
    <div class="vocab-item"><strong>${item.word}</strong><span>${item.definition}</span></div>
  `).join('');
}

function renderQuiz(gradeData) {
  el.quizContent.innerHTML = gradeData.quiz.map((question, index) => `
    <div class="quiz-question" data-index="${index}">
      <p><strong>Question ${index + 1}.</strong> ${question.question}</p>
      <div class="quiz-options">
        ${question.options.map(option => `
          <label class="quiz-option">
            <input type="radio" name="question${index}" value="${escapeHtml(option)}">
            <span>${option}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function resetResultFeedback() {
  el.scoreFeedback.textContent = '';
  el.timestamp.textContent = '';
  el.timestamp.style.display = 'none';

  if (el.scoreButton) el.scoreButton.style.display = 'inline-flex';
  if (el.screenshotButton) el.screenshotButton.style.display = 'none';
}

function clearQuiz() {
  document.querySelectorAll('#quizContent input[type="radio"]').forEach(input => input.checked = false);

  el.scoreFeedback.textContent = '';
  el.timestamp.textContent = '';
  el.timestamp.style.display = 'none';

  el.scoreButton.style.display = 'inline-flex';
  el.screenshotButton.style.display = 'none';
}

function calculateScore() {
  const gradeData = getCurrentGradeData();
  let score = 0;
  let allAnswered = true;

  gradeData.quiz.forEach((question, index) => {
    const selected = document.querySelector(`input[name="question${index}"]:checked`);

    if (!selected) {
      allAnswered = false;
      return;
    }

    if (selected.value === question.answer) {
      score += 1;
    }
  });

  if (!allAnswered) {
    el.scoreFeedback.textContent = 'Please answer all questions to get your score.';
    el.timestamp.textContent = '';
    el.timestamp.style.display = 'none';
    el.screenshotButton.style.display = 'none';
    return;
  }

  const feedbackMap = {
    0: 'Too low. Try again! (Muy bajito, ¡Intenta de nuevo!)',
    1: 'Too low. Try again! (Muy bajito, ¡Intenta de nuevo!)',
    2: 'Getting better. Try again! (Mejorando. ¡Intenta de nuevo!)',
    3: 'Barely made it. Try again! (Pasaste raspadito(a). ¡Intenta de nuevo!)',
    4: 'Good job. (¡Buen trabajo!)',
    5: 'Amazing work! You are the best! (¡Estupendo!)'
  };

  el.scoreFeedback.textContent = `Score: ${score}/5 - ${feedbackMap[score]}`;

  const now = new Date();
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };

  const date = now.toLocaleDateString('en-US', dateOptions);
  const time = now.toLocaleTimeString('en-US', timeOptions);

  el.timestamp.textContent = `Date: ${date} / Time: ${time}`;
  el.timestamp.style.display = 'block';

  // Same behavior as the original project:
  // after a valid score, My Score disappears and Take Screenshot appears.
  el.scoreButton.style.display = 'none';
  el.screenshotButton.style.display = 'inline-flex';
}

function buildPracticeChallenge() {
  const gradeData = getCurrentGradeData();
  const allSentences = gradeData.pages.flatMap(page => page.sentences || []);
  const contentHtml = allSentences.map(item => item.html).join(' ');
  const transformed = contentHtml
    .replace(/<b>(.*?)<\/b>/g, (_, phrase) => `<span class="drop-zone" data-expected="${escapeHtml(phrase)}"></span>`)
    .replace(/<br\s*\/?>/g, ' ');

  state.currentGameTemplate = transformed;
  const shuffled = [...gradeData.practiceWords].sort(() => Math.random() - 0.5);
  el.readingGameContainer.innerHTML = `
    <div class="challenge-reading">${transformed}</div>
    <div class="word-bank" id="wordBank">
      ${shuffled.map((word, idx) => `<div class="word-chip" draggable="true" data-word="${escapeHtml(word)}" data-id="${idx}">${word}</div>`).join('')}
    </div>
  `;
  el.gameScore.textContent = 'Score: 0%';
  setupWordBankInteractions();
}

function setupWordBankInteractions() {
  const wordBank = document.getElementById('wordBank');
  const chips = wordBank.querySelectorAll('.word-chip');
  const zones = el.readingGameContainer.querySelectorAll('.drop-zone');

  chips.forEach(chip => {
    chip.addEventListener('click', () => selectWordChip(chip));
    chip.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', chip.dataset.id);
    });
  });

  zones.forEach(zone => {
    zone.addEventListener('dragover', (event) => event.preventDefault());
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('text/plain');
      const chip = wordBank.querySelector(`.word-chip[data-id="${CSS.escape(id)}"]`);
      if (chip) placeChip(zone, chip);
    });
    zone.addEventListener('click', () => {
      if (state.selectedWordChip) placeChip(zone, state.selectedWordChip);
      else if (zone.dataset.filledId) returnChipToBank(zone);
    });
  });
}

function selectWordChip(chip) {
  document.querySelectorAll('.word-chip.selected').forEach(item => item.classList.remove('selected'));
  chip.classList.add('selected');
  state.selectedWordChip = chip;
}

function placeChip(zone, chip) {
  if (zone.dataset.filledId) returnChipToBank(zone);
  const sourceZone = chip.closest('.drop-zone');
  if (sourceZone) sourceZone.innerHTML = '';
  zone.innerHTML = '';
  zone.appendChild(chip);
  zone.dataset.filledId = chip.dataset.id;
  zone.classList.add('filled');
  chip.classList.remove('selected');
  state.selectedWordChip = null;
}

function returnChipToBank(zone) {
  const chip = zone.querySelector('.word-chip');
  if (!chip) return;
  document.getElementById('wordBank').appendChild(chip);
  zone.innerHTML = '';
  zone.dataset.filledId = '';
  zone.classList.remove('filled', 'correct', 'incorrect');
}

function checkPracticeAnswers() {
  const zones = el.readingGameContainer.querySelectorAll('.drop-zone');
  let correct = 0;
  zones.forEach(zone => {
    zone.classList.remove('correct', 'incorrect');
    const chip = zone.querySelector('.word-chip');
    const expected = normalizeKey(zone.dataset.expected || '');
    const actual = chip ? normalizeKey(chip.dataset.word || '') : '';
    if (chip && expected === actual) {
      correct += 1;
      zone.classList.add('correct');
    } else {
      zone.classList.add('incorrect');
    }
  });
  const total = zones.length || 1;
  const score = Math.round((correct / total) * 100);
  el.gameScore.textContent = `Score: ${score}%`;
}

function loadVoices() {
  const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  el.voiceSelect.innerHTML = voices.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
  const preferred = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.name.includes('Google')) || voices.find(v => v.lang === 'en-US') || voices[0];
  if (preferred) {
    state.selectedVoice = preferred;
    el.voiceSelect.value = preferred.name;
  }
}

function clearTTSFallbackTimer() {
  if (state.ttsFallbackTimer) {
    clearInterval(state.ttsFallbackTimer);
    state.ttsFallbackTimer = null;
  }
}

function startSpeech() {
  if (state.allWordElements.length === 0) buildWordIndex();

  if (state.sentenceWordOffsets.length === 0) {
    console.warn('No sentences to speak');
    return;
  }

  // Chrome can swallow the first utterance when cancel() and speak()
  // happen in the same tick. Keep the short delay that worked reliably
  // in the previous version of the project.
  stopSpeech();
  state.speechCancelled = false;
  state.currentSentenceIdx = -1;
  toggleTTSButtons('speaking');

  setTimeout(() => {
    if (!state.speechCancelled) speakSentence(0);
  }, 120);
}

function speakSentence(index) {
  if (state.speechCancelled || index >= state.sentenceWordOffsets.length) {
    finishSpeech();
    return;
  }

  const info = state.sentenceWordOffsets[index];
  state.currentSentenceIdx = index;

  const utt = new SpeechSynthesisUtterance(info.text);
  utt.rate = state.speechRate;
  utt.pitch = 1.0;
  if (state.selectedVoice) utt.voice = state.selectedVoice;

  let boundaryFired = false;
  let fallbackWordIndex = 0;

  const startFallbackWordSync = () => {
    clearTTSFallbackTimer();

    const approximateWords = Math.max(info.count, 1);
    const estimatedWpm = 210 * state.speechRate;
    const msPerWord = Math.max(110, Math.round(60000 / estimatedWpm));

    highlightSentence(index);
    highlightWord(info.start);

    fallbackWordIndex = 0;

    state.ttsFallbackTimer = setInterval(() => {
      if (
        state.speechCancelled ||
        state.currentSentenceIdx !== index ||
        fallbackWordIndex >= approximateWords - 1
      ) {
        clearTTSFallbackTimer();
        return;
      }

      fallbackWordIndex += 1;
      highlightWord(info.start + fallbackWordIndex);
    }, msPerWord);
  };

  utt.onstart = () => {
    highlightSentence(index);
    highlightWord(info.start);

    // Google Chrome normally provides word boundaries.
    // If a voice/browser does not fire them quickly, use the same
    // visual fallback that the previous working version used.
    setTimeout(() => {
      if (
        !boundaryFired &&
        !state.speechCancelled &&
        state.currentSentenceIdx === index
      ) {
        startFallbackWordSync();
      }
    }, 90);
  };

  utt.onboundary = (event) => {
    if (event.name !== 'word') return;

    if (!boundaryFired) {
      boundaryFired = true;
      clearTTSFallbackTimer();
      el.ttsSyncStatus.hidden = false;
      el.ttsSyncStatus.textContent = 'Word-level sync active';
    }

    const textBefore = info.text.substring(0, event.charIndex);
    const wordIndex = textBefore
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;

    highlightWord(info.start + wordIndex);
  };

  utt.onend = () => {
    clearTTSFallbackTimer();

    setTimeout(() => {
      if (!state.speechCancelled) speakSentence(index + 1);
    }, 180);
  };

  utt.onerror = (event) => {
    clearTTSFallbackTimer();

    // A deliberate speechSynthesis.cancel() produces "canceled".
    // Do not advance to the next sentence in that case.
    if (event.error !== 'canceled' && !state.speechCancelled) {
      setTimeout(() => {
        if (!state.speechCancelled) speakSentence(index + 1);
      }, 180);
    }
  };

  speechSynthesis.speak(utt);
}

function pauseSpeech() {
  if (!speechSynthesis.speaking) return;
  speechSynthesis.pause();
  toggleTTSButtons('paused');
}

function resumeSpeech() {
  speechSynthesis.resume();
  toggleTTSButtons('speaking');
}

function stopSpeech() {
  state.speechCancelled = true;
  state.currentSentenceIdx = -1;
  clearTTSFallbackTimer();
  speechSynthesis.cancel();
  clearHighlights();
  toggleTTSButtons('idle');
}

function finishSpeech() {
  state.currentSentenceIdx = -1;
  clearTTSFallbackTimer();
  clearHighlights();
  toggleTTSButtons('idle');
}

function toggleTTSButtons(mode) {
  el.ttsPlay.hidden = mode !== 'idle';
  el.ttsPause.hidden = mode !== 'speaking';
  el.ttsResume.hidden = mode !== 'paused';
  el.ttsStop.hidden = mode === 'idle';
  if (mode === 'idle') el.ttsSyncStatus.hidden = true;
}

function highlightSentence(index) {
  // Keep the vocabulary tooltip visible for the remainder of the sentence.
  // It is closed only when the reader moves to the next sentence.
  closeAutoTooltip();

  state.allSentenceElements.forEach(sentence => sentence.classList.remove('tts-sentence-active'));
  const target = state.allSentenceElements[index];
  if (target) target.classList.add('tts-sentence-active');
}

function highlightWord(index) {
  state.allWordElements.forEach(word => word.classList.remove('tts-active', 'tts-active-vocab'));
  const target = state.allWordElements[index];
  if (!target) return;

  if (target.classList.contains('vocab-word')) {
    target.classList.add('tts-active-vocab');

    // If another vocabulary word appears in the same sentence,
    // replace the tooltip with the new definition.
    autoShowTooltip(target);
  } else {
    target.classList.add('tts-active');

    // Do NOT close the vocabulary tooltip here.
    // It stays visible until the current sentence finishes.
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearHighlights() {
  state.allSentenceElements.forEach(sentence => sentence.classList.remove('tts-sentence-active'));
  state.allWordElements.forEach(word => word.classList.remove('tts-active', 'tts-active-vocab'));
  closeAutoTooltip();
}

function autoShowTooltip(target) {
  closeAutoTooltip();
  const definition = target.dataset.definition;
  if (!definition) return;
  const tooltip = document.createElement('div');
  tooltip.className = 'vocab-tooltip';
  tooltip.textContent = definition;
  document.body.appendChild(tooltip);
  positionTooltip(tooltip, target);
  state.currentAutoTooltip = tooltip;
}

function closeAutoTooltip() {
  if (state.currentAutoTooltip) {
    state.currentAutoTooltip.remove();
    state.currentAutoTooltip = null;
  }
}

function closeManualTooltips() {
  document.querySelectorAll('.vocab-tooltip.manual').forEach(node => node.remove());
}

function showManualTooltip(target) {
  closeManualTooltips();
  const tooltip = document.createElement('div');
  tooltip.className = 'vocab-tooltip manual';
  tooltip.textContent = target.dataset.definition || target.dataset.phrase || target.textContent;
  document.body.appendChild(tooltip);
  positionTooltip(tooltip, target);
}

function positionTooltip(tooltip, target) {
  const rect = target.getBoundingClientRect();
  const top = rect.top + window.scrollY - tooltip.offsetHeight - 12;
  const left = Math.min(window.innerWidth - tooltip.offsetWidth - 16, Math.max(16, rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2));
  tooltip.style.top = `${Math.max(16, top)}px`;
  tooltip.style.left = `${left}px`;
}

let cameraVideo = null;
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  cameraVideo = document.createElement('video');
  cameraVideo.autoplay = true;
  cameraVideo.playsInline = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    cameraVideo.srcObject = stream;
    el.cameraBox.innerHTML = '';
    el.cameraBox.appendChild(cameraVideo);
  } catch (error) {
    el.cameraBox.innerHTML = '<span>Camera unavailable</span>';
  }
}


function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }

  return currentY;
}

function getFieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}



function drawEvidenceWatermark(ctx, canvas, fullName, dateTimeText) {
  // Two-line stamp (name / date + time), tiled diagonally with enough space
  // between copies so it stays readable. Drawn ON TOP of everything, so it
  // also crosses the photo and the form fields.
  const name = ((fullName || 'Student').trim() || 'Student').toUpperCase();
  const lines = [name, dateTimeText];

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shrink long names so one stamp is never wider than ~520px.
  let size = 26;
  const widest = () => Math.max(...lines.map(t => ctx.measureText(t).width));
  do {
    ctx.font = `bold ${size}px Arial, sans-serif`;
    if (widest() <= 520) break;
    size -= 1;
  } while (size > 16);

  const lineGap = size * 1.25;
  const stepX = widest() + 110;          // real text width + breathing room
  const stepY = lineGap * 2 + 90;
  const reach = Math.hypot(canvas.width, canvas.height);

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-28 * Math.PI / 180);
  ctx.fillStyle = 'rgba(32, 49, 94, 0.13)';

  let row = 0;
  for (let y = -reach; y <= reach; y += stepY, row += 1) {
    const offset = row % 2 ? stepX / 2 : 0;   // brick pattern
    for (let x = -reach - offset; x <= reach; x += stepX) {
      ctx.fillText(lines[0], x, y - lineGap / 2);
      ctx.fillText(lines[1], x, y + lineGap / 2);
    }
  }

  ctx.restore();
}


async function takeScreenshot() {
  const button = el.screenshotButton;

  if (!button) {
    alert('Screenshot button is not available.');
    return;
  }

  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = 'Capturing...';

    const gradeData = getCurrentGradeData();
    const institution = getFieldValue('institutionField');
    const course = getFieldValue('courseField');
    const studentId = getFieldValue('idField');
    const fullName = getFieldValue('nameField');
    const title = gradeData?.title || getFieldValue('evidenceTitleField') || 'Reading';

    const now = new Date();
    const watermarkDateTime =
      `${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} - ${now.toLocaleTimeString('en-US')}`;

    // Build the evidence PNG ourselves instead of trying to photograph the DOM.
    // This avoids html2canvas, browser security restrictions, layout differences,
    // XAMPP issues, and webcam DOM-capture failures.
    const canvas = document.createElement('canvas');
    const width = 1200;
    const padding = 54;
    const contentWidth = width - (padding * 2);

    canvas.width = width;
    canvas.height = 1120;

    const ctx = canvas.getContext('2d', { alpha: false });

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer border
    ctx.strokeStyle = '#1327a8';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b00000';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText(title.toUpperCase(), width / 2, 75);

    // Instructions
    ctx.fillStyle = '#111111';
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText(
      '1. Fill all information out.  2. Take a Screenshot.  3. Send/Show evidence to your teacher.',
      width / 2,
      125
    );

    // Camera image
    const photoX = (width - 230) / 2;
    const photoY = 160;
    const photoSize = 230;

    ctx.fillStyle = '#eef2f8';
    ctx.fillRect(photoX, photoY, photoSize, photoSize);
    ctx.strokeStyle = '#1327a8';
    ctx.lineWidth = 3;
    ctx.strokeRect(photoX, photoY, photoSize, photoSize);

    const cameraBox = document.getElementById('cameraBox');
    const video = cameraBox?.querySelector('video');

    if (
      video &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      // Crop webcam to square, preserving proportions.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const side = Math.min(vw, vh);
      const sx = (vw - side) / 2;
      const sy = (vh - side) / 2;

      ctx.drawImage(
        video,
        sx, sy, side, side,
        photoX, photoY, photoSize, photoSize
      );
    } else {
      ctx.fillStyle = '#59657d';
      ctx.font = '22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Camera unavailable', width / 2, photoY + 122);
    }

    // Form information
    const fields = [
      ['Institution', institution],
      ['Group/Course', course],
      ['ID', studentId],
      ['Full Name', fullName]
    ];

    let y = 445;

    ctx.textAlign = 'left';

    for (const [label, value] of fields) {
      ctx.fillStyle = '#1456bd';
      ctx.font = 'bold 23px Arial, sans-serif';
      ctx.fillText(`* ${label}:`, padding, y);

      y += 18;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#c5c9d4';
      ctx.lineWidth = 2;
      ctx.fillRect(padding, y, contentWidth, 56);
      ctx.strokeRect(padding, y, contentWidth, 56);

      ctx.fillStyle = '#111111';
      ctx.font = '23px Arial, sans-serif';

      const displayValue = value || ' ';
      ctx.fillText(displayValue, padding + 14, y + 36);

      y += 90;
    }

    // Score box
    const scoreText = el.scoreFeedback?.textContent?.trim() || 'Score not calculated';
    const timestampText =
      el.timestamp?.textContent?.trim() ||
      `Date: ${now.toLocaleDateString()} / Time: ${now.toLocaleTimeString()}`;

    ctx.fillStyle = '#efffef';
    ctx.fillRect(padding, y, contentWidth, 80);

    ctx.fillStyle = '#0b6f16';
    ctx.font = 'bold 24px Arial, sans-serif';
    drawWrappedText(ctx, scoreText, padding + 14, y + 32, contentWidth - 28, 30);

    y += 112;

    ctx.fillStyle = '#555555';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText(timestampText, padding, y);

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1428a0';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(
      'English Reading Project • Weekly Readings',
      width / 2,
      canvas.height - 42
    );

    // Watermark last: name + date + time over the whole evidence (photo and fields included).
    drawEvidenceWatermark(ctx, canvas, fullName, watermarkDateTime);

    const dataURL = canvas.toDataURL('image/png');
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const fileName =
      `weekly-reading-week-${state.currentWeek}-grade-${state.currentGradeId}-${safeTitle || 'result'}.png`;

    const isiOS =
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isiOS) {
      const newWindow = window.open('', '_blank');

      if (!newWindow) {
        throw new Error('Popup blocked');
      }

      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Reading Evidence</title>
            <style>
              body {
                margin:0;
                padding:16px;
                background:#f4f7ff;
                text-align:center;
                font-family:Arial,sans-serif;
              }
              img {
                display:block;
                width:100%;
                max-width:900px;
                height:auto;
                margin:0 auto 14px;
              }
            </style>
          </head>
          <body>
            <img src="${dataURL}" alt="Reading evidence">
            <p>Press and hold the image to save it to Photos.</p>
          </body>
        </html>
      `);

      newWindow.document.close();
    } else {
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      link.remove();
    }

  } catch (error) {
    console.error('Evidence image error:', error);
    alert(`Could not create the evidence image: ${error.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText || 'Take Screenshot';
  }
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => speechSynthesis.cancel());
