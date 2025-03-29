// audio.js - Simplified and Fixed Version
document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initReadingSection();
  initVocabularySection();
});

function initReadingSection() {
  const weekSelect = document.getElementById('weekSelect');
  const gradeSelect = document.getElementById('gradeSelect');
  
  weekSelect.addEventListener('change', loadContent);
  gradeSelect.addEventListener('change', loadContent);
  
  loadContent();
  
  function loadContent() {
    const week = weekSelect.value;
    const grade = gradeSelect.value;
    
    loadReading(week, grade);
    loadVocabulary(week, grade);
  }
}

async function loadReading(week, grade) {
  try {
    const response = await fetch(`data/readings/week${week}_reading.json`);
    const data = await response.json();
    const reading = data.readings[grade];
    
    document.getElementById('textContent').innerHTML = reading.text
      .map(s => `<span data-time="${s.time}">${s.content}</span>`)
      .join(' ');
      
    document.getElementById('audioSource').src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
    document.getElementById('audioPlayer').load();
    
    document.getElementById('imageFrame').src = `assets/images/week${week}_image_grade${grade}.jpg`;
    
    // Process for vocabulary highlighting
    setTimeout(highlightVocabulary, 300);
  } catch (error) {
    console.error("Error loading reading:", error);
  }
}

async function loadVocabulary(week, grade) {
  try {
    const response = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
    const data = await response.json();
    const vocab = data.vocabulary[grade];
    
    document.getElementById('vocabularyContent').innerHTML = vocab
      .map(item => `<div><strong>${item.word}</strong>: ${item.definition}</div>`)
      .join('');
  } catch (error) {
    console.error("Error loading vocabulary:", error);
  }
}

function highlightVocabulary() {
  const vocabItems = document.querySelectorAll('#vocabularyContent div');
  const textContent = document.getElementById('textContent');
  
  vocabItems.forEach(item => {
    const word = item.querySelector('strong').textContent.replace(/<[^>]*>/g, '');
    const definition = item.textContent.split(': ')[1];
    
    // Create regex to match the word (case insensitive)
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    
    // Highlight matches in text
    textContent.innerHTML = textContent.innerHTML.replace(regex, 
      `<span class="vocab-word" data-definition="${definition}">$&</span>`);
  });
  
  // Add click handlers for tooltips
  document.querySelectorAll('.vocab-word').forEach(word => {
    word.addEventListener('click', showTooltip);
  });
}

function showTooltip(event) {
  const tooltip = document.getElementById('tooltip-container');
  tooltip.innerHTML = event.target.getAttribute('data-definition');
  tooltip.style.display = 'block';
  tooltip.style.left = `${event.pageX}px`;
  tooltip.style.top = `${event.pageY + 10}px`;
  
  // Hide tooltip when clicking anywhere
  document.addEventListener('click', function hideTooltip() {
    tooltip.style.display = 'none';
    document.removeEventListener('click', hideTooltip);
  }, { once: true });
  
  event.stopPropagation();
}