/**
 * Nutrition Tracker Dashboard JavaScript
 * Handles food logs display and nutrition tracking
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard JS loaded');
    
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
        log_date: new Date().toISOString()
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
    
    // Fetch food logs
    fetch('/api/food-logs', {
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
        displayFoodLogs(data.logs, logContainer);
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
        container.innerHTML = '<p>No food logs yet. Analyze some food and save it to your log!</p>';
        return;
    }
    
    let html = '<table class="food-logs-table">';
    html += '<thead><tr>';
    html += '<th>Food</th><th>Calories</th><th>Protein (g)</th><th>Carbs (g)</th><th>Fat (g)</th><th>Date</th>';
    html += '</tr></thead><tbody>';
    
    logs.forEach(log => {
        const date = log.log_date ? new Date(log.log_date).toLocaleDateString() : 'N/A';
        
        html += '<tr>';
        html += `<td>${log.food_name}</td>`;
        html += `<td>${log.calories}</td>`;
        html += `<td>${log.protein_g}</td>`;
        html += `<td>${log.carbs_g}</td>`;
        html += `<td>${log.fat_g}</td>`;
        html += `<td>${date}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // Add totals row
    addTotalsRow(logs, container);
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
 * Initialize nutrition tracking UI
 */
function initNutritionTracking() {
    // Find all nutrition tracking inputs
    const inputs = {
        caloriesGoal: document.getElementById('caloriesGoal'),
        proteinGoal: document.getElementById('proteinGoal'),
        carbsGoal: document.getElementById('carbsGoal'),
        fatGoal: document.getElementById('fatGoal')
    };
    
    // Check if any inputs exist on this page
    const hasInputs = Object.values(inputs).some(el => el !== null);
    if (!hasInputs) return;
    
    // Load saved goals from localStorage
    const savedGoals = JSON.parse(localStorage.getItem('nutritionGoals') || '{}');
    
    // Set input values from saved goals
    if (inputs.caloriesGoal) inputs.caloriesGoal.value = savedGoals.calories || 2000;
    if (inputs.proteinGoal) inputs.proteinGoal.value = savedGoals.protein || 50;
    if (inputs.carbsGoal) inputs.carbsGoal.value = savedGoals.carbs || 250;
    if (inputs.fatGoal) inputs.fatGoal.value = savedGoals.fat || 70;
    
    // Add event listeners to save changes
    Object.values(inputs).forEach(input => {
        if (input) {
            input.addEventListener('change', saveNutritionGoals);
        }
    });
    
    // Initialize progress bars
    updateProgressBars();
}

/**
 * Save nutrition goals to localStorage
 */
function saveNutritionGoals() {
    const goals = {
        calories: parseFloat(document.getElementById('caloriesGoal')?.value) || 2000,
        protein: parseFloat(document.getElementById('proteinGoal')?.value) || 50,
        carbs: parseFloat(document.getElementById('carbsGoal')?.value) || 250,
        fat: parseFloat(document.getElementById('fatGoal')?.value) || 70
    };
    
    localStorage.setItem('nutritionGoals', JSON.stringify(goals));
    
    // Update progress bars with new goals
    updateProgressBars();
}

/**
 * Update nutrition tracking based on food logs data
 */
function updateNutritionTracking(totals) {
    if (!totals) return;
    
    // Display consumed amounts in UI
    const caloriesConsumed = document.getElementById('caloriesConsumed');
    const proteinConsumed = document.getElementById('proteinConsumed');
    const carbsConsumed = document.getElementById('carbsConsumed');
    const fatConsumed = document.getElementById('fatConsumed');
    
    if (caloriesConsumed) caloriesConsumed.textContent = Math.round(totals.calories);
    if (proteinConsumed) proteinConsumed.textContent = Math.round(totals.protein * 10) / 10;
    if (carbsConsumed) carbsConsumed.textContent = Math.round(totals.carbs * 10) / 10;
    if (fatConsumed) fatConsumed.textContent = Math.round(totals.fat * 10) / 10;
    
    // Update progress bars
    updateProgressBars(totals);
}

/**
 * Update progress bars for nutrition tracking
 */
function updateProgressBars(totals = null) {
    // Get saved goals
    const savedGoals = JSON.parse(localStorage.getItem('nutritionGoals') || '{}');
    
    // Get default goals
    const goals = {
        calories: savedGoals.calories || 2000,
        protein: savedGoals.protein || 50,
        carbs: savedGoals.carbs || 250,
        fat: savedGoals.fat || 70
    };
    
    // If totals weren't passed, try to get them from the UI
    if (!totals) {
        totals = {
            calories: parseFloat(document.getElementById('caloriesConsumed')?.textContent) || 0,
            protein: parseFloat(document.getElementById('proteinConsumed')?.textContent) || 0,
            carbs: parseFloat(document.getElementById('carbsConsumed')?.textContent) || 0,
            fat: parseFloat(document.getElementById('fatConsumed')?.textContent) || 0
        };
    }
    
    // Update each progress bar
    updateProgressBar('calories', totals.calories, goals.calories);
    updateProgressBar('protein', totals.protein, goals.protein);
    updateProgressBar('carbs', totals.carbs, goals.carbs);
    updateProgressBar('fat', totals.fat, goals.fat);
}

/**
 * Update a single progress bar
 */
function updateProgressBar(nutrient, consumed, goal) {
    const progressBar = document.getElementById(`${nutrient}-progress-bar`);
    const progressText = document.getElementById(`${nutrient}-progress-text`);
    
    if (!progressBar) return;
    
    // Calculate percentage
    const percentage = Math.min(Math.round((consumed / goal) * 100), 100) || 0;
    
    // Update progress bar
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    
    // Update text if available
    if (progressText) {
        progressText.textContent = `${consumed} / ${goal} (${percentage}%)`;
    }
    
    // Update color based on percentage
    if (percentage < 50) {
        progressBar.className = 'progress-bar bg-info';
    } else if (percentage < 75) {
        progressBar.className = 'progress-bar bg-success';
    } else if (percentage < 90) {
        progressBar.className = 'progress-bar bg-warning';
    } else {
        progressBar.className = 'progress-bar bg-danger';
    }
}