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

  questions.forEach((question, index) => {
    const selectedOption = question.querySelector('input[type="radio"]:checked');
    if (selectedOption && selectedOption.value === quizData.quiz[index].answer) {
      score += 1;
    }
  });

  return score;
}

// Display feedback based on score
function displayFeedback(score) {
  const feedbackMap = {
    1: "Too low. (Muy bajito)",
    2: "Getting better (Mejorando)",
    3: "Just made it (Pasaste)",
    4: "Good job (Buen trabajo)",
    5: "Amazing work! (Estupendo)",
  };

  const feedback = feedbackMap[score] || "Please answer all questions to get your score.";
  scoreFeedback.textContent = `Score: ${score}/5 - ${feedback}`;
}

// Highlight text based on audio time
function updateTextForCurrentTime() {
  if (!cachedReadingData) return;

  const currentTime = audioPlayer.currentTime;
  const spans = document.querySelectorAll("#textContent span");

  if (spans.length === 0) return;

  spans.forEach(span => span.classList.remove("highlight"));

  for (let i = cachedReadingData.text.length - 1; i >= 0; i--) {
    if (currentTime >= cachedReadingData.text[i].time) {
      spans[i].classList.add("highlight");
      break;
    }
  }
}

// Event Listeners
weekSelect.addEventListener('change', loadReading);
gradeSelect.addEventListener('change', loadReading);
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);
scoreButton.addEventListener('click', () => {
  const score = calculateScore();
  displayFeedback(score);
  scoreButton.style.display = "none";
});
clearButton.addEventListener('click', () => {
  document.querySelectorAll('input[type="radio"]').forEach(radio => (radio.checked = false));
  scoreFeedback.textContent = '';
  scoreButton.style.display = "inline-block";
});

// Load the first week and grade by default
loadReading();