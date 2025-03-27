class TalkingCharacter {
  constructor() {
    this.canvas = document.getElementById('talking-character');
    this.ctx = this.canvas.getContext('2d');
    this.audioPlayer = document.getElementById('audioPlayer');
    this.mouthValue = 0;
    this.animationId = null;
    this.characterType = 'woman';
    
    // AI Lip Sync Properties
    this.phonemeMap = {
      'A': 0.8, 'E': 0.6, 'I': 0.7, 'O': 0.9, 'U': 0.8,
      'L': 0.5, 'M': 0.4, 'B': 0.3, 'P': 0.3, 'D': 0.2
    };
    
    this.loadAssets().then(() => {
      this.drawCharacter();
      this.setupSpeechRecognition();
    });
  }

  async loadAssets() {
    this.characterImage = new Image();
    return new Promise((resolve) => {
      this.characterImage.src = `assets/characters/${this.characterType}.png`;
      this.characterImage.onload = resolve;
    });
  }

  setupSpeechRecognition() {
    // Web Speech API Integration
    this.synth = window.speechSynthesis;
    this.utterance = new SpeechSynthesisUtterance();
    
    this.utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const word = this.utterance.text.substring(event.charIndex, event.charIndex + event.charLength);
        this.animatePhonemes(word);
      }
    };

    // Sync with audio player
    this.audioPlayer.addEventListener('play', () => {
      const text = document.getElementById('textContent').textContent;
      this.speak(text);
    });
  }

  speak(text) {
    this.utterance.text = text;
    this.synth.speak(this.utterance);
    this.startLipSync();
  }

  animatePhonemes(word) {
    // AI-powered phoneme detection
    const phonemes = word.toUpperCase().split('');
    phonemes.forEach((char, i) => {
      const intensity = this.phonemeMap[char] || 0.1;
      setTimeout(() => {
        this.mouthValue = intensity;
      }, i * 150); // Adjust timing for natural speech
    });
  }

  startLipSync() {
    cancelAnimationFrame(this.animationId);
    
    const animate = () => {
      this.drawCharacter();
      
      // Natural mouth closing when not speaking
      if (!this.synth.speaking) {
        this.mouthValue = Math.max(0, this.mouthValue - 0.05);
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  drawCharacter() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw character
    this.ctx.drawImage(this.characterImage, 0, 0, this.canvas.width, this.canvas.height);
    
    // AI-powered mouth drawing
    this.drawMouth();
  }

  drawMouth() {
    const mouthHeight = 10 + this.mouthValue * 20;
    const mouthWidth = 30 + this.mouthValue * 10;
    
    this.ctx.fillStyle = '#C45C66';
    this.ctx.beginPath();
    this.ctx.ellipse(
      this.canvas.width / 2,
      this.canvas.height / 2 + 40,
      mouthWidth,
      mouthHeight,
      0, 0, Math.PI
    );
    this.ctx.fill();
    
    // Tongue animation when mouth is very open
    if (this.mouthValue > 0.7) {
      this.ctx.fillStyle = '#FF7F93';
      this.ctx.beginPath();
      this.ctx.ellipse(
        this.canvas.width / 2,
        this.canvas.height / 2 + 45,
        mouthWidth * 0.7,
        mouthHeight * 0.4,
        0, 0, Math.PI
      );
      this.ctx.fill();
    }
  }
}

// Initialize automatically when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  window.AICharacter = new TalkingCharacter();
});