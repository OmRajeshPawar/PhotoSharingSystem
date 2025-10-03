// JavaScript File (e.g., app.js) - UPDATED

// --- Configuration ---
const API_ENDPOINT = 'https://gobuez36nk.execute-api.ap-south-1.amazonaws.com/v1/upload'; // Keep your actual endpoint
const MAX_PHOTOS = 10; // This is now primarily enforced server-side, but good for UI feedback
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
const limitReachedSection = document.getElementById('limit-reached-section'); // NEW: Section for limit message
const limitReachedName = document.getElementById('limit-reached-name'); // NEW: Display name in limit message


// --- State Variables ---
let guestName = '';
let photoCount = 0; // Still useful for client-side UI hints, but server is source of truth
let currentPhotoDataUrl = null;
let isUploading = false;
let eventName = DEFAULT_EVENT_NAME;
let deviceID = ''; // NEW: To store the unique device identifier for this event

// Dynamic local storage keys
let STORAGE_KEY_NAME = '';
let STORAGE_KEY_COUNT = '';
let STORAGE_KEY_DEVICE_ID = ''; // NEW: Key for device ID

// --- UUID Generation ---
// Simple UUID v4 generator (good enough for this purpose)
function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// --- Core Functions ---

/**
 * Sets the dynamic local storage keys based on the current eventName.
 * MODIFIED: Added key for Device ID.
 */
function setStorageKeys() {
    const safeEventKeyPart = eventName.replace(/[^a-zA-Z0-9_-]/g, '_');
    STORAGE_KEY_NAME = `${STORAGE_KEY_PREFIX}${safeEventKeyPart}_guestName`;
    STORAGE_KEY_COUNT = `${STORAGE_KEY_PREFIX}${safeEventKeyPart}_photoCount`;
    STORAGE_KEY_DEVICE_ID = `${STORAGE_KEY_PREFIX}${safeEventKeyPart}_deviceID`; // NEW
    console.log("Storage keys set for event:", eventName, "->", STORAGE_KEY_NAME, STORAGE_KEY_COUNT, STORAGE_KEY_DEVICE_ID);
}

/**
 * Reads the event name from the global variable set in the HTML.
 * (No changes needed)
 */
function getEventNameFromHtml() {
    if (typeof currentEventName !== 'undefined' && currentEventName) {
        eventName = currentEventName;
        console.log("Event name found in HTML:", eventName);
    } else {
        eventName = DEFAULT_EVENT_NAME;
        console.warn("Global variable 'currentEventName' not defined in HTML, using default:", eventName);
    }
}

/**
 * NEW: Gets or generates the Device ID for the current event from Local Storage.
 */
function ensureDeviceID() {
    if (!STORAGE_KEY_DEVICE_ID) {
        console.error("Device ID storage key not set. Cannot get/set Device ID.");
        // Fallback or error handling needed? For now, generate one anyway but log error.
        setStorageKeys(); // Try setting keys again
        if(!STORAGE_KEY_DEVICE_ID) return; // If still failing, stop
    }

    let storedDeviceID = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (storedDeviceID) {
        deviceID = storedDeviceID;
        console.log(`Device ID retrieved for event '${eventName}': ${deviceID}`);
    } else {
        deviceID = generateUUID();
        localStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceID);
        console.log(`New Device ID generated and stored for event '${eventName}': ${deviceID}`);
    }
}


/**
 * Controls which main section of the app is visible.
 * MODIFIED: Added handling for the new 'limit-reached-section'.
 */
function showSection(sectionId) {
    console.log("Showing section:", sectionId); // Debug log
    document.querySelectorAll('.section').forEach(section => {
        if (section.id === sectionId) {
            // Delay slightly before adding active class to allow display: block to take effect
            // This ensures the transition is visible.
             section.style.display = 'block'; // Make it take up space first
             setTimeout(() => {
                section.classList.add('active');
             }, 10); // Small delay
        } else {
            section.classList.remove('active');
            // Wait for transition to finish before setting display none
             section.addEventListener('transitionend', function handleTransitionEnd() {
                if (!section.classList.contains('active')) {
                    section.style.display = 'none';
                }
                section.removeEventListener('transitionend', handleTransitionEnd); // Clean up listener
             }, { once: true }); // Use once option if available

             // Fallback timeout if transitionend doesn't fire (e.g., element already hidden)
             setTimeout(() => {
                 if (!section.classList.contains('active')) {
                    section.style.display = 'none';
                 }
             }, 650); // Slightly longer than transition duration (0.6s)
        }
    });

    // Clear status messages when changing sections
    if (cameraStatusMessage) cameraStatusMessage.textContent = '';
    if (reviewStatusMessage) reviewStatusMessage.textContent = '';
}

/**
 * Updates the entire UI based on the current state variables.
 * MODIFIED: Check photoCount against MAX_PHOTOS, potentially show limit section.
 */
function updateUI() {
    // Server count is the truth, but local count helps UI immediately.
    // We might get the actual count back from the server on successful upload.
    const remaining = Math.max(0, MAX_PHOTOS - photoCount);
    photosRemainingSpan.textContent = remaining;
    displayName.textContent = guestName;
    finalDisplayName.textContent = guestName;
    if (limitReachedName) limitReachedName.textContent = guestName; // Update name in limit section

    if (!guestName) {
        showSection('name-prompt');
    } else if (currentPhotoDataUrl) {
        showSection('review-section');
        photoPreview.src = currentPhotoDataUrl;
        uploadButton.disabled = isUploading;
        saveButton.disabled = isUploading;
        discardButton.disabled = isUploading;
    } else if (photoCount >= MAX_PHOTOS) { // Check local count for immediate UI feedback
        showSection('limit-reached-section'); // Show limit reached section
    } else if (remaining > 0) {
        showSection('camera-section');
        takePhotoButton.disabled = false;
    } else { // Fallback or initial state before count known?
         showSection('camera-section'); // Default to camera if count is 0 and name known
         takePhotoButton.disabled = false;
    }
}

/**
 * Loads state from Local Storage for the current event.
 * MODIFIED: Calls getEventNameFromHtml, sets storage keys, ensures Device ID.
 */
function loadState() {
    getEventNameFromHtml();
    setStorageKeys();
    ensureDeviceID(); // Ensure we have a Device ID for this session/event

    guestName = localStorage.getItem(STORAGE_KEY_NAME) || '';
    photoCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
    console.log(`loadState for event '${eventName}': Loaded guestName: ${guestName}, photoCount: ${photoCount}, deviceID: ${deviceID}`);
    currentPhotoDataUrl = null;
    isUploading = false;
    updateUI();
}

/**
 * Saves the current guest's name and photo count to Local Storage for the current event.
 * NOTE: Server count is the real truth, this is mostly for quick UI refresh.
 * (No major changes needed, maybe remove count saving if server response is always used)
 */
function saveState() {
    if (!STORAGE_KEY_NAME || !STORAGE_KEY_COUNT) {
        console.error("Cannot save state: Storage keys not set.");
        return;
    }
    localStorage.setItem(STORAGE_KEY_NAME, guestName);
    // Only save count if NOT relying solely on server response count
    localStorage.setItem(STORAGE_KEY_COUNT, photoCount.toString());
    console.log(`saveState for event '${eventName}': Saved guestName: ${guestName}, photoCount: ${photoCount}`);
}

/**
 * Handles the submission of the guest's name.
 * MODIFIED: Reset count/ID only if name changes *for this specific event's storage*. Also ensures Device ID is ready.
 */
function handleNameSubmit() {
    const name = guestNameInput.value.trim();
    if (name) {
        console.log(`handleNameSubmit for event '${eventName}': Entered name: ${name}`);
        const storedName = localStorage.getItem(STORAGE_KEY_NAME);

        // If name changes, we might reset local count, but DeviceID persists unless cache cleared.
        // The server still tracks by DeviceID.
        if (storedName !== name) {
            console.log("Name changed locally for this event. Local photoCount might be reset if desired, but server tracks by DeviceID.");
            // Decide if resetting local count makes sense. Let's keep it simple and NOT reset count here.
            // The server's count based on DeviceID is what matters for the limit.
             photoCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10); // Keep existing count for this device/event
        } else {
            console.log("Name is the same for this event, loading existing photoCount.");
            photoCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
        }

        guestName = name;
        currentPhotoDataUrl = null;
        ensureDeviceID(); // Make sure we have the device ID ready
        saveState(); // Save the potentially new name

        setTimeout(() => {
            updateUI();
        }, 100);

    } else {
        alert('Please enter your name.');
    }
}

/**
 * Handles the click event on the "Take Photo" button.
 * (No changes needed)
 */
function handleTakePhotoClick() {
    // Check local count first for immediate feedback, although server has final say
    if (photoCount >= MAX_PHOTOS) {
         reviewStatusMessage.textContent = `You have reached the limit of ${MAX_PHOTOS} photos.`;
         showSection('limit-reached-section'); // Ensure limit section is shown
         return;
    }
    cameraStatusMessage.textContent = '';
    reviewStatusMessage.textContent = '';
    photoInput.value = null;
    photoInput.click();
}

/**
 * Handles the event when a photo file is selected. Resizes/compresses.
 * (No changes needed in core logic, keep resizing)
 */
function handlePhotoCaptured(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        cameraStatusMessage.textContent = 'Please select an image file.';
        photoInput.value = null;
        return;
    }
    // Check local count again before processing
     if (photoCount >= MAX_PHOTOS) {
         cameraStatusMessage.textContent = `Upload limit reached (${MAX_PHOTOS}). Cannot process new photo.`;
         showSection('limit-reached-section');
         photoInput.value = null; // Clear selection
         return;
    }

    cameraStatusMessage.textContent = 'Processing photo...';
    takePhotoButton.disabled = true;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width; let height = img.height;
            const maxSize = 1920; const quality = 0.7;
            if (width > maxSize || height > maxSize) {
                if (width > height) { height *= maxSize / width; width = maxSize; }
                else { width *= maxSize / height; height = maxSize; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            currentPhotoDataUrl = dataUrl;
            cameraStatusMessage.textContent = '';
            updateUI(); // Go to review section
        };
        img.onerror = () => { /* (Keep error handling) */ console.error('Error loading image.'); cameraStatusMessage.textContent = 'Error loading image.'; takePhotoButton.disabled = false; photoInput.value = null; };
        img.src = e.target.result;
    };
    reader.onerror = (error) => { /* (Keep error handling) */ console.error('FileReader error:', error); cameraStatusMessage.textContent = 'Error reading file.'; takePhotoButton.disabled = false; photoInput.value = null; };
    reader.readAsDataURL(file);
}


/**
 * Handles the click event on the "Upload" button.
 * MODIFIED: Sends deviceID in the payload and handles 429 response.
 */
async function handleUploadClick() {
    console.log(`handleUploadClick triggered for event '${eventName}' by guest '${guestName}' device '${deviceID}'`);
    // Add check for deviceID
    if (!currentPhotoDataUrl || !guestName || !eventName || !deviceID || isUploading) {
        console.warn(`Upload conditions not met. Photo: ${!!currentPhotoDataUrl}, Name: ${!!guestName}, Event: ${!!eventName}, DeviceID: ${!!deviceID}, Uploading: ${isUploading}`);
        if (!guestName) reviewStatusMessage.textContent = 'Error: Guest name missing.';
        else if (!eventName) reviewStatusMessage.textContent = 'Error: Event context missing.';
        else if (!deviceID) reviewStatusMessage.textContent = 'Error: Device identifier missing. Please refresh.'; // Added Device ID check
        else if (!currentPhotoDataUrl) reviewStatusMessage.textContent = 'Error: No photo data.';
        return;
    }
     // Check local count as preliminary step
     if (photoCount >= MAX_PHOTOS) {
         reviewStatusMessage.textContent = `Upload limit reached (${MAX_PHOTOS}).`;
         showSection('limit-reached-section');
         return;
    }


    // Trigger download first (optional, keep if desired)
    handleSaveClick(); // Consider if this should happen only on success or be optional

    isUploading = true;
    reviewStatusMessage.textContent = 'Uploading...(Download initiated)'; // Simpler message
    uploadButton.disabled = true; saveButton.disabled = true; discardButton.disabled = true;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({
                guestName: guestName,
                eventName: eventName,
                deviceID: deviceID, // NEW: Send the device ID
                imageData: currentPhotoDataUrl,
            }),
        });

        // Check for specific "Limit Reached" status code
        if (response.status === 429) {
            const result = await response.json();
            console.warn('Upload limit reached:', result.message);
            reviewStatusMessage.textContent = result.message || `Upload limit (${MAX_PHOTOS}) reached for this device.`;
            photoCount = MAX_PHOTOS; // Update local count to reflect limit
            saveState(); // Save updated local count
            currentPhotoDataUrl = null; // Clear photo data
            updateUI(); // Update UI to show limit section
            return; // Stop processing
        }

        // Check for other non-OK responses
        if (!response.ok) {
            let errorMsg = `Upload failed: ${response.status}`;
            try { errorMsg = `Upload failed: ${(await response.json()).message || errorMsg}`; } catch (e) {}
            throw new Error(errorMsg);
        }

        // --- Success ---
        const result = await response.json();
        console.log('Upload successful:', result);
        reviewStatusMessage.textContent = 'Upload successful! (Photo Downloaded to Device)';
        // Use server's count if available, otherwise increment local
        photoCount = result.uploadCount ? parseInt(result.uploadCount, 10) : photoCount + 1;
        currentPhotoDataUrl = null;
        saveState(); // Save updated state (especially the count)
        setTimeout(() => {
            updateUI();
            cameraStatusMessage.textContent = 'Upload successful!'; // Feedback in camera view
            setTimeout(() => { cameraStatusMessage.textContent = ''; }, 3000);
        }, 1000);

    } catch (error) {
        console.error('Upload error:', error);
        reviewStatusMessage.textContent = `Error: ${error.message || 'Upload failed.'}`;
        // Re-enable buttons on error
        uploadButton.disabled = false; saveButton.disabled = false; discardButton.disabled = false;
    } finally {
        isUploading = false;
        // Re-enable buttons if the photo wasn't successfully cleared (e.g., error occurred)
        if (currentPhotoDataUrl) {
            uploadButton.disabled = false; saveButton.disabled = false; discardButton.disabled = false;
        }
    }
}

/**
 * Handles the click event on the "Save to My Device" button.
 * (No changes needed, filename logic is fine)
 */
function handleSaveClick() {
    if (!currentPhotoDataUrl) { reviewStatusMessage.textContent = 'No photo to save.'; return; }
    try {
        const link = document.createElement('a');
        link.href = currentPhotoDataUrl;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let extension = 'jpg';
        const mimeMatch = currentPhotoDataUrl.match(/^data:image\/(\w+);base64,/);
        if (mimeMatch && mimeMatch[1]) extension = mimeMatch[1];
        link.download = `photo_${eventName}_${guestName}_${timestamp}.${extension}`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        if (!isUploading) { // Avoid double message if upload triggers save
             reviewStatusMessage.textContent = 'Download initiated!';
             setTimeout(() => { reviewStatusMessage.textContent = ''; }, 4000);
        }
    } catch (error) { console.error('Save error:', error); reviewStatusMessage.textContent = 'Could not initiate download.'; }
}

/**
 * Handles the click event on the "Discard & Retake" button.
 * (No changes needed)
 */
function handleDiscardClick() {
    if (isUploading) return;
    console.log("Discarding photo.");
    currentPhotoDataUrl = null; photoInput.value = null;
    updateUI(); // Go back to camera view (or limit view if applicable)
}

// --- Event Listeners ---
// (Keep all existing event listeners)
submitNameButton.addEventListener('click', handleNameSubmit);
takePhotoButton.addEventListener('click', handleTakePhotoClick);
photoInput.addEventListener('change', handlePhotoCaptured);
uploadButton.addEventListener('click', handleUploadClick);
saveButton.addEventListener('click', handleSaveClick);
discardButton.addEventListener('click', handleDiscardClick);

// --- Initial Application Load ---
// MODIFIED: Calls loadState which now also handles Device ID
document.addEventListener('DOMContentLoaded', loadState);