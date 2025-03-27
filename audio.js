// DOM Elements for Audio and Image
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');
const characterImg = document.getElementById('talking-character');
let cachedReadingData = null;
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

// Character functions
function loadCharacter(characterType) {
  const characters = {
    'man': {
      neutral: 'assets/characters/man_neutral.png',
      talking: 'assets/characters/man_talking.png'
    },
    'woman': {
      neutral: 'assets/characters/woman_neutral.png',
      talking: 'assets/characters/woman_talking.png'
    }
  };

  const character = characters[characterType] || characters['woman']; // Default to woman
  characterImg.src = character.neutral;
  characterImg.dataset.talking = character.talking;
}

function setupCharacterAnimation() {
  let animationFrame;
  const animationInterval = 200;

  function animate() {
    if (audioPlayer.paused) return;
    
    // Toggle between talking and neutral states
    const isTalking = characterImg.src.includes('_talking');
    characterImg.src = isTalking 
      ? characterImg.src.replace('_talking', '_neutral')
      : characterImg.dataset.talking;
    
    animationFrame = setTimeout(animate, animationInterval);
  }

  audioPlayer.addEventListener('play', () => {
    animate();
  });

  audioPlayer.addEventListener('pause', () => {
    clearTimeout(animationFrame);
    characterImg.src = characterImg.src.replace('_talking', '_neutral');
  });

  audioPlayer.addEventListener('ended', () => {
    clearTimeout(animationFrame);
    characterImg.src = characterImg.src.replace('_talking', '_neutral');
  });
}

async function loadReadingForAudio() {
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    // Load reading data
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) throw new Error(`Failed to fetch reading data`);
    const reading = await readingResponse.json();
    cachedReadingData = reading;

    if (reading) {
      // Set up audio and image
      audioSource.src = reading.audio;
      textContent.innerHTML = reading.text.map(sentence => 
        `<span data-time="${sentence.time}">${sentence.content}</span>`
      ).join('');
      audioPlayer.load();
      imageFrame.src = reading.image;

      // Set up character if specified
      if (reading.character) {
        loadCharacter(reading.character);
        setupCharacterAnimation();
      }

      // Load vocabulary
      const vocabularyResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
      if (!vocabularyResponse.ok) throw new Error(`Failed to fetch vocabulary data`);
      vocabularyData = await vocabularyResponse.json();

      if (vocabularyData.vocabulary?.length) {
        vocabularyContent.innerHTML = vocabularyData.vocabulary.map(item => 
          `<div><strong>${item.word}:</strong> ${item.definition}</div>`
        ).join('');
        setTimeout(processTextForVocabulary, 100);
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

// Vocabulary tooltip functions
function showVocabularyTooltip(word, element) {
  if (!vocabularyData) return;
  
  const cleanWord = word.replace(/<[^>]+>/g, '').replace(/[.,!?;:"]/g, '').toLowerCase();
  
  const vocabItem = vocabularyData.vocabulary.find(item => {
    const vocabWord = item.word.replace(/<[^>]+>/g, '').toLowerCase();
    return vocabWord === cleanWord;
  });
  
  if (vocabItem) {
    document.querySelectorAll('.vocab-tooltip').forEach(t => t.remove());
    
    const tooltip = document.createElement('div');
    tooltip.className = 'vocab-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${cleanWord}:</strong> ${vocabItem.definition}
        <button class="close-tooltip">×</button>
      </div>
    `;
    
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${rect.top + window.scrollY - 40}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(tooltip);
    
    tooltip.querySelector('.close-tooltip').addEventListener('click', () => {
      tooltip.remove();
    });
    
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

function processTextForVocabulary() {
  if (!vocabularyData || !textContent) return;
  
  let html = textContent.innerHTML;
  
  vocabularyData.vocabulary.forEach(item => {
    const word = item.word.replace(/<[^>]+>/g, '');
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    html = html.replace(regex, match => 
      `<span class="vocab-word" data-word="${word}">${match}</span>`
    );
  });
  
  textContent.innerHTML = html;
  
  document.querySelectorAll('.vocab-word').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      showVocabularyTooltip(this.dataset.word, this);
    });
  });
}

// Event listeners
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);
document.addEventListener('DOMContentLoaded', loadReadingForAudio);