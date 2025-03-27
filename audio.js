// audio.js - Complete Version
// Handles audio playback, text highlighting, and vocabulary tooltips

// DOM Elements
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');

// Global variables
let cachedReadingData = null;
let vocabularyData = null;

// Highlight text based on audio playback time
function updateTextForCurrentTime() {
  if (!cachedReadingData || !cachedReadingData.text) return;

  const currentTime = audioPlayer.currentTime;
  const spans = document.querySelectorAll("#textContent span");

  // Remove previous highlights
  spans.forEach(span => span.classList.remove("highlight"));

  // Find and highlight current sentence
  for (let i = cachedReadingData.text.length - 1; i >= 0; i--) {
    if (currentTime >= cachedReadingData.text[i].time) {
      spans[i].classList.add("highlight");
      
      // Optional: Auto-scroll to highlighted text
      spans[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
      break;
    }
  }
}

// Load reading content for selected week/grade
async function loadReadingForAudio() {
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    // 1. Load consolidated week data
    const response = await fetch(`data/week${week}.json`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const weekData = await response.json();
    cachedReadingData = weekData.readings[grade];
    vocabularyData = weekData.vocabulary[grade];

    // 2. Update audio source
    audioSource.src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
    audioPlayer.load();

    // 3. Update image
    imageFrame.src = `assets/images/week${week}_image_grade${grade}.jpg`;

    // 4. Build text content with time markers
    if (cachedReadingData && cachedReadingData.text) {
      textContent.innerHTML = cachedReadingData.text
        .map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`)
        .join(' ');
    } else {
      textContent.innerHTML = "No reading text available.";
    }

    // 5. Load vocabulary
    if (vocabularyData && vocabularyData.length > 0) {
      vocabularyContent.innerHTML = vocabularyData
        .map(item => `<div><strong>${item.word}:</strong> ${item.definition}</div>`)
        .join('');
      
      // Process text for vocabulary tooltips after short delay
      setTimeout(processTextForVocabulary, 300);
    } else {
      vocabularyContent.innerHTML = "No vocabulary for this lesson.";
    }

  } catch (error) {
    console.error('Error loading content:', error);
    handleLoadingError();
  }
}

// Handle loading errors
function handleLoadingError() {
  audioSource.src = '';
  textContent.innerHTML = 'Error loading content. Please try again later.';
  imageFrame.src = '';
  vocabularyContent.innerHTML = '';
}

// Vocabulary Tooltip System
function showVocabularyTooltip(word, element) {
  if (!vocabularyData) return;

  // Clean the word (remove HTML tags and punctuation)
  const cleanWord = word.replace(/<[^>]+>/g, '')
                       .replace(/[.,!?;:"]/g, '')
                       .toLowerCase();

  // Find matching vocabulary item
  const vocabItem = vocabularyData.find(item => 
    item.word.replace(/<[^>]+>/g, '').toLowerCase() === cleanWord
  );

  if (!vocabItem) return;

  // Remove existing tooltips
  document.querySelectorAll('.vocab-tooltip').forEach(t => t.remove());

  // Create new tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'vocab-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <strong>${vocabItem.word}:</strong> ${vocabItem.definition}
      <button class="close-tooltip">×</button>
    </div>
  `;

  // Position tooltip near clicked word
  const rect = element.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.top = `${rect.top + window.scrollY - 40}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  
  document.body.appendChild(tooltip);

  // Close button handler
  tooltip.querySelector('.close-tooltip').addEventListener('click', () => {
    tooltip.remove();
  });

  // Close when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeTooltip(e) {
      if (!tooltip.contains(e.target)) {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
      }
    });
  }, 100);
}

// Process text to make vocabulary words clickable
function processTextForVocabulary() {
  if (!vocabularyData || !textContent) return;
  
  let html = textContent.innerHTML;

  // Make each vocabulary word clickable
  vocabularyData.forEach(item => {
    const word = item.word.replace(/<[^>]+>/g, '');
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    html = html.replace(regex, match => 
      `<span class="vocab-word" data-word="${word}">${match}</span>`
    );
  });

  textContent.innerHTML = html;

  // Add click handlers to vocabulary words
  document.querySelectorAll('.vocab-word').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      showVocabularyTooltip(this.dataset.word, this);
    });
  });
}

// Event Listeners
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadReadingForAudio();
  
  // Reload when week/grade changes
  document.getElementById('weekSelect').addEventListener('change', loadReadingForAudio);
  document.getElementById('gradeSelect').addEventListener('change', loadReadingForAudio);
});