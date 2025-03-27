// characters.js
const characterImg = document.getElementById('talking-character');
let animationFrame = null;

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

function initCharacter(characterType, audioPlayer) {
  const character = CHARACTER_ASSETS[characterType] || CHARACTER_ASSETS['woman'];
  
  // Preload images
  const neutralImg = new Image();
  const talkingImg = new Image();
  
  neutralImg.src = character.neutral;
  talkingImg.src = character.talking;
  
  neutralImg.onload = () => {
    characterImg.src = character.neutral;
    characterImg.dataset.talking = character.talking;
    characterImg.style.display = 'block';
    setupCharacterAnimation(audioPlayer);
  };
  
  neutralImg.onerror = () => {
    console.error('Failed to load character images');
    characterImg.style.display = 'none';
  };
}

function setupCharacterAnimation(audioPlayer) {
  // Clear any existing listeners
  audioPlayer.removeEventListener('play', startAnimation);
  audioPlayer.removeEventListener('pause', resetAnimation);
  audioPlayer.removeEventListener('ended', resetAnimation);
  
  // Add new listeners
  audioPlayer.addEventListener('play', startAnimation);
  audioPlayer.addEventListener('pause', resetAnimation);
  audioPlayer.addEventListener('ended', resetAnimation);
}

function startAnimation() {
  let isTalking = false;
  const animationSpeed = 200; // milliseconds between mouth changes
  
  function animate() {
    if (characterImg.style.display === 'none') return;
    
    isTalking = !isTalking;
    characterImg.src = isTalking 
      ? characterImg.dataset.talking 
      : characterImg.src.replace('_talking', '_neutral');
    
    animationFrame = setTimeout(animate, animationSpeed);
  }
  
  // Clear any existing animation
  if (animationFrame) clearTimeout(animationFrame);
  animate();
}

function resetAnimation() {
  if (animationFrame) {
    clearTimeout(animationFrame);
    animationFrame = null;
  }
  if (characterImg.src.includes('_talking')) {
    characterImg.src = characterImg.src.replace('_talking', '_neutral');
  }
}