const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const imageFrame = document.getElementById('imageFrame');
const textContent = document.getElementById('textContent');

// Data structure for all weeks and grades
const weeklyData = [
  {
    week: 1,
    readings: {
      6: {
        audio: 'audios/week1/w1-grade6.mp3',
        image: 'images/week1/w1-grade6.jpg',
        text: [
			  { time: 1, content: 'A Morning Routine: She <b>wakes</b> up.' },
			  { time: 2, content: 'She sees the moon <b>rise</b>.' },
			  { time: 4, content: 'She <b>brushes</b> her <b>teeth</b>.' },
			  { time: 7, content: 'Her <b>teeth</b> are <b>white</b>.' },
			  { time: 10, content: 'She puts on her <b>clothes</b>.' },
			  { time: 12, content: 'Her <b>shirt</b> is green.' },
			  { time: 15, content: 'Her shoes are <b>yellow</b>.' },
			  { time: 18, content: 'Her <b>pants</b> are <b>brown</b>.' },
			  { time: 21, content: 'She goes <b>downstairs</b>.' },
			  { time: 23, content: 'She gets a <b>bowl</b>.' },
			  { time: 26, content: 'She <b>pours</b> milk and <b>cereal</b>.' },
			  { time: 32, content: 'She eats.' },
			  { time: 34, content: 'She gets the <b>newspaper</b>.' },
			  { time: 37, content: 'She reads.' }
			]
      },
      7: {
        audio: 'audios/week1/w1-grade7.mp3',
        image: 'images/week1/w1-grade7.png',
        text: [
			  { time: 1, content: 'I love mornings: She <b>woke up</b> and headed to the bathroom.' },
			  { time: 2, content: 'She turned on the <b>shower</b> and stepped in.' },
			  { time: 5, content: 'The water made her hair <b>wet</b>.' },
			  { time: 9, content: 'She <b>grabbed</b> her soap and washed.' },
			  { time: 12, content: 'After finishing, she <b>wrapped</b> herself in a <b>towel</b>.' },
			  { time: 15, content: 'Looking in the <b>mirror</b>, she saw her <b>reflection</b>.' },
			  { time: 20, content: 'She needed to <b>shave</b> her legs.' },
			  { time: 24, content: 'She applied <b>cream</b> and picked up the <b>razor</b>.' },
			  { time: 27, content: 'By <b>accident</b>, she cut herself and started to <b>bleed</b>.' },
			  { time: 31, content: 'The cut began to <b>sting</b>.' },
			  { time: 35, content: 'She wiped away the <b>facial</b> expression of pain and' },
			  { time: 38, content: 'continued getting ready.' }
			]

      }
      // Add grades 8-11 similarly
    }
  }
  
  // Add more weeks as needed. by jony: remember when adding another week, must add the comma "}," after the bracket
];

// Populate week dropdown
weeklyData.forEach((week, index) => {
  const option = document.createElement('option');
  option.value = index;
  option.textContent = `Week ${week.week}`;
  weekSelect.appendChild(option);
});

// Function to load reading based on selected week and grade
function loadReading() {
  const weekIndex = weekSelect.value;
  const grade = gradeSelect.value;
  const week = weeklyData[weekIndex];
  const reading = week.readings[grade];

  if (reading) {
    audioSource.src = reading.audio;
    imageFrame.src = reading.image;
    textContent.innerHTML = reading.text
      .map((sentence) => `<span data-time="${sentence.time}">${sentence.content}</span>`)
      .join(' ');

    audioPlayer.load();

    console.log("Text loaded:", textContent.innerHTML); // Debugging log
    console.log("All spans after loading:", document.querySelectorAll("span")); // Check if spans exist
  }
}

// Function to update text based on audio time
function updateTextForCurrentTime() {
  console.log("Current audio time:", audioPlayer.currentTime); // Debugging

  const weekIndex = weekSelect.value;
  const grade = gradeSelect.value;
  const week = weeklyData[weekIndex];
  const reading = week.readings[grade];

  if (reading) {
    const currentTime = audioPlayer.currentTime;
    const spans = textContent.querySelectorAll('span');

    if (spans.length === 0) {
      console.log("No spans found! Text not loaded correctly.");
      return;
    }

    // Remove previous highlights
    spans.forEach((span) => span.classList.remove('highlight'));

    // Find the correct sentence to highlight
    for (let i = reading.text.length - 1; i >= 0; i--) {
      if (currentTime >= reading.text[i].time) {
        spans[i].classList.add('highlight');
        console.log("Highlighting:", spans[i].textContent);
        break;
      }
    }
  }
}

// Event listeners
weekSelect.addEventListener('change', loadReading);
gradeSelect.addEventListener('change', loadReading);
audioPlayer.addEventListener('timeupdate', updateTextForCurrentTime);

// Load the first week and grade by default
loadReading();