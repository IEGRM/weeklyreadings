// DOM Elements for Quiz
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');

// Global variable to store quiz data
let quizData = null;

// Populate week dropdown
for (let week = 1; week <= 4; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = `Week ${week}`;
  if (week === 4) option.selected = true;
  weekSelect.appendChild(option);
}

// Save selected week and grade to localStorage
function saveSelections() {
  localStorage.setItem('selectedWeek', weekSelect.value);
  localStorage.setItem('selectedGrade', gradeSelect.value);
}

// Restore selected week and grade from localStorage
function restoreSelections() {
  const savedWeek = localStorage.getItem('selectedWeek');
  const savedGrade = localStorage.getItem('selectedGrade');

  if (savedWeek) weekSelect.value = savedWeek;
  if (savedGrade) gradeSelect.value = savedGrade;
}

// Load quiz based on selected week and grade
async function loadQuiz() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;

  try {
    // CORRECTED FILENAME - changed "_quiz.json" to "_quizzes.json"
    const quizResponse = await fetch(`data/quizzes/week${week}_quizzes.json`);
    
    if (!quizResponse.ok) {
      throw new Error(`Failed to fetch quiz data: ${quizResponse.status}`);
    }
    
    const fullQuizData = await quizResponse.json();
    
    // Get questions for the selected grade
    const gradeQuestions = fullQuizData.quizzes[grade];
    
    if (gradeQuestions && Array.isArray(gradeQuestions)) {
      quizContent.innerHTML = gradeQuestions.map((question, index) => `
        <div class="quiz-question">
          <p><strong>Question ${index + 1}:</strong> ${question.question}</p>
          <ul>
            ${question.options.map(option => `
              <li>
                <input type="radio" name="question${index}" value="${option}">
                ${option}
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('');
      
      // Store the current grade's questions for scoring
      quizData = {
        quiz: gradeQuestions
      };
    } else {
      quizContent.innerHTML = "No quiz data available for this grade.";
      quizData = null;
    }
  } catch (error) {
    console.error('Error loading quiz data:', error);
    quizContent.innerHTML = `
      <div style="color:red; padding:10px; border:1px solid red;">
        Error loading quiz: ${error.message}<br>
        Tried to load: data/quizzes/week${week}_quizzes.json
      </div>
    `;
    quizData = null;
  }
}

// Calculate quiz score
function calculateScore() {
  if (!quizData) return { score: 0, allAnswered: false };

  const questions = document.querySelectorAll('.quiz-question');
  let score = 0;
  let allAnswered = true;

  questions.forEach((question, index) => {
    const selectedOption = question.querySelector('input[type="radio"]:checked');
    if (!selectedOption) {
      allAnswered = false;
    } else {
      const userAnswer = selectedOption.value;
      const correctAnswer = quizData.quiz[index].answer;

      if (userAnswer === correctAnswer) {
        score += 1;
      }
    }
  });

  return { score, allAnswered };
}

// Display feedback based on score
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

  const feedback = feedbackMap[score] || "Please answer all questions to get your score.";
  scoreFeedback.textContent = `Score: ${score}/5 - ${feedback}`;

  // Show timestamp
  const now = new Date();
  timestamp.textContent = `Completed: ${now.toLocaleString()}`;
  timestamp.style.display = "block";
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  restoreSelections();
  loadQuiz();
});

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
  if (allAnswered) {
    scoreButton.style.display = "none";
  }
});

clearButton.addEventListener('click', () => {
  document.querySelectorAll('input[type="radio"]').forEach(radio => (radio.checked = false));
  scoreFeedback.textContent = '';
  timestamp.textContent = '';
  timestamp.style.display = "none";
  scoreButton.style.display = "inline-block";
});