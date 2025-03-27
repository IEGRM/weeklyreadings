// DOM Elements for Audio and Image
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');
let cachedReadingData = null;

// Added this for tooltip on 20250326
let vocabularyData = null;

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

async function loadReadingForAudio() {
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    // Load reading for audio
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) throw new Error(`Failed to fetch reading data: ${readingResponse.status} ${readingResponse.statusText}`);
    const reading = await readingResponse.json();
    cachedReadingData = reading;

    if (reading) {
      audioSource.src = reading.audio;
      textContent.innerHTML = reading.text.map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`).join('');
      audioPlayer.load();
      imageFrame.src = reading.image;

      // Load vocabulary
      const vocabularyResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
      if (!vocabularyResponse.ok) throw new Error(`Failed to fetch vocabulary data: ${vocabularyResponse.status} ${vocabularyResponse.statusText}`);
      vocabularyData = await vocabularyResponse.json(); // Store in global variable

      if (vocabularyData.vocabulary && Array.isArray(vocabularyData.vocabulary)) {
        vocabularyContent.innerHTML = vocabularyData.vocabulary.map(item => `<div><strong>${item.word}:</strong> ${item.definition}</div>`).join('');
        
        // THIS IS WHERE IT SHOULD BE ADDED:
        setTimeout(processTextForVocabulary, 100); // Process text after vocabulary loads
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

//This is for the tooltip

// Function to show vocabulary tooltip
function showVocabularyTooltip(word, element) {
  if (!vocabularyData) return;
  
  // Clean the word by removing HTML tags and punctuation
  const cleanWord = word.replace(/<[^>]+>/g, '').replace(/[.,!?;:"]/g, '').toLowerCase();
  
  // Find the word in vocabulary (case insensitive)
  const vocabItem = vocabularyData.vocabulary.find(item => {
    const vocabWord = item.word.replace(/<[^>]+>/g, '').toLowerCase();
    return vocabWord === cleanWord;
  });
  
  if (vocabItem) {
    // Remove any existing tooltips
    document.querySelectorAll('.vocab-tooltip').forEach(t => t.remove());
    
    // Create and show tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'vocab-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${cleanWord}:</strong> ${vocabItem.definition}
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

// Function to process text and make vocabulary words clickable
function processTextForVocabulary() {
  if (!vocabularyData || !textContent) return;
  
  // Get all text content
  let html = textContent.innerHTML;
  
  // Process each vocabulary word
  vocabularyData.vocabulary.forEach(item => {
    const word = item.word.replace(/<[^>]+>/g, ''); // Remove HTML tags
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    html = html.replace(regex, match => {
      return `<span class="vocab-word" data-word="${word}">${match}</span>`;
    });
  });
  
  // Update the content
  textContent.innerHTML = html;
  
  // Add click handlers
  document.querySelectorAll('.vocab-word').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      showVocabularyTooltip(this.dataset.word, this);
    });
  });
}


//end of tooltip





// Event listener for audio time updates
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);

// Load reading for audio, image, and vocabulary when the page loads
document.addEventListener('DOMContentLoaded', loadReadingForAudio);