/**
 * Nutrition Tracker Dashboard JavaScript
 * Handles food logs display and nutrition tracking
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard JS loaded');
    
    // Initialize date picker with today's date
    const dateInput = document.getElementById('dashboard-date');
    if (dateInput) {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
        
        // Add event listener for date changes
        dateInput.addEventListener('change', function() {
            initFoodLogsDisplay();
        });
    }
    
    // Initialize all dashboard components
    initFoodAnalysis();
    initFoodLogsDisplay();
    initNutritionTracking();
});

/**
 * Initialize food analysis functionality
 */
function initFoodAnalysis() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const foodDescription = document.getElementById('foodDescription');
    
    if (analyzeBtn && foodDescription) {
        console.log('Food analysis form found');
        
        analyzeBtn.addEventListener('click', async function() {
            const text = foodDescription.value.trim();
            
            if (!text) {
                alert('Please enter a food description.');
                return;
            }
            
            // Show loading indicator
            const resultsContainer = document.getElementById('analysis-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="loading">Analyzing food...</div>';
            }
            
            try {
                const response = await fetch('/api/analyze-text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to analyze food');
                }
                
                const data = await response.json();
                
                if (resultsContainer) {
                    if (data.success) {
                        // Format and display the results
                        resultsContainer.innerHTML = formatNutritionData(data.data);
                    } else {
                        resultsContainer.innerHTML = `<div class="error">${data.error || 'Failed to analyze food'}</div>`;
                    }
                }
            } catch (error) {
                if (resultsContainer) {
                    resultsContainer.innerHTML = `<div class="error">${error.message}</div>`;
                }
                console.error('Error analyzing food:', error);
            }
        });
    }
}

/**
 * Format nutrition data for display
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
        
        // Build HTML for displaying nutrition information
        let html = `<div class="nutrition-card">
            <h3>${data.food_name || 'Food Analysis'}</h3>
            <div class="nutrition-macros">
                <div class="macro">
                    <span class="macro-name">Calories</span>
                    <span class="macro-value">${data.calories || 0}</span>
                </div>
                <div class="macro">
                    <span class="macro-name">Protein</span>
                    <span class="macro-value">${extractNumber(data.protein)}</span>g
                </div>
                <div class="macro">
                    <span class="macro-name">Carbs</span>
                    <span class="macro-value">${extractNumber(data.carbohydrates || data.carbs)}</span>g
                </div>
                <div class="macro">
                    <span class="macro-name">Fat</span>
                    <span class="macro-value">${extractNumber(data.fat || data.fats)}</span>g
                </div>
            </div>`;
        
        // Add more details if available
        if (data.vitamins_and_minerals) {
            html += `<div class="nutrition-micros">
                <h4>Vitamins & Minerals</h4>
                <ul>`;
            
            for (const [key, value] of Object.entries(data.vitamins_and_minerals)) {
                html += `<li><span>${formatNutrientName(key)}</span>: ${value}</li>`;
            }
            
            html += `</ul></div>`;
        }
        
        // Add button to save to food log
        html += `<button id="save-analysis-btn" class="btn">Save to Food Log</button>`;
        
        html += `</div>`;
        
        // Add event listener for save button after a short delay to ensure DOM is updated
        setTimeout(() => {
            const saveBtn = document.getElementById('save-analysis-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', function() {
                    saveFoodToLog(data);
                });
            }
        }, 100);
        
        return html;
    } catch (e) {
        console.error('Error formatting nutrition data:', e);
        return `<div class="error">Error formatting results: ${e.message}</div>`;
    }
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
 * Format nutrient name for display (e.g. "vitamin_a" -> "Vitamin A")
 */
function formatNutrientName(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Save analyzed food to user's food log
 */
function saveFoodToLog(data) {
    const userToken = localStorage.getItem('userToken');
    const dateInput = document.getElementById('dashboard-date');
    
    if (!userToken) {
        alert('You must be logged in to save to your food log');
        return;
    }
    
    // Extract food data
    const foodLogData = {
        food_name: data.food_name || 'Unknown Food',
        calories: extractNumber(data.calories),
        protein_g: extractNumber(data.protein),
        carbs_g: extractNumber(data.carbohydrates || data.carbs),
        fat_g: extractNumber(data.fat || data.fats),
        log_date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0]
    };
    
    console.log('Saving food data:', foodLogData);
    
    // Send to server
    fetch('/api/food-logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + userToken
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
        alert('Food saved to your log successfully!');
        // Refresh food logs if they're displayed on this page
        initFoodLogsDisplay();
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
        console.error('Error saving food:', error);
    });
}

/**
 * Initialize food logs display
 */
function initFoodLogsDisplay() {
    const logContainer = document.getElementById('food-logs-container');
    const dateInput = document.getElementById('dashboard-date');
    
    if (!logContainer) {
        // Container doesn't exist on this page
        return;
    }
    
    const userToken = localStorage.getItem('userToken');
    
    if (!userToken) {
        logContainer.innerHTML = '<p>You need to <a href="/account">log in</a> to view your food logs.</p>';
        return;
    }
    
    // Show loading state
    logContainer.innerHTML = '<p>Loading your food logs...</p>';
    
    // Get selected date
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    // Reset consumed values when changing dates
    const caloriesConsumed = document.getElementById('calories-consumed');
    const proteinConsumed = document.getElementById('protein-consumed');
    const carbsConsumed = document.getElementById('carbs-consumed');
    const fatConsumed = document.getElementById('fat-consumed');
    
    if (caloriesConsumed) caloriesConsumed.value = '0';
    if (proteinConsumed) proteinConsumed.value = '0';
    if (carbsConsumed) carbsConsumed.value = '0';
    if (fatConsumed) fatConsumed.value = '0';
    
    // Update progress bars with reset values
    updateProgressBars();
    
    // Fetch food logs
    fetch(`/api/food-logs?date=${selectedDate}`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + userToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch food logs');
        }
        return response.json();
    })
    .then(data => {
        // Filter logs for the selected date
        const filteredLogs = data.logs.filter(log => {
            const logDate = new Date(log.log_date);
            const compareDate = new Date(selectedDate);
            return logDate.toISOString().split('T')[0] === compareDate.toISOString().split('T')[0];
        });
        
        displayFoodLogs(filteredLogs, logContainer);
    })
    .catch(error => {
        logContainer.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        console.error('Error fetching food logs:', error);
    });
}

/**
 * Display food logs in the specified container
 */
function displayFoodLogs(logs, container) {
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p>No food logs for this date. Analyze some food and save it to your log!</p>';
        return;
    }
    
    let html = '<table class="food-logs-table">';
    html += '<thead><tr>';
    html += '<th>Food</th><th>Calories</th><th>Protein (g)</th><th>Carbs (g)</th><th>Fat (g)</th><th>Date</th><th></th>';
    html += '</tr></thead><tbody>';
    
    logs.forEach(log => {
        // Format the date for display
        const date = log.log_date ? formatDateForDisplay(log.log_date) : 'N/A';
        
        html += '<tr>';
        html += `<td>${log.food_name}</td>`;
        html += `<td>${log.calories}</td>`;
        html += `<td>${log.protein_g}</td>`;
        html += `<td>${log.carbs_g}</td>`;
        html += `<td>${log.fat_g}</td>`;
        html += `<td>${date}</td>`;
        html += `<td><button class="delete-log" data-log-id="${log.id}" style="color: red; background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 8px;">&times;</button></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // Add event listeners for delete buttons
    const deleteButtons = container.querySelectorAll('.delete-log');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const logId = this.getAttribute('data-log-id');
            if (confirm('Are you sure you want to delete this food log entry?')) {
                deleteFoodLog(logId);
            }
        });
    });
    
    // Add totals row and update nutrition tracking
    addTotalsRow(logs, container);
}

/**
 * Format date for display, adjusting for timezone
 */
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    // Add the timezone offset to get the correct local date
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return localDate.toLocaleDateString();
}

/**
 * Add a totals row to the food logs table
 */
function addTotalsRow(logs, container) {
    if (!logs || logs.length === 0) return;
    
    // Calculate totals
    const totals = logs.reduce((acc, log) => {
        acc.calories += Number(log.calories) || 0;
        acc.protein += Number(log.protein_g) || 0;
        acc.carbs += Number(log.carbs_g) || 0;
        acc.fat += Number(log.fat_g) || 0;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Find the table
    const table = container.querySelector('.food-logs-table');
    if (!table) return;
    
    // Add totals row
    const totalsRow = table.createTFoot().insertRow(0);
    
    // Add cells to totals row
    const nameCell = totalsRow.insertCell(0);
    nameCell.textContent = 'TOTAL';
    nameCell.style.fontWeight = 'bold';
    
    const caloriesCell = totalsRow.insertCell(1);
    caloriesCell.textContent = Math.round(totals.calories);
    caloriesCell.style.fontWeight = 'bold';
    
    const proteinCell = totalsRow.insertCell(2);
    proteinCell.textContent = Math.round(totals.protein * 10) / 10;
    proteinCell.style.fontWeight = 'bold';
    
    const carbsCell = totalsRow.insertCell(3);
    carbsCell.textContent = Math.round(totals.carbs * 10) / 10;
    carbsCell.style.fontWeight = 'bold';
    
    const fatCell = totalsRow.insertCell(4);
    fatCell.textContent = Math.round(totals.fat * 10) / 10;
    fatCell.style.fontWeight = 'bold';
    
    // Empty date cell
    totalsRow.insertCell(5);
    
    // Update nutrition tracking if available
    updateNutritionTracking(totals);
}

/**
 * Initialize nutrition tracking
 */
function initNutritionTracking() {
    // Load saved goals from localStorage
    loadSavedGoals();
    
    // Add event listener for food log updates
    window.addEventListener('foodLogUpdated', function(event) {
        const foodLogData = event.detail.foodLogData;
        
        // Update consumed values
        const caloriesConsumed = document.getElementById('calories-consumed');
        const proteinConsumed = document.getElementById('protein-consumed');
        const carbsConsumed = document.getElementById('carbs-consumed');
        const fatConsumed = document.getElementById('fat-consumed');
        
        if (caloriesConsumed) {
            const currentCalories = parseFloat(caloriesConsumed.value) || 0;
            caloriesConsumed.value = currentCalories + foodLogData.calories;
        }
        
        if (proteinConsumed) {
            const currentProtein = parseFloat(proteinConsumed.value) || 0;
            proteinConsumed.value = currentProtein + foodLogData.protein_g;
        }
        
        if (carbsConsumed) {
            const currentCarbs = parseFloat(carbsConsumed.value) || 0;
            carbsConsumed.value = currentCarbs + foodLogData.carbs_g;
        }
        
        if (fatConsumed) {
            const currentFat = parseFloat(fatConsumed.value) || 0;
            fatConsumed.value = currentFat + foodLogData.fat_g;
        }
        
        // Update progress bars
        updateProgressBars();
        
        // Refresh food logs display
        initFoodLogsDisplay();
    });
    
    // Initialize input event listeners for manual updates
    const nutritionInputs = document.querySelectorAll('input[type="number"]');
    nutritionInputs.forEach(input => {
        input.addEventListener('change', function() {
            updateProgressBars();
        });
    });
    
    // Add event listener for Save Changes button
    const saveButton = document.getElementById('save-nutrition');
    if (saveButton) {
        saveButton.addEventListener('click', saveNutritionGoals);
    }
    
    // Initial update of progress bars
    updateProgressBars();
}

/**
 * Load saved nutrition goals from localStorage
 */
function loadSavedGoals() {
    const savedGoals = localStorage.getItem('nutritionGoals');
    if (savedGoals) {
        try {
            const goals = JSON.parse(savedGoals);
            
            // Set the values in the input fields
            const caloriesGoal = document.getElementById('calories-goal');
            const proteinGoal = document.getElementById('protein-goal');
            const carbsGoal = document.getElementById('carbs-goal');
            const fatGoal = document.getElementById('fat-goal');
            
            if (caloriesGoal && goals.calories) caloriesGoal.value = goals.calories;
            if (proteinGoal && goals.protein) proteinGoal.value = goals.protein;
            if (carbsGoal && goals.carbs) carbsGoal.value = goals.carbs;
            if (fatGoal && goals.fat) fatGoal.value = goals.fat;
            
            // Update progress bars with loaded goals
            updateProgressBars();
        } catch (error) {
            console.error('Error loading saved goals:', error);
        }
    }
}

/**
 * Save nutrition goals to localStorage
 */
function saveNutritionGoals() {
    const goals = {
        calories: parseFloat(document.getElementById('calories-goal')?.value) || 2000,
        protein: parseFloat(document.getElementById('protein-goal')?.value) || 50,
        carbs: parseFloat(document.getElementById('carbs-goal')?.value) || 250,
        fat: parseFloat(document.getElementById('fat-goal')?.value) || 70
    };
    
    // Save to localStorage
    localStorage.setItem('nutritionGoals', JSON.stringify(goals));
    
    // Show success message
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = 'Goals saved successfully!';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        opacity: 1;
        transition: opacity 0.5s ease-in-out;
    `;
    
    document.body.appendChild(message);
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => {
            message.remove();
        }, 500);
    }, 3000);
    
    // Update progress bars with new goals
    updateProgressBars();
}

/**
 * Update nutrition tracking based on food logs data
 */
function updateNutritionTracking(totals) {
    if (!totals) return;
    
    // Update consumed values in input fields
    const caloriesConsumed = document.getElementById('calories-consumed');
    const proteinConsumed = document.getElementById('protein-consumed');
    const carbsConsumed = document.getElementById('carbs-consumed');
    const fatConsumed = document.getElementById('fat-consumed');
    
    // Set the values directly from totals
    if (caloriesConsumed) caloriesConsumed.value = Math.round(totals.calories);
    if (proteinConsumed) proteinConsumed.value = Math.round(totals.protein * 10) / 10;
    if (carbsConsumed) carbsConsumed.value = Math.round(totals.carbs * 10) / 10;
    if (fatConsumed) fatConsumed.value = Math.round(totals.fat * 10) / 10;
    
    // Update progress bars and text
    updateProgressBars();
}

/**
 * Update progress bars for nutrition tracking
 */
function updateProgressBars() {
    // Get consumed values from input fields
    const consumed = {
        calories: parseFloat(document.getElementById('calories-consumed')?.value) || 0,
        protein: parseFloat(document.getElementById('protein-consumed')?.value) || 0,
        carbs: parseFloat(document.getElementById('carbs-consumed')?.value) || 0,
        fat: parseFloat(document.getElementById('fat-consumed')?.value) || 0
    };
    
    // Get goal values from input fields
    const goals = {
        calories: parseFloat(document.getElementById('calories-goal')?.value) || 2000,
        protein: parseFloat(document.getElementById('protein-goal')?.value) || 50,
        carbs: parseFloat(document.getElementById('carbs-goal')?.value) || 250,
        fat: parseFloat(document.getElementById('fat-goal')?.value) || 70
    };
    
    // Update each progress bar
    updateProgressBar('calories', consumed.calories, goals.calories);
    updateProgressBar('protein', consumed.protein, goals.protein);
    updateProgressBar('carbs', consumed.carbs, goals.carbs);
    updateProgressBar('fat', consumed.fat, goals.fat);
}

/**
 * Update a single progress bar
 */
function updateProgressBar(nutrient, consumed, goal) {
    const progressBar = document.querySelector(`#${nutrient}-progress`);
    const progressText = document.querySelector(`#${nutrient}-text`);
    
    if (!progressBar || !progressText) return;
    
    // Calculate percentage (capped at 100%)
    const percentage = Math.min(Math.round((consumed / goal) * 100), 100) || 0;
    
    // Update progress bar width
    progressBar.style.width = `${percentage}%`;
    
    // Update text display
    let unit = nutrient === 'calories' ? 'kcal' : 'g';
    progressText.textContent = `${Math.round(consumed * 10) / 10} / ${goal} ${unit}`;
    
    // Update progress bar color based on percentage
    if (percentage < 50) {
        progressBar.style.backgroundColor = '#17a2b8'; // info
    } else if (percentage < 75) {
        progressBar.style.backgroundColor = '#28a745'; // success
    } else if (percentage < 90) {
        progressBar.style.backgroundColor = '#ffc107'; // warning
    } else {
        progressBar.style.backgroundColor = '#dc3545'; // danger
    }
}

/**
 * Delete a food log entry
 */
function deleteFoodLog(logId) {
    const userToken = localStorage.getItem('userToken');
    
    if (!userToken) {
        showError('You must be logged in to delete food logs');
        return;
    }
    
    fetch(`/api/food-logs/${logId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + userToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete food log');
        }
        return response.json();
    })
    .then(data => {
        // Refresh the food logs display
        initFoodLogsDisplay();
    })
    .catch(error => {
        showError('Error deleting food log: ' + error.message);
        console.error('Delete error:', error);
    });
}