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
        
        if (data.user) {
            // Show authenticated UI
            document.getElementById('landing-page').style.display = 'none';
            document.getElementById('home-feed').style.display = 'block';
            document.getElementById('nav-profile').style.display = 'block';
            document.getElementById('nav-messages').style.display = 'block';
            document.getElementById('nav-settings').style.display = 'block';
            
            // Populate sidebar with user data
            const avatar = data.user.profilePicture || 'https://via.placeholder.com/150';
            document.getElementById('sidebar-avatar').src = avatar;
            document.getElementById('sidebar-name').textContent = data.user.displayName || data.user.username;
            document.getElementById('sidebar-username').textContent = '@' + data.user.username;

            // Load posts/feed
            setupPosts();
        } else {
            // Show landing page and auto-open login modal if redirected
            document.getElementById('landing-page').style.display = 'block';
            document.getElementById('home-feed').style.display = 'none';
            
            const url = new URL(window.location.href);
            if (url.searchParams.get('login') === '1') {
                const loginModalEl = document.getElementById('loginModal');
                if (loginModalEl) new bootstrap.Modal(loginModalEl).show();
            }
        }
        
        renderAuthNav(data.user);

        // Wire auth forms if present
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const identifier = form.identifier.value.trim();
                const password = form.password.value.trim();
                
                if (!identifier || !password) {
                    showError('Please fill in all fields');
                    return;
                }

                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                
                try {
                    const resp = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ identifier, password })
                    });
                    if (resp.ok) {
                        showSuccess('Logged in successfully');
                        tryHideModal('loginModal');
                        location.reload();
                    } else {
                        const err = await resp.json().catch(() => ({}));
                        showError(err.error || 'Login failed');
                    }
                } catch (err) {
                    console.error(err);
                    showError('Network error. Please try again.');
                } finally {
                    submitBtn.disabled = false;
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

                // Validation
                if (!payload.username || !payload.email || !payload.password) {
                    showError('Please fill in all required fields');
                    return;
                }
                if (payload.username.length < 3) {
                    showError('Username must be at least 3 characters');
                    return;
                }
                if (payload.password.length < 6) {
                    showError('Password must be at least 6 characters');
                    return;
                }

                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;

                try {
                    const resp = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    if (resp.ok) {
                        showSuccess('Account created! Complete your profile.');
                        tryHideModal('registerModal');
                        window.location.href = 'profile-setup.html';
                    } else {
                        const err = await resp.json().catch(() => ({}));
                        showError(err.error || 'Registration failed');
                    }
                } catch (err) {
                    console.error(err);
                    showError('Network error. Please try again.');
                } finally {
                    submitBtn.disabled = false;
                }
            });
        }

    } catch (e) {
        console.error('Auth init error', e);
    }
}

// ===== Posts =====
function setupPosts() {
    const form = document.getElementById('createPostForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = document.getElementById('postContent');
            const content = textarea.value.trim();
            
            if (!content) {
                showError('Post cannot be empty');
                return;
            }
            
            if (content.length > 500) {
                showError('Post must be 500 characters or less');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            try {
                const resp = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content })
                });
                if (resp.ok) {
                    textarea.value = '';
                    showSuccess('Post created successfully');
                    await loadPosts();
                } else {
                    const err = await resp.json().catch(() => ({}));
                    showError(err.error || 'Failed to post');
                }
            } catch (err) {
                console.error(err);
                showError('Network error. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post';
            }
        });
    }

    loadPosts();
}

async function loadPosts() {
    try {
        const resp = await fetch('/api/posts', { credentials: 'include' });
        if (!resp.ok) return;
        const data = await resp.json();
        renderPosts(data.posts || []);
    } catch (err) {
        console.error('loadPosts error', err);
    }
}

function renderPosts(posts) {
    const container = document.getElementById('posts-list');
    if (!container) return;
    if (!posts.length) {
        container.innerHTML = '<div class="card mb-3"><div class="card-body text-muted">No posts yet. Be the first to share something!</div></div>';
        return;
    }

    container.innerHTML = posts.map(post => renderPostCard(post)).join('');
    
    // Attach event listeners to like buttons
    container.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const postId = btn.dataset.postId;
            const resp = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                credentials: 'include'
            });
            if (resp.ok) {
                const data = await resp.json();
                btn.querySelector('.like-icon').textContent = data.liked ? '❤️' : '🤍';
                btn.querySelector('.like-count').textContent = data.likeCount;
            } else {
                showError('Failed to like post');
            }
        });
    });

    // Attach delete listeners
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Delete this post?')) {
                const postId = btn.dataset.postId;
                const resp = await fetch(`/api/posts/${postId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (resp.ok) {
                    await loadPosts();
                } else {
                    const err = await resp.json().catch(() => ({}));
                    showError(err.error || 'Failed to delete post');
                }
            }
        });
    });
}

function renderPostCard(post) {
    const authorName = escapeHtml(post.author?.displayName || post.author?.username || 'User');
    const username = escapeHtml(post.author?.username || 'user');
    const avatar = post.author?.profilePicture || 'https://via.placeholder.com/80';
    const content = escapeHtml(post.content || '');
    const created = formatDate(post.createdAt);
    const likeCount = post.likes?.length || 0;

    return `
      <div class="card mb-3 post-card" data-post-id="${post.id}">
        <div class="card-body">
          <div class="d-flex align-items-center mb-2 gap-3">
            <img src="${avatar}" alt="${authorName}" class="rounded-circle" width="48" height="48" style="object-fit: cover;">
            <div>
              <div class="fw-semibold">${authorName}</div>
              <small class="text-muted">@${username} - ${created}</small>
            </div>
          </div>
          <p class="mb-3">${content}</p>
          <div class="d-flex gap-3 border-top pt-2">
            <button class="btn btn-sm btn-light like-btn" data-post-id="${post.id}">
              <span class="like-icon">🤍</span> <span class="like-count">${likeCount}</span>
            </button>
            <button class="btn btn-sm btn-light comment-btn" data-post-id="${post.id}">💬 Comment</button>
            <button class="btn btn-sm btn-light delete-btn" data-post-id="${post.id}">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `;
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

// Show error toast
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast show position-fixed bottom-0 end-0 m-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast-header bg-danger text-white">
            <strong class="me-auto">Error</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            ${escapeHtml(message)}
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Show success toast
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast show position-fixed bottom-0 end-0 m-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast-header bg-success text-white">
            <strong class="me-auto">Success</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            ${escapeHtml(message)}
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
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
