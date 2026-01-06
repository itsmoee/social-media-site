// Social Media Site JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('SocialHub loaded successfully!');

    // Initialize tooltips
    initializeTooltips();

    // Add event listeners
    setupEventListeners();

    // Load dynamic content
    loadUserData();

    // Initialize auth UI
    initAuth();
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

// ===== Auth Integration =====
async function initAuth() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        renderAuthNav(data.user);

        // Auto-open login modal if redirected with login=1
        const url = new URL(window.location.href);
        if (!data.user && url.searchParams.get('login') === '1') {
            const loginModalEl = document.getElementById('loginModal');
            if (loginModalEl) new bootstrap.Modal(loginModalEl).show();
        }

        // Wire auth forms if present
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const identifier = form.identifier.value.trim();
                const password = form.password.value.trim();
                const resp = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ identifier, password })
                });
                if (resp.ok) {
                    // Close modal and refresh UI
                    tryHideModal('loginModal');
                    location.reload();
                } else {
                    const err = await resp.json().catch(() => ({}));
                    alert(err.error || 'Login failed');
                }
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const payload = {
                    username: form.username.value.trim(),
                    email: form.email.value.trim(),
                    displayName: form.displayName.value.trim(),
                    password: form.password.value.trim()
                };
                const resp = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                if (resp.ok) {
                    tryHideModal('registerModal');
                    location.reload();
                } else {
                    const err = await resp.json().catch(() => ({}));
                    alert(err.error || 'Registration failed');
                }
            });
        }

    } catch (e) {
        console.error('Auth init error', e);
    }
}

function renderAuthNav(user) {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;
    if (user) {
        navAuth.innerHTML = `
            <div class="dropdown">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                ${escapeHtml(user.username)}
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="profile.html">My Profile</a></li>
                <li><a class="dropdown-item" href="settings.html">Settings</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item" id="btn-logout">Log out</button></li>
              </ul>
            </div>`;
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                location.href = 'index.html';
            });
        }
    } else {
        navAuth.innerHTML = `
            <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">Log in</a>
            <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#registerModal">Sign up</a>`;
    }
}

function tryHideModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const instance = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
    instance.hide();
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
