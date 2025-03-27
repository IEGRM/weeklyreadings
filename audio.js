// DOM Elements for Audio and Image
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');
let cachedReadingData = null;
let vocabularyData = null;

// Function to update text based on audio time
function updateTextForCurrentTime() {
  if (!cachedReadingData) return;

  const currentTime = audioPlayer.currentTime;
  const spans = document.querySelectorAll("#textContent span");

  if (spans.length === 0) return;

  spans.forEach(span => span.classList.remove("highlight"));

  for (let i = cachedReadingData.text.length - 1; i >= 0; i--) {
    if (currentTime >= cachedReadingData.text[i].time) {
      spans[i].classList.add("highlight");
      break;
    }
  }
}

async function loadReadingForAudio() {
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) throw new Error(`Failed to fetch reading data`);
    const reading = await readingResponse.json();
    cachedReadingData = reading;

    if (reading) {
      audioSource.src = reading.audio;
      textContent.innerHTML = reading.text.map(sentence => 
        `<span data-time="${sentence.time}">${sentence.content}</span>`
      ).join('');
      audioPlayer.load();
      imageFrame.src = reading.image;

      // Initialize character if specified
      if (typeof initCharacter !== 'undefined' && reading.character) {
        initCharacter(reading.character, audioPlayer);
      }

      // Load vocabulary
      const vocabularyResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
      vocabularyData = vocabularyResponse.ok ? await vocabularyResponse.json() : null;
      
      if (vocabularyData?.vocabulary) {
        vocabularyContent.innerHTML = vocabularyData.vocabulary.map(item => 
          `<div><strong>${item.word}:</strong> ${item.definition}</div>`
        ).join('');
        setTimeout(processTextForVocabulary, 100);
      }
    }
  } catch (error) {
    console.error('Error loading reading data:', error);
    audioSource.src = '';
    textContent.innerHTML = 'Error loading reading content. Please try again.';
    imageFrame.src = '';
    vocabularyContent.innerHTML = '';
  }
}

// [Keep all your existing vocabulary tooltip functions...]

// Event listeners
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);
document.addEventListener('DOMContentLoaded', loadReadingForAudio);