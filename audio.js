// DOM Elements for Audio
const audioPlayer = document.getElementById('audioPlayer');
const textContent = document.getElementById('textContent');
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

// Function to load reading data for audio
async function loadReadingForAudio() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;

  try {
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) throw new Error(`Failed to fetch reading data: ${readingResponse.status} ${readingResponse.statusText}`);
    const reading = await readingResponse.json();

    if (reading) {
      audioSource.src = reading.audio;
      textContent.innerHTML = reading.text.map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`).join('');
      audioPlayer.load();
      cachedReadingData = reading; // Cache reading data
    }
  } catch (error) {
    console.error('Error loading reading data:', error);
    audioSource.src = '';
    textContent.innerHTML = 'Error loading reading content. Please try again.';
  }
}

// Event listener for audio time updates
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);

// Load reading for audio when the page loads
document.addEventListener('DOMContentLoaded', loadReadingForAudio);