// audio.js - Simplified Version with Bold Formatting Preserved
// Handles audio playback and text highlighting without tooltips

// DOM Elements
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');

// Global variable
let cachedReadingData = null;

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

    // 2. Load vocabulary data if available (without tooltips)
    try {
      const vocabResponse = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
      if (vocabResponse.ok) {
        const vocabData = await vocabResponse.json();
        const gradeVocab = vocabData.vocabulary[grade];
        
        if (gradeVocab && gradeVocab.length > 0) {
          vocabularyContent.innerHTML = gradeVocab
            .map(item => `<div><strong>${item.word}:</strong> ${item.definition}</div>`)
            .join('');
        } else {
          vocabularyContent.innerHTML = "No vocabulary for this lesson.";
        }
      }
    } catch (vocabError) {
      console.log('No vocabulary file found for this week');
      vocabularyContent.innerHTML = '';
    }

    // 3. Update media sources
    audioSource.src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
    audioPlayer.load();
    imageFrame.src = `assets/images/week${week}_image_grade${grade}.jpg`;

    // 4. Build text content - PRESERVE ALL ORIGINAL HTML FORMATTING
    if (cachedReadingData && cachedReadingData.text) {
      textContent.innerHTML = cachedReadingData.text
        .map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`)
        .join(' ');
    } else {
      textContent.innerHTML = "No reading text available.";
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

// Event Listeners
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadReadingForAudio();
  
  // Reload when week/grade changes
  document.getElementById('weekSelect').addEventListener('change', loadReadingForAudio);
  document.getElementById('gradeSelect').addEventListener('change', loadReadingForAudio);
});