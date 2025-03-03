// DOM Elements
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const imageFrame = document.getElementById('imageFrame');
const textContent = document.getElementById('textContent');
const vocabularyContent = document.getElementById('vocabularyContent');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');

// Global variable to store quiz data
let quizData = null;
let cachedReadingData = null;

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

// Load reading, vocabulary, and quiz based on selected week and grade
// Load reading, vocabulary, and quiz based on selected week and grade
async function loadReading() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;

  try {
    // Load reading for audio
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) throw new Error(`Failed to fetch reading data: ${readingResponse.status} ${readingResponse.statusText}`);
    const reading = await readingResponse.json();

    if (reading) {
      audioSource.src = reading.audio;
      imageFrame.src = reading.image;
      textContent.innerHTML = reading.text.map(sentence => `<span data-time="${sentence.time}">${sentence.content}</span>`).join('');
      audioPlayer.load();
      cachedReadingData = reading; // Cache reading data
    }

    // Load vocabulary
    const vocabularyResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
    if (!vocabularyResponse.ok) throw new Error(`Failed to fetch vocabulary data: ${vocabularyResponse.status} ${vocabularyResponse.statusText}`);
    const vocabularyData = await vocabularyResponse.json();

    if (vocabularyData.vocabulary && Array.isArray(vocabularyData.vocabulary)) {
      vocabularyContent.innerHTML = vocabularyData.vocabulary.map(item => `<div><strong>${item.word}:</strong> ${item.definition}</div>`).join('');
    } else {
      vocabularyContent.innerHTML = "No vocabulary data available.";
    }

    // Load quiz
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
    console.error('Error loading content:', error);
    audioSource.src = '';
    imageFrame.src = '';
    textContent.innerHTML = 'Error loading content. Please try again.';
    vocabularyContent.innerHTML = '';
    quizContent.innerHTML = '';
  }
}

// Calculate quiz score
function calculateScore() {
  const questions = document.querySelectorAll('.quiz-question');
  let score = 0;
  let allAnswered = true; // Flag to check if all questions are answered

  questions.forEach((question, index) => {
    const selectedOption = question.querySelector('input[type="radio"]:checked');
    if (!selectedOption) {
      allAnswered = false; // Set flag to false if any question is unanswered
    } else {
      const userAnswer = selectedOption.value;
      const correctAnswer = quizData.quiz[index].answer;

      if (userAnswer === correctAnswer) {
        score += 1;
      }
    }
  });

  return { score, allAnswered }; // Return both the score and the flag
}

// Display feedback based on score
function displayFeedback(score, allAnswered) {
  if (!allAnswered) {
    scoreFeedback.textContent = "Please answer all questions to get your score.";
    timestamp.textContent = ""; // Clear the timestamp if not all questions are answered
    return; // Exit the function early
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
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const date = now.toLocaleDateString('en-US', dateOptions);
  const time = now.toLocaleTimeString('en-US', timeOptions);
  timestamp.textContent = `Date: ${date} / Time: ${time}`;
  timestamp.style.display = "block"; // Show the timestamp
}

// Event listeners
weekSelect.addEventListener('change', () => {
  saveSelections();
  loadReading();
});

gradeSelect.addEventListener('change', () => {
  saveSelections();
  loadReading();
});

scoreButton.addEventListener('click', () => {
  const { score, allAnswered } = calculateScore(); // Destructure the returned object
  displayFeedback(score, allAnswered); // Pass both score and allAnswered flag
  if (allAnswered) {
    scoreButton.style.display = "none"; // Hide "My Score" button only if all questions are answered
  }
});

clearButton.addEventListener('click', () => {
  document.querySelectorAll('input[type="radio"]').forEach(radio => (radio.checked = false));
  scoreFeedback.textContent = ''; // Clear the feedback message
  timestamp.textContent = ''; // Clear the timestamp
  timestamp.style.display = "none"; // Hide the timestamp
  scoreButton.style.display = "inline-block"; // Show "My Score" button again
});

// Restore selections and load reading when the page loads
document.addEventListener('DOMContentLoaded', () => {
  restoreSelections();
  loadReading();
});