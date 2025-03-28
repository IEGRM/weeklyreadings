// script.js - Complete Fixed Version
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const textContent = document.getElementById('textContent');
const vocabularyContent = document.getElementById('vocabularyContent');
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const imageFrame = document.getElementById('imageFrame');

let quizData = null;

// Initialize week selector with Week 4 as default
function initializeWeekSelector() {
  for (let week = 1; week <= 4; week++) {
    const option = document.createElement('option');
    option.value = week;
    option.textContent = `Week ${week}`;
    weekSelect.appendChild(option);
  }
  
  // Set Week 4 as default if no selection exists
  if (!localStorage.getItem('selectedWeek')) {
    weekSelect.value = 4;
    localStorage.setItem('selectedWeek', 4);
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

// Load reading content
async function loadReading(week, grade) {
  try {
    const response = await fetch(`data/readings/week${week}_reading.json`);
    if (!response.ok) throw new Error('Reading data not found');
    
    const data = await response.json();
    if (data.readings && data.readings[grade]) {
      textContent.innerHTML = data.readings[grade].text
        .map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`)
        .join(' ');
    }
  } catch (error) {
    console.error('Reading load error:', error);
    textContent.innerHTML = 'Error loading reading content';
  }
}

// Load vocabulary
async function loadVocabulary(week, grade) {
  try {
    const response = await fetch(`data/vocabulary/week${week}_vocabulary.json`);
    if (!response.ok) throw new Error('Vocabulary data not found');
    
    const data = await response.json();
    if (data.vocabulary && data.vocabulary[grade]) {
      vocabularyContent.innerHTML = data.vocabulary[grade]
        .map(item => `
          <div class="vocab-item">
            <strong>${item.word}</strong>: ${item.definition}
          </div>
        `).join('');
    }
  } catch (error) {
    console.error('Vocabulary load error:', error);
    vocabularyContent.innerHTML = 'Error loading vocabulary';
  }
}

// Load quiz
async function loadQuiz(week, grade) {
  try {
    const response = await fetch(`data/quizzes/week${week}_quizzes.json`);
    if (!response.ok) throw new Error('Quiz data not found');
    
    const data = await response.json();
    if (data.quizzes && data.quizzes[grade]) {
      quizData = data.quizzes[grade];
      quizContent.innerHTML = quizData.map((question, index) => `
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
    console.error('Quiz load error:', error);
    quizContent.innerHTML = 'Error loading quiz';
  }
}

// Load media (audio and image)
function loadMedia(week, grade) {
  audioSource.src = `assets/audios/week${week}_audio_grade${grade}.mp3`;
  audioPlayer.load();
  imageFrame.src = `assets/images/week${week}_image_grade${grade}.jpg`;
}

// Load all content
async function loadAllContent() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;
  
  await Promise.all([
    loadReading(week, grade),
    loadVocabulary(week, grade),
    loadQuiz(week, grade)
  ]);
  
  loadMedia(week, grade);
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
document.addEventListener('DOMContentLoaded', async () => {
  initializeWeekSelector();
  restoreSelections();
  await loadAllContent(); // Load all content on initial page load
});