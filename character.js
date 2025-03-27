class TalkingCharacter {
  constructor() {
    this.canvas = document.getElementById('talking-character');
    this.ctx = this.canvas.getContext('2d');
    this.img = new Image();
    this.mouthOpenness = 0;
    this.floatOffset = 0;
    
    // Load character
    this.img.src = 'assets/characters/woman.png';
    this.img.onload = () => this.draw();
    
    // Animation loop
    setInterval(() => this.draw(), 1000/60); // 60fps
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Floating animation
    this.floatOffset = Math.sin(Date.now() / 500) * 5;
    
    // Draw character
    this.ctx.save();
    this.ctx.translate(0, this.floatOffset);
    this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
    
    // Draw mouth (simple version)
    this.drawMouth();
    this.ctx.restore();
  }

  drawMouth() {
    const mouthHeight = 5 + (this.mouthOpenness * 15);
    const mouthWidth = 20 + (this.mouthOpenness * 10);
    
    this.ctx.fillStyle = '#ff6b8b'; // Mouth color
    this.ctx.beginPath();
    this.ctx.ellipse(
      this.canvas.width/2, 
      this.canvas.height/2 + 40, 
      mouthWidth, 
      mouthHeight, 
      0, 0, Math.PI
    );
    this.ctx.fill();
  }

  speak(text) {
    // Animate mouth while "speaking"
    const animateMouth = () => {
      this.mouthOpenness = Math.min(1, this.mouthOpenness + 0.1);
      if (this.mouthOpenness >= 1) this.closeMouth();
    };
    
    this.mouthInterval = setInterval(animateMouth, 150);
    setTimeout(() => this.stopSpeaking(), text.length * 100); // Auto-stop
  }

  closeMouth() {
    this.mouthOpenness = Math.max(0, this.mouthOpenness - 0.2);
  }

  stopSpeaking() {
    clearInterval(this.mouthInterval);
    const closeInterval = setInterval(() => {
      this.closeMouth();
      if (this.mouthOpenness <= 0) clearInterval(closeInterval);
    }, 50);
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.character = new TalkingCharacter();
  
  // Test - remove this in production
  document.getElementById('audioPlayer').addEventListener('play', () => {
    window.character.speak("Hello, let's read the story");
  });
});