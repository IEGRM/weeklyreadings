// audio.js - Fixed Working Version
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');

let cachedReadingData = null;
let vocabularyData = null;

function updateTextForCurrentTime() {
  if (!cachedReadingData || !cachedReadingData.text) return;

  const currentTime = audioPlayer.currentTime;
  const spans = document.querySelectorAll("#textContent span[data-time]");

  spans.forEach(span => span.classList.remove("highlight"));

  for (let i = cachedReadingData.text.length - 1; i >= 0; i--) {
    if (currentTime >= cachedReadingData.text[i].time) {
      const targetSpan = Array.from(spans).find(span => 
        parseFloat(span.getAttribute('data-time')) === cachedReadingData.text[i].time
      );
      if (targetSpan) {
        targetSpan.classList.add("highlight");
        targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      break;
    }
  }
}

async function loadReadingForAudio() {
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    // Load reading data
    const readingResponse = await fetch(`data/readings/week${week}_reading.json`);
    if (!readingResponse.ok) throw new Error(`Failed to load reading: ${readingResponse.status}`);
    
    const readingData = await readingResponse.json();
    cachedReadingData = readingData.readings[grade];

    // Load vocabulary data
    try {
      const vocabResponse = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
      if (vocabResponse.ok) {
        const vocabData = await vocabResponse.json();
        vocabularyData = vocabData.vocabulary[grade];
      }
    } catch (vocabError) {
      console.log('No vocabulary file found for this week');
      vocabularyData = null;
    }

    // Update media sources
    audioSource.src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
    audioPlayer.load();
    imageFrame.src = `assets/images/week${week}_image_grade${grade}.jpg`;

    // Build text content
    if (cachedReadingData && cachedReadingData.text) {
      textContent.innerHTML = cachedReadingData.text
        .map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`)
        .join(' ');
    } else {
      textContent.innerHTML = "No reading text available.";
    }

    // Load vocabulary
    if (vocabularyData && vocabularyData.length > 0) {
      vocabularyContent.innerHTML = vocabularyData
        .map(item => `<div class="vocab-item"><strong>${item.word}:</strong> ${item.definition}</div>`)
        .join('');
      setTimeout(() => processTextForVocabulary(), 300);
    } else {
      vocabularyContent.innerHTML = "No vocabulary for this lesson.";
    }

  } catch (error) {
    console.error('Error loading content:', error);
    handleLoadingError();
  }
}

function handleLoadingError() {
  audioSource.src = '';
  textContent.innerHTML = 'Error loading content. Please try again later.';
  imageFrame.src = '';
  vocabularyContent.innerHTML = '';
}

// TOOLTIP FUNCTIONS
function showVocabularyTooltip(word, element) {
  if (!vocabularyData) return;
  
  // Clean the word
  const cleanWord = word.replace(/[.,!?;:"]/g, '').toLowerCase();
  
  // Find matching vocabulary item
  const vocabItem = vocabularyData.find(item => 
    item.word.toLowerCase() === cleanWord
  );
  
  if (vocabItem) {
    removeAllTooltips();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'vocab-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${vocabItem.word}:</strong> ${vocabItem.definition}
        <button class="close-tooltip">×</button>
      </div>
    `;
    
    // Position above the word
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(tooltip);
    
    // Close handlers
    tooltip.querySelector('.close-tooltip').addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.remove();
    });
    
    setTimeout(() => {
      document.addEventListener('click', function closeTooltip(e) {
        if (!tooltip.contains(e.target)) {
          tooltip.remove();
          document.removeEventListener('click', closeTooltip);
        }
      });
    }, 100);
  }
}

function removeAllTooltips() {
  document.querySelectorAll('.vocab-tooltip').forEach(t => t.remove());
}

function processTextForVocabulary() {
  if (!vocabularyData || !textContent) return;
  
  const sentenceSpans = textContent.querySelectorAll('span[data-time]');
  
  sentenceSpans.forEach(span => {
    let originalHTML = span.innerHTML;
    let processedHTML = originalHTML;
    
    vocabularyData.forEach(item => {
      const word = item.word.trim();
      const regex = new RegExp(`(^|\\s)(${escapeRegExp(word)})(?=[\\s.,!?;:]|$)`, 'gi');
      processedHTML = processedHTML.replace(regex, (match, p1, p2) => {
        if (p1.includes('vocab-word')) return match;
        return `${p1}<span class="vocab-word" data-word="${word}">${p2}</span>`;
      });
    });
    
    if (processedHTML !== originalHTML) {
      span.innerHTML = processedHTML;
    }
  });
  
  document.querySelectorAll('.vocab-word').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      showVocabularyTooltip(this.dataset.word, this);
    });
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Event Listeners
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);
document.addEventListener('DOMContentLoaded', () => {
  loadReadingForAudio();
  document.getElementById('weekSelect').addEventListener('change', loadReadingForAudio);
  document.getElementById('gradeSelect').addEventListener('change', loadReadingForAudio);
});