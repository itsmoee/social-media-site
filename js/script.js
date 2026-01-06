// Social Media Site JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('SocialHub loaded successfully!');

    // Initialize tooltips
    initializeTooltips();

    // Add event listeners
    setupEventListeners();

    // Load dynamic content
    loadUserData();
});

// Initialize Bootstrap tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Like button functionality
    document.querySelectorAll('.btn-light').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.textContent.includes('❤️')) {
                this.classList.toggle('liked');
                const count = parseInt(this.textContent.match(/\d+/)[0]);
                this.textContent = this.textContent.includes('Likes') 
                    ? '❤️ ' + (count + 1) + ' Likes' 
                    : count + ' Likes';
            }
        });
    });

    // Message input functionality
    const messageInput = document.querySelector('input[placeholder="Type a message..."]');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                sendMessage(this.value);
                this.value = '';
            }
        });
    }

    // Search functionality
    const searchInputs = document.querySelectorAll('input[placeholder*="Search"]');
    searchInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            filterResults(this.value, this);
        });
    });
}

// Load user data (simulated)
function loadUserData() {
    const userData = {
        name: 'John Doe',
        username: '@johndoe',
        followers: 5200,
        posts: 234,
        location: 'San Francisco, CA'
    };

    // You can use this data to populate the page
    console.log('User Data:', userData);
}

// Send message function
function sendMessage(message) {
    console.log('Message sent:', message);
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = 'mb-3 d-flex justify-content-end';
    messageEl.innerHTML = `
        <div class="bg-primary text-white p-3 rounded-3" style="max-width: 70%;">
            <p class="mb-0">${escapeHtml(message)}</p>
            <small class="text-white-50">${getCurrentTime()}</small>
        </div>
    `;

    // Append to chat messages
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Filter results based on search
function filterResults(searchTerm, inputElement) {
    const parentContainer = inputElement.closest('.card') || inputElement.closest('.modal-body');
    if (!parentContainer) return;

    const items = parentContainer.querySelectorAll('.list-group-item, a[href="#"]');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm.toLowerCase())) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Get current time in HH:MM format
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Add animation to elements on scroll
function observeElements() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.post-card').forEach(el => {
        observer.observe(el);
    });
}

// Toggle theme (light/dark)
function toggleTheme(themeName) {
    const html = document.documentElement;
    if (themeName === 'dark') {
        html.style.colorScheme = 'dark';
        document.body.style.backgroundColor = '#1a1a1a';
        document.body.style.color = '#fff';
    } else if (themeName === 'light') {
        html.style.colorScheme = 'light';
        document.body.style.backgroundColor = '#f8f9fa';
        document.body.style.color = '#333';
    }
    // Save preference to localStorage
    localStorage.setItem('theme', themeName);
}

// Initialize theme from localStorage
window.addEventListener('load', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    toggleTheme(savedTheme);
    observeElements();
});

// Export functions for use in HTML
window.sendMessage = sendMessage;
window.toggleTheme = toggleTheme;
window.filterResults = filterResults;
