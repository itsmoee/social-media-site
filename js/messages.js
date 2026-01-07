// Messages page functionality
document.addEventListener('DOMContentLoaded', async function() {
    await initMessaging();
});

let currentConversationId = null;

async function initMessaging() {
    // Check auth
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (!data.user) {
        window.location.href = 'index.html?login=1';
        return;
    }

    await loadConversations();

    // Wire send message button
    const sendBtn = document.querySelector('.card-footer button.btn-primary');
    const msgInput = document.querySelector('input[placeholder="Type a message..."]');
    
    if (sendBtn && msgInput) {
        sendBtn.addEventListener('click', async () => {
            if (!currentConversationId) {
                showError('Please select a conversation first');
                return;
            }

            const content = msgInput.value.trim();
            if (!content) {
                showError('Message cannot be empty');
                return;
            }

            sendBtn.disabled = true;
            try {
                const resp = await fetch('/api/messages/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ recipientId: currentConversationId, content })
                });

                if (resp.ok) {
                    msgInput.value = '';
                    await loadConversation(currentConversationId);
                } else {
                    const err = await resp.json().catch(() => ({}));
                    showError(err.error || 'Failed to send message');
                }
            } catch (err) {
                console.error(err);
                showError('Network error. Please try again.');
            } finally {
                sendBtn.disabled = false;
            }
        });

        // Allow Enter to send
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
    }
}

async function loadConversations() {
    try {
        const resp = await fetch('/api/messages/conversations', { credentials: 'include' });
        if (!resp.ok) return;

        const data = await resp.json();
        const convList = document.querySelector('.col-lg-4 .list-group');
        
        if (!convList) return;
        
        if (!data.conversations || data.conversations.length === 0) {
            convList.innerHTML = '<div class="list-group-item text-muted">No conversations yet</div>';
            return;
        }

        convList.innerHTML = data.conversations.map(conv => `
            <a href="#" class="list-group-item list-group-item-action border-0" data-user-id="${conv.conversationWith._id}" onclick="selectConversation(event, '${conv.conversationWith._id}')">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="d-flex align-items-center gap-2 flex-grow-1">
                        <img src="${conv.conversationWith.profilePicture || 'https://via.placeholder.com/40'}" alt="Avatar" class="rounded-circle" width="40">
                        <div>
                            <h6 class="mb-0"><strong>${escapeHtml(conv.conversationWith.displayName || conv.conversationWith.username)}</strong></h6>
                            <small>${escapeHtml(conv.lastMessage.content.substring(0, 40))}</small>
                        </div>
                    </div>
                    <small class="text-muted">${formatTime(conv.lastMessage.createdAt)}</small>
                </div>
            </a>
        `).join('');
    } catch (err) {
        console.error('loadConversations error:', err);
        showError('Failed to load conversations');
    }
}

async function selectConversation(event, userId) {
    event.preventDefault();
    currentConversationId = userId;
    await loadConversation(userId);
}

async function loadConversation(userId) {
    try {
        const resp = await fetch(`/api/messages/conversation/${userId}`, { credentials: 'include' });
        if (!resp.ok) return;

        const data = await resp.json();
        const chatMessages = document.querySelector('.chat-messages');
        
        if (!chatMessages) return;

        if (!data.messages || data.messages.length === 0) {
            chatMessages.innerHTML = '<div class="text-muted text-center p-4">No messages yet. Start a conversation!</div>';
            return;
        }

        // Get current user
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        const meData = await meRes.json();
        const currentUserId = meData.user?.id;

        chatMessages.innerHTML = data.messages.map(msg => {
            const isOwn = msg.sender._id === currentUserId;
            return `
                <div class="mb-3 d-flex ${isOwn ? 'justify-content-end' : ''}">
                    <div class="bg-${isOwn ? 'primary text-white' : 'light'} p-3 rounded-3" style="max-width: 70%;">
                        <p class="mb-0">${escapeHtml(msg.content)}</p>
                        <small class="text-${isOwn ? 'white-50' : 'muted'}">${formatTime(msg.createdAt)}</small>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        console.error('loadConversation error:', err);
        showError('Failed to load conversation');
    }
}

function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
