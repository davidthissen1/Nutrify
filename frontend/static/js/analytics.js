document.addEventListener('DOMContentLoaded', function() {
    const timeButtons = document.querySelectorAll('.time-btn');
    let currentRange = 'week';
    let charts = {};

    // Initialize charts
    initializeCharts();
    fetchAndUpdateData(currentRange);

    // Time range button handlers
    timeButtons.forEach(button => {
        button.addEventListener('click', () => {
            timeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentRange = button.dataset.range;
            fetchAndUpdateData(currentRange);
        });
    });

    function initializeCharts() {
        // Calories Chart
        charts.calories = new Chart(document.getElementById('caloriesChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Calories',
                    data: [],
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 3000, // Most people consume between 1500-3000 calories
                        title: {
                            display: true,
                            text: 'Calories (kcal)'
                        }
                    }
                }
            }
        });

        // Macros Distribution Chart
        charts.macros = new Chart(document.getElementById('macrosChart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Protein',
                        data: [],
                        backgroundColor: '#2196F3'
                    },
                    {
                        label: 'Carbs',
                        data: [],
                        backgroundColor: '#4CAF50'
                    },
                    {
                        label: 'Fat',
                        data: [],
                        backgroundColor: '#FFC107'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 300, // Reasonable daily total for macronutrients
                        title: {
                            display: true,
                            text: 'Grams (g)'
                        }
                    },
                    x: {
                        stacked: true
                    }
                }
            }
        });

        // Protein Chart
        charts.protein = new Chart(document.getElementById('proteinChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Protein (g)',
                    data: [],
                    borderColor: '#2196F3',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 150, // Most people need 50-150g protein per day
                        title: {
                            display: true,
                            text: 'Protein (g)'
                        }
                    }
                }
            }
        });

        // Carbs & Fat Chart
        charts.carbsFat = new Chart(document.getElementById('carbsFatChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Carbs (g)',
                        data: [],
                        borderColor: '#4CAF50',
                        tension: 0.1
                    },
                    {
                        label: 'Fat (g)',
                        data: [],
                        borderColor: '#FFC107',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 250, // Typical range for carbs (200-300g) and fats (44-77g)
                        title: {
                            display: true,
                            text: 'Grams (g)'
                        }
                    }
                }
            }
        });
    }

    function fetchAndUpdateData(range) {
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = '/account';
            return;
        }

        fetch(`/api/nutrition-history?range=${range}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            updateCharts(data);
        })
        .catch(error => {
            console.error('Error fetching nutrition data:', error);
        });
    }

    function updateCharts(data) {
        // Update Calories Chart
        charts.calories.data.labels = data.dates;
        charts.calories.data.datasets[0].data = data.calories;
        charts.calories.update();

        // Update Macros Chart
        charts.macros.data.labels = data.dates;
        charts.macros.data.datasets[0].data = data.protein;
        charts.macros.data.datasets[1].data = data.carbs;
        charts.macros.data.datasets[2].data = data.fat;
        charts.macros.update();

        // Update Protein Chart
        charts.protein.data.labels = data.dates;
        charts.protein.data.datasets[0].data = data.protein;
        charts.protein.update();

        // Update Carbs & Fat Chart
        charts.carbsFat.data.labels = data.dates;
        charts.carbsFat.data.datasets[0].data = data.carbs;
        charts.carbsFat.data.datasets[1].data = data.fat;
        charts.carbsFat.update();
    }
}); 