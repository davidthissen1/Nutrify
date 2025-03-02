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
        fetch('/api/analyze-image', {
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
    let html = '<div class="result-container">';
    
    // Add food name as title
    html += `<h3 class="result-title">${data.food_name || 'Food Analysis'}</h3>`;
    
    if (data.portion_size) {
        html += `<p class="portion-size">Portion: ${data.portion_size}</p>`;
    }
    
    // Main macronutrients
    html += '<div class="macros-container">';
    html += createMacroElement('Calories', data.calories, '');
    html += createMacroElement('Protein', extractNumber(data.protein), 'g');
    html += createMacroElement('Carbs', extractNumber(data.carbohydrates || data.carbs), 'g');
    html += createMacroElement('Fat', extractNumber(data.fat || data.fats), 'g');
    html += '</div>';
    
    // Additional nutrients if available
    if (data.fiber) {
        html += `<p class="additional-nutrient"><span>Fiber:</span> ${data.fiber}</p>`;
    }
    
    // Vitamins and minerals
    if (data.vitamins_and_minerals && Object.keys(data.vitamins_and_minerals).length > 0) {
        html += '<div class="vitamins-minerals">';
        html += '<h4>Vitamins & Minerals</h4>';
        html += '<ul>';
        
        for (const [key, value] of Object.entries(data.vitamins_and_minerals)) {
            const formattedName = formatNutrientName(key);
            html += `<li><span>${formattedName}:</span> ${value}</li>`;
        }
        
        html += '</ul></div>';
    }
    
    // Allergens if available
    if (data.potential_allergens && data.potential_allergens.length > 0) {
        html += '<div class="allergens">';
        html += '<h4>Potential Allergens</h4>';
        html += '<p>' + data.potential_allergens.join(', ') + '</p>';
        html += '</div>';
    }
    
    html += '</div>';
    return html;
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