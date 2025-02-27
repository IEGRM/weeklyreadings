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
        audio: 'audios/week1/grade6.mp3',
        image: 'images/week1/grade6.jpg',
        text: [
          { time: 0, content: '6° Grade: Week 1 - Beginning of the reading.' },
          { time: 5, content: '6° Grade: Week 1 - 5 seconds in.' },
          { time: 10, content: '6° Grade: Week 1 - 10 seconds in.' }
        ]
      },
      7: {
        audio: 'audios/week1/grade7.mp3',
        image: 'images/week1/grade7.jpg',
        text: [
          { time: 0, content: '7° Grade: Week 1 - Beginning of the reading.' },
          { time: 6, content: '7° Grade: Week 1 - 6 seconds in.' },
          { time: 12, content: '7° Grade: Week 1 - 12 seconds in.' }
        ]
      }
      // Add grades 8-11 similarly
    }
  },
  {
    week: 2,
    readings: {
      6: {
        audio: 'audios/week2/grade6.mp3',
        image: 'images/week2/grade6.jpg',
        text: [
          { time: 0, content: '6° Grade: Week 2 - Beginning of the reading.' },
          { time: 7, content: '6° Grade: Week 2 - 7 seconds in.' },
          { time: 14, content: '6° Grade: Week 2 - 14 seconds in.' }
        ]
      },
      7: {
        audio: 'audios/week2/grade7.mp3',
        image: 'images/week2/grade7.jpg',
        text: [
          { time: 0, content: '7° Grade: Week 2 - Beginning of the reading.' },
          { time: 8, content: '7° Grade: Week 2 - 8 seconds in.' },
          { time: 16, content: '7° Grade: Week 2 - 16 seconds in.' }
        ]
      }
      // Add grades 8-11 similarly
    }
  }
  // Add more weeks as needed
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
      .join('<br>'); // Add line breaks between sentences
    audioPlayer.load();
  }
}

// Function to update text based on audio time
function updateTextForCurrentTime() {
  const weekIndex = weekSelect.value;
  const grade = gradeSelect.value;
  const week = weeklyData[weekIndex];
  const reading = week.readings[grade];

  if (reading) {
    const currentTime = audioPlayer.currentTime;
    const spans = textContent.querySelectorAll('span');

    // Remove highlight from all spans
    spans.forEach((span) => span.classList.remove('highlight'));

    // Highlight the current sentence
    for (let i = reading.text.length - 1; i >= 0; i--) {
      if (currentTime >= reading.text[i].time) {
        spans[i].classList.add('highlight');
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