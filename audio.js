const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');

let currentReadingData = null;
let vocabularyData = null;

// Crear la manito
const handPointer = document.createElement('img');
handPointer.id = 'handPointer';
handPointer.src = 'assets/images/hand_normal.png';
handPointer.style.position = 'absolute';
handPointer.style.width = '90px'; // tamaño de la foto
handPointer.style.height = '90px'; // tamaño de la foto
handPointer.style.pointerEvents = 'none';
handPointer.style.zIndex = '1000';
handPointer.style.transition = 'all 0.3s ease';
handPointer.style.display = 'none';
document.body.appendChild(handPointer);

let lastHighlightedElement = null;
let isOnVocabulary = false;

document.addEventListener('DOMContentLoaded', function () {
  loadContent();

  document.getElementById('weekSelect').addEventListener('change', loadContent);
  document.getElementById('gradeSelect').addEventListener('change', loadContent);
  audioPlayer.addEventListener('timeupdate', highlightCurrentText);

  audioPlayer.addEventListener('pause', () => {
    handPointer.style.display = 'none';
    handPointer.classList.remove('bouncing');
  });

  audioPlayer.addEventListener('ended', () => {
    handPointer.style.display = 'none';
    handPointer.classList.remove('bouncing');
  });
});

async function loadContent() {
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    await loadReading(week, grade);
    await loadVocabulary(week, grade);
    processVocabularyHighlighting();
  } catch (error) {
    console.error("Error loading content:", error);
  }
}

async function loadReading(week, grade) {
  const response = await fetch(`data/readings/week${week}_reading.json`);
  const data = await response.json();
  currentReadingData = data.readings[grade];

  textContent.innerHTML = currentReadingData.text
    .map(sentence => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sentence.content;
      const words = Array.from(tempDiv.childNodes).map(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.split(/\s+/).map(word => `<span class="word-unit">${word}</span>`).join(' ');
        } else {
          return `<span class="word-unit">${node.outerHTML}</span>`;
        }
      }).join(' ');
      return `<span class="sentence-span" data-time="${sentence.time}">${words}</span>`;
    })
    .join(' ');

  audioSource.src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
  audioPlayer.load();
  audioPlayer.playbackRate = 1.0; // velocidad 100% de la manito
  document.getElementById('imageDisplay').src = `assets/images/week${week}_image_grade${grade}.jpg`;
}

async function loadVocabulary(week, grade) {
  try {
    const response = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
    const data = await response.json();
    vocabularyData = data.vocabulary[grade];

    vocabularyContent.innerHTML = vocabularyData
      .map(item => `<div class="vocab-item"><strong>${item.word}</strong>: ${item.definition}</div>`)
      .join('');
  } catch (error) {
    console.log("No vocabulary file found for this week");
    vocabularyData = null;
  }
}

function processVocabularyHighlighting() {
  if (!vocabularyData) return;

  const vocabMap = {};
  vocabularyData.forEach(item => {
    const cleanWord = item.word.replace(/<[^>]*>/g, '').toLowerCase().trim();
    vocabMap[cleanWord] = item.definition;
  });

  const textSpans = document.querySelectorAll('#textContent .word-unit');
  textSpans.forEach(span => {
    const word = span.textContent.toLowerCase().trim();
    if (vocabMap[word]) {
      span.classList.add('vocab-word', 'highlightable');
      span.setAttribute('data-definition', vocabMap[word]);
      span.addEventListener('click', showTooltip);
    }
  });
}

let lastSentenceIndex = -1;
let lastWordIndex = -1;

function highlightCurrentText() {
  if (!currentReadingData?.text) return;

  const currentTime = audioPlayer.currentTime;
  const sentenceSpans = document.querySelectorAll('#textContent .sentence-span');

  let currentSentenceIndex = -1;
  for (let i = currentReadingData.text.length - 1; i >= 0; i--) {
    if (currentTime >= currentReadingData.text[i].time) {
      currentSentenceIndex = i;
      break;
    }
  }

  if (currentSentenceIndex === -1) return;
  if (currentSentenceIndex !== lastSentenceIndex) {
    lastSentenceIndex = currentSentenceIndex;
    lastWordIndex = -1;
  }

  const sentenceSpan = sentenceSpans[currentSentenceIndex];
  const words = sentenceSpan.querySelectorAll('.word-unit');

  const currentSentence = currentReadingData.text[currentSentenceIndex];
  const nextSentence = currentReadingData.text[currentSentenceIndex + 1];
  const sentenceStartTime = currentSentence.time;
  const sentenceEndTime = nextSentence ? nextSentence.time : audioPlayer.duration;

  const duration = sentenceEndTime - sentenceStartTime;
  const timePerWord = duration / words.length;

  const wordPosition = Math.floor((currentTime - sentenceStartTime) / timePerWord);

  if (wordPosition >= words.length || wordPosition === lastWordIndex) return;

  document.querySelectorAll('.word-unit').forEach(el => el.classList.remove('current-highlight'));
  const currentWord = words[wordPosition];
  currentWord.classList.add('current-highlight');

  const rect = currentWord.getBoundingClientRect();
  const handWidth = handPointer.offsetWidth || 60;
  handPointer.style.left = `${rect.left + rect.width / 2 - handWidth / 2}px`;
  handPointer.style.top = `${rect.bottom + window.scrollY + 5}px`;
  handPointer.style.display = 'block';
  handPointer.classList.add('bouncing');

  if (currentWord.classList.contains('vocab-word')) {
    if (!isOnVocabulary) {
      handPointer.src = 'assets/images/hand_pressing.png';
      handPointer.style.transform = 'scale(1.2) translateY(5px)';
      isOnVocabulary = true;

      currentWord.classList.add('pressed');
      showTooltip({ target: currentWord, stopPropagation: () => {} });

      setTimeout(() => {
        currentWord.classList.remove('pressed');
      }, 400);
    }
  } else {
    if (isOnVocabulary) {
      handPointer.src = 'assets/images/hand_normal.png';
      handPointer.style.transform = 'scale(1) translateY(0)';
      isOnVocabulary = false;
    }
  }

  lastWordIndex = wordPosition;
}

function showTooltip(event) {
  event.stopPropagation();

  const existingTooltip = document.querySelector('.vocab-tooltip.visible');
  if (existingTooltip) existingTooltip.remove();

  const tooltip = document.createElement('div');
  tooltip.className = 'vocab-tooltip';
  document.body.appendChild(tooltip);

  const wordRect = event.target.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;

  tooltip.style.setProperty('--tooltip-x', `${wordRect.left + wordRect.width / 2}px`);
  tooltip.style.setProperty('--tooltip-y', `${wordRect.top + scrollY - 10}px`);
  tooltip.classList.add('position-above');

  tooltip.innerHTML = `
    <div class="tooltip-content">
      ${event.target.getAttribute('data-definition')}
    </div>
    <button class="close-tooltip">×</button>
  `;

  setTimeout(() => tooltip.classList.add('visible'), 10);

  tooltip.querySelector('.close-tooltip').addEventListener('click', () => tooltip.remove());

  document.addEventListener('click', function closeTooltip(e) {
    if (!tooltip.contains(e.target)) {
      tooltip.remove();
      document.removeEventListener('click', closeTooltip);
    }
  });
}
