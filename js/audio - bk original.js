// DOM Elements for Audio and Image
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');
let cachedReadingData = null;

// Function to update text based on audio time
function updateTextForCurrentTime() {
  if (!cachedReadingData) return;

  const currentTime = audioPlayer.currentTime;
  const spans = document.querySelectorAll("#textContent span");

  if (spans.length === 0) return;

  // Remove previous highlights
  spans.forEach(span => span.classList.remove("highlight"));

  // Find the correct sentence to highlight
  for (let i = cachedReadingData.text.length - 1; i >= 0; i--) {
    if (currentTime >= cachedReadingData.text[i].time) {
      spans[i].classList.add("highlight");
      break;
    }
  }
}

// Function to load reading data for audio, image, and vocabulary
async function loadReadingForAudio() {
  const week = document.getElementById('weekSelect').value; // Access weekSelect
  const grade = document.getElementById('gradeSelect').value; // Access gradeSelect

  try {
    // Load reading for audio
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) throw new Error(`Failed to fetch reading data: ${readingResponse.status} ${readingResponse.statusText}`);
    const reading = await readingResponse.json();

    if (reading) {
      audioSource.src = reading.audio;
      textContent.innerHTML = reading.text.map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`).join('');
      audioPlayer.load();
      cachedReadingData = reading; // Cache reading data

      // Load image
      imageFrame.src = reading.image;

      // Load vocabulary
      const vocabularyResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
      if (!vocabularyResponse.ok) throw new Error(`Failed to fetch vocabulary data: ${vocabularyResponse.status} ${vocabularyResponse.statusText}`);
      const vocabularyData = await vocabularyResponse.json();

      if (vocabularyData.vocabulary && Array.isArray(vocabularyData.vocabulary)) {
        vocabularyContent.innerHTML = vocabularyData.vocabulary.map(item => `<div><strong>${item.word}:</strong> ${item.definition}</div>`).join('');
      } else {
        vocabularyContent.innerHTML = "No vocabulary data available.";
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

// Event listener for audio time updates
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);

// Load reading for audio, image, and vocabulary when the page loads
document.addEventListener('DOMContentLoaded', loadReadingForAudio);