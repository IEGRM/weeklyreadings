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
for (let week = 1; week <= 2; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = `Week ${week}`;
  if (week === 1) option.selected = true; // Set Week 1 as default
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
    const quizResponse = await fetch(`data/quizzes/week${week}/grade${grade}.json`);
    if (!quizResponse.ok) throw new Error(`Failed to fetch quiz data: ${quizResponse.status} ${quizResponse.statusText}`);
    quizData = await quizResponse.json();

    if (quizData.quiz && Array.isArray(quizData.quiz)) {
      quizContent.innerHTML = quizData.quiz.map((question, index) => `
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
    } else {
      quizContent.innerHTML = "No quiz data available.";
    }
  } catch (error) {
    console.error('Error loading quiz data:', error);
    quizContent.innerHTML = 'Error loading quiz content. Please try again.';
  }
}

/