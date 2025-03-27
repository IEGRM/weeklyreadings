// script.js - Quiz Functionality
// Handles week/grade selection and quiz management

// DOM Elements
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');

// Global variable
let quizData = null;

// Populate week dropdown
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

// Load quiz from consolidated JSON
async function loadQuiz() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;

  try {
    const response = await fetch(`data/week${week}.json`);
    if (!response.ok) throw new Error(`Failed to load quiz: ${response.status}`);
    
    const weekData = await response.json();
    quizData = weekData.quizzes[grade]; // Access grade-specific quiz

    if (quizData && Array.isArray(quizData)) {
      renderQuiz(quizData);
    } else {
      quizContent.innerHTML = "No quiz available for this selection.";
    }
  } catch (error) {
    console.error('Quiz loading error:', error);
    quizContent.innerHTML = "Error loading quiz. Please try again.";
  }
}

// Render quiz questions
function renderQuiz(questions) {
  quizContent.innerHTML = questions.map((question, index) => `
    <div class="quiz-question">
      <p><strong>Question ${index + 1}:</strong> ${question.question}</p>
      <ul>
        ${question.options.map(option => `
          <li>
            <input type="radio" name="question${index}" id="q${index}_opt${question.options.indexOf(option)}" value="${option}">
            <label for="q${index}_opt${question.options.indexOf(option)}">${option}</label>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

// Calculate quiz score
function calculateScore() {
  let score = 0;
  let allAnswered = true;

  document.querySelectorAll('.quiz-question').forEach((question, index) => {
    const selectedOption = question.querySelector('input[type="radio"]:checked');
    
    if (!selectedOption) {
      allAnswered = false;
    } else if (selectedOption.value === quizData[index].answer) {
      score++;
    }
  });

  return { score, allAnswered };
}

// Display score feedback
function displayFeedback(score, allAnswered) {
  if (!allAnswered) {
    scoreFeedback.textContent = "Please answer all questions to get your score.";
    timestamp.textContent = "";
    return;
  }

  const feedbackMap = {
    1: "Too low. Try again! (Muy bajito, ¡Intenta de nuevo!)",
    2: "Getting better. Try again! (Mejorando. ¡Intenta de nuevo!)",
    3: "Barely made it. Try again! (Pasaste raspadito(a). ¡Intenta de nuevo!)",
    4: "Good job. (¡Buen trabajo!)",
    5: "Amazing work! You are the best! (¡Estupendo!)",
  };

  scoreFeedback.textContent = `Score: ${score}/5 - ${feedbackMap[score] || "Please answer all questions."}`;
  updateTimestamp();
}

// Update timestamp
function updateTimestamp() {
  const now = new Date();
  timestamp.textContent = `Submitted: ${now.toLocaleString()}`;
  timestamp.style.display = "block";
}

// Event Listeners
weekSelect.addEventListener('change', () => {
  saveSelections();
  loadQuiz();
});

gradeSelect.addEventListener('change', () => {
  saveSelections();
  loadQuiz();
});

scoreButton.addEventListener('click', () => {
  const { score, allAnswered } = calculateScore();
  displayFeedback(score, allAnswered);
  if (allAnswered) scoreButton.style.display = "none";
});

clearButton.addEventListener('click', () => {
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.checked = false;
  });
  scoreFeedback.textContent = "";
  timestamp.textContent = "";
  scoreButton.style.display = "inline-block";
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeWeekSelector();
  restoreSelections();
  loadQuiz();
});