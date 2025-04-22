// Dashboard functionality for analytics dashboard
class DashboardManager {
  constructor(visualizer) {
    this.visualizer = visualizer || new AnalyticsVisualizer();
    this.apiBaseUrl = '/api';
    this.projectId = null;
    this.startDate = null;
    this.endDate = null;
    this.charts = {};
    
    // Initialize date range
    this.initializeDateRange();
  }
  
  /**
   * Initialize dashboard
   * @param {string} projectId - Project ID
   */
  async initialize(projectId) {
    this.projectId = projectId;
    
    try {
      // Load project data
      await this.loadProjectData();
      
      // Initialize charts
      this.initializeCharts();
      
      // Load dashboard data
      await this.loadDashboardData();
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('Dashboard initialized successfully');
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      this.showError('Failed to initialize dashboard. Please try again later.');
    }
  }
  
  /**
   * Initialize date range (default to last 30 days)
   */
  initializeDateRange() {
    const today = new Date();
    
    // Set end date to today
    this.endDate = today.toISOString().split('T')[0];
    
    // Set start date to 30 days ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
    this.startDate = startDate.toISOString().split('T')[0];
    
    // Update date range picker if it exists
    const dateRangePicker = document.getElementById('date-range');
    if (dateRangePicker) {
      dateRangePicker.value = `${this.formatDate(startDate)} - ${this.formatDate(today)}`;
    }
  }
  
  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  /**
   * Load project data
   */
  async loadProjectData() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/projects/${this.projectId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load project data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load project data');
      }
      
      // Update project name in UI
      const projectNameElement = document.getElementById('project-name');
      if (projectNameElement && data.project) {
        projectNameElement.textContent = data.project.name;
      }
      
      return data.project;
    } catch (error) {
      console.error('Error loading project data:', error);
      this.showError('Failed to load project data. Please try again later.');
      throw error;
    }
  }
  
  /**
   * Initialize charts
   */
  initializeCharts() {
    // Initialize event trends chart
    this.initializeEventTrendsChart();
    
    // Initialize event distribution chart
    this.initializeEventDistributionChart();
    
    // Initialize user retention chart
    this.initializeUserRetentionChart();
    
    // Initialize conversion funnel
    this.initializeConversionFunnel();
  }
  
  /**
   * Initialize event trends chart
   */
  initializeEventTrendsChart() {
    const ctx = document.getElementById('event-trends-chart');
    if (!ctx) return;
    
    // Create placeholder data
    const labels = this.visualizer.generateDateLabels(30);
    const data = {
      labels: labels,
      datasets: [{
        label: 'Events',
        data: this.visualizer.generateRandomData(30, 500, 1500),
        borderColor: this.visualizer.colors.primary,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    };
    
    // Create chart
    this.charts.eventTrends = this.visualizer.createLineChart('event-trends-chart', data);
  }
  
  /**
   * Initialize event distribution chart
   */
  initializeEventDistributionChart() {
    const ctx = document.getElementById('event-distribution-chart');
    if (!ctx) return;
    
    // Create placeholder data
    const data = {
      labels: ['Page View', 'Button Click', 'Form Submit', 'API Call', 'Purchase'],
      datasets: [{
        data: [45, 25, 15, 10, 5],
        backgroundColor: [
          this.visualizer.colors.primary,
          this.visualizer.colors.secondary,
          this.visualizer.colors.success,
          this.visualizer.colors.warning,
          this.visualizer.colors.danger
        ],
        borderWidth: 1
      }]
    };
    
    // Create chart
    this.charts.eventDistribution = this.visualizer.createDoughnutChart('event-distribution-chart', data);
  }
  
  /**
   * Initialize user retention chart
   */
  initializeUserRetentionChart() {
    const container = document.getElementById('user-retention-chart');
    if (!container) return;
    
    // Create placeholder data
    const data = {
      maxPeriod: 7,
      cohorts: [
        {
          date: 'Apr 1',
          size: 1250,
          retention: {
            1: 45,
            2: 38,
            3: 32,
            4: 28,
            5: 25,
            6: 22,
            7: 20
          }
        },
        {
          date: 'Apr 8',
          size: 1320,
          retention: {
            1: 48,
            2: 40,
            3: 34,
            4: 30,
            5: 27,
            6: 24,
            7: 22
          }
        },
        {
          date: 'Apr 15',
          size: 1180,
          retention: {
            1: 42,
            2: 36,
            3: 30,
            4: 26,
            5: 23,
            6: 20,
            7: 18
          }
        }
      ]
    };
    
    // Create heatmap
    this.visualizer.createRetentionHeatmap('user-retention-chart', data);
  }
  
  /**
   * Initialize conversion funnel
   */
  initializeConversionFunnel() {
    const container = document.getElementById('conversion-funnel-chart');
    if (!container) return;
    
    // Create placeholder data
    const data = {
      steps: [
        { label: 'Visit', value: 1000 },
        { label: 'Sign Up', value: 750 },
        { label: 'Product View', value: 500 },
        { label: 'Add to Cart', value: 250 },
        { label: 'Purchase', value: 100 }
      ]
    };
    
    // Create funnel
    this.visualizer.createFunnel('conversion-funnel-chart', data);
  }
  
  /**
   * Load dashboard data
   */
  async loadDashboardData() {
    try {
      // Load event count by day
      await this.loadEventCountByDay();
      
      // Load event count by type
      await this.loadEventCountByType();
      
      // Load unique users by day
      await this.loadUniqueUsersByDay();
      
      // Load funnel conversion
      await this.loadFunnelConversion();
      
      // Load retention cohorts
      await this.loadRetentionCohorts();
      
      // Load recent events
      await this.loadRecentEvents();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showError('Failed to load some dashboard data. Please try again later.');
    }
  }
  
  /**
   * Load event count by day
   */
  async loadEventCountByDay() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/events/count-by-day?projectId=${this.projectId}&startDate=${this.startDate}&endDate=${this.endDate}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load event count by day: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load event count by day');
      }
      
      // Update event trends chart
      if (this.charts.eventTrends && result.data && result.data.length > 0) {
        const labels = result.data.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const data = {
          labels: labels,
          datasets: [{
            label: 'Events',
            data: result.data.map(item => item.count),
            borderColor: this.visualizer.colors.primary,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        };
        
        this.visualizer.updateChart('event-trends-chart', data);
      }
      
      // Update total events stat
      const totalEvents = result.data.reduce((sum, item) => sum + item.count, 0);
      const totalEventsElement = document.getElementById('total-events');
      if (totalEventsElement) {
        totalEventsElement.textContent = totalEvents.toLocaleString();
      }
      
      return result.data;
    } catch (error) {
      console.error('Error loading event count by day:', error);
      return null;
    }
  }
  
  /**
   * Load event count by type
   */
  async loadEventCountByType() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/events/count-by-type?projectId=${this.projectId}&startDate=${this.startDate}&endDate=${this.endDate}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load event count by type: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load event count by type');
      }
      
      // Update event distribution chart
      if (this.charts.eventDistribution && result.data && result.data.length > 0) {
        const data = {
          labels: result.data.map(item => item.event_type),
          datasets: [{
            data: result.data.map(item => item.count),
            backgroundColor: [
              this.visualizer.colors.primary,
              this.visualizer.colors.secondary,
              this.visualizer.colors.success,
              this.visualizer.colors.warning,
              this.visualizer.colors.danger,
              this.visualizer.colors.info
            ],
            borderWidth: 1
          }]
        };
        
        this.visualizer.updateChart('event-distribution-chart', data);
      }
      
      return result.data;
    } catch (error) {
      console.error('Error loading event count by type:', error);
      return null;
    }
  }
  
  /**
   * Load unique users by day
   */
  async loadUniqueUsersByDay() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/events/unique-users?projectId=${this.projectId}&startDate=${this.startDate}&endDate=${this.endDate}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load unique users by day: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load unique users by day');
      }
      
      // Update active users stat
      const activeUsers = result.data.reduce((sum, item) => sum + item.unique_users, 0);
      const activeUsersElement = document.getElementById('active-users');
      if (activeUsersElement) {
        activeUsersElement.textContent = activeUsers.toLocaleString();
      }
      
      return result.data;
    } catch (error) {
      console.error('Error loading unique users by day:', error);
      return null;
    }
  }
  
  /**
   * Load funnel conversion
   */
  async loadFunnelConversion() {
    try {
      const steps = [
        { eventType: 'page_view', conditions: { page: 'home' } },
        { eventType: 'page_view', conditions: { page: 'signup' } },
        { eventType: 'form_submit', conditions: { form: 'signup' } },
        { eventType: 'page_view', conditions: { page: 'dashboard' } }
      ];
      
      const response = await fetch(`${this.apiBaseUrl}/events/funnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: this.projectId,
          steps: steps,
          startDate: this.startDate,
          endDate: this.endDate
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load funnel conversion: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load funnel conversion');
      }
      
      // Update conversion funnel
      if (result.data && result.data.steps) {
        const funnelData = {
          steps: result.data.steps.map(step => ({
            label: step.event_type,
            value: step.count
          }))
        };
        
        // Create or update funnel
        const container = document.getElementById('conversion-funnel-chart');
        if (container) {
          container.innerHTML = '';
          this.visualizer.createFunnel('conversion-funnel-chart', funnelData);
        }
        
        // Update conversion rate stat
        const conversionRateElement = document.getElementById('conversion-rate');
        if (conversionRateElement && result.data.overall_conversion) {
          const rate = (result.data.overall_conversion * 100).toFixed(1);
          conversionRateElement.textContent = `${rate}%`;
        }
      }
      
      return result.data;
    } catch (error) {
      console.error('Error loading funnel conversion:', error);
      return null;
    }
  }
  
  /**
   * Load retention cohorts
   */
  async loadRetentionCohorts() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/events/retention?projectId=${this.projectId}&startDate=${this.startDate}&endDate=${this.endDate}&interval=day`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load retention cohorts: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load retention cohorts');
      }
      
      // Update retention heatmap
      if (result.data && result.data.cohorts) {
        const cohortData = {
          maxPeriod: result.data.periods.length,
          cohorts: result.data.cohorts.map(cohort => ({
            date: new Date(cohort.cohort_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            size: cohort.cohort_size,
            retention: Object.fromEntries(
              result.data.periods.map(period => [
                period,
                cohort.retention[period] ? cohort.retention[period].rate : 0
              ])
            )
          }))
        };
        
        // Create or update heatmap
        const container = document.getElementById('user-retention-chart');
        if (container) {
          this.visualizer.createRetentionHeatmap('user-retention-chart', cohortData);
        }
      }
      
      return result.data;
    } catch (error) {
      console.error('Error loading retention cohorts:', error);
      return null;
    }
  }
  
  /**
   * Load recent events
   */
  async loadRecentEvents() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/events/recent?projectId=${this.projectId}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load recent events: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load recent events');
      }
      
      // Update recent events table
      if (result.events && result.events.length > 0) {
        const tableBody = document.querySelector('#recent-events-table tbody');
        if (tableBody) {
          tableBody.innerHTML = '';
          
          result.events.forEach(event => {
            const row = document.createElement('tr');
            
            // Event ID
            const idCell = document.createElement('td');
            idCell.textContent = event.event_id.substring(0, 8);
            row.appendChild(idCell);
            
            // Event Type
            const typeCell = document.createElement('td');
            typeCell.textContent = event.event_type;
            row.appendChild(typeCell);
            
            // User ID
            const userCell = document.createElement('td');
            userCell.textContent = event.user_id.substring(0, 8);
            row.appendChild(userCell);
            
            // Timestamp
            const timestampCell = document.createElement('td');
            const date = new Date(event.timestamp);
            timestampCell.textContent = date.toLocaleString();
            row.appendChild(timestampCell);
            
            // Properties
            const propertiesCell = document.createElement('td');
            const viewButton = document.createElement('button');
            viewButton.className = 'btn btn-sm btn-ghost';
            viewButton.innerHTML = '<i class="fas fa-eye"></i> View';
            viewButton.dataset.properties = JSON.stringify(event.properties);
            viewButton.addEventListener('click', () => this.showPropertiesModal(event.properties));
            propertiesCell.appendChild(viewButton);
            row.appendChild(propertiesCell);
            
            // Actions
            const actionsCell = document.createElement('td');
            const actionButton = document.createElement('button');
            actionButton.className = 'btn btn-sm btn-outline';
            actionButton.innerHTML = '<i class="fas fa-search"></i>';
            actionButton.addEventListener('click', () => this.showEventDetails(event.event_id));
            actionsCell.appendChild(actionButton);
            row.appendChild(actionsCell);
            
            tableBody.appendChild(row);
          });
        }
      }
      
      return result.events;
    } catch (error) {
      console.error('Error loading recent events:', error);
      return null;
    }
  }
  
  /**
   * Show properties modal
   * @param {Object} properties - Event properties
   */
  showPropertiesModal(properties) {
    const modal = document.getElementById('propertiesModal');
    const propertiesContent = document.querySelector('#propertiesModal pre');
    
    if (modal && propertiesContent) {
      propertiesContent.textContent = JSON.stringify(properties, null, 2);
      
      // Show modal
      modal.style.display = 'block';
      
      // Add event listener to close button
      const closeButton = modal.querySelector('[data-dismiss="modal"]');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      }
      
      // Add event listener to copy button
      const copyButton = modal.querySelector('.btn-primary');
      if (copyButton) {
        copyButton.addEventListener('click', () => {
          navigator.clipboard.writeText(JSON.stringify(properties, null, 2))
            .then(() => {
              alert('Properties copied to clipboard');
            })
            .catch(err => {
              console.error('Failed to copy properties:', err);
            });
        });
      }
    }
  }
  
  /**
   * Show event details
   * @param {string} eventId - Event ID
   */
  showEventDetails(eventId) {
    alert(`Event details for ${eventId} would be shown here.`);
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Date range picker
    const dateRangePicker = document.getElementById('date-range');
    if (dateRangePicker) {
      dateRangePicker.addEventListener('change', (event) => {
        const dateRange = event.target.value;
        const [start, end] = dateRange.split(' - ');
        
        // Parse dates
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // Update date range
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = endDate.toISOString().split('T')[0];
        
        // Reload dashboard data
        this.loadDashboardData();
      });
    }
    
    // Quick date range buttons
    const last7DaysButton = document.querySelector('button[data-range="7d"]');
    if (last7DaysButton) {
      last7DaysButton.addEventListener('click', () => {
        this.setDateRange(7);
      });
    }
    
    const last30DaysButton = document.querySelector('button[data-range="30d"]');
    if (last30DaysButton) {
      last30DaysButton.addEventListener('click', () => {
        this.setDateRange(30);
      });
    }
    
    const thisQuarterButton = document.querySelector('button[data-range="quarter"]');
    if (thisQuarterButton) {
      thisQuarterButton.addEventListener('click', () => {
        this.setQuarterDateRange();
      });
    }
    
    // Refresh dashboard button
    const refreshButton = document.querySelector('.refresh-dashboard');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.loadDashboardData();
      });
    }
  }
  
  /**
   * Set date range
   * @param {number} days - Number of days
   */
  setDateRange(days) {
    const today = new Date();
    
    // Set end date to today
    this.endDate = today.toISOString().split('T')[0];
    
    // Set start date to X days ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    this.startDate = startDate.toISOString().split('T')[0];
    
    // Update date range picker
    const dateRangePicker = document.getElementById('date-range');
    if (dateRangePicker) {
      dateRangePicker.value = `${this.formatDate(startDate)} - ${this.formatDate(today)}`;
    }
    
    // Reload dashboard data
    this.loadDashboardData();
  }
  
  /**
   * Set quarter date range
   */
  setQuarterDateRange() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    
    // Set start date to beginning of quarter
    const startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
    this.startDate = startDate.toISOString().split('T')[0];
    
    // Set end date to today
    this.endDate = today.toISOString().split('T')[0];
    
    // Update date range picker
    const dateRangePicker = document.getElementById('date-range');
    if (dateRangePicker) {
      dateRangePicker.value = `${this.formatDate(startDate)} - ${this.formatDate(today)}`;
    }
    
    // Reload dashboard data
    this.loadDashboardData();
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    
    // Add toast to document
    document.body.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardManager;
}
