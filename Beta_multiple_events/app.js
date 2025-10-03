// --- Configuration ---
// API_ENDPOINT remains the same
const API_ENDPOINT = 'https://gobuez36nk.execute-api.ap-south-1.amazonaws.com/v1/upload'; // Keep your actual endpoint
const MAX_PHOTOS = 10;
const STORAGE_KEY_PREFIX = 'wedding_photo_app_';
const DEFAULT_EVENT_NAME = 'general'; // Fallback if event name isn't set in HTML

// --- DOM Element References ---
// (Keep all your existing getElementById references)
const namePromptSection = document.getElementById('name-prompt');
const guestNameInput = document.getElementById('guest-name');
const submitNameButton = document.getElementById('submit-name');
const cameraSection = document.getElementById('camera-section');
const displayName = document.getElementById('display-name');
const photosRemainingSpan = document.getElementById('photos-remaining');
const takePhotoButton = document.getElementById('take-photo-button');
const photoInput = document.getElementById('photo-input');
const cameraStatusMessage = document.getElementById('camera-status-message');
const reviewSection = document.getElementById('review-section');
const photoPreview = document.getElementById('photo-preview');
const reviewStatusMessage = document.getElementById('review-status-message');
const uploadButton = document.getElementById('upload-button');
const saveButton = document.getElementById('save-button');
const discardButton = document.getElementById('discard-button');
const noPhotosSection = document.getElementById('no-photos-section');
const finalDisplayName = document.getElementById('final-display-name');
// You might add specific elements per HTML if needed, but try to keep structure common

// --- State Variables ---
let guestName = '';
let photoCount = 0;
let currentPhotoDataUrl = null;
let isUploading = false;
let eventName = DEFAULT_EVENT_NAME; // Initialize with default

// Dynamic local storage keys
let STORAGE_KEY_NAME = '';
let STORAGE_KEY_COUNT = '';

// --- Core Functions ---

/**
 * Sets the dynamic local storage keys based on the current eventName.
 * (No changes needed in this function)
 */
function setStorageKeys() {
    const safeEventKeyPart = eventName.replace(/[^a-zA-Z0-9_-]/g, '_');
    STORAGE_KEY_NAME = `${STORAGE_KEY_PREFIX}${safeEventKeyPart}_guestName`;
    STORAGE_KEY_COUNT = `${STORAGE_KEY_PREFIX}${safeEventKeyPart}_photoCount`;
    console.log("Storage keys set for event:", eventName, "->", STORAGE_KEY_NAME, STORAGE_KEY_COUNT);
}

/**
 * NEW: Reads the event name from the global variable set in the HTML.
 */
function getEventNameFromHtml() {
    if (typeof currentEventName !== 'undefined' && currentEventName) {
        eventName = currentEventName;
        console.log("Event name found in HTML:", eventName);
    } else {
        eventName = DEFAULT_EVENT_NAME;
        console.warn("Global variable 'currentEventName' not defined in HTML, using default:", eventName);
        // Optionally display a warning to the user
        // cameraStatusMessage.textContent = "Warning: Event context missing.";
    }
}


/**
 * Controls which main section of the app is visible.
 * (No changes needed in this function)
 */
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';
    } else {
        console.error("Error: Section not found:", sectionId);
    }
    cameraStatusMessage.textContent = '';
    reviewStatusMessage.textContent = '';
}

/**
 * Updates the entire UI based on the current state variables.
 * (No changes needed in this function)
 */
function updateUI() {
    const remaining = Math.max(0, MAX_PHOTOS - photoCount);
    photosRemainingSpan.textContent = remaining;
    displayName.textContent = guestName;
    finalDisplayName.textContent = guestName;

    if (!guestName) {
        showSection('name-prompt');
    } else if (currentPhotoDataUrl) {
        showSection('review-section');
        photoPreview.src = currentPhotoDataUrl;
        uploadButton.disabled = isUploading;
        saveButton.disabled = isUploading;
        discardButton.disabled = isUploading;
    } else if (remaining > 0) {
        showSection('camera-section');
        takePhotoButton.disabled = false;
    } else {
        showSection('no-photos-section');
    }
}

/**
 * Loads the guest's name and photo count from Local Storage for the current event.
 * MODIFIED: Calls getEventNameFromHtml instead of URL parser.
 */
function loadState() {
    getEventNameFromHtml(); // MODIFIED: Get event name from HTML global var
    setStorageKeys();       // Set storage keys based on event name

    guestName = localStorage.getItem(STORAGE_KEY_NAME) || '';
    photoCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
    console.log(`loadState for event '${eventName}': Loaded guestName: ${guestName}, photoCount: ${photoCount}`);
    currentPhotoDataUrl = null;
    isUploading = false;
    updateUI();
}

/**
 * Saves the current guest's name and photo count to Local Storage for the current event.
 * (No changes needed in this function)
 */
function saveState() {
    if (!STORAGE_KEY_NAME || !STORAGE_KEY_COUNT) {
        console.error("Cannot save state: Storage keys not set.");
        return;
    }
    localStorage.setItem(STORAGE_KEY_NAME, guestName);
    localStorage.setItem(STORAGE_KEY_COUNT, photoCount.toString());
    console.log(`saveState for event '${eventName}': Saved guestName: ${guestName}, photoCount: ${photoCount}`);
}

/**
 * Handles the submission of the guest's name. Resets count if name changes for this event.
 * (No changes needed in this function)
 */
function handleNameSubmit() {
    const name = guestNameInput.value.trim();
    if (name) {
        console.log(`handleNameSubmit for event '${eventName}': Entered name: ${name}`);
        const storedName = localStorage.getItem(STORAGE_KEY_NAME);

        if (storedName !== name) {
            console.log("New name detected for this event, resetting photoCount.");
            photoCount = 0;
        } else {
            console.log("Name is the same for this event, loading existing photoCount.");
            photoCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
        }

        guestName = name;
        currentPhotoDataUrl = null;
        saveState();

        setTimeout(() => {
            updateUI();
        }, 100);

    } else {
        alert('Please enter your name.');
    }
}

/**
 * Handles the click event on the "Take Photo" button.
 * (No changes needed in this function)
 */
function handleTakePhotoClick() {
    cameraStatusMessage.textContent = '';
    reviewStatusMessage.textContent = '';
    photoInput.value = null;
    photoInput.click();
}

/**
 * Handles the event when a photo file is selected. Resizes/compresses if necessary.
 * (No changes needed in this function)
 */
function handlePhotoCaptured(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        cameraStatusMessage.textContent = 'Please select an image file.';
        photoInput.value = null;
        return;
    }
    cameraStatusMessage.textContent = 'Processing photo...';
    takePhotoButton.disabled = true;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxSize = 1920;
            const quality = 0.7;

            if (width > maxSize || height > maxSize) {
                if (width > height) { height *= maxSize / width; width = maxSize; }
                else { width *= maxSize / height; height = maxSize; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            // Basic size check (optional, as Lambda/API GW have limits)
            // ... (keep size check if desired) ...
            currentPhotoDataUrl = dataUrl;
            cameraStatusMessage.textContent = '';
            updateUI();
        };
        img.onerror = () => {
            console.error('Error loading image.');
            cameraStatusMessage.textContent = 'Error loading image. Please try again.';
            takePhotoButton.disabled = false; photoInput.value = null;
        };
        img.src = e.target.result;
    };
    reader.onerror = (error) => {
        console.error('FileReader error:', error);
        cameraStatusMessage.textContent = 'Error reading file. Please try again.';
        takePhotoButton.disabled = false; photoInput.value = null;
    };
    reader.readAsDataURL(file);
}


/**
 * Handles the click event on the "Upload" button. Triggers download & sends data.
 * (No changes needed in this function - it already uses the 'eventName' variable)
 */
async function handleUploadClick() {
    console.log(`handleUploadClick triggered for event '${eventName}' by guest '${guestName}'`);
    if (!currentPhotoDataUrl || !guestName || !eventName || isUploading) {
        // (Keep validation logic)
        console.warn(`Upload conditions not met. Photo: ${!!currentPhotoDataUrl}, Name: ${!!guestName}, Event: ${!!eventName}, Uploading: ${isUploading}`);
        if (!guestName) reviewStatusMessage.textContent = 'Error: Guest name missing.';
        else if (!eventName || eventName === DEFAULT_EVENT_NAME) reviewStatusMessage.textContent = 'Error: Event context missing.';
        else if (!currentPhotoDataUrl) reviewStatusMessage.textContent = 'Error: No photo data.';
        return;
    }

    // Trigger download first
    handleSaveClick();

    isUploading = true;
    reviewStatusMessage.textContent = 'Uploading... (Download initiated)';
    uploadButton.disabled = true; saveButton.disabled = true; discardButton.disabled = true;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({
                guestName: guestName,
                eventName: eventName, // Uses the 'eventName' read from HTML global var
                imageData: currentPhotoDataUrl,
            }),
        });
        reviewStatusMessage.textContent = `Upload response status: ${response.status}`;
        if (!response.ok) {
            // (Keep error handling logic)
            let errorMsg = `Upload failed: ${response.status}`;
            try { errorMsg = `Upload failed: ${(await response.json()).message || errorMsg}`; } catch (e) {}
            throw new Error(errorMsg);
        }
        const result = await response.json();
        console.log('Upload successful:', result);
        reviewStatusMessage.textContent = 'Upload successful!';
        photoCount++;
        currentPhotoDataUrl = null;
        saveState();
        setTimeout(() => {
            updateUI();
            cameraStatusMessage.textContent = 'Upload successful!';
            setTimeout(() => { cameraStatusMessage.textContent = ''; }, 3000);
        }, 1000);
    } catch (error) {
        console.error('Upload error:', error);
        reviewStatusMessage.textContent = `Error: ${error.message || 'Upload failed.'}`;
        uploadButton.disabled = false; saveButton.disabled = false; discardButton.disabled = false;
    } finally {
        isUploading = false;
        if (currentPhotoDataUrl) { // Re-enable buttons if error occurred before clearing photo
             uploadButton.disabled = false; saveButton.disabled = false; discardButton.disabled = false;
        }
    }
}

/**
 * Handles the click event on the "Save to My Device" button.
 * (No changes needed in this function - it already uses 'eventName')
 */
function handleSaveClick() {
    if (!currentPhotoDataUrl) { /* ... */ return; }
    try {
        const link = document.createElement('a');
        link.href = currentPhotoDataUrl;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let extension = 'jpg';
        const mimeMatch = currentPhotoDataUrl.match(/^data:image\/(\w+);base64,/);
        if (mimeMatch && mimeMatch[1]) extension = mimeMatch[1];
        link.download = `photo_${eventName}_${guestName}_${timestamp}.${extension}`; // Uses eventName
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        if (!isUploading) { /* Show status message only on manual save */
            reviewStatusMessage.textContent = 'Download initiated!';
            setTimeout(() => { reviewStatusMessage.textContent = ''; }, 4000);
        }
    } catch (error) { /* ... */ }
}

/**
 * Handles the click event on the "Discard & Retake" button.
 * (No changes needed in this function)
 */
function handleDiscardClick() {
    if (isUploading) return;
    console.log("Discarding photo.");
    currentPhotoDataUrl = null; photoInput.value = null;
    updateUI();
}

// --- Event Listeners ---
// (Keep all your existing event listeners - no changes needed)
submitNameButton.addEventListener('click', handleNameSubmit);
takePhotoButton.addEventListener('click', handleTakePhotoClick);
photoInput.addEventListener('change', handlePhotoCaptured);
uploadButton.addEventListener('click', handleUploadClick);
saveButton.addEventListener('click', handleSaveClick);
discardButton.addEventListener('click', handleDiscardClick);

// --- Initial Application Load ---
// MODIFIED: Call loadState which now reads from HTML global var
document.addEventListener('DOMContentLoaded', loadState);