// RadixInsight Website JavaScript

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality for code samples
    const tabButtons = document.querySelectorAll('.tab-btn');
    const codeTabs = document.querySelectorAll('.code-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            codeTabs.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked button and corresponding tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('header nav a, a.btn[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Only apply to links that start with #
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Offset for header
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Highlight active navigation item based on scroll position
    const sections = document.querySelectorAll('section[id]');
    
    function highlightNavItem() {
        const scrollPosition = window.scrollY + 100; // Add offset
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active class from all nav items
                document.querySelectorAll('nav a').forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active class to corresponding nav item
                const correspondingNavItem = document.querySelector(`nav a[href="#${sectionId}"]`);
                if (correspondingNavItem) {
                    correspondingNavItem.classList.add('active');
                }
            }
        });
    }
    
    // Call on scroll and on page load
    window.addEventListener('scroll', highlightNavItem);
    highlightNavItem();
    
    // Mobile navigation toggle
    const createMobileNav = () => {
        const header = document.querySelector('header');
        const nav = document.querySelector('header nav');
        
        // Create mobile nav toggle button if it doesn't exist
        if (!document.querySelector('.mobile-nav-toggle')) {
            const mobileNavToggle = document.createElement('button');
            mobileNavToggle.classList.add('mobile-nav-toggle');
            mobileNavToggle.innerHTML = '<i class="fas fa-bars"></i>';
            header.querySelector('.container').appendChild(mobileNavToggle);
            
            // Add event listener to toggle
            mobileNavToggle.addEventListener('click', () => {
                nav.classList.toggle('active');
                mobileNavToggle.querySelector('i').classList.toggle('fa-bars');
                mobileNavToggle.querySelector('i').classList.toggle('fa-times');
            });
            
            // Close mobile nav when clicking outside
            document.addEventListener('click', (e) => {
                if (!nav.contains(e.target) && !mobileNavToggle.contains(e.target) && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    mobileNavToggle.querySelector('i').classList.add('fa-bars');
                    mobileNavToggle.querySelector('i').classList.remove('fa-times');
                }
            });
            
            // Close mobile nav when clicking a nav link
            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    nav.classList.remove('active');
                    mobileNavToggle.querySelector('i').classList.add('fa-bars');
                    mobileNavToggle.querySelector('i').classList.remove('fa-times');
                });
            });
        }
    };
    
    // Check if we need mobile navigation
    const checkMobileNav = () => {
        if (window.innerWidth <= 768) {
            createMobileNav();
        }
    };
    
    // Call on page load and resize
    checkMobileNav();
    window.addEventListener('resize', checkMobileNav);
    
    // Create a simple data flow diagram
    const createDataFlowDiagram = () => {
        const diagramPlaceholder = document.getElementById('data-flow-diagram-placeholder');
        
        if (diagramPlaceholder) {
            // Create canvas element
            const canvas = document.createElement('canvas');
            canvas.width = diagramPlaceholder.offsetWidth;
            canvas.height = 300;
            diagramPlaceholder.innerHTML = '';
            diagramPlaceholder.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            
            // Define colors
            const colors = {
                background: '#f8f9fa',
                box: '#4a6cf7',
                arrow: '#6c757d',
                text: '#ffffff',
                label: '#212529'
            };
            
            // Draw background
            ctx.fillStyle = colors.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Define components and their positions
            const components = [
                { name: 'Client App', x: 100, y: 50, width: 120, height: 60 },
                { name: 'API Gateway', x: 100, y: 150, width: 120, height: 60 },
                { name: 'Kafka/Redis', x: 300, y: 150, width: 120, height: 60 },
                { name: 'Event Consumer', x: 500, y: 150, width: 120, height: 60 },
                { name: 'ClickHouse DB', x: 700, y: 150, width: 120, height: 60 },
                { name: 'Analytics Engine', x: 500, y: 250, width: 120, height: 60 },
                { name: 'Dashboard UI', x: 300, y: 250, width: 120, height: 60 }
            ];
            
            // Draw connections
            ctx.strokeStyle = colors.arrow;
            ctx.lineWidth = 2;
            
            // Client to API Gateway
            drawArrow(ctx, 160, 110, 160, 150);
            
            // API Gateway to Kafka
            drawArrow(ctx, 220, 180, 300, 180);
            
            // Kafka to Event Consumer
            drawArrow(ctx, 420, 180, 500, 180);
            
            // Event Consumer to ClickHouse
            drawArrow(ctx, 620, 180, 700, 180);
            
            // ClickHouse to Analytics Engine
            drawArrow(ctx, 700, 200, 620, 250);
            
            // Analytics Engine to Dashboard
            drawArrow(ctx, 500, 280, 420, 280);
            
            // Draw components
            components.forEach(component => {
                // Draw box
                ctx.fillStyle = colors.box;
                ctx.fillRect(component.x, component.y, component.width, component.height);
                
                // Draw text
                ctx.fillStyle = colors.text;
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(component.name, component.x + component.width / 2, component.y + component.height / 2);
            });
            
            // Add title
            ctx.fillStyle = colors.label;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('RadixInsight Data Flow Architecture', canvas.width / 2, 20);
        }
    };
    
    // Helper function to draw arrows
    function drawArrow(ctx, fromX, fromY, toX, toY) {
        const headLength = 10;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    }
    
    // Create data flow diagram on page load
    createDataFlowDiagram();
    
    // Recreate diagram on window resize
    window.addEventListener('resize', () => {
        createDataFlowDiagram();
    });
    
    // Add syntax highlighting for code blocks
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
});
