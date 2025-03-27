// audio.js - Updated and simplified version
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');
let cachedReadingData = null;
let vocabularyData = null;

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

// Rest of your existing functions (updateTextForCurrentTime, loadReadingForAudio) remain the same
// Just add this line at the end of your loadReadingForAudio function, inside the if(vocabularyData) block:
setTimeout(processTextForVocabulary, 100);