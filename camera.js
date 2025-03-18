// camera.js

// DOM Elements for Camera
const video = document.createElement('video');
video.setAttribute('autoplay', '');
video.setAttribute('playsinline', '');
video.style.width = '100%';
video.style.height = '100%';
video.style.objectFit = 'cover';

// Function to start the camera
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (error) {
    console.error('Error accessing the camera:', error);
    alert('Could not access the camera. Please ensure you have granted the necessary permissions.');
  }
}

// Function to stop the camera
function stopCamera() {
  const stream = video.srcObject;
  if (stream) {
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
}

// Function to insert the camera feed into the image section
function insertCameraFeed() {
  const imageSection = document.getElementById('imageSection');
  imageSection.innerHTML = ''; // Clear any existing content
  imageSection.appendChild(video);
}

// Start the camera and insert the feed when the page loads
document.addEventListener('DOMContentLoaded', () => {
  insertCameraFeed();
  startCamera();
});

// Stop the camera when the page is unloaded to free up resources
window.addEventListener('beforeunload', stopCamera);