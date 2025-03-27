// audio.js - Updated version on 20250326
// DOM Elements for Audio and Image
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');
let cachedReadingData = null;
let vocabularyData = null; // Store vocabulary data globally

// Function to show vocabulary tooltip
function showVocabularyTooltip(word) {
  if (!vocabularyData) return;
  
  // Find the word in vocabulary (case insensitive)
  const vocabItem = vocabularyData.vocabulary.find(item => 
    item.word.toLowerCase().includes(word.toLowerCase())
  );
  
  if (vocabItem) {
    // Create and show tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'vocab-tooltip';
    tooltip.innerHTML = `<strong>${word}:</strong> ${vocabItem.definition}`;
    
    // Position it near the clicked word
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${event.clientY - 40}px`;
    tooltip.style.left = `${event.clientX}px`;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-tooltip';
    closeBtn.onclick = () => tooltip.remove();
    tooltip.appendChild(closeBtn);
    
    document.body.appendChild(tooltip);
    
    // Close tooltip when clicking outside
    const closeTooltip = (e) => {
      if (!tooltip.contains(e.target)) {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeTooltip);
    }, 100);
  }
}

// Function to make vocabulary words clickable in text
function makeVocabularyClickable() {
  if (!vocabularyData) return;
  
  // Get all text nodes in the reading content
  const walker = document.createTreeWalker(
    textContent,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const words = node.nodeValue.split(/(\s+)/);
    
    // Check each word against vocabulary
    for (let i = 0; i < words.length; i++) {
      const word = words[i].trim().replace(/[.,!?;:"]/g, '');
      if (!word) continue;
      
      const vocabItem = vocabularyData.vocabulary.find(item => 
        item.word.toLowerCase().includes(`<strong>${word.toLowerCase()}</strong>`)
      );
      
      if (vocabItem) {
        // Replace the word with a clickable span
        words[i] = words[i].replace(
          new RegExp(word, 'i'),
          `<span class="vocab-word" data-word="${word}">${word}</span>`
        );
      }
    }
    
    // Replace the node with processed content
    const span = document.createElement('span');
    span.innerHTML = words.join('');
    node.parentNode.replaceChild(span, node);
  }
  
  // Add click handlers to vocabulary words
  document.querySelectorAll('.vocab-word').forEach(word => {
    word.addEventListener('click', (e) => {
      e.stopPropagation();
      showVocabularyTooltip(word.dataset.word);
    });
  });
}

// Function to update text based on audio time
function updateTextForCurrentTime() {
  if (!cachedReadingData) return;

  const currentTime = audioPlayer.currentTime;
  const spans = document.querySelectorAll("#textContent span[data-time]");

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
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    // Load reading for audio
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) throw new Error(`Failed to fetch reading data: ${readingResponse.status} ${readingResponse.statusText}`);
    const reading = await readingResponse.json();
    cachedReadingData = reading; // Cache reading data

    if (reading) {
      audioSource.src = reading.audio;
      textContent.innerHTML = reading.text.map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`).join('');
      audioPlayer.load();

      // Load image
      imageFrame.src = reading.image;

      // Load vocabulary
      const vocabularyResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
      if (!vocabularyResponse.ok) throw new Error(`Failed to fetch vocabulary data: ${vocabularyResponse.status} ${vocabularyResponse.statusText}`);
      vocabularyData = await vocabularyResponse.json();

      if (vocabularyData.vocabulary && Array.isArray(vocabularyData.vocabulary)) {
        vocabularyContent.innerHTML = vocabularyData.vocabulary.map(item => `<div><strong>${item.word}:</strong> ${item.definition}</div>`).join('');
        
        // Make vocabulary words clickable in text
        setTimeout(makeVocabularyClickable, 500); // Delay to allow DOM to update
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

// Reload when week or grade changes
document.getElementById('weekSelect').addEventListener('change', loadReadingForAudio);
document.getElementById('gradeSelect').addEventListener('change', loadReadingForAudio);