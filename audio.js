// audio.js - Complete Version with Duplicate Words Fix
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
  const spans = document.querySelectorAll("#textContent span[data-time]");

  // Remove previous highlights
  spans.forEach(span => span.classList.remove("highlight"));

  // Find and highlight current sentence
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
    // 1. Load reading data
    const readingResponse = await fetch(`data/readings/week${week}_reading.json`);
    if (!readingResponse.ok) throw new Error(`Failed to load reading: ${readingResponse.status}`);
    
    const readingData = await readingResponse.json();
    cachedReadingData = readingData.readings[grade];

    // Clean text data of any artifacts
    if (cachedReadingData?.text) {
      cachedReadingData.text = cachedReadingData.text.map(sentence => ({
        time: sentence.time,
        content: sentence.content.replace(/">/g, '') // Clean artifacts
      }));
    }

    // 2. Load vocabulary data if available
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

    // 3. Update audio source with new path
    audioSource.src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
    audioPlayer.load();

    // 4. Update image with new path
    imageFrame.src = `assets/images/week${week}_image_grade${grade}.jpg`;

    // 5. Build text content
    if (cachedReadingData && cachedReadingData.text) {
      textContent.innerHTML = cachedReadingData.text
        .map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`)
        .join(' ');
    } else {
      textContent.innerHTML = "No reading text available.";
    }

    // 6. Load vocabulary if available
    if (vocabularyData && vocabularyData.length > 0) {
      vocabularyContent.innerHTML = vocabularyData
        .map(item => `<div><strong>${item.word}:</strong> ${item.definition}</div>`)
        .join('');
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

  // Find matching vocabulary item (case insensitive, exact match)
  const vocabItem = vocabularyData.find(item => 
    item.word.toLowerCase() === word.toLowerCase()
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



// Process text to make vocabulary words clickable (without duplication)
// In the processTextForVocabulary() function:
function processTextForVocabulary() {
  if (!vocabularyData || !textContent) return;

  // Get all sentence spans
  const sentenceSpans = textContent.querySelectorAll('span[data-time]');
  
  // Process each sentence individually
  sentenceSpans.forEach(span => {
    const originalHTML = span.innerHTML;
    let processedHTML = originalHTML;

    // Process each vocabulary word
    vocabularyData.forEach(item => {
      const word = item.word.trim();
      // Match the word as standalone or with punctuation
      const regex = new RegExp(`(^|\\s|>)(${escapeRegExp(word)})(?=[\\s.,!?;:]|$|<)`, 'gi');
      processedHTML = processedHTML.replace(regex, (match, p1, p2) => {
        // Skip if already wrapped in a vocab-word span
        if (p1.endsWith('"') || p1.endsWith('=')) return match;
        return `${p1}<span class="vocab-word" data-word="${word}">${p2}</span>`;
      });
    });

    // Only update if changes were made
    if (processedHTML !== originalHTML) {
      span.innerHTML = processedHTML;

      // Add click handlers to new vocab words
      span.querySelectorAll('.vocab-word').forEach(el => {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          showVocabularyTooltip(this.dataset.word, this);
        });
      });
    }
  });
}





// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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