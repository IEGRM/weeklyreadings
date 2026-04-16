// audio.js — TTS Version (v2 fixed)
// Uses Web Speech API instead of audio files.
// Sentence-by-sentence with onboundary word-level highlighting.
// Auto-shows tooltip when TTS passes a vocabulary word.

const textContent = document.getElementById('textContent');
const vocabularyContent = document.getElementById('vocabularyContent');

let currentReadingData = null;
let vocabularyData = null;

// ─── TTS State ───
let selectedVoice = null;
let speechRate = 0.85;
let isSpeaking = false;
let isPausedState = false;
let cancelledFlag = false;
let currentSentenceIdx = -1;
let sentenceWordOffsets = [];
let allWordElements = [];
let allSentenceElements = [];

// ─── DOM refs (grabbed later after DOM ready) ───
let ttsPlay, ttsPause, ttsResume, ttsStop, voiceSelect, ttsSpeedRange, ttsSpeedLabel, ttsSyncStatus;
let manualTooltipWordEl = null;
let manualTooltipSuppressUntil = 0;
let animatedScrollFrame = null;

// ═══════════════════════════════════════════════
// VOICE LOADING
// ═══════════════════════════════════════════════
function loadVoices() {
  const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  if (!voiceSelect) return;
  voiceSelect.innerHTML = '';
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = v.name;
    voiceSelect.appendChild(opt);
  });
  const preferred = voices.find(v => v.name.includes('Google US English'))
    || voices.find(v => v.name.includes('Google'))
    || voices.find(v => v.lang === 'en-US')
    || voices[0];
  if (preferred) {
    selectedVoice = preferred;
    voiceSelect.value = preferred.name;
  }
}

// ═══════════════════════════════════════════════
// CONTENT LOADING
// ═══════════════════════════════════════════════
async function loadContent() {
  stopSpeech();

  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  // Safety: if script.js hasn't populated dropdowns yet, skip
  if (!week || !grade) return;

  try {
    await loadReading(week, grade);
    await loadVocabulary(week, grade);
    processVocabularyHighlighting();
    buildWordIndex();
  } catch (error) {
    console.error("Error loading content:", error);
  }
}

async function loadReading(week, grade) {
  const response = await fetch(`data/readings/week${week}_reading.json`);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data = await response.json();
  currentReadingData = data.readings[grade];

  if (!currentReadingData || !currentReadingData.text) {
    textContent.innerHTML = '<p>No reading data available for this grade.</p>';
    return;
  }

  // Render text with word spans and sentence spans
  textContent.innerHTML = currentReadingData.text
    .map(function(sentence, sIdx) {
      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = sentence.content;
      var words = Array.from(tempDiv.childNodes).map(function(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.split(/\s+/)
            .filter(function(w) { return w.length > 0; })
            .map(function(word) { return '<span class="word-unit">' + word + '</span>'; })
            .join(' ');
        } else {
          return '<span class="word-unit">' + node.outerHTML + '</span>';
        }
      }).join(' ');
      return '<span class="sentence-span" data-sentence-idx="' + sIdx + '">' + words + '</span>';
    })
    .join(' ');

  // Load image
  var imgEl = document.getElementById('imageDisplay');
  if (imgEl) {
    imgEl.src = 'assets/images/week' + week + '_image_grade' + grade + '.jpg';
  }
}

async function loadVocabulary(week, grade) {
  try {
    var response = await fetch('data/vocabulary/week' + week + '_vocabulary.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    var data = await response.json();
    vocabularyData = data.vocabulary[grade];

    if (vocabularyData) {
      vocabularyContent.innerHTML = vocabularyData
        .map(function(item) { return '<div class="vocab-item"><strong>' + item.word + '</strong>: ' + item.definition + '</div>'; })
        .join('');
    }
  } catch (error) {
    console.log("No vocabulary file found for this week");
    vocabularyData = null;
  }
}

function processVocabularyHighlighting() {
  if (!vocabularyData) return;

  var vocabMap = {};
  vocabularyData.forEach(function(item) {
    var cleanWord = item.word.replace(/<[^>]*>/g, '').toLowerCase().trim();
    vocabMap[cleanWord] = item.definition;
  });

  var textSpans = document.querySelectorAll('#textContent .word-unit');
  textSpans.forEach(function(span) {
    var word = span.textContent.toLowerCase().trim();
    if (vocabMap[word]) {
      span.classList.add('vocab-word', 'highlightable');
      span.setAttribute('data-definition', vocabMap[word]);
      span.setAttribute('tabindex', '0');
      span.addEventListener('mousedown', handleVocabPointerDown);
      span.addEventListener('pointerdown', handleVocabPointerDown);
      span.addEventListener('click', showTooltip);
    }
  });
}

function handleVocabPointerDown(event) {
  event.preventDefault();
}

function getSpokenTokensFromWord(word) {
  return String(word || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(function(token) { return token.length > 0; });
}

function buildWordIndex() {
  sentenceWordOffsets = [];
  allWordElements = Array.from(document.querySelectorAll('#textContent .word-unit'));
  allSentenceElements = Array.from(document.querySelectorAll('#textContent .sentence-span'));

  var offset = 0;
  allSentenceElements.forEach(function(sentEl) {
    var wordsInSentence = Array.from(sentEl.querySelectorAll('.word-unit'));
    var visibleText = wordsInSentence.map(function(w) { return w.textContent; }).join(' ');
    var speechParts = [];
    var speechWordMap = [];

    wordsInSentence.forEach(function(wordEl, localIdx) {
      var globalIdx = offset + localIdx;
      var spokenTokens = getSpokenTokensFromWord(wordEl.textContent);

      if (spokenTokens.length === 0) {
        spokenTokens = [wordEl.textContent];
      }

      spokenTokens.forEach(function(token) {
        speechParts.push(token);
        speechWordMap.push(globalIdx);
      });
    });

    sentenceWordOffsets.push({
      start: offset,
      count: wordsInSentence.length,
      text: visibleText,
      speechText: speechParts.join(' '),
      speechWordMap: speechWordMap,
      speechCount: speechWordMap.length,
      element: sentEl
    });
    offset += wordsInSentence.length;
  });
}

// ═══════════════════════════════════════════════
// TTS SPEAKING — SENTENCE BY SENTENCE
// ═══════════════════════════════════════════════
function speakSentence(sentIdx) {
  if (cancelledFlag || sentIdx >= sentenceWordOffsets.length) {
    finishSpeech();
    return;
  }

  var info = sentenceWordOffsets[sentIdx];
  currentSentenceIdx = sentIdx;

  var utt = new SpeechSynthesisUtterance(info.speechText || info.text);
  if (selectedVoice) utt.voice = selectedVoice;
  utt.rate = speechRate;
  utt.pitch = 1.0;

  var boundaryFired = false;
  var fallbackTimer = null;
  var fallbackWordIndex = 0;

  function clearFallbackTimer() {
    if (fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function startFallbackWordSync() {
    clearFallbackTimer();

    var approxWords = Math.max(info.speechCount || info.count, 1);
    var estimatedWpm = 210 * speechRate;
    var msPerWord = Math.max(110, Math.round((60000 / estimatedWpm)));

    highlightSentence(sentIdx);
    highlightWord(info.speechWordMap && info.speechWordMap.length ? info.speechWordMap[0] : info.start);

    fallbackWordIndex = 0;
    updateSyncStatus('sentence');

    fallbackTimer = setInterval(function() {
      fallbackWordIndex++;
      if (fallbackWordIndex >= approxWords) {
        clearFallbackTimer();
        return;
      }
      var fallbackGlobalIdx = info.speechWordMap && info.speechWordMap.length
        ? info.speechWordMap[Math.min(fallbackWordIndex, info.speechWordMap.length - 1)]
        : (info.start + fallbackWordIndex);
      highlightWord(fallbackGlobalIdx);
    }, msPerWord);
  }

  utt.onstart = function() {
    highlightSentence(sentIdx);
    highlightWord(info.speechWordMap && info.speechWordMap.length ? info.speechWordMap[0] : info.start);

    // if onboundary does not arrive quickly, use fallback
    setTimeout(function() {
      if (!boundaryFired && !cancelledFlag && currentSentenceIdx === sentIdx) {
        startFallbackWordSync();
      }
    }, 80);
  };

  utt.onboundary = function(e) {
    if (e.name === 'word') {
      if (!boundaryFired) {
        boundaryFired = true;
        clearFallbackTimer();
        updateSyncStatus('word');
      }

      var speechText = info.speechText || info.text;
      var textBefore = speechText.substring(0, e.charIndex);
      var spokenWordIdx = textBefore.split(/\s+/).filter(function(w) { return w.length > 0; }).length;
      var globalIdx = info.speechWordMap && info.speechWordMap.length
        ? info.speechWordMap[Math.min(spokenWordIdx, info.speechWordMap.length - 1)]
        : (info.start + spokenWordIdx);
      highlightWord(globalIdx);
    }
  };

  utt.onend = function() {
    clearFallbackTimer();
    setTimeout(function() {
      if (!cancelledFlag) speakSentence(sentIdx + 1);
    }, 180);
  };

  utt.onerror = function(e) {
    clearFallbackTimer();
    if (e.error !== 'canceled') {
      setTimeout(function() {
        if (!cancelledFlag) speakSentence(sentIdx + 1);
      }, 180);
    }
  };

  speechSynthesis.speak(utt);
}

// ═══════════════════════════════════════════════
// HIGHLIGHTING
// ═══════════════════════════════════════════════
function highlightSentence(sentIdx) {
  allSentenceElements.forEach(function(el) { el.classList.remove('tts-sentence-active'); });
  if (allSentenceElements[sentIdx]) {
    allSentenceElements[sentIdx].classList.add('tts-sentence-active');
  }
}

function highlightWord(globalIdx) {
  if (globalIdx < 0 || globalIdx >= allWordElements.length) return;

  allWordElements.forEach(function(el) {
    el.classList.remove('tts-active', 'tts-active-vocab');
  });

  var el = allWordElements[globalIdx];

  if (el.classList.contains('vocab-word')) {
    el.classList.add('tts-active-vocab');
  } else {
    el.classList.add('tts-active');
  }

  // Keep vocabulary tooltips manual only.
  closeAutoTooltip();

  // Only scroll when the active word is leaving the comfortable reading area.
  ensureWordVisible(el);
}

function ensureWordVisible(el) {
  if (!el) return;

  var rect = el.getBoundingClientRect();
  var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  var topMargin = Math.min(170, viewportHeight * 0.24);
  var bottomMargin = Math.min(210, viewportHeight * 0.30);
  var readingZoneTop = topMargin;
  var readingZoneBottom = viewportHeight - bottomMargin;

  if (rect.top >= readingZoneTop && rect.bottom <= readingZoneBottom) return;

  var targetTop = window.scrollY + rect.top - (viewportHeight * 0.38);
  targetTop = Math.max(0, Math.round(targetTop));

  var now = Date.now();
  if (lastAutoScrollTop !== null && Math.abs(targetTop - lastAutoScrollTop) < 60 && (now - lastAutoScrollTime) < 900) {
    return;
  }

  lastAutoScrollTop = targetTop;
  lastAutoScrollTime = now;
  smoothScrollToY(targetTop, 380);
}

function smoothScrollToY(targetTop, duration) {
  if (animatedScrollFrame) {
    cancelAnimationFrame(animatedScrollFrame);
    animatedScrollFrame = null;
  }

  var startTop = window.scrollY || window.pageYOffset || 0;
  var distance = targetTop - startTop;
  if (Math.abs(distance) < 8) {
    window.scrollTo(0, targetTop);
    return;
  }

  var startTime = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(now) {
    var elapsed = now - startTime;
    var progress = Math.min(1, elapsed / duration);
    var eased = easeInOutCubic(progress);
    window.scrollTo(0, Math.round(startTop + (distance * eased)));

    if (progress < 1) {
      animatedScrollFrame = requestAnimationFrame(step);
    } else {
      animatedScrollFrame = null;
    }
  }

  animatedScrollFrame = requestAnimationFrame(step);
}

function clearHighlights() {
  allWordElements.forEach(function(el) {
    el.classList.remove('tts-active', 'tts-active-vocab');
  });
  allSentenceElements.forEach(function(el) {
    el.classList.remove('tts-sentence-active');
  });
  closeAutoTooltip();
  if (animatedScrollFrame) {
    cancelAnimationFrame(animatedScrollFrame);
    animatedScrollFrame = null;
  }
  manualTooltipWordEl = null;
  lastAutoScrollTop = null;
  lastAutoScrollTime = 0;
}

// ═══════════════════════════════════════════════
// AUTO TOOLTIP FOR VOCAB WORDS DURING TTS
// (replaces the hand pointer behavior)
// ═══════════════════════════════════════════════
var currentAutoTooltip = null;
var lastAutoScrollTop = null;
var lastAutoScrollTime = 0;

function autoShowVocabTooltip(wordEl) {
  closeAutoTooltip();

  var definition = wordEl.getAttribute('data-definition');
  if (!definition) return;

  var tooltip = document.createElement('div');
  tooltip.className = 'vocab-tooltip auto-vocab-tooltip';
  document.body.appendChild(tooltip);

  var wordRect = wordEl.getBoundingClientRect();
  var scrollY = window.scrollY || window.pageYOffset;

  tooltip.style.setProperty('--tooltip-x', (wordRect.left + wordRect.width / 2) + 'px');
  tooltip.style.setProperty('--tooltip-y', (wordRect.top + scrollY - 10) + 'px');
  tooltip.classList.add('position-above');

  tooltip.innerHTML = '<div class="tooltip-content">' + definition + '</div>';

  setTimeout(function() { tooltip.classList.add('visible'); }, 10);

  currentAutoTooltip = tooltip;
}

function closeAutoTooltip() {
  if (currentAutoTooltip) {
    currentAutoTooltip.remove();
    currentAutoTooltip = null;
  }
}

// ═══════════════════════════════════════════════
// TTS CONTROLS
// ═══════════════════════════════════════════════
function startSpeech() {
  if (allWordElements.length === 0) buildWordIndex();
  if (sentenceWordOffsets.length === 0) {
    console.warn('No sentences to speak');
    return;
  }

  stopSpeech();
  cancelledFlag = false;
  isSpeaking = true;
  isPausedState = false;

  ttsPlay.style.display = 'none';
  ttsPause.style.display = 'inline-block';
  ttsResume.style.display = 'none';
  ttsStop.style.display = 'inline-block';
  updateSyncStatus('starting');

  setTimeout(function() {
    if (!cancelledFlag) speakSentence(0);
  }, 100);
}

function pauseSpeech() {
  speechSynthesis.pause();
  isPausedState = true;
  ttsPause.style.display = 'none';
  ttsResume.style.display = 'inline-block';
}

function resumeSpeech() {
  speechSynthesis.resume();
  isPausedState = false;
  ttsPause.style.display = 'inline-block';
  ttsResume.style.display = 'none';
}

function stopSpeech() {
  cancelledFlag = true;
  speechSynthesis.cancel();
  isSpeaking = false;
  isPausedState = false;
  currentSentenceIdx = -1;

  if (ttsPlay) ttsPlay.style.display = 'inline-block';
  if (ttsPause) ttsPause.style.display = 'none';
  if (ttsResume) ttsResume.style.display = 'none';
  if (ttsStop) ttsStop.style.display = 'none';
  if (ttsSyncStatus) ttsSyncStatus.style.display = 'none';

  clearHighlights();
}

function finishSpeech() {
  isSpeaking = false;
  isPausedState = false;
  currentSentenceIdx = -1;

  if (ttsPlay) ttsPlay.style.display = 'inline-block';
  if (ttsPause) ttsPause.style.display = 'none';
  if (ttsResume) ttsResume.style.display = 'none';
  if (ttsStop) ttsStop.style.display = 'none';
  if (ttsSyncStatus) ttsSyncStatus.style.display = 'none';

  clearHighlights();
}

function updateSyncStatus(mode) {
  if (!ttsSyncStatus) return;

  if (mode === 'word') {
    ttsSyncStatus.style.display = 'inline-flex';
    ttsSyncStatus.innerHTML = '<span class="sync-dot sync-dot-green"></span> Word-level sync active';
    ttsSyncStatus.className = 'sync-status sync-green';
  } else {
    ttsSyncStatus.style.display = 'none';
    ttsSyncStatus.innerHTML = '';
    ttsSyncStatus.className = '';
  }
}

// ═══════════════════════════════════════════════
// MANUAL TOOLTIP (click on vocab word)
// ═══════════════════════════════════════════════
function showTooltip(event) {
  event.preventDefault();
  event.stopPropagation();
  closeAutoTooltip();

  var now = Date.now();
  if (now < manualTooltipSuppressUntil) return;

  var wordEl = event.currentTarget || event.target.closest('.vocab-word');
  if (!wordEl) return;

  var definition = wordEl.getAttribute('data-definition');
  if (!definition) return;

  var existing = document.querySelector('.vocab-tooltip.manual-tooltip');
  if (existing) {
    if (manualTooltipWordEl === wordEl) {
      existing.remove();
      manualTooltipWordEl = null;
      manualTooltipSuppressUntil = Date.now() + 180;
      return;
    }
    existing.remove();
    manualTooltipWordEl = null;
  }

  var tooltip = document.createElement('div');
  tooltip.className = 'vocab-tooltip manual-tooltip visible';
  document.body.appendChild(tooltip);
  manualTooltipWordEl = wordEl;

  var wordRect = wordEl.getBoundingClientRect();
  var scrollY = window.scrollY || window.pageYOffset;

  tooltip.style.setProperty('--tooltip-x', (wordRect.left + wordRect.width / 2) + 'px');
  tooltip.style.setProperty('--tooltip-y', (wordRect.top + scrollY - 10) + 'px');
  tooltip.classList.add('position-above');

  tooltip.innerHTML =
    '<div class="tooltip-content">' + definition + '</div>' +
    '<button class="close-tooltip" type="button" aria-label="Close tooltip">&times;</button>';

  tooltip.querySelector('.close-tooltip').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    tooltip.remove();
    manualTooltipWordEl = null;
    manualTooltipSuppressUntil = Date.now() + 180;
  });

  setTimeout(function() {
    document.addEventListener('click', function closeTooltip(e) {
      if (!tooltip.contains(e.target) && e.target !== wordEl) {
        tooltip.remove();
        manualTooltipWordEl = null;
        document.removeEventListener('click', closeTooltip);
      }
    });
  }, 0);
}

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  // Grab DOM refs
  ttsPlay = document.getElementById('ttsPlay');
  ttsPause = document.getElementById('ttsPause');
  ttsResume = document.getElementById('ttsResume');
  ttsStop = document.getElementById('ttsStop');
  voiceSelect = document.getElementById('voiceSelect');
  ttsSpeedRange = document.getElementById('ttsSpeedRange');
  ttsSpeedLabel = document.getElementById('ttsSpeedLabel');
  ttsSyncStatus = document.getElementById('ttsSyncStatus');

  // Load voices
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;

  // TTS button listeners
  if (ttsPlay) ttsPlay.addEventListener('click', startSpeech);
  if (ttsPause) ttsPause.addEventListener('click', pauseSpeech);
  if (ttsResume) ttsResume.addEventListener('click', resumeSpeech);
  if (ttsStop) ttsStop.addEventListener('click', stopSpeech);

  // Voice selector
  if (voiceSelect) {
    voiceSelect.addEventListener('change', function() {
      var voices = speechSynthesis.getVoices().filter(function(v) { return v.lang.startsWith('en'); });
      selectedVoice = voices.find(function(v) { return v.name === voiceSelect.value; }) || selectedVoice;
    });
  }

  // Speed slider
  if (ttsSpeedRange) {
    ttsSpeedRange.addEventListener('input', function() {
      speechRate = parseFloat(ttsSpeedRange.value);
      if (ttsSpeedLabel) ttsSpeedLabel.textContent = speechRate.toFixed(2) + 'x';
    });
  }

  // Week/grade change listeners (audio.js side)
  document.getElementById('weekSelect').addEventListener('change', loadContent);
  document.getElementById('gradeSelect').addEventListener('change', loadContent);

  // IMPORTANT: Delay initial load so script.js can populate the week dropdown first.
  // script.js loads AFTER audio.js and fills weekSelect with options.
  setTimeout(function() {
    loadContent();
  }, 400);
});

// Stop speech when leaving the page
window.addEventListener('beforeunload', function() {
  speechSynthesis.cancel();
});

// Compatibility alias — script.js calls loadReadingForAudio() on week/grade change
window.loadReadingForAudio = loadContent;
