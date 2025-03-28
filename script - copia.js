// script.js - Fixed Initial Load Issue
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');

let quizData = null;

// Initialize week selector with Week 4 as default
function initializeWeekSelector() {
  for (let week = 1; week <= 4; week++) {
    const option = document.createElement('option');
    option.value = week;
    option.textContent = `Week ${week}`;
    weekSelect.appendChild(option);
  }
  
  // Force Week 4 as default on first load
  weekSelect.value = 4;
  localStorage.setItem('selectedWeek', 4); // Save default to localStorage
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

// Load all content for current selections
async function loadAllContent() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;
  
  // Load reading content
  try {
    const readingResponse = await fetch(`data/readings/week${week}_reading.json`);
    const readingData = await readingResponse.json();
    
    if (readingData.readings?.[grade]?.text) {
      document.getElementById('textContent').innerHTML = 
        readingData.readings[grade].text.map(s => `<span data-time="${s.time}">${s.content}</span>`).join(' ');
    }
  } catch (error) {
    console.error("Reading load failed:", error);
  }

  // Load vocabulary
  try {
    const vocabResponse = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
    const vocabData = await vocabResponse.json();
    
    if (vocabData.vocabulary?.[grade]) {
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
  try {
    const quizResponse = await fetch(`data/quizzes/week${week}_quizzes.json`);
    const quizData = await quizResponse.json();
    
    if (quizData.quizzes?.[grade]) {
      quizContent.innerHTML = quizData.quizzes[grade].map((question, index) => `
        <div class="quiz-question">
          <p><strong>Question ${index + 1}:</strong> ${question.question}</p>
          <ul>
            ${question.options.map((option, optIndex) => `
              <li>
                <input type="radio" 
                       name="question${index}" 
                       id="q${index}_opt${optIndex}" 
                       value="${option.replace(/"/g, '&quot;')}">
                <label for="q${index}_opt${optIndex}">${option}</label>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error("Quiz load failed:", error);
    quizContent.innerHTML = `Quiz load failed: ${error.message}`;
  }

  // Load media
  document.getElementById('audioSource').src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
  document.getElementById('audioPlayer').load();
  document.getElementById('imageFrame').src = `assets/images/week${week}_image_grade${grade}.jpg`;
}

// Event listeners
weekSelect.addEventListener('change', () => {
  saveSelections();
  loadAllContent();
});

gradeSelect.addEventListener('change', () => {
  saveSelections();
  loadAllContent();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeWeekSelector();
  restoreSelections();
  loadAllContent(); // Load all content on initial page load
});