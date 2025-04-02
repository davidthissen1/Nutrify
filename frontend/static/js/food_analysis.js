/**
 * Nutrition Tracker - Food Analysis Module
 * Handles the food analyzer functionality including text analysis and image upload
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Food Analysis JS loaded');
    
    // Initialize tab switching
    initTabSwitching();
    
    // Initialize text analysis
    initTextAnalysis();
    
    // Initialize camera functionality
    initCamera();
    
    // Initialize image upload
    initImageUpload();
});

/**
 * Initialize tab switching between text and upload
 */
function initTabSwitching() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (!tabs.length || !tabContents.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Get the target tab content ID
            const targetId = this.getAttribute('data-tab');
            
            // Update active tab styling
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide appropriate tab content
            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
}

/**
 * Initialize text analysis functionality
 */
function initTextAnalysis() {
    const textForm = document.getElementById('text-form');
    const analyzeBtn = document.getElementById('analyze-text-btn');
    const foodDesc = document.getElementById('food-description');
    
    if (!textForm || !analyzeBtn || !foodDesc) {
        console.log('Text analysis elements not found');
        return;
    }
    
    // Prevent default form submission
    textForm.addEventListener('submit', function(e) {
        e.preventDefault();
        analyzeFood();
    });
    
    // Add click handler for analyze button
    analyzeBtn.addEventListener('click', function() {
        analyzeFood();
    });
    
    function analyzeFood() {
        const text = foodDesc.value.trim();
        
        if (!text) {
            alert('Please enter a food description.');
            return;
        }
        
        // Show loading indicator and hide results
        showLoading();
        
        // Send the text to the backend for analysis
        fetch('/api/food/analyze-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            
            if (data.success) {
                displayResults(data.data);
            } else {
                showError(data.error || 'Failed to analyze food');
            }
        })
        .catch(error => {
            hideLoading();
            showError('Error analyzing food: ' + error.message);
            console.error('Analysis error:', error);
        });
    }
}

/**
 * Initialize camera functionality
 */
function initCamera() {
    const videoElement = document.getElementById('camera-preview');
    const canvasElement = document.getElementById('camera-canvas');
    const imageElement = document.getElementById('camera-output');
    const startButton = document.getElementById('start-camera');
    const captureButton = document.getElementById('capture-photo');
    const retakeButton = document.getElementById('retake-photo');
    const analyzeButton = document.getElementById('analyze-camera-btn');
    
    let stream = null;
    
    if (!videoElement || !canvasElement || !startButton || !captureButton || !retakeButton || !analyzeButton) {
        console.log('Camera elements not found');
        return;
    }
    
    // Start camera button click handler
    startButton.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            
            videoElement.srcObject = stream;
            videoElement.style.display = 'block';
            startButton.style.display = 'none';
            captureButton.style.display = 'inline-block';
            imageElement.style.display = 'none';
            retakeButton.style.display = 'none';
            analyzeButton.style.display = 'none';
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please make sure you have granted camera permissions.');
        }
    });
    
    // Capture photo button click handler
    captureButton.addEventListener('click', function() {
        // Set canvas dimensions to match video
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        // Draw video frame to canvas
        const context = canvasElement.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        // Convert canvas to image
        const imageDataUrl = canvasElement.toDataURL('image/jpeg');
        imageElement.src = imageDataUrl;
        
        // Stop video stream and hide video element
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        videoElement.style.display = 'none';
        imageElement.style.display = 'block';
        captureButton.style.display = 'none';
        retakeButton.style.display = 'inline-block';
        analyzeButton.style.display = 'inline-block';
    });
    
    // Retake photo button click handler
    retakeButton.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            
            videoElement.srcObject = stream;
            videoElement.style.display = 'block';
            imageElement.style.display = 'none';
            retakeButton.style.display = 'none';
            analyzeButton.style.display = 'none';
            captureButton.style.display = 'inline-block';
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please make sure you have granted camera permissions.');
        }
    });
    
    // Analyze photo button click handler
    analyzeButton.addEventListener('click', function() {
        // Show loading indicator
        showLoading();
        
        // Convert base64 image to blob
        fetch(imageElement.src)
            .then(res => res.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('image', blob, 'camera-photo.jpg');
                
                // Send to backend for analysis
                return fetch('/api/food/analyze-image', {
                    method: 'POST',
                    body: formData
                });
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server error: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                hideLoading();
                
                if (data.success) {
                    displayResults(data.data);
                } else {
                    showError(data.error || 'Failed to analyze image');
                }
            })
            .catch(error => {
                hideLoading();
                showError('Error analyzing image: ' + error.message);
                console.error('Analysis error:', error);
            });
    });
    
    // Clean up when switching tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
            imageElement.style.display = 'none';
            startButton.style.display = 'inline-block';
            captureButton.style.display = 'none';
            retakeButton.style.display = 'none';
            analyzeButton.style.display = 'none';
        });
    });
}

/**
 * Initialize image upload functionality
 */
function initImageUpload() {
    const fileInput = document.getElementById('food-image');
    const preview = document.getElementById('upload-preview');
    const analyzeBtn = document.getElementById('analyze-upload-btn');
    
    if (!fileInput || !preview || !analyzeBtn) {
        console.log('Image upload elements not found');
        return;
    }
    
    // Handle file selection for preview
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Handle image analysis
    analyzeBtn.addEventListener('click', function() {
        if (!fileInput.files || !fileInput.files[0]) {
            alert('Please select an image to upload.');
            return;
        }
        
        // Show loading indicator
        showLoading();
        
        // Create form data with the image
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        
        // Send the image to the backend for analysis
        fetch('/api/food/analyze-image', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            
            if (data.success) {
                displayResults(data.data);
            } else {
                showError(data.error || 'Failed to analyze image');
            }
        })
        .catch(error => {
            hideLoading();
            showError('Error analyzing image: ' + error.message);
            console.error('Analysis error:', error);
        });
    });
}

/**
 * Display analysis results
 */
function displayResults(data) {
    const resultsContainer = document.getElementById('results-container');
    const results = document.getElementById('results');
    const saveBtn = document.getElementById('save-result-btn');
    
    if (!resultsContainer || !results) {
        console.error('Results container not found');
        return;
    }
    
    // Show the results container
    resultsContainer.style.display = 'block';
    
    try {
        // If data is a string (like JSON), parse it
        let parsedData;
        if (typeof data === 'string') {
            // Remove markdown formatting if present
            if (data.includes('```')) {
                data = data.replace(/```json|```/g, '').trim();
            }
            parsedData = JSON.parse(data);
        } else {
            parsedData = data;
        }
        
        console.log('Parsed nutrition data:', parsedData);
        
        // Save the data for later use
        localStorage.setItem('currentFoodAnalysis', JSON.stringify(parsedData));
        
        // Format and display the nutrition information
        results.innerHTML = formatNutritionData(parsedData);
        
        // Show the save button
        if (saveBtn) {
            saveBtn.style.display = 'block';
            
            // Add event listener to save button
            saveBtn.onclick = function() {
                saveToFoodLog(parsedData);
            };
        }
    } catch (error) {
        console.error('Error parsing nutrition data:', error);
        results.innerHTML = '<div class="error">Error formatting results: ' + error.message + '</div>';
        if (saveBtn) saveBtn.style.display = 'none';
    }
}

/**
 * Format nutrition data into HTML
 */
function formatNutritionData(data) {
    try {
        // If data is a string (like JSON), parse it
        if (typeof data === 'string') {
            // Remove markdown formatting if present
            if (data.includes('```')) {
                data = data.replace(/```json|```/g, '').trim();
            }
            data = JSON.parse(data);
        }
        
        // Extract the main values
        const foodName = data.food_name || 'Food Analysis';
        const calories = extractNumber(data.calories) || 0;
        const protein = extractNumber(data.protein) || 0;
        const carbs = extractNumber(data.carbohydrates || data.carbs) || 0;
        const fat = extractNumber(data.fat || data.fats) || 0;
        const portionSize = data.portion_size || 'Standard serving';
        
        // Build HTML with appropriate animation classes
        let html = '<div class="nutrition-card">';
        
        // Food name and portion size
        html += `<h3 class="food-name">${foodName}</h3>`;
        html += `<p class="portion-size">${portionSize}</p>`;
        
        // Calories section
        html += `
            <div class="calories-section">
                <div class="calories-label">Calories</div>
                <div class="calories-value">${calories}</div>
            </div>
        `;
        
        // Macronutrients section
        html += `<h3>Macronutrients</h3>`;
        html += '<div class="macro-section">';
        html += '<div class="macro-list">';
        
        // Protein
        html += `
            <div class="macro-item">
                <div class="macro-label">Protein</div>
                <div class="macro-value">${protein}g</div>
            </div>
        `;
        
        // Carbs
        html += `
            <div class="macro-item">
                <div class="macro-label">Carbs</div>
                <div class="macro-value">${carbs}g</div>
            </div>
        `;
        
        // Fat
        html += `
            <div class="macro-item">
                <div class="macro-label">Fat</div>
                <div class="macro-value">${fat}g</div>
            </div>
        `;
        
        // Add fiber if available
        if (data.fiber) {
            html += `
                <div class="macro-item">
                    <div class="macro-label">Fiber</div>
                    <div class="macro-value">${extractNumber(data.fiber)}g</div>
                </div>
            `;
        }
        
        // Close macro list and section
        html += '</div>'; // close macro-list
        html += '</div>'; // close macro-section
        
        // Vitamins and minerals section if available
        if (data.vitamins_and_minerals && Object.keys(data.vitamins_and_minerals).length > 0) {
            html += `<h3>Vitamins & Minerals</h3>`;
            html += '<div class="micros-section">';
            html += '<div class="micro-list">';
            
            // Add each micronutrient (limit to 6 to avoid cluttering)
            let count = 0;
            for (const [key, value] of Object.entries(data.vitamins_and_minerals)) {
                if (count < 6 && value) {  // Only show if value exists
                    const formattedName = formatNutrientName(key);
                    html += `
                        <div class="micro-item">
                            <div class="micro-label">${formattedName}</div>
                            <div class="micro-value">${value}</div>
                        </div>
                    `;
                    count++;
                }
            }
            
            html += '</div>'; // close micro-list
            html += '</div>'; // close micros-section
        }
        
        // Allergens if available
        if (data.potential_allergens && data.potential_allergens.length > 0) {
            html += '<div class="allergens-section">';
            html += '<h3>Potential Allergens</h3>';
            html += '<div class="allergens-list">';
            
            for (const allergen of data.potential_allergens) {
                html += `<div class="allergen-item">${allergen}</div>`;
            }
            
            html += '</div>'; // close allergens-list
            html += '</div>'; // close allergens-section
        }
        
        // Health assessment if available
        if (data.health_assessment || data.health_notes) {
            html += '<div class="health-assessment-section">';
            html += '<h3>Health Notes</h3>';
            html += '<div class="health-assessment-content">';
            html += `<p>${data.health_assessment || data.health_notes}</p>`;
            html += '</div>'; // close health-assessment-content
            html += '</div>'; // close health-assessment-section
        }
        
        html += '</div>'; // close nutrition-card
        
        return html;
    } catch (e) {
        console.error('Error formatting nutrition data:', e);
        return `<div class="error">Error formatting results: ${e.message}</div>`;
    }
}

/**
 * Format nutrient name for display
 */
function formatNutrientName(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Extract numeric value from string (e.g. "15g" -> 15)
 */
function extractNumber(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    
    const matches = String(value).match(/[\d.]+/);
    return matches ? parseFloat(matches[0]) : 0;
}

/**
 * Create a macro element for the nutrition display
 */
function createMacroElement(name, value, unit) {
    return `
        <div class="macro-item">
            <div class="macro-name">${name}</div>
            <div class="macro-value">${value}</div>
            <div class="macro-unit">${unit}</div>
        </div>
    `;
}

/**
 * Save to food log
 */
function saveToFoodLog() {
    // Check if user is logged in
    if (!localStorage.getItem('userToken')) {
        showError('You must be logged in to save to your food log');
        return;
    }
    
    // Get the analyzed data from localStorage
    const storedData = localStorage.getItem('currentFoodAnalysis');
    if (!storedData) {
        showError('No food data available to save');
        return;
    }
    
    try {
        const data = JSON.parse(storedData);
        
        // Prepare data for API
        const foodLogData = {
            food_name: data.food_name || 'Unknown Food',
            calories: extractNumber(data.calories),
            protein_g: extractNumber(data.protein),
            carbs_g: extractNumber(data.carbohydrates || data.carbs),
            fat_g: extractNumber(data.fat || data.fats),
            log_date: new Date().toISOString()
        };
        
        console.log('Saving food data:', foodLogData);
        
        // Send to API
        fetch('/api/food-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('userToken')
            },
            body: JSON.stringify(foodLogData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save food to log');
            }
            return response.json();
        })
        .then(data => {
            showMessage('Food saved to your log successfully!', 'success');
            
            // Dispatch custom event for dashboard update
            const event = new CustomEvent('foodLogUpdated', {
                detail: {
                    foodLogData: foodLogData
                }
            });
            window.dispatchEvent(event);
            
            // Optionally refresh the page if we're on the dashboard
            if (window.location.pathname.includes('dashboard')) {
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        })
        .catch(error => {
            showError('Error: ' + error.message);
        });
    } catch (error) {
        showError('Error processing food data: ' + error.message);
    }
}

/**
 * Show loading indicator
 */
function showLoading() {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const saveBtn = document.getElementById('save-result-btn');
    const resultsContainer = document.getElementById('results-container');
    
    if (loading) loading.style.display = 'block';
    if (results) results.innerHTML = '';
    if (saveBtn) saveBtn.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'block';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    const results = document.getElementById('results');
    if (results) {
        results.innerHTML = `<div class="error">${message}</div>`;
    } else {
        alert(message);
    }
}

/**
 * Show message with specified type
 */
function showMessage(message, type = 'info') {
    const saveBtn = document.getElementById('save-result-btn');
    
    // Remove any existing messages
    document.querySelectorAll('.message').forEach(el => el.remove());
    
    // Create new message
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', type);
    messageEl.textContent = message;
    messageEl.style.padding = '10px';
    messageEl.style.margin = '10px 0';
    messageEl.style.borderRadius = '4px';
    
    if (type === 'success') {
        messageEl.style.backgroundColor = '#d4edda';
        messageEl.style.color = '#155724';
        messageEl.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        messageEl.style.backgroundColor = '#f8d7da';
        messageEl.style.color = '#721c24';
        messageEl.style.border = '1px solid #f5c6cb';
    } else {
        messageEl.style.backgroundColor = '#d1ecf1';
        messageEl.style.color = '#0c5460';
        messageEl.style.border = '1px solid #bee5eb';
    }
    
    // Insert after save button or at the end of results
    if (saveBtn && saveBtn.parentNode) {
        saveBtn.parentNode.insertBefore(messageEl, saveBtn.nextSibling);
    } else {
        const results = document.getElementById('results');
        if (results) {
            results.appendChild(messageEl);
        }
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 500);
        }
    }, 5000);
}