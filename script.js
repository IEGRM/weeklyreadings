const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const imageFrame = document.getElementById('imageFrame');
const textContent = document.getElementById('textContent');
const vocabularyContent = document.getElementById('vocabularyContent');
const quizContent = document.getElementById('quizContent');

// Populate week dropdown
for (let week = 1; week <= 39; week++) {
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

  console.log(`Loading Week ${week}, Grade ${grade}`); // Debugging log

  try {
    // Load reading
    const readingResponse = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!readingResponse.ok) {
      throw new Error(`Failed to fetch reading data: ${readingResponse.status} ${readingResponse.statusText}`);
    }
    const reading = await readingResponse.json();
    console.log("Reading data:", reading); // Debugging log

    if (reading) {
      audioSource.src = reading.audio;
      imageFrame.src = reading.image;
      textContent.innerHTML = reading.text
        .map((sentence) => `<span data-time="${sentence.time}">${sentence.content}</span>`)
        .join('');

      audioPlayer.load();
      console.log("Image path:", reading.image); // Debugging log
      console.log("All spans after loading:", document.querySelectorAll("span")); // Check if spans exist
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
    const quiz = await quizResponse.json();
    console.log("Quiz data:", quiz); // Debugging log

    if (quiz && Array.isArray(quiz.questions)) {
      quizContent.innerHTML = quiz.questions
        .map(
          (question, index) => `
            <div class="quiz-question">
              <p><strong>Question ${index + 1}:</strong> ${question.question}</p>
              <ul>
                ${question.options.map((option) => `<li>${option}</li>`).join('')}
              </ul>
              <p><strong>Answer:</strong> ${question.answer}</p>
            </div>
          `
        )
        .join('');
    } else {
      console.error("Quiz data is not in the expected format:", quiz);
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