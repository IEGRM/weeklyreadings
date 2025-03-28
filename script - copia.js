// script.js - Complete Quiz Solution
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
  
  console.log(`Loading quiz from: data/quizzes/week${week}_quizzes.json`);
  
  try {
    const response = await fetch(`data/quizzes/week${week}_quizzes.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Quiz data loaded:", data);
    
    if (!data.quizzes || !data.quizzes[grade]) {
      quizContent.innerHTML = "No quiz for this grade.";
      return;
    }
    
    quizData = data.quizzes[grade];
    renderQuiz(quizData);
    
  } catch (error) {
    console.error("Quiz load failed:", error);
    quizContent.innerHTML = `
      <div class="error">
        Quiz load failed: ${error.message}
        <br>Path: data/quizzes/week${week}_quizzes.json
      </div>
    `;
  }
}

// Render quiz questions
function renderQuiz(questions) {
  quizContent.innerHTML = questions.map((question, index) => `
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

// Calculate score
function calculateScore() {
  let score = 0;
  let allAnswered = true;

  quizData.forEach((question, index) => {
    const selectedOption = document.querySelector(`input[name="question${index}"]:checked`);
    
    if (!selectedOption) {
      allAnswered = false;
    } else if (selectedOption.value === question.answer) {
      score++;
    }
  });

  return { score, allAnswered, total: quizData.length };
}

// Display feedback
function displayFeedback(score, allAnswered, total) {
  if (!allAnswered) {
    scoreFeedback.textContent = "Please answer all questions to get your score.";
    scoreFeedback.style.color = "red";
    timestamp.textContent = "";
    return;
  }

  const percentage = Math.round((score / total) * 100);
  let message = "";
  
  if (percentage >= 80) message = "Excellent work!";
  else if (percentage >= 60) message = "Good job!";
  else message = "Keep practicing!";

  scoreFeedback.innerHTML = `
    Score: ${score}/${total} (${percentage}%) - ${message}
  `;
  scoreFeedback.style.color = "darkgreen";
  updateTimestamp();
}

// Update timestamp
function updateTimestamp() {
  const now = new Date();
  timestamp.textContent = `Submitted: ${now.toLocaleString()}`;
}

// Event listeners
weekSelect.addEventListener('change', () => {
  saveSelections();
  loadQuiz();
});

gradeSelect.addEventListener('change', () => {
  saveSelections();
  loadQuiz();
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
  loadQuiz();
});