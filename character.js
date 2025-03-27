class TalkingCharacter {
  constructor() {
    this.canvas = document.getElementById('talking-character');
    this.ctx = this.canvas.getContext('2d');
    this.audioPlayer = document.getElementById('audioPlayer');
    this.isSpeaking = false;
    this.mouthValue = 0;
    this.characterType = 'woman'; // Default
    this.characterImages = {
      woman: { neutral: 'assets/characters/woman.png' },
      man: { neutral: 'assets/characters/man.png' }
    };
    this.currentImage = new Image();
    this.animationFrame = null;
    this.speech = new SpeechSynthesisUtterance();
    this.speech.lang = 'en-US';
    this.speech.onboundary = (e) => this.handleSpeechEvent(e);
  }

  async init(characterType) {
    this.characterType = characterType || 'woman';
    await this.loadCharacter();
    this.setupEventListeners();
  }

  async loadCharacter() {
    return new Promise((resolve) => {
      this.currentImage.src = this.characterImages[this.characterType].neutral;
      this.currentImage.onload = () => {
        this.drawCharacter();
        resolve();
      };
    });
  }

  drawCharacter(mouthOpenness = 0) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw base character
    this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
    
    // Animate mouth (simplified example)
    if (mouthOpenness > 0) {
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.ellipse(
        this.canvas.width/2, 
        this.canvas.height/2 + 30, 
        20, 
        5 + (10 * mouthOpenness), 
        0, 0, Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  speakText(text) {
    if (window.speechSynthesis) {
      this.speech.text = text;
      window.speechSynthesis.speak(this.speech);
      this.animateSpeaking();
    }
  }

  handleSpeechEvent(event) {
    if (event.name === 'word') {
      const word = this.speech.text.substring(event.charIndex, 
                event.charIndex + event.charLength);
      this.highlightWord(word);
    }
  }

  animateSpeaking() {
    this.isSpeaking = true;
    const animate = () => {
      if (!this.isSpeaking) return;
      
      // Simple mouth animation
      this.mouthValue = Math.sin(Date.now() / 200) * 0.5 + 0.5;
      this.drawCharacter(this.mouthValue);
      
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  stopSpeaking() {
    this.isSpeaking = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.drawCharacter(0);
    window.speechSynthesis.cancel();
  }

  setupEventListeners() {
    this.audioPlayer.addEventListener('play', () => {
      // Sync with audio playback
      const text = document.getElementById('textContent').textContent;
      this.speakText(text);
    });

    this.audioPlayer.addEventListener('pause', () => this.stopSpeaking());
    this.audioPlayer.addEventListener('ended', () => this.stopSpeaking());
  }
}

// Initialize
const character = new TalkingCharacter();

// Export for use in audio.js
function initCharacter(characterType) {
  character.init(characterType);
}