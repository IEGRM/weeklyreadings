const weekSelect = document.getElementById('weekSelect');
const gradeSelect = document.getElementById('gradeSelect');
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const imageFrame = document.getElementById('imageFrame');
const textContent = document.getElementById('textContent');

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

// Function to load reading based on selected week and grade
async function loadReading() {
  const week = weekSelect.value;
  const grade = gradeSelect.value;

  console.log(`Loading Week ${week}, Grade ${grade}`); // Debugging log

  try {
    const response = await fetch(`data/readings/week${week}/grade${grade}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    const reading = await response.json();
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
  } catch (error) {
    console.error('Error loading reading:', error);
    audioSource.src = '';
    imageFrame.src = '';
    textContent.innerHTML = 'Error loading reading. Please try again.';
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