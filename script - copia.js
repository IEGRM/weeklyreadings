// DOM Elements for Quiz
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const screenshotButton = document.getElementById('screenshotButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');

// Global variable to store quiz data
let quizData = null;

// Populate week dropdown
for (let week = 1; week <= 5; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = `Week ${week}`;
  if (week === 5) option.selected = true;
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

// Function to reset quiz UI
function resetQuizUI() {
  document.querySelectorAll('input[type="radio"]').forEach(radio => (radio.checked = false));
  scoreFeedback.textContent = '';
  timestamp.textContent = '';
  timestamp.style.display = "none";
  scoreButton.style.display = "inline-block";
}

// Helper function to load scripts dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Enhanced screenshot function for mobile/desktop
async function takeScreenshot() {
  try {
    // Show loading state
    screenshotButton.disabled = true;
    screenshotButton.textContent = "Capturing...";
    
    const element = document.querySelector('.info-box');
    const originalScroll = window.scrollY;
    
    // Scroll to top for full capture
    window.scrollTo(0, 0);
    
    // Load html2canvas if needed
    if (typeof html2canvas !== 'function') {
      await loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
    }

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(element, {
      scale: window.innerWidth < 768 ? 3 : 2, // Higher DPI on mobile
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      useCORS: true,
      logging: false
    });

    // Restore scroll position
    window.scrollTo(0, originalScroll);

    // Handle download/display
    const dataURL = canvas.toDataURL('image/png');
    const fileName = `quiz-result-${new Date().toISOString().slice(0,10)}.png`;

    // iOS workaround
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const newWindow = window.open();
      newWindow.document.write(`
        <img src="${dataURL}" style="max-width:100%" />
        <p>Press and hold to save image</p>
      `);
    } 
    // Android/Desktop download
    else {
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

  } catch (error) {
    console.error('Screenshot error:', error);
    alert('Could not capture screenshot. Please try again.');
  } finally {
    screenshotButton.disabled = false;
    screenshotButton.textContent = "Take Screenshot";
  }
}

// Load quiz based on selected week and grade
async function loadQuiz() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;

  try {
    const quizResponse = await fetch(`data/quizzes/week${week}_quizzes.json`);
    
    if (!quizResponse.ok) {
      throw new Error(`Failed to fetch quiz data: ${quizResponse.status}`);
    }
    
    const fullQuizData = await quizResponse.json();
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
      
      quizData = { quiz: gradeQuestions };
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
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const date = now.toLocaleDateString('en-US', dateOptions);
  const time = now.toLocaleTimeString('en-US', timeOptions);
  timestamp.textContent = `Date: ${date} / Time: ${time}`;
  timestamp.style.display = "block";
}

// Event listeners
weekSelect.addEventListener('change', () => {
  saveSelections();
  resetQuizUI();
  loadQuiz();
  loadReadingForAudio();
});

gradeSelect.addEventListener('change', () => {
  saveSelections();
  resetQuizUI();
  loadQuiz();
  loadReadingForAudio();
});

scoreButton.addEventListener('click', () => {
  const { score, allAnswered } = calculateScore();
  displayFeedback(score, allAnswered);
  if (allAnswered) {
    scoreButton.style.display = "none";
  }
});

clearButton.addEventListener('click', resetQuizUI);

screenshotButton.addEventListener('click', takeScreenshot);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  restoreSelections();
  loadQuiz();
});