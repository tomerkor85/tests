/**
 * RadixInsight Modern JavaScript
 * Modern, minimalist functionality for the RadixInsight platform
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initNavigation();
  initMobileMenu();
  initAnimations();
  initCharts();
  initTooltips();
  initModals();
  initDropdowns();
  initTabs();
  
  // Check if we're on the login page
  if (document.querySelector('.login-form')) {
    initLoginForm();
  }
  
  // Check if we're on a dashboard page
  if (document.querySelector('.dashboard-container')) {
    initDashboard();
  }
});

/**
 * Initialize smooth scrolling navigation
 */
function initNavigation() {
  const navLinks = document.querySelectorAll('a[href^="#"]:not([data-toggle])');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        // Smooth scroll to target
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Offset for header
          behavior: 'smooth'
        });
        
        // Update URL hash without scrolling
        history.pushState(null, null, targetId);
      }
    });
  });
  
  // Highlight active nav item based on scroll position
  window.addEventListener('scroll', highlightNavItem);
  highlightNavItem(); // Call once on load
}

/**
 * Highlight the active navigation item based on scroll position
 */
function highlightNavItem() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  
  if (sections.length === 0 || navLinks.length === 0) return;
  
  const scrollPosition = window.scrollY + 100; // Add offset
  
  // Find the current section
  let currentSection = sections[0].getAttribute('id');
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      currentSection = section.getAttribute('id');
    }
  });
  
  // Remove active class from all links
  navLinks.forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to current link
  const currentLink = document.querySelector(`nav a[href="#${currentSection}"]`);
  if (currentLink) {
    currentLink.classList.add('active');
  }
}

/**
 * Initialize mobile menu functionality
 */
function initMobileMenu() {
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const nav = document.querySelector('nav');
  
  if (!mobileToggle || !nav) return;
  
  mobileToggle.addEventListener('click', function() {
    nav.classList.toggle('active');
    
    // Toggle icon if using Font Awesome
    const icon = this.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    if (!nav.contains(e.target) && !mobileToggle.contains(e.target) && nav.classList.contains('active')) {
      nav.classList.remove('active');
      
      // Reset icon if using Font Awesome
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
      }
    }
  });
}

/**
 * Initialize animations for elements
 */
function initAnimations() {
  // Add animation classes when elements come into view
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animatedElements.length === 0) return;
  
  // Create intersection observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const animation = element.dataset.animation || 'animate-fade-in';
        element.classList.add(animation);
        
        // Stop observing after animation is added
        observer.unobserve(element);
      }
    });
  }, {
    threshold: 0.1 // Trigger when 10% of the element is visible
  });
  
  // Observe all animated elements
  animatedElements.forEach(element => {
    observer.observe(element);
  });
}

/**
 * Initialize charts if Chart.js is available
 */
function initCharts() {
  if (typeof Chart === 'undefined') return;
  
  // Sample chart initialization - will be replaced with real data
  const chartElements = document.querySelectorAll('.chart-canvas');
  
  chartElements.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    const chartType = canvas.dataset.chartType || 'line';
    
    // Sample data - will be replaced with real data
    const data = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: canvas.dataset.label || 'Data',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        tension: 0.4
      }]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };
    
    new Chart(ctx, {
      type: chartType,
      data: data,
      options: options
    });
  });
}

/**
 * Initialize tooltips
 */
function initTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    const tooltipText = element.dataset.tooltip;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.classList.add('tooltip');
    tooltip.textContent = tooltipText;
    
    // Add tooltip to element
    element.appendChild(tooltip);
    
    // Show/hide tooltip on hover
    element.addEventListener('mouseenter', () => {
      tooltip.classList.add('show');
    });
    
    element.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  });
}

/**
 * Initialize modal dialogs
 */
function initModals() {
  const modalTriggers = document.querySelectorAll('[data-toggle="modal"]');
  
  modalTriggers.forEach(trigger => {
    const modalId = trigger.dataset.target;
    const modal = document.querySelector(modalId);
    
    if (!modal) return;
    
    // Open modal when trigger is clicked
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    });
    
    // Close modal when close button is clicked
    const closeButtons = modal.querySelectorAll('[data-dismiss="modal"]');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
      });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
      }
    });
    
    // Close modal when pressing Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
      }
    });
  });
}

/**
 * Initialize dropdown menus
 */
function initDropdowns() {
  const dropdownTriggers = document.querySelectorAll('[data-toggle="dropdown"]');
  
  dropdownTriggers.forEach(trigger => {
    const dropdownMenu = trigger.nextElementSibling;
    
    if (!dropdownMenu || !dropdownMenu.classList.contains('dropdown-menu')) return;
    
    // Toggle dropdown when trigger is clicked
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        if (menu !== dropdownMenu) {
          menu.classList.remove('show');
        }
      });
      
      // Toggle current dropdown
      dropdownMenu.classList.toggle('show');
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  });
}

/**
 * Initialize tabs
 */
function initTabs() {
  const tabTriggers = document.querySelectorAll('[data-toggle="tab"]');
  
  tabTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      
      const tabContainer = trigger.closest('.tabs');
      if (!tabContainer) return;
      
      const targetId = trigger.getAttribute('href');
      const targetTab = document.querySelector(targetId);
      
      if (!targetTab) return;
      
      // Remove active class from all triggers and tabs
      tabContainer.querySelectorAll('[data-toggle="tab"]').forEach(tab => {
        tab.classList.remove('active');
      });
      
      tabContainer.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      
      // Add active class to current trigger and tab
      trigger.classList.add('active');
      targetTab.classList.add('active');
    });
  });
}

/**
 * Initialize login form validation
 */
function initLoginForm() {
  const loginForm = document.querySelector('.login-form');
  const emailInput = document.querySelector('#email');
  const passwordInput = document.querySelector('#password');
  const loginError = document.querySelector('#login-error');
  
  if (!loginForm || !emailInput || !passwordInput) return;
  
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Reset error messages
    loginError.textContent = '';
    loginError.style.display = 'none';
    
    // Validate email
    const email = emailInput.value.trim();
    if (!email) {
      showLoginError('Please enter your email address.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showLoginError('Please enter a valid email address.');
      return;
    }
    
    // Validate domain (radix-int.com)
    const domain = email.split('@')[1];
    if (domain !== 'radix-int.com') {
      showLoginError('Access is restricted to Radix International employees only.');
      return;
    }
    
    // Validate password
    const password = passwordInput.value;
    if (!password) {
      showLoginError('Please enter your password.');
      return;
    }
    
    // Simulate login (will be replaced with actual API call)
    simulateLogin(email, password);
  });
  
  function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
  }
  
  function simulateLogin(email, password) {
    // Show loading state
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    // Simulate API call
    setTimeout(() => {
      // For demo purposes, always succeed
      // This will be replaced with actual API call
      const user = {
        id: 'user123',
        email: email,
        name: email.split('@')[0]
      };
      
      // Store user in localStorage
      localStorage.setItem('radixinsight_user', JSON.stringify(user));
      localStorage.setItem('radixinsight_token', 'demo-token-' + Date.now());
      
      // Redirect to dashboard
      window.location.href = 'index.html';
    }, 1500);
  }
}

/**
 * Initialize dashboard functionality
 */
function initDashboard() {
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }
  
  // Initialize date range picker if available
  const dateRangePicker = document.querySelector('.date-range-picker');
  if (dateRangePicker && typeof flatpickr !== 'undefined') {
    flatpickr(dateRangePicker, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      defaultDate: [
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      ]
    });
  }
  
  // Initialize dashboard refresh
  const refreshButton = document.querySelector('.refresh-dashboard');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      refreshDashboardData();
    });
  }
}

/**
 * Refresh dashboard data (placeholder)
 */
function refreshDashboardData() {
  // This will be replaced with actual API calls
  console.log('Refreshing dashboard data...');
  
  // Show loading state
  const charts = document.querySelectorAll('.chart-container');
  charts.forEach(chart => {
    chart.classList.add('loading');
  });
  
  // Simulate API call
  setTimeout(() => {
    // Remove loading state
    charts.forEach(chart => {
      chart.classList.remove('loading');
    });
    
    // Update charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
      const chartInstances = Object.values(Chart.instances);
      chartInstances.forEach(chart => {
        // Generate new random data
        const data = chart.data.datasets[0].data;
        chart.data.datasets[0].data = data.map(() => Math.floor(Math.random() * 100));
        chart.update();
      });
    }
    
    // Show success message
    const toast = document.createElement('div');
    toast.classList.add('toast', 'toast-success');
    toast.textContent = 'Dashboard refreshed successfully';
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }, 1500);
}

/**
 * Create architecture diagram using SVG
 * @param {string} containerId - ID of the container element
 * @param {Object} config - Diagram configuration
 */
function createArchitectureDiagram(containerId, config) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', config.width || 800);
  svg.setAttribute('height', config.height || 600);
  svg.setAttribute('class', 'architecture-diagram');
  
  // Add title
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  title.setAttribute('x', (config.width || 800) / 2);
  title.setAttribute('y', 30);
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('font-size', '20');
  title.setAttribute('font-weight', 'bold');
  title.textContent = config.title || 'Architecture Diagram';
  svg.appendChild(title);
  
  // Add components
  if (config.components && Array.isArray(config.components)) {
    config.components.forEach(component => {
      // Create group for component
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      // Create rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', component.x);
      rect.setAttribute('y', component.y);
      rect.setAttribute('width', component.width || 120);
      rect.setAttribute('height', component.height || 60);
      rect.setAttribute('rx', 5);
      rect.setAttribute('ry', 5);
      rect.setAttribute('fill', component.fill || '#3b82f6');
      rect.setAttribute('stroke', component.stroke || '#2563eb');
      rect.setAttribute('stroke-width', 2);
      group.appendChild(rect);
      
      // Create text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', component.x + (component.width || 120) / 2);
      text.setAttribute('y', component.y + (component.height || 60) / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '14');
      text.textContent = component.name;
      group.appendChild(text);
      
      svg.appendChild(group);
    });
  }
  
  // Add connections
  if (config.connections && Array.isArray(config.connections)) {
    config.connections.forEach(connection => {
      // Create line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      // Calculate path
      const startX = connection.startX;
      const startY = connection.startY;
      const endX = connection.endX;
      const endY = connection.endY;
      
      // Create curved path
      let path;
      if (connection.type === 'straight') {
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        // Default to curved
        const controlX = (startX + endX) / 2;
        const controlY1 = startY;
        const controlY2 = endY;
        
        path = `M ${startX} ${startY} C ${controlX} ${controlY1}, ${controlX} ${controlY2}, ${endX} ${endY}`;
      }
      
      line.setAttribute('d', path);
      line.setAttribute('stroke', connection.stroke || '#6b7280');
      line.setAttribute('stroke-width', 2);
      line.setAttribute('fill', 'none');
      line.setAttribute('marker-end', 'url(#arrowhead)');
      
      svg.appendChild(line);
      
      // Add label if provided
      if (connection.label) {
        const labelX = (startX + endX) / 2;
        const labelY = (startY + endY) / 2 - 10;
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', labelX);
        label.setAttribute('y', labelY);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '12');
        label.setAttribute('fill', '#6b7280');
        
        // Add background rectangle for better readability
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', labelX - 40);
        labelBg.setAttribute('y', labelY - 12);
        labelBg.setAttribute('width', 80);
        labelBg.setAttribute('height', 16);
        labelBg.setAttribute('fill', 'white');
        labelBg.setAttribute('opacity', 0.8);
        
        svg.appendChild(labelBg);
        
        label.textContent = connection.label;
        svg.appendChild(label);
      }
    });
    
    // Add arrowhead marker definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', 10);
    marker.setAttribute('markerHeight', 7);
    marker.setAttribute('refX', 9);
    marker.setAttribute('refY', 3.5);
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#6b7280');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
  }
  
  // Add SVG to container
  container.appendChild(svg);
}
