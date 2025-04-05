// DOM Elements for Quiz
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const screenshotButton = document.getElementById('screenshotButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');


// Change this to current week. No me puedo olvidadar!
const totalWeeks = 5;
const defaultGradelevel = 6;
// *******************************************


// Global variable to store quiz data
let quizData = null;

// Populate week dropdown
for (let week = 1; week <= totalWeeks; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = `Week ${week}`;
  if (week === totalWeeks) option.selected = true; // Auto-select last week
  weekSelect.appendChild(option);
}

// Save selected week and grade to localStorage
function saveSelections() {
  localStorage.setItem('selectedWeek', weekSelect.value);
  localStorage.setItem('selectedGrade', gradeSelect.value);
}

// Restore selected week and grade from localStorage
function restoreSelections() {
  // Unconditionally reset to defaults (override localStorage)
  weekSelect.value = totalWeeks;    // Week 5
  gradeSelect.value = defaultGradelevel;   // Grade 6
  saveSelections();          // Sync defaults to localStorage
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




//<<<<<<<<<<  This is my game for vocabulary building activity.>>>>>>>>>

async function initReadingGame() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;
  
  try {
    // Fetch reading data
    const response = await fetch(`data/readings/week${week}_reading.json`);
    const data = await response.json();
    const readingData = data.readings[grade].text;

    // Process the reading text (skip first line/title)
    let fullText = '';
    const boldedWords = [];
    
    // Start from index 1 to skip the title
    for (let i = 1; i < readingData.length; i++) {
      let content = readingData[i].content;
      
      // Extract and store bolded words
      content = content.replace(/<b>(.*?)<\/b>/g, (match, word) => {
        boldedWords.push(word);
        return `_____`; // Replace with gap
      });
      
      // Remove other HTML tags
      content = content.replace(/<br>/g, ' ')
                       .replace(/<\/?[^>]+>/g, '')
                       .replace(/\s+/g, ' ');
      
      fullText += content + ' ';
    }

    // Clean up extra spaces
    fullText = fullText.trim();

    // Remove duplicate words
    const uniqueWords = [...new Set(boldedWords)];
    
    // Shuffle words for drag-and-drop
    const shuffledWords = [...uniqueWords].sort(() => Math.random() - 0.5);

    // Generate game HTML
    const gameHTML = `
      <div class="reading-game">
        <div id="scoreDisplay">Score: 0%</div>
        <div class="reading-text">${fullText}</div>
        <div class="draggable-words">
          ${shuffledWords.map(word => `
            <div class="draggable" draggable="true" data-word="${word}">${word}</div>
          `).join('')}
        </div>
        <button id="checkAnswers" class="game-button">Check Answers</button>
        <button id="closeGame" class="game-button">Close</button>
      </div>
    `;

    const container = document.getElementById('readingGameContainer');
    container.innerHTML = gameHTML;
    container.style.display = 'block';

    // Convert gaps to drop zones
    const textElement = container.querySelector('.reading-text');
    textElement.innerHTML = textElement.textContent.replace(/_____/g, 
      '<span class="drop-zone" data-expected=""></span>'
    );

    // Match drop zones with expected words
    const dropZones = container.querySelectorAll('.drop-zone');
    let wordIndex = 0;
    dropZones.forEach(zone => {
      zone.dataset.expected = boldedWords[wordIndex++];
    });

    setupDragAndDrop();

  } catch (error) {
    console.error("Error loading reading game:", error);
    alert("Failed to load the reading game. Please try again.");
  }
}



function setupDragAndDrop() {
  const draggables = document.querySelectorAll('.draggable');
  const dropZones = document.querySelectorAll('.drop-zone');

  // Drag events
  draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', draggable.dataset.word);
      draggable.classList.add('dragging');
    });
  });

  // Drop zone events
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('hovered');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('hovered');
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      const word = e.dataTransfer.getData('text/plain');
      const draggable = document.querySelector(`.draggable[data-word="${word}"]`);
      
      if (!zone.querySelector('.dropped-word')) {
        zone.innerHTML = '';
        const wordClone = draggable.cloneNode(true);
        wordClone.classList.remove('dragging');
        wordClone.classList.add('dropped-word');
        wordClone.draggable = false;
        zone.appendChild(wordClone);
        zone.dataset.filled = word;
      }
      
      zone.classList.remove('hovered');
    });
  });

  // Rest of the function remains the same...
  document.getElementById('checkAnswers').addEventListener('click', () => {
    const dropZones = document.querySelectorAll('.drop-zone');
    let correct = 0;
    
    dropZones.forEach(zone => {
      const isCorrect = zone.dataset.filled === zone.dataset.expected;
      zone.style.backgroundColor = isCorrect ? '#d4edda' : '#f8d7da';
      if (isCorrect) correct++;
    });

    const totalWords = dropZones.length;
    const score = Math.round((correct / totalWords) * 100);
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.innerHTML = `Score: ${score}%`;
    scoreDisplay.style.color = score === 100 ? 'darkgreen' : 'darkred';

    if (score < 100) {
      scoreDisplay.innerHTML += `<br><small>Some answers are incorrect. Try again!</small>`;
    }
  });

  document.getElementById('closeGame').addEventListener('click', () => {
    document.getElementById('readingGameContainer').style.display = 'none';
  });
}




// Start the game when button is clicked
document.getElementById('readingGameButton').addEventListener('click', initReadingGame);