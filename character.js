// characters.js
const characterImg = document.getElementById('talking-character');
let mouthAnimationFrame = null;

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

function loadCharacter(characterType) {
  const character = CHARACTER_ASSETS[characterType] || CHARACTER_ASSETS['woman']; // Default to woman
  characterImg.src = character.neutral;
  characterImg.dataset.talking = character.talking;
  
  // Verify images exist
  const img = new Image();
  img.onerror = () => {
    console.warn(`Character images missing for ${characterType}, using default`);
    characterImg.src = CHARACTER_ASSETS.woman.neutral;
    characterImg.dataset.talking = CHARACTER_ASSETS.woman.talking;
  };
  img.src = character.neutral;
}

function setupCharacterAnimation() {
  if (mouthAnimationFrame) {
    cancelAnimationFrame(mouthAnimationFrame);
  }
  
  audioPlayer.addEventListener('play', startMouthAnimation);
  audioPlayer.addEventListener('pause', resetMouthAnimation);
  audioPlayer.addEventListener('ended', resetMouthAnimation);
}

function startMouthAnimation() {
  let isTalking = false;
  const animationInterval = 200; // Adjust speed here
  
  function animate() {
    if (audioPlayer.paused) return;
    
    isTalking = !isTalking;
    characterImg.src = isTalking 
      ? characterImg.dataset.talking 
      : characterImg.src.replace('_talking', '_neutral');
    
    mouthAnimationFrame = setTimeout(() => {
      requestAnimationFrame(animate);
    }, animationInterval);
  }
  animate();
}

function resetMouthAnimation() {
  if (mouthAnimationFrame) {
    clearTimeout(mouthAnimationFrame);
    mouthAnimationFrame = null;
  }
  if (characterImg.src.includes('_talking')) {
    characterImg.src = characterImg.src.replace('_talking', '_neutral');
  }
}

// Make audioPlayer available (shared with audio.js)
let audioPlayer;
function initCharacters(player) {
  audioPlayer = player;
}