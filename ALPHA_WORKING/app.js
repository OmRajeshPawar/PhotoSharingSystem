// --- Configuration ---
// IMPORTANT: Replace this placeholder with the actual Invoke URL from API Gateway Step 20
const API_ENDPOINT = 'https://gobuez36nk.execute-api.ap-south-1.amazonaws.com/v1/upload';
const MAX_PHOTOS = 10; // Maximum photos allowed per guest
const STORAGE_KEY_PREFIX = 'wedding_photo_app_'; // Prefix for local storage keys
const STORAGE_KEY_NAME = `${STORAGE_KEY_PREFIX}guestName`;
const STORAGE_KEY_COUNT = `${STORAGE_KEY_PREFIX}photoCount`;

// --- DOM Element References ---
// Get references to all interactive elements in the HTML
const namePromptSection = document.getElementById('name-prompt');
const guestNameInput = document.getElementById('guest-name');
const submitNameButton = document.getElementById('submit-name');

const cameraSection = document.getElementById('camera-section');
const displayName = document.getElementById('display-name');
const photosRemainingSpan = document.getElementById('photos-remaining');
const takePhotoButton = document.getElementById('take-photo-button');
const photoInput = document.getElementById('photo-input'); // Hidden file input
const cameraStatusMessage = document.getElementById('camera-status-message');

const reviewSection = document.getElementById('review-section');
const photoPreview = document.getElementById('photo-preview');
const reviewStatusMessage = document.getElementById('review-status-message');
const uploadButton = document.getElementById('upload-button');
const saveButton = document.getElementById('save-button');
const discardButton = document.getElementById('discard-button');

const noPhotosSection = document.getElementById('no-photos-section');
const finalDisplayName = document.getElementById('final-display-name');

// --- State Variables ---
// These hold the application's current state
let guestName = ''; // Stores the guest's name
let photoCount = 0; // Stores the number of photos uploaded by this guest
let currentPhotoDataUrl = null; // Temporarily holds the Base64 Data URL of the photo being reviewed
let isUploading = false; // Flag to prevent multiple uploads at once

// --- Core Functions ---

/**
 * Controls which main section of the app is visible.
 * @param {string} sectionId - The ID of the HTML element section to show.
 */
function showSection(sectionId) {
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    // Show the requested section
    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';
    } else {
        console.error("Error: Section not found:", sectionId);
    }
    // Clear status messages whenever the view changes
    cameraStatusMessage.textContent = '';
    reviewStatusMessage.textContent = '';
}

/**
 * Updates the entire UI based on the current state variables (guestName, photoCount, currentPhotoDataUrl).
 */
function updateUI() {
    const remaining = Math.max(0, MAX_PHOTOS - photoCount); // Ensure remaining is not negative
    photosRemainingSpan.textContent = remaining;
    displayName.textContent = guestName; // Update name display in camera section
    finalDisplayName.textContent = guestName; // Update name display in final section

    // Determine which section to show
    if (!guestName) {
        showSection('name-prompt'); // Show name input if no name is set
    } else if (currentPhotoDataUrl) {
        // If a photo has been taken and is ready for review
        showSection('review-section');
        photoPreview.src = currentPhotoDataUrl; // Set the image source for preview
        // Ensure review buttons are enabled unless an upload is in progress
        uploadButton.disabled = isUploading;
        saveButton.disabled = isUploading;
        discardButton.disabled = isUploading;
    } else if (remaining > 0) {
        // If name is set, no photo is under review, and photos are remaining
        showSection('camera-section');
        takePhotoButton.disabled = false; // Enable the take photo button
    } else {
        // If name is set and no photos are remaining
        showSection('no-photos-section');
    }
}

/**
 * Loads the guest's name and photo count from the browser's Local Storage.
 */
function loadState() {
    guestName = localStorage.getItem(STORAGE_KEY_NAME) || '';
    photoCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
    console.log("loadState (Android): Loaded guestName:", guestName);
    console.log("loadState (Android): Loaded photoCount:", photoCount);
    currentPhotoDataUrl = null;
    isUploading = false;
    updateUI();
}

/**
 * Saves the current guest's name and photo count to Local Storage.
 */
function saveState() {
    localStorage.setItem(STORAGE_KEY_NAME, guestName);
    localStorage.setItem(STORAGE_KEY_COUNT, photoCount.toString());
}

// --- Function to handle the submission of the guest's name ---
// REPLACE the existing handleNameSubmit function in your app.js with this one
function handleNameSubmit() {
    const name = guestNameInput.value.trim(); // Get name and remove whitespace
    if (name) {
        // --- Debug Message ---
        const tempStatusElement = document.getElementById('camera-status-message');
        if(tempStatusElement) tempStatusElement.textContent = `Name submitted: ${name}`;
        // --- End Debug Message ---

        console.log("handleNameSubmit (Android - Attempting delay): Entered name:", name);
        console.log("handleNameSubmit (Android - Attempting delay): Current guestName (before update):", guestName);
        console.log("handleNameSubmit (Android - Attempting delay): Local Storage Name (before):", localStorage.getItem(STORAGE_KEY_NAME));

        const storedName = localStorage.getItem(STORAGE_KEY_NAME);
        console.log("handleNameSubmit (Android - Attempting delay): Stored Name:", storedName);

        if (storedName !== name) {
            console.log("handleNameSubmit (Android - Attempting delay): New name detected (Android), resetting photoCount.");
            photoCount = 0; // Reset count only if name is different
        } else {
            console.log("handleNameSubmit (Android - Attempting delay): Name is the same (Android), loading existing photoCount.");
            photoCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
        }

        guestName = name; // Update the in-memory guestName
        currentPhotoDataUrl = null; // Ensure not in review state
        saveState(); // Save the new name and potentially reset count
        console.log("handleNameSubmit (Android - Attempting delay): Local Storage Name (after saveState):", localStorage.getItem(STORAGE_KEY_NAME));
        console.log("handleNameSubmit (Android - Attempting delay): Local Storage Count (after saveState):", localStorage.getItem(STORAGE_KEY_COUNT));
        console.log("handleNameSubmit (Android - Attempting delay): guestName (after update):", guestName);

        // Introduce a small delay before updating the UI
        setTimeout(() => {
            updateUI(); // Update the view (should show camera section)
            console.log("handleNameSubmit (Android - Attempting delay): updateUI called after delay.");
        }, 500); // Adjust the delay (in milliseconds) as needed

        // --- Debug Message Clear (Optional) ---
        // setTimeout(() => { if(tempStatusElement) tempStatusElement.textContent = ''; }, 4000);
        // --- End Debug Message Clear ---

    } else {
        // Provide feedback if name is empty
        alert('Please enter your name.');
    }
}

/**
 * Handles the click event on the "Take Photo" button.
 */
function handleTakePhotoClick() {
    // Clear any old status messages
    cameraStatusMessage.textContent = '';
    reviewStatusMessage.textContent = '';
    // Reset the file input value. This allows capturing the same image again
    // if the user cancels the camera or review process.
    photoInput.value = null;
    // Programmatically click the hidden file input to open the camera/gallery
    photoInput.click();
}

/**
 * Handles the event when a photo file is selected. Resizes and compresses the image if necessary
 * to be under 10MB before preparing it for review.
 * @param {Event} event - The file input change event.
 */
function handlePhotoCaptured(event) {
    const file = event.target.files[0]; // Get the selected file
    if (!file) {
        console.log("No file selected.");
        return; // Exit if no file was chosen
    }

    // Basic check for image type
    if (!file.type.startsWith('image/')) {
        cameraStatusMessage.textContent = 'Please select an image file.';
        photoInput.value = null; // Reset input
        return;
    }

    cameraStatusMessage.textContent = 'Processing photo...';
    takePhotoButton.disabled = true; // Temporarily disable button

    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxSize = 1920; // Maximum width or height for resizing (adjust as needed)
            const quality = 0.7; // Compression quality (0.0 to 1.0)

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height *= maxSize / width;
                    width = maxSize;
                } else {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG with compression
            let dataUrl = canvas.toDataURL('image/jpeg', quality);

            // Check the size of the processed image (Data URL)
            const maxSizeMB = 10;
            const maxSizeBytes = maxSizeMB * 1024 * 1024;
            const dataUrlSize = dataUrl.length * (3/4) - (dataUrl.slice(-2) === '==' ? 2 : dataUrl.slice(-1) === '=' ? 1 : 0); // Approximate size calculation

            if (dataUrlSize > maxSizeBytes) {
                console.warn("Processed image is still too large. Further optimization might be needed.");
                cameraStatusMessage.textContent = `Image was processed but is still over ${maxSizeMB}MB. Please try a different image or a lower quality might be needed.`;
                takePhotoButton.disabled = false;
                photoInput.value = null;
                return;
            }

            currentPhotoDataUrl = dataUrl;
            cameraStatusMessage.textContent = ''; // Clear processing message
            updateUI(); // Show the review section
        };
        img.onerror = () => {
            console.error('Error loading image.');
            cameraStatusMessage.textContent = 'Error loading image. Please try again.';
            takePhotoButton.disabled = false;
            photoInput.value = null;
        };
        img.src = e.target.result;
    };

    reader.onerror = (error) => {
        console.error('FileReader error:', error);
        cameraStatusMessage.textContent = 'Error reading file. Please try again.';
        takePhotoButton.disabled = false;
        photoInput.value = null;
    };

    reader.readAsDataURL(file);
}
/**
 * Handles the click event on the "Upload" button in the review section.
 * Sends the photo data to the backend API.
 */
async function handleUploadClick() {
    // --- Debug Message ---
    reviewStatusMessage.textContent = `Upload attempt: guestName is currently "${guestName || 'EMPTY'}"`;
    // --- End Debug Message ---

    console.log("handleUploadClick (Android - Minimal Payload): Current guestName:", guestName);
    console.log("handleUploadClick (Android - Minimal Payload): API Endpoint:", API_ENDPOINT);
    console.log("handleUploadClick (Android - Minimal Payload): Local Storage (before upload check):", localStorage.getItem(STORAGE_KEY_NAME), localStorage.getItem(STORAGE_KEY_COUNT));

    // Prevent action if no photo is being reviewed, no name is set, or already uploading
    if (!currentPhotoDataUrl || !guestName || isUploading) {
        console.warn(`Upload button clicked but conditions not met. Has photo: ${!!currentPhotoDataUrl}, Has name: ${!!guestName}, Is uploading: ${isUploading}`);
        if (!guestName) {
            reviewStatusMessage.textContent = 'Error: Cannot upload without guest name. Please refresh and enter name.';
        } else if (!currentPhotoDataUrl) {
            reviewStatusMessage.textContent = 'Error: No photo data to upload.';
        }
        if (!isUploading) {
            uploadButton.disabled = false;
            saveButton.disabled = false;
            discardButton.disabled = false;
        }
        return;
    }

    isUploading = true;
    reviewStatusMessage.textContent = 'Attempting upload with minimal data...'; // Updated message
    uploadButton.disabled = true;
    saveButton.disabled = true;
    discardButton.disabled = true;

    try {
        console.log(`Attempting fetch to API endpoint for: ${guestName} with minimal payload.`);

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                guestName: guestName,
                imageData: currentPhotoDataUrl, // Sending a small, static string
            }),
        });

        reviewStatusMessage.textContent = `Received response status: ${response.status}`;

        if (!response.ok) {
            let errorMsg = `Upload failed with status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = `Upload failed: ${errorData.message || errorMsg}`;
            } catch (parseError) { console.warn("Could not parse error response body:", parseError); }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log('Upload successful (with minimal payload):', result);
        reviewStatusMessage.textContent = 'Upload successful!';

        photoCount++;
        currentPhotoDataUrl = null;
        saveState();
        console.log("handleUploadClick (Android - Minimal Payload): Local Storage (after successful upload):", localStorage.getItem(STORAGE_KEY_NAME), localStorage.getItem(STORAGE_KEY_COUNT));

        setTimeout(() => {
            updateUI();
            cameraStatusMessage.textContent = 'Upload successful!';
            setTimeout(() => { cameraStatusMessage.textContent = ''; }, 3000);
        }, 1000);

    } catch (error) {
        console.error('Upload error object (minimal payload):', error);
        reviewStatusMessage.textContent = 'Error: Upload failed. Please check your network connection and try again.';

        uploadButton.disabled = false;
        saveButton.disabled = false;
        discardButton.disabled = false;

    } finally {
        isUploading = false;
        if (!currentPhotoDataUrl) {
           // updateUI();
        }
    }
}
/**
 * Handles the click event on the "Save to My Device" button.
 * Triggers a browser download of the photo being reviewed.
 */
function handleSaveClick() {
    if (!currentPhotoDataUrl || isUploading) return; // Don't save if nothing to save or uploading

    try {
        const link = document.createElement('a'); // Create a temporary anchor element
        link.href = currentPhotoDataUrl; // Set the link's target to the Base64 Data URL

        // Create a suggested filename for the download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Try to infer extension from Data URL header, default to jpg
        let extension = 'jpg';
        const mimeMatch = currentPhotoDataUrl.match(/^data:image\/(\w+);base64,/);
        if (mimeMatch && mimeMatch[1]) {
            extension = mimeMatch[1];
        }
        link.download = `wedding_photo_${guestName}_${timestamp}.${extension}`; // e.g., wedding_photo_Ana_2025-10-26T10-30-00-000Z.jpeg

        // Append link to body, click it, then remove it (required for cross-browser compatibility)
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        reviewStatusMessage.textContent = 'Download initiated! Check your device.';
         // Clear the message after a few seconds
         setTimeout(() => { reviewStatusMessage.textContent = ''; }, 4000);

    } catch (error) {
        console.error('Save error:', error);
        reviewStatusMessage.textContent = 'Could not start download.';
    }
}

/**
 * Handles the click event on the "Discard & Retake" button.
 * Clears the photo being reviewed and returns to the camera view.
 */
function handleDiscardClick() {
    if (isUploading) return; // Don't discard if uploading

    console.log("Discarding photo.");
    currentPhotoDataUrl = null; // Clear the temporary photo data
    photoInput.value = null;     // Reset the file input to allow re-selection
    updateUI(); // Update the UI to go back to the camera view (or no photos view)
}


// --- Event Listeners ---
// Connect the functions to the HTML element events
submitNameButton.addEventListener('click', handleNameSubmit);
takePhotoButton.addEventListener('click', handleTakePhotoClick);
// Listen for changes on the hidden file input (when a photo is selected)
photoInput.addEventListener('change', handlePhotoCaptured);
// Listen for clicks on the review section buttons
uploadButton.addEventListener('click', handleUploadClick);
saveButton.addEventListener('click', handleSaveClick);
discardButton.addEventListener('click', handleDiscardClick);

// --- Initial Application Load ---
// Load the state from local storage and update the UI when the page loads
document.addEventListener('DOMContentLoaded', loadState);