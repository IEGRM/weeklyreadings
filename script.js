// script.js - Complete Solution with Default Week 4 Loading
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');

let quizData = null;

// Initialize week selector
function initializeWeekSelector() {
  for (let week = 1; week <= 4; week++) {
    const option = document.createElement('option');
    option.value = week;
    option.textContent = `Week ${week}`;
    weekSelect.appendChild(option);
  }
  
  // Set Week 4 as default if no saved selection exists
  if (!localStorage.getItem('selectedWeek')) {
    weekSelect.value = 4;
  }
}

// Save selections to localStorage
function saveSelections() {
  localStorage.setItem('selectedWeek', weekSelect.value);
  localStorage.setItem('selectedGrade', gradeSelect.value);
}

// Restore selections from localStorage
function restoreSelections() {
  const savedWeek = localStorage.getItem('selectedWeek');
  const savedGrade = localStorage.getItem('selectedGrade');

  if (savedWeek) weekSelect.value = savedWeek;
  if (savedGrade) gradeSelect.value = savedGrade;
}

// Load quiz data
async function loadQuiz() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;
  
  try {
    const response = await fetch(`data/quizzes/week${week}_quizzes.json`);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.quizzes || !data.quizzes[grade]) {
      quizContent.innerHTML = "No quiz for this grade.";
      return;
    }
    
    quizData = data.quizzes[grade];
    renderQuiz(quizData);
    
  } catch (error) {
    console.error("Quiz load failed:", error);
    quizContent.innerHTML = `Quiz load failed: ${error.message}`;
  }
}

// Initialize all content
async function initializeContent() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;
  
  // Load reading content
  try {
    const readingResponse = await fetch(`data/readings/week${week}_reading.json`);
    const readingData = await readingResponse.json();
    
    if (readingData.readings && readingData.readings[grade]) {
      // Update reading content display
      document.getElementById('textContent').innerHTML = 
        readingData.readings[grade].text.map(s => `<span data-time="${s.time}">${s.content}</span>`).join(' ');
      
      // Update media
      document.getElementById('audioSource').src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
      document.getElementById('audioPlayer').load();
      document.getElementById('imageFrame').src = `assets/images/week${week}_image_grade${grade}.jpg`;
    }
  } catch (error) {
    console.error("Reading load failed:", error);
  }
  
  // Load vocabulary
  try {
    const vocabResponse = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
    const vocabData = await vocabResponse.json();
    
    if (vocabData.vocabulary && vocabData.vocabulary[grade]) {
      document.getElementById('vocabularyContent').innerHTML = 
        vocabData.vocabulary[grade].map(item => `
          <div class="vocab-item">
            <strong>${item.word}</strong>: ${item.definition}
          </div>
        `).join('');
    }
  } catch (error) {
    console.error("Vocabulary load failed:", error);
  }
  
  // Load quiz
  await loadQuiz();
}

// Event listeners
weekSelect.addEventListener('change', () => {
  saveSelections();
  initializeContent();
});

gradeSelect.addEventListener('change', () => {
  saveSelections();
  initializeContent();
});

scoreButton.addEventListener('click', () => {
  const { score, allAnswered, total } = calculateScore();
  displayFeedback(score, allAnswered, total);
});

clearButton.addEventListener('click', () => {
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.checked = false;
  });
  scoreFeedback.textContent = "";
  timestamp.textContent = "";
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeWeekSelector();
  restoreSelections();
  initializeContent(); // Changed from loadQuiz() to initializeContent()
});