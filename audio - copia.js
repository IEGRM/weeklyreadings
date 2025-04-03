// audio.js - Complete solution with audio sync highlighting AND tooltips
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');

let currentReadingData = null;
let vocabularyData = null;

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  loadContent();
  
  // Set up event listeners
  document.getElementById('weekSelect').addEventListener('change', loadContent);
  document.getElementById('gradeSelect').addEventListener('change', loadContent);
  audioPlayer.addEventListener('timeupdate', highlightCurrentText);
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
  
  // Build the text content with time markers
  textContent.innerHTML = currentReadingData.text
    .map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`)
    .join(' ');
  
  // Set up audio and image
  audioSource.src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
  audioPlayer.load();
  imageFrame.src = `assets/images/week${week}_image_grade${grade}.jpg`;
}

async function loadVocabulary(week, grade) {
  try {
    const response = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
    const data = await response.json();
    vocabularyData = data.vocabulary[grade];
    
    // Display vocabulary list
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

  // Create a map of vocabulary words and their definitions
  const vocabMap = {};
  vocabularyData.forEach(item => {
    // Extract text content from HTML tags and clean
    const cleanWord = item.word.replace(/<[^>]*>/g, '')
                              .toLowerCase()
                              .trim();
    vocabMap[cleanWord] = item.definition;
  });

  // Process each text span
  const textSpans = document.querySelectorAll('#textContent span[data-time]');
  textSpans.forEach(span => {
    const originalHTML = span.innerHTML;
    let highlightedHTML = originalHTML;
    
    // Match whole words only (case insensitive)
    const wordRegex = /\b(\w+)\b/g;
    
    highlightedHTML = highlightedHTML.replace(wordRegex, (matchedWord) => {
      const lowerWord = matchedWord.toLowerCase();
      if (vocabMap[lowerWord]) {
        return `<span class="vocab-word highlightable" 
                 data-definition="${vocabMap[lowerWord]}">${matchedWord}</span>`;
      }
      return matchedWord;
    });

    span.innerHTML = highlightedHTML;
  });

  // Add click handlers for tooltips
  document.querySelectorAll('.vocab-word').forEach(word => {
    word.addEventListener('click', showTooltip);
  });
}



function highlightCurrentText() {
  if (!currentReadingData?.text) return;
  
  const currentTime = audioPlayer.currentTime;
  const textSpans = document.querySelectorAll('#textContent span[data-time]');
  
  // Remove highlight from all spans
  textSpans.forEach(span => span.classList.remove('current-highlight'));
  
  // Find and highlight the current span
  for (let i = currentReadingData.text.length - 1; i >= 0; i--) {
    if (currentTime >= currentReadingData.text[i].time) {
      const currentSpan = Array.from(textSpans).find(
        span => parseFloat(span.getAttribute('data-time')) === currentReadingData.text[i].time
      );
      
      if (currentSpan) {
        currentSpan.classList.add('current-highlight');
        currentSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      break;
    }
  }
}

// Add this to your existing showTooltip function
function showTooltip(event) {
  event.stopPropagation();
  
  // Remove any existing tooltips
  const existingTooltip = document.querySelector('.vocab-tooltip.visible');
  if (existingTooltip) existingTooltip.remove();
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'vocab-tooltip';
  document.body.appendChild(tooltip);
  
  // Position tooltip
  const wordRect = event.target.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  
  // Set CSS variables for positioning
  tooltip.style.setProperty('--tooltip-x', `${wordRect.left + wordRect.width/2}px`);
  tooltip.style.setProperty('--tooltip-y', `${wordRect.bottom + scrollY + 5}px`);
  
  // Smart positioning
  if (wordRect.bottom > window.innerHeight - 150) {
    tooltip.classList.add('position-above');
  } else {
    tooltip.classList.add('position-below');
  }
  
  tooltip.innerHTML = `
    <div class="tooltip-content">
      ${event.target.getAttribute('data-definition')}
    </div>
    <button class="close-tooltip">×</button>
  `;
  
  // Show tooltip
  setTimeout(() => tooltip.classList.add('visible'), 10);
  
  // Close handlers (keep your existing implementation)
  tooltip.querySelector('.close-tooltip').addEventListener('click', () => {
    tooltip.remove();
  });
  
  document.addEventListener('click', function closeTooltip(e) {
    if (!tooltip.contains(e.target)) {
      tooltip.remove();
      document.removeEventListener('click', closeTooltip);
    }
  });
}