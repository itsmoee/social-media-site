// Settings page functionality
document.addEventListener('DOMContentLoaded', async function() {
    await loadSettingsPage();
});

async function loadSettingsPage() {
    // Check auth
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (!data.user) {
        window.location.href = 'index.html?login=1';
        return;
    }

    const user = data.user;

    // Populate form with current user data
    const emailInput = document.querySelector('input[value="john@example.com"]');
    const usernameInput = document.querySelector('input[value="johndoe"]');
    const displayNameInput = document.querySelector('input[value="John Doe"]');
    const bioInput = document.querySelector('textarea');

    if (emailInput) emailInput.value = user.email;
    if (usernameInput) usernameInput.disabled = true; // Username can't be changed
    if (usernameInput) usernameInput.value = user.username;
    if (displayNameInput) displayNameInput.value = user.displayName || '';
    if (bioInput) bioInput.value = user.bio || '';

    // Wire form submission for account settings
    const accountForm = document.querySelector('#account form');
    if (accountForm) {
        const saveBtn = accountForm.querySelector('button[type="button"]:first-of-type');
        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const displayName = displayNameInput.value.trim();
                const bioValue = bioInput.value.trim();
                const email = emailInput.value.trim();

                if (!displayName) {
                    showError('Display name cannot be empty');
                    return;
                }

                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';

                try {
                    const resp = await fetch('/api/user/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ displayName, bio: bioValue, email })
                    });

                    if (resp.ok) {
                        showSuccess('Settings saved successfully');
                    } else {
                        const err = await resp.json().catch(() => ({}));
                        showError(err.error || 'Failed to save settings');
                    }
                } catch (err) {
                    console.error(err);
                    showError('Network error. Please try again.');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Changes';
                }
            });
        }
    }

    // Wire password change form
    const passwordForm = document.querySelector('#account form:last-of-type');
    if (passwordForm) {
        const currentPwInput = passwordForm.querySelector('input[type="password"]:nth-of-type(1)');
        const newPwInput = passwordForm.querySelector('input[type="password"]:nth-of-type(2)');
        const confirmPwInput = passwordForm.querySelector('input[type="password"]:nth-of-type(3)');
        const changeBtn = passwordForm.querySelector('button[type="button"]:first-of-type');

        if (changeBtn) {
            changeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentPassword = currentPwInput.value.trim();
                const newPassword = newPwInput.value.trim();
                const confirmPassword = confirmPwInput.value.trim();

                if (!currentPassword || !newPassword || !confirmPassword) {
                    showError('All password fields are required');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showError('New passwords do not match');
                    return;
                }

                if (newPassword.length < 6) {
                    showError('Password must be at least 6 characters');
                    return;
                }

                changeBtn.disabled = true;
                changeBtn.textContent = 'Updating...';

                try {
                    const resp = await fetch('/api/user/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ currentPassword, newPassword })
                    });

                    if (resp.ok) {
                        showSuccess('Password changed successfully');
                        currentPwInput.value = '';
                        newPwInput.value = '';
                        confirmPwInput.value = '';
                    } else {
                        const err = await resp.json().catch(() => ({}));
                        showError(err.error || 'Failed to change password');
                    }
                } catch (err) {
                    console.error(err);
                    showError('Network error. Please try again.');
                } finally {
                    changeBtn.disabled = false;
                    changeBtn.textContent = 'Update Password';
                }
            });
        }
    }
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
