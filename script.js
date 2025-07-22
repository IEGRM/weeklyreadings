// DOM Elements for Quiz
const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const quizContent = document.getElementById('quizContent');
const scoreButton = document.getElementById('scoreButton');
const clearButton = document.getElementById('clearButton');
const screenshotButton = document.getElementById('screenshotButton');
const scoreFeedback = document.getElementById('scoreFeedback');
const timestamp = document.getElementById('timestamp');

// Change this to current week
const totalWeeks = 12;
const defaultGradelevel = 6;

// Global variable to store quiz data
let quizData = null;
let dragGhost = null;

// Populate week dropdown
for (let week = 1; week <= totalWeeks; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = `Week ${week}`;
  if (week === totalWeeks) option.selected = true;
  weekSelect.appendChild(option);
}

// Save selected week and grade to localStorage
function saveSelections() {
  localStorage.setItem('selectedWeek', weekSelect.value);
  localStorage.setItem('selectedGrade', gradeSelect.value);
}

// Restore selected week and grade from localStorage
function restoreSelections() {
  weekSelect.value = totalWeeks;
  gradeSelect.value = defaultGradelevel;
  saveSelections();
}

// Function to reset quiz UI
function resetQuizUI() {
  document.querySelectorAll('input[type="radio"]').forEach(radio => (radio.checked = false));
  scoreFeedback.textContent = '';
  timestamp.textContent = '';
  timestamp.style.display = "none";
  scoreButton.style.display = "inline-block";
  screenshotButton.style.display = "none";
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
    screenshotButton.disabled = true;
    screenshotButton.textContent = "Capturing...";
    
    const element = document.querySelector('.info-box');
    const originalScroll = window.scrollY;
    window.scrollTo(0, 0);
    
    if (typeof html2canvas !== 'function') {
      await loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(element, {
      scale: window.innerWidth < 768 ? 3 : 2,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      useCORS: true,
      logging: false
    });

    window.scrollTo(0, originalScroll);
    const dataURL = canvas.toDataURL('image/png');
    const fileName = `quiz-result-${new Date().toISOString().slice(0,10)}.png`;

    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const newWindow = window.open();
      newWindow.document.write(`
        <img src="${dataURL}" style="max-width:100%" />
        <p>Press and hold to save image</p>
      `);
    } else {
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

  const now = new Date();
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const date = now.toLocaleDateString('en-US', dateOptions);
  const time = now.toLocaleTimeString('en-US', timeOptions);
  timestamp.textContent = `Date: ${date} / Time: ${time}`;
  timestamp.style.display = "block";
  screenshotButton.style.display = "inline-block";
}

// Event listeners
weekSelect.addEventListener('change', () => {
  saveSelections();
  resetQuizUI();
  loadQuiz();
  loadReadingForAudio();
  loadReadingTitle();
});

gradeSelect.addEventListener('change', () => {
  saveSelections();
  resetQuizUI();
  loadQuiz();
  loadReadingForAudio();
  loadReadingTitle();
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
  screenshotButton.style.display = "none";
});

// Reading Game Implementation
async function initReadingGame() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;
  
  try {
    // Hide the practice button when game starts
    document.getElementById('readingGameButton').style.display = 'none';
    
    const response = await fetch(`data/readings/week${week}_reading.json`);
    const data = await response.json();
    const readingData = data.readings[grade].text;

    let fullText = '';
    const boldedWords = [];
    
    for (let i = 1; i < readingData.length; i++) {
      let content = readingData[i].content;
      
      content = content.replace(/<b>(.*?)<\/b>/g, (match, word) => {
        boldedWords.push(word);
        return `_____`;
      });
      
      content = content.replace(/<br>/g, ' ')
                       .replace(/<\/?[^>]+>/g, '')
                       .replace(/\s+/g, ' ');
      
      fullText += content + ' ';
    }

    fullText = fullText.trim();
    const uniqueWords = [...new Set(boldedWords)];
    const shuffledWords = [...uniqueWords].sort(() => Math.random() - 0.5);

    const gameHTML = `
      <div class="reading-game">
        <div id="scoreDisplay" style="font-weight: bold; text-align: center; color: darkblue;">Score: 0%</div>		
        <hr class="score-divider"> 
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

    const textElement = container.querySelector('.reading-text');
    textElement.innerHTML = textElement.textContent.replace(/_____/g, 
      '<span class="drop-zone" data-expected=""></span>'
    );

    const dropZones = container.querySelectorAll('.drop-zone');
    let wordIndex = 0;
    dropZones.forEach(zone => {
      zone.dataset.expected = boldedWords[wordIndex++];
    });

    setupDragAndDrop();

    // Close button event listener
    document.getElementById('closeGame').addEventListener('click', () => {
      container.style.display = 'none';
      // Show the practice button again
      document.getElementById('readingGameButton').style.display = 'block';
    });

  } catch (error) {
    console.error("Error loading reading game:", error);
    alert("Failed to load the reading game. Please try again.");
    // Show button again if error occurs
    document.getElementById('readingGameButton').style.display = 'block';
  }
}

function positionGhost(e) {
  if (!dragGhost) return;
  dragGhost.style.left = `${e.clientX}px`;
  dragGhost.style.top = `${e.clientY}px`;
}

function positionTouchGhost(e) {
  if (!dragGhost) return;
  const touch = e.touches[0];
  dragGhost.style.left = `${touch.clientX}px`;
  dragGhost.style.top = `${touch.clientY}px`;
}

function setupDragAndDrop() {
  const body = document.body;
  const draggableWords = document.querySelector('.draggable-words');

  // ===== MOBILE TOUCH HANDLING =====
  let touchStartY = 0;
  let activeTouchElement = null;
  let isDragging = false;

  // Touch start handler
  document.addEventListener('touchstart', (e) => {
    const target = e.target.closest('.draggable, .dropped-word');
    if (target) {
      activeTouchElement = target;
      touchStartY = e.touches[0].clientY;
      isDragging = false;
      
      // Create ghost for touch
      dragGhost = target.cloneNode(true);
      dragGhost.classList.add('drag-ghost');
      dragGhost.style.width = `${target.offsetWidth}px`;
      document.body.appendChild(dragGhost);
      
      e.preventDefault();
    }
  }, { passive: false });

  // Touch move handler
  document.addEventListener('touchmove', (e) => {
    if (activeTouchElement && !isDragging) {
      const touchY = e.touches[0].clientY;
      if (Math.abs(touchY - touchStartY) > 5) {
        isDragging = true;
        body.classList.add('no-scroll');
        activeTouchElement.classList.add('dragging');
        document.documentElement.style.overflow = 'hidden';
        document.addEventListener('touchmove', positionTouchGhost);
      }
    }

    if (isDragging) {
      positionTouchGhost(e);
      e.preventDefault();
    }
  }, { passive: false });

  // Touch end handler
  document.addEventListener('touchend', (e) => {
    if (isDragging) {
      const touch = e.changedTouches[0];
      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = elementUnderTouch?.closest('.drop-zone');

      if (dropZone) {
        const word = activeTouchElement.dataset.word;
        
        // Remove from previous location
        const sourceZone = activeTouchElement.closest('.drop-zone');
        if (sourceZone) {
          sourceZone.innerHTML = '';
          sourceZone.dataset.filled = '';
        } else {
          activeTouchElement.remove();
        }

        // Remove existing word in target zone if any
        if (dropZone.querySelector('.dropped-word')) {
          returnToWordBank(dropZone.querySelector('.dropped-word').dataset.word);
          dropZone.innerHTML = '';
        }

        // Create new dropped word
        const wordClone = document.createElement('div');
        wordClone.textContent = word;
        wordClone.classList.add('dropped-word');
        wordClone.dataset.word = word;
        wordClone.draggable = true;
        dropZone.appendChild(wordClone);
        dropZone.dataset.filled = word;
      }
    }

    // Clean up
    body.classList.remove('no-scroll');
    document.documentElement.style.overflow = '';
    if (dragGhost) {
      document.removeEventListener('touchmove', positionTouchGhost);
      dragGhost.remove();
      dragGhost = null;
    }
    if (activeTouchElement) {
      activeTouchElement.classList.remove('dragging');
      activeTouchElement = null;
    }
    isDragging = false;
  });

  // ===== DESKTOP DRAG HANDLING =====
  document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('draggable') || e.target.classList.contains('dropped-word')) {
      body.classList.add('no-scroll');
      
      // Create ghost element
      dragGhost = e.target.cloneNode(true);
      dragGhost.classList.add('drag-ghost');
      dragGhost.style.width = `${e.target.offsetWidth}px`;
      document.body.appendChild(dragGhost);
      
      // Position it at the cursor
      document.addEventListener('dragover', positionGhost);
      e.dataTransfer.setData('text/plain', e.target.dataset.word);
      e.target.classList.add('dragging');
    }
  });

  document.addEventListener('dragover', (e) => {
    positionGhost(e);
    if (e.target.classList.contains('drop-zone')) {
      e.preventDefault();
      e.target.classList.add('hovered');
    }
  });

  document.addEventListener('dragend', () => {
    body.classList.remove('no-scroll');
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    
    // Remove ghost
    if (dragGhost) {
      document.removeEventListener('dragover', positionGhost);
      dragGhost.remove();
      dragGhost = null;
    }
  });

  // ===== SHARED DROP ZONE HANDLING =====
  document.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('drop-zone')) {
      e.target.classList.remove('hovered');
    }
  });

  document.addEventListener('drop', (e) => {
    if (e.target.classList.contains('drop-zone')) {
      e.preventDefault();
      const word = e.dataTransfer.getData('text/plain');
      const draggedElement = document.querySelector(`.dragging[data-word="${word}"]`);
      
      if (draggedElement) {
        const sourceZone = draggedElement.closest('.drop-zone');
        if (sourceZone) {
          sourceZone.innerHTML = '';
          sourceZone.dataset.filled = '';
        } else {
          draggedElement.remove();
        }

        if (e.target.querySelector('.dropped-word')) {
          const existingWord = e.target.querySelector('.dropped-word');
          returnToWordBank(existingWord.dataset.word);
          e.target.innerHTML = '';
        }

        const wordClone = document.createElement('div');
        wordClone.textContent = word;
        wordClone.classList.add('dropped-word');
        wordClone.dataset.word = word;
        wordClone.draggable = true;
        e.target.appendChild(wordClone);
        e.target.dataset.filled = word;
        e.target.classList.remove('hovered');
      }
    }
  });

  // Helper function to return words to word bank
  function returnToWordBank(word) {
    const newDraggable = document.createElement('div');
    newDraggable.textContent = word;
    newDraggable.classList.add('draggable');
    newDraggable.dataset.word = word;
    newDraggable.draggable = true;
    draggableWords.appendChild(newDraggable);
  }

  // Check answers button
  document.getElementById('checkAnswers').addEventListener('click', () => {
    const dropZones = document.querySelectorAll('.drop-zone');
    let correct = 0;
    
    dropZones.forEach(zone => {
      const filledWord = zone.querySelector('.dropped-word');
      const isCorrect = filledWord && filledWord.dataset.word === zone.dataset.expected;
      
      zone.style.backgroundColor = isCorrect ? '#d4edda' : '#ffa6a6';
      if (filledWord) {
        filledWord.style.color = isCorrect ? 'darkgreen' : 'darkred';
      }
      if (isCorrect) correct++;
    });

    const totalWords = dropZones.length;
    const score = Math.round((correct / totalWords) * 100);
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.textContent = `Score: ${score}%`;
    scoreDisplay.style.color = score === 100 ? 'darkgreen' : 'darkred';
  });
}

// Start the game when button is clicked
document.getElementById('readingGameButton').addEventListener('click', initReadingGame);