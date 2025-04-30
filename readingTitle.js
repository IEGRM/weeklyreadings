// readingTitle.js - Handles extracting and displaying the reading title

// Store the current title element reference
let titleElement;

function initializeTitleUpdater() {
    // Get the title element
    titleElement = document.getElementById('readingTitleDisplay');
    
    // Get the select elements
    const weekSelect = document.getElementById('weekSelect');
    const gradeSelect = document.getElementById('gradeSelect');
    
    // Add event listeners for changes
    if (weekSelect) {
        weekSelect.addEventListener('change', loadReadingTitle);
    }
    if (gradeSelect) {
        gradeSelect.addEventListener('change', loadReadingTitle);
    }
    
    // Load initial title
    loadReadingTitle();
}

async function loadReadingTitle() {
    if (!titleElement) return;
    
    try {
        const week = document.getElementById('weekSelect').value;
        const grade = document.getElementById('gradeSelect').value;
        
        // Show loading state
        titleElement.textContent = "Loading title...";
        
        const response = await fetch(`data/readings/week${week}_reading.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const readingData = data.readings[grade];
        
        if (!readingData?.text?.length) {
            throw new Error('No text data available for this grade');
        }

        // Extract title from first line (between <b> tags)
        const firstLine = readingData.text[0].content;
        const titleMatch = firstLine.match(/<b>(.*?)<\/b>/);
        
        if (!titleMatch) {
            throw new Error('No title found in the content');
        }
        
        const title = titleMatch[1].replace(/<br>/g, '').trim();
        titleElement.textContent = title;
        
    } catch (error) {
        console.error("Error loading reading title:", error);
        titleElement.textContent = "Weekly Reading";
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTitleUpdater);

// Make function available to other scripts
window.loadReadingTitle = loadReadingTitle;