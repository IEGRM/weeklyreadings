// audio.js - Final Fixed Version with No Word Duplication
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

    // 5. Build text content - CLEANED version
    if (cachedReadingData && cachedReadingData.text) {
      // First clean any existing HTML artifacts
      const cleanedText = cachedReadingData.text.map(sentence => ({
        time: sentence.time,
        content: sentence.content
          .replace(/<[^>]+>/g, '') // Remove all HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }));

      // Then build the content
      textContent.innerHTML = cleanedText
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
  
  // Find the word in vocabulary (case insensitive)
  const vocabItem = vocabularyData.find(item => 
    item.word.toLowerCase() === word.toLowerCase()
  );
  
  if (vocabItem) {
    // Remove any existing tooltips
    document.querySelectorAll('.vocab-tooltip').forEach(t => t.remove());
    
    // Create and show tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'vocab-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${vocabItem.word}:</strong> ${vocabItem.definition}
        <button class="close-tooltip">×</button>
      </div>
    `;
    
    // Position it near the clicked word
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${rect.top + window.scrollY - 40}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(tooltip);
    
    // Close tooltip when clicking the close button
    tooltip.querySelector('.close-tooltip').addEventListener('click', () => {
      tooltip.remove();
    });
    
    // Close tooltip when clicking outside
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

// Process text to make vocabulary words clickable (FIXED version)
function processTextForVocabulary() {
  if (!vocabularyData || !textContent) return;
  
  // Get all sentence spans
  const sentenceSpans = textContent.querySelectorAll('span[data-time]');
  
  // Process each sentence individually
  sentenceSpans.forEach(span => {
    let originalText = span.textContent;
    let processedHTML = originalText;
    
    // Process each vocabulary word
    vocabularyData.forEach(item => {
      const word = item.word.trim();
      // Match whole words only (case insensitive)
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
      processedHTML = processedHTML.replace(regex, match => {
        return `<span class="vocab-word" data-word="${word}">${match}</span>`;
      });
    });
    
    // Only update if changes were made
    if (processedHTML !== originalText) {
      span.innerHTML = processedHTML;
    }
  });
  
  // Add click handlers to new vocab words
  document.querySelectorAll('.vocab-word').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      showVocabularyTooltip(this.dataset.word, this);
    });
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