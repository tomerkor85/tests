// Chart.js utilities for analytics visualizations
class AnalyticsVisualizer {
  constructor() {
    // Ensure Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded. Please include Chart.js library.');
      return;
    }
    
    // Set default chart colors
    this.colors = {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#06b6d4',
      light: '#f3f4f6',
      dark: '#1f2937'
    };
    
    // Set default chart options
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: this.colors.dark,
          titleFont: {
            family: "'Inter', sans-serif",
            size: 14
          },
          bodyFont: {
            family: "'Inter', sans-serif",
            size: 13
          },
          padding: 12,
          cornerRadius: 4
        }
      }
    };
    
    // Initialize charts container
    this.charts = {};
  }
  
  /**
   * Create a line chart for time series data
   * @param {string} elementId - Canvas element ID
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   * @returns {Chart} - Chart.js instance
   */
  createLineChart(elementId, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
      console.error(`Canvas element with ID "${elementId}" not found.`);
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Merge default options with provided options
    const chartOptions = {
      ...this.defaultOptions,
      ...options,
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        }
      }
    };
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'line',
      data: data,
      options: chartOptions
    });
    
    // Store chart instance
    this.charts[elementId] = chart;
    
    return chart;
  }
  
  /**
   * Create a bar chart
   * @param {string} elementId - Canvas element ID
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   * @returns {Chart} - Chart.js instance
   */
  createBarChart(elementId, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
      console.error(`Canvas element with ID "${elementId}" not found.`);
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Merge default options with provided options
    const chartOptions = {
      ...this.defaultOptions,
      ...options,
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        }
      }
    };
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: chartOptions
    });
    
    // Store chart instance
    this.charts[elementId] = chart;
    
    return chart;
  }
  
  /**
   * Create a horizontal bar chart (e.g., for funnels)
   * @param {string} elementId - Canvas element ID
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   * @returns {Chart} - Chart.js instance
   */
  createHorizontalBarChart(elementId, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
      console.error(`Canvas element with ID "${elementId}" not found.`);
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Merge default options with provided options
    const chartOptions = {
      ...this.defaultOptions,
      ...options,
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        }
      }
    };
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: chartOptions
    });
    
    // Store chart instance
    this.charts[elementId] = chart;
    
    return chart;
  }
  
  /**
   * Create a doughnut chart
   * @param {string} elementId - Canvas element ID
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   * @returns {Chart} - Chart.js instance
   */
  createDoughnutChart(elementId, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
      console.error(`Canvas element with ID "${elementId}" not found.`);
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Merge default options with provided options
    const chartOptions = {
      ...this.defaultOptions,
      ...options,
      cutout: '70%',
      plugins: {
        ...this.defaultOptions.plugins,
        legend: {
          position: 'right',
          labels: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          }
        }
      }
    };
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: chartOptions
    });
    
    // Store chart instance
    this.charts[elementId] = chart;
    
    return chart;
  }
  
  /**
   * Create a pie chart
   * @param {string} elementId - Canvas element ID
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   * @returns {Chart} - Chart.js instance
   */
  createPieChart(elementId, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
      console.error(`Canvas element with ID "${elementId}" not found.`);
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Merge default options with provided options
    const chartOptions = {
      ...this.defaultOptions,
      ...options
    };
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'pie',
      data: data,
      options: chartOptions
    });
    
    // Store chart instance
    this.charts[elementId] = chart;
    
    return chart;
  }
  
  /**
   * Create a heatmap for retention cohorts
   * @param {string} elementId - Table element ID
   * @param {Object} data - Cohort data
   * @returns {HTMLElement} - Heatmap table element
   */
  createRetentionHeatmap(elementId, data) {
    const container = document.getElementById(elementId);
    if (!container) {
      console.error(`Container element with ID "${elementId}" not found.`);
      return null;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Create table
    const table = document.createElement('table');
    table.className = 'retention-heatmap';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add cohort header
    const cohortHeader = document.createElement('th');
    cohortHeader.textContent = 'Cohort';
    headerRow.appendChild(cohortHeader);
    
    // Add period headers
    for (let i = 0; i <= data.maxPeriod; i++) {
      const periodHeader = document.createElement('th');
      periodHeader.textContent = `${i === 0 ? 'Users' : `Day ${i}`}`;
      headerRow.appendChild(periodHeader);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add cohort rows
    data.cohorts.forEach(cohort => {
      const row = document.createElement('tr');
      
      // Add cohort date
      const cohortCell = document.createElement('td');
      cohortCell.textContent = cohort.date;
      cohortCell.className = 'cohort-date';
      row.appendChild(cohortCell);
      
      // Add cohort size
      const sizeCell = document.createElement('td');
      sizeCell.textContent = cohort.size;
      row.appendChild(sizeCell);
      
      // Add retention cells
      for (let i = 1; i <= data.maxPeriod; i++) {
        const retentionCell = document.createElement('td');
        const retention = cohort.retention[i] || 0;
        
        // Set cell text
        retentionCell.textContent = `${retention}%`;
        
        // Set cell color based on retention rate
        const hue = Math.min(120, retention * 1.2);
        retentionCell.style.backgroundColor = `hsl(${hue}, 70%, 60%)`;
        
        // Set text color based on background brightness
        retentionCell.style.color = hue > 60 ? '#000' : '#fff';
        
        row.appendChild(retentionCell);
      }
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    return table;
  }
  
  /**
   * Create a funnel visualization
   * @param {string} elementId - Container element ID
   * @param {Object} data - Funnel data
   * @returns {HTMLElement} - Funnel container element
   */
  createFunnel(elementId, data) {
    const container = document.getElementById(elementId);
    if (!container) {
      console.error(`Container element with ID "${elementId}" not found.`);
      return null;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Create funnel container
    const funnelContainer = document.createElement('div');
    funnelContainer.className = 'funnel-container';
    
    // Get max value for scaling
    const maxValue = Math.max(...data.steps.map(step => step.value));
    
    // Create funnel steps
    data.steps.forEach((step, index) => {
      // Create step container
      const stepContainer = document.createElement('div');
      stepContainer.className = 'funnel-step';
      
      // Create step bar
      const stepBar = document.createElement('div');
      stepBar.className = 'funnel-bar';
      
      // Calculate width percentage
      const widthPercentage = (step.value / maxValue) * 100;
      stepBar.style.width = `${widthPercentage}%`;
      
      // Set bar color
      const hue = 200 - (index * (150 / data.steps.length));
      stepBar.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
      
      // Create step label
      const stepLabel = document.createElement('div');
      stepLabel.className = 'funnel-label';
      stepLabel.textContent = step.label;
      
      // Create step value
      const stepValue = document.createElement('div');
      stepValue.className = 'funnel-value';
      stepValue.textContent = step.value.toLocaleString();
      
      // Create conversion rate (for all steps except the first)
      if (index > 0) {
        const conversionRate = document.createElement('div');
        conversionRate.className = 'funnel-conversion';
        
        const previousValue = data.steps[index - 1].value;
        const rate = (step.value / previousValue) * 100;
        
        conversionRate.textContent = `${rate.toFixed(1)}%`;
        stepContainer.appendChild(conversionRate);
      }
      
      // Assemble step
      stepContainer.appendChild(stepLabel);
      stepContainer.appendChild(stepBar);
      stepContainer.appendChild(stepValue);
      
      // Add step to funnel
      funnelContainer.appendChild(stepContainer);
    });
    
    container.appendChild(funnelContainer);
    
    return funnelContainer;
  }
  
  /**
   * Update chart data
   * @param {string} chartId - Chart ID
   * @param {Object} newData - New chart data
   */
  updateChart(chartId, newData) {
    const chart = this.charts[chartId];
    if (!chart) {
      console.error(`Chart with ID "${chartId}" not found.`);
      return;
    }
    
    chart.data = newData;
    chart.update();
  }
  
  /**
   * Destroy chart
   * @param {string} chartId - Chart ID
   */
  destroyChart(chartId) {
    const chart = this.charts[chartId];
    if (!chart) {
      console.error(`Chart with ID "${chartId}" not found.`);
      return;
    }
    
    chart.destroy();
    delete this.charts[chartId];
  }
  
  /**
   * Generate random data for demo purposes
   * @param {number} points - Number of data points
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {Array} - Array of random values
   */
  generateRandomData(points, min = 0, max = 100) {
    return Array.from({ length: points }, () => 
      Math.floor(Math.random() * (max - min + 1)) + min
    );
  }
  
  /**
   * Generate date labels for time series
   * @param {number} days - Number of days
   * @param {Date} endDate - End date (defaults to today)
   * @returns {Array} - Array of date strings
   */
  generateDateLabels(days, endDate = new Date()) {
    const labels = [];
    const end = new Date(endDate);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsVisualizer;
}
