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

// Populate week dropdown (agregar cada semana una semana más para mostrar la ultima desarrollada)
for (let week = 1; week <= 5; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = `Week ${week}`;
  if (week === 1) {
    option.selected = true; // Set Week 1 as the default selection
  }
  weekSelect.appendChild(option);
}

// Function to load reading, vocabulary, and quiz based on selected week and grade

async function loadReading() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;  

  try {
    // Load reading for audio by jony
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) {
      throw new Error(`Failed to fetch reading data: ${readingResponse.status} ${readingResponse.statusText}`);
    }
    const reading = await readingResponse.json();    

    if (reading) {
      audioSource.src = reading.audio;
      imageFrame.src = reading.image;
      textContent.innerHTML = reading.text
        .map((sentence) => `<span data-time="${sentence.time}">${sentence.content}</span>`)
        .join('');

      audioPlayer.load();      
    }

    // Load vocabulary
    const vocabularyResponse = await fetch(`data/vocabulary/week${week}/grade${grade}.json`);
    if (!vocabularyResponse.ok) {
      throw new Error(`Failed to fetch vocabulary data: ${vocabularyResponse.status} ${vocabularyResponse.statusText}`);
    }
    const vocabularyData = await vocabularyResponse.json(); // Parse the JSON object
    console.log("Vocabulary data:", vocabularyData); // Debugging log

    // Access the array inside the "vocabulary" key
    if (vocabularyData.vocabulary && Array.isArray(vocabularyData.vocabulary)) {
      vocabularyContent.innerHTML = vocabularyData.vocabulary
        .map((item) => `<div><strong>${item.word}:</strong> ${item.definition}</div>`)
        .join('');
    } else {
      console.error("Vocabulary data is not in the expected format:", vocabularyData);
      vocabularyContent.innerHTML = "No vocabulary data available.";
    }

    
	// Load quiz
    const quizResponse = await fetch(`data/quizzes/week${week}/grade${grade}.json`);
    if (!quizResponse.ok) {
      throw new Error(`Failed to fetch quiz data: ${quizResponse.status} ${quizResponse.statusText}`);
    }
    const quizData = await quizResponse.json();
    console.log("Quiz data:", quizData); // Debugging log

    // Access the array inside the "quiz" key
    if (quizData.quiz && Array.isArray(quizData.quiz)) {
      quizContent.innerHTML = quizData.quiz
        .map(
          (question, index) => `
            <div class="quiz-question">
              <p><strong>Question ${index + 1}:</strong> ${question.question}</p>
              <ul>
                ${question.options.map((option) => `
                  <li>
                    <input type="radio" name="question${index}" value="${option}">
                    ${option}
                  </li>
                `).join('')}
              </ul>
            </div>
          `
        )
        .join('');
    } else {
      console.error("Quiz data is not in the expected format:", quizData);
      quizContent.innerHTML = "No quiz data available.";
    }
  } catch (error) {
    console.error('Error loading content:', error);
    audioSource.src = '';
    imageFrame.src = '';
    textContent.innerHTML = 'Error loading content. Please try again.';
    vocabularyContent.innerHTML = ''; // Clear vocabulary content on error
    quizContent.innerHTML = ''; // Clear quiz content on error
  }
}

// Function to calculate the score
function calculateScore() {
  const questions = document.querySelectorAll('.quiz-question');
  let score = 0;

  questions.forEach((question, index) => {
    const selectedOption = question.querySelector('input[type="radio"]:checked');
    if (selectedOption) {
      const userAnswer = selectedOption.value;
      const correctAnswer = quizData.quiz[index].answer;

      if (userAnswer === correctAnswer) {
        score += 1;
      }
    }
  });

  return score;
}

// Function to display feedback based on the score
function displayFeedback(score) {
  let feedback = '';
  switch (score) {
    case 1:
      feedback = "Too low. (Muy bajito)";
      break;
    case 2:
      feedback = "Getting better (Mejorando)";
      break;
    case 3:
      feedback = "Just made it (Pasaste)";
      break;
    case 4:
      feedback = "Good job (Buen trabajo)";
      break;
    case 5:
      feedback = "Amazing work! (Estupendo)";
      break;
    default:
      feedback = "Please answer all questions to get your score.";
  }
  scoreFeedback.textContent = `Score: ${score}/5 - ${feedback}`;
}

// Event listener for the "My Score" button
scoreButton.addEventListener('click', () => {
  const score = calculateScore();
  displayFeedback(score);
});

// Event listener for the "Clear" button
clearButton.addEventListener('click', () => {
  const radioButtons = document.querySelectorAll('input[type="radio"]');
  radioButtons.forEach((radio) => (radio.checked = false));
  scoreFeedback.textContent = ''; // Clear the feedback
});


// Function to update text based on audio time
function updateTextForCurrentTime() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;

  // Fetch the reading data again to get the text with timestamps
  fetch(`data/readings/week${week}/grade${grade}.json`)
    .then((response) => response.json())
    .then((reading) => {
      const currentTime = audioPlayer.currentTime;
      const spans = document.querySelectorAll("#textContent span");

      if (spans.length === 0) {
        console.log("No spans found! Text not loaded correctly.");
        return;
      }

      // Remove previous highlights
      spans.forEach((span) => span.classList.remove("highlight"));

      // Find the correct sentence to highlight
      for (let i = reading.text.length - 1; i >= 0; i--) {
        if (currentTime >= reading.text[i].time) {
          spans[i].classList.add("highlight");
          console.log("Highlighting:", spans[i].textContent);
          break;
        }
      }
    })
    .catch((error) => {
      console.error('Error fetching reading data:', error);
    });
}

// Event listeners
weekSelect.addEventListener('change', loadReading);
gradeSelect.addEventListener('change', loadReading);
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);

// Load the first week and grade by default
loadReading();