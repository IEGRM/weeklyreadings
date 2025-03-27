// DOM Elements
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const textContent = document.getElementById('textContent');
const imageFrame = document.getElementById('imageFrame');
const vocabularyContent = document.getElementById('vocabularyContent');
const characterImg = document.getElementById('talking-character');
let cachedReadingData = null;
let vocabularyData = null;
let animationFrame = null;

// Character configuration
const CHARACTER_ASSETS = {
  'man': {
    neutral: 'assets/characters/man_neutral.png',
    talking: 'assets/characters/man_talking.png'
  },
  'woman': {
    neutral: 'assets/characters/woman_neutral.png',
    talking: 'assets/characters/woman_talking.png'
  }
};

// Initialize character
function initCharacter(characterType) {
  const character = CHARACTER_ASSETS[characterType] || CHARACTER_ASSETS['woman'];
  
  // Set initial state
  characterImg.src = character.neutral;
  characterImg.dataset.neutral = character.neutral;
  characterImg.dataset.talking = character.talking;
  
  // Verify images exist
  const imgTest = new Image();
  imgTest.onerror = () => console.error("Character images not found!");
  imgTest.src = character.neutral;
}

// Character animation control
function startCharacterAnimation() {
  let isTalking = false;
  const animationSpeed = 200; // milliseconds between mouth changes
  
  function animate() {
    if (audioPlayer.paused) return;
    
    isTalking = !isTalking;
    characterImg.src = isTalking 
      ? characterImg.dataset.talking 
      : characterImg.dataset.neutral;
    
    animationFrame = setTimeout(animate, animationSpeed);
  }
  
  // Clear any existing animation
  if (animationFrame) clearTimeout(animationFrame);
  animate();
}

function stopCharacterAnimation() {
  if (animationFrame) {
    clearTimeout(animationFrame);
    animationFrame = null;
  }
  characterImg.src = characterImg.dataset.neutral;
}

// Audio event setup
function setupAudioEvents() {
  audioPlayer.addEventListener('play', startCharacterAnimation);
  audioPlayer.addEventListener('pause', stopCharacterAnimation);
  audioPlayer.addEventListener('ended', stopCharacterAnimation);
}

// Modified loadReadingForAudio function
async function loadReadingForAudio() {
  const week = document.getElementById('weekSelect').value;
  const grade = document.getElementById('gradeSelect').value;

  try {
    const response = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!response.ok) throw new Error('Failed to load reading');
    const reading = await response.json();
    cachedReadingData = reading;

    // Set up content
    audioSource.src = reading.audio;
    textContent.innerHTML = reading.text.map(s => `<span data-time="${s.time}">${s.content}</span>`).join('');
    audioPlayer.load();
    imageFrame.src = reading.image;

    // Initialize character if specified
    if (reading.character) {
      initCharacter(reading.character);
      setupAudioEvents();
    }

    // Load vocabulary
    const vocabResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
    vocabularyData = vocabResponse.ok ? await vocabResponse.json() : null;
    
    if (vocabularyData?.vocabulary) {
      vocabularyContent.innerHTML = vocabularyData.vocabulary.map(item => 
        `<div><strong>${item.word}:</strong> ${item.definition}</div>`
      ).join('');
      setTimeout(processTextForVocabulary, 100);
    }

  } catch (error) {
    console.error('Loading error:', error);
    // Error handling...
  }
}

// [Keep all your existing vocabulary tooltip functions...]

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadReadingForAudio();
});