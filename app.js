// PiVolve Recall - Complete Application
let memories = [];
let editId = null;
let currentReminder = 'none';
let activityChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMemories();
    setupEventListeners();
    updateStats();
    renderMemories();
    updateDate();
    setupCharts();
    checkReminders();
    setInterval(checkReminders, 60000);
});

// Load from localStorage
function loadMemories() {
    const saved = localStorage.getItem('pivolve_memories');
    if (saved) {
        memories = JSON.parse(saved);
    }
}

// Save to localStorage
function saveMemories() {
    localStorage.setItem('pivolve_memories', JSON.stringify(memories));
    updateStats();
    renderMemories();
    updateCharts();
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
    
    // Buttons
    document.getElementById('quickSaveBtn')?.addEventListener('click', () => openModal());
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modalCancel')?.addEventListener('click', closeModal);
    document.getElementById('modalSave')?.addEventListener('click', saveMemory);
    
    // Search
    document.getElementById('searchInput')?.addEventListener('input', () => renderMemories());
    
    // Export
    document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
    document.getElementById('exportJSON')?.addEventListener('click', exportToJSON);
    document.getElementById('exportMD')?.addEventListener('click', exportToMarkdown);
    
    // Reminder buttons
    document.querySelectorAll('.reminder-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.reminder-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReminder = btn.dataset.hours;
        });
    });
    
    // Modal close on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('memoryModal');
        if (e.target === modal) closeModal();
    });
}

// Switch Views
function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view === view) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}View`).classList.add('active');
    
    if (view === 'notepad') renderNotepad();
    if (view === 'insights') updateCharts();
}

// Open Modal
function openModal(memory = null) {
    const modal = document.getElementById('memoryModal');
    
    if (memory) {
        editId = memory.id;
        document.getElementById('modalText').value = memory.text;
        document.getElementById('modalTags').value = memory.tags.join(', ');
        document.getElementById('modalNotes').value = memory.notes || '';
        document.getElementById('modalSource').value = memory.source || '';
        currentReminder = memory.reminder || 'none';
        
        document.querySelectorAll('.reminder-btn').forEach(btn => {
            if (btn.dataset.hours === currentReminder) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } else {
        editId = null;
        document.getElementById('modalText').value = '';
        document.getElementById('modalTags').value = '';
        document.getElementById('modalNotes').value = '';
        document.getElementById('modalSource').value = '';
        currentReminder = 'none';
        document.querySelectorAll('.reminder-btn').forEach(btn => {
            if (btn.dataset.hours === 'none') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    modal.style.display = 'flex';
}

// Close Modal
function closeModal() {
    document.getElementById('memoryModal').style.display = 'none';
    editId = null;
}

// Save Memory
function saveMemory() {
    const text = document.getElementById('modalText').value.trim();
    if (!text) {
        showToast('Please enter some content');
        return;
    }
    
    const tags = document.getElementById('modalTags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    
    const notes = document.getElementById('modalNotes').value;
    const source = document.getElementById('modalSource').value;
    const reminder = currentReminder !== 'none' ? parseInt(currentReminder) : null;
    const reminderTime = reminder ? Date.now() + (reminder * 3600000) : null;
    
    if (editId) {
        const index = memories.findIndex(m => m.id === editId);
        if (index !== -1) {
            memories[index] = {
                ...memories[index],
                text,
                tags,
                notes,
                source,
                reminder,
                reminderTime,
                updatedAt: Date.now()
            };
            showToast('Memory updated!');
        }
    } else {
        const newMemory = {
            id: Date.now(),
            text,
            tags,
            notes,
            source,
            reminder,
            reminderTime,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        memories.unshift(newMemory);
        showToast('Memory saved!');
        
        if (reminderTime) {
            scheduleNotification(newMemory);
        }
    }
    
    saveMemories();
    closeModal();
}

// Render Memories
function renderMemories() {
    const container = document.getElementById('memoriesContainer');
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    let filtered = memories;
    if (searchTerm) {
        filtered = memories.filter(m => 
            m.text.toLowerCase().includes(searchTerm) ||
            m.notes?.toLowerCase().includes(searchTerm) ||
            m.tags.some(t => t.toLowerCase().includes(searchTerm))
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-brain"></i></div>
                <h3>No memories yet</h3>
                <p>Click "New Memory" to start saving ideas</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(memory => `
        <div class="memory-card" data-id="${memory.id}">
            <div class="memory-text">${escapeHtml(memory.text.substring(0, 200))}${memory.text.length > 200 ? '...' : ''}</div>
            ${memory.notes ? `<div class="memory-notes"><i class="fas fa-pen"></i> ${escapeHtml(memory.notes.substring(0, 100))}</div>` : ''}
            <div class="memory-meta">
                <span><i class="far fa-clock"></i> ${timeAgo(memory.createdAt)}</span>
                ${memory.source ? `<span><i class="fas fa-globe"></i> ${escapeHtml(memory.source)}</span>` : ''}
                ${memory.reminder ? `<span><i class="fas fa-bell"></i> ${getReminderText(memory.reminder)}</span>` : ''}
            </div>
            ${memory.tags.length ? `
                <div class="memory-tags">
                    ${memory.tags.map(tag => `<span class="memory-tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            <div class="memory-actions">
                <button class="memory-btn edit" data-id="${memory.id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="memory-btn delete" data-id="${memory.id}"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const memory = memories.find(m => m.id === parseInt(btn.dataset.id));
            if (memory) openModal(memory);
        });
    });
    
    document.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this memory?')) {
                memories = memories.filter(m => m.id !== parseInt(btn.dataset.id));
                saveMemories();
                showToast('Memory deleted');
            }
        });
    });
    
    document.querySelectorAll('.memory-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('searchInput').value = tag.dataset.tag;
            renderMemories();
        });
    });
}

// Render Notepad
function renderNotepad() {
    const container = document.getElementById('notepadContainer');
    document.getElementById('notepadCount').textContent = `${memories.length} entries`;
    
    if (memories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-book"></i></div>
                <h3>Empty notepad</h3>
                <p>Your saved memories will appear here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = memories.map(memory => `
        <div class="memory-card">
            <div class="memory-text">${escapeHtml(memory.text)}</div>
            <div class="memory-meta">${new Date(memory.createdAt).toLocaleString()}</div>
        </div>
    `).join('');
}

// Update Stats
function updateStats() {
    const today = new Date().toDateString();
    const todayCount = memories.filter(m => new Date(m.createdAt).toDateString() === today).length;
    const reminderCount = memories.filter(m => m.reminderTime && m.reminderTime > Date.now()).length;
    const uniqueTags = new Set(memories.flatMap(m => m.tags)).size;
    
    animateNumber('totalCount', memories.length);
    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('reminderCount').textContent = reminderCount;
    document.getElementById('tagCount').textContent = uniqueTags;
}

// Animate Number
function animateNumber(id, target) {
    const element = document.getElementById(id);
    if (!element) return;
    const start = parseInt(element.textContent) || 0;
    const duration = 500;
    const steps = 30;
    const increment = (target - start) / steps;
    let current = start;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, duration / steps);
}

// Update Date
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerHTML = new Date().toLocaleDateString('en-US', options);
}

// Setup Charts
function setupCharts() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Memories',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168,85,247,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                      x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } } }
        }
    });
}

// Update Charts
function updateCharts() {
    if (!activityChart) return;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const counts = new Array(7).fill(0);
    
    memories.forEach(memory => {
        const day = new Date(memory.createdAt).getDay();
        counts[day]++;
    });
    
    activityChart.data.datasets[0].data = counts;
    activityChart.update();
    
    // Update tag cloud
    const tagCount = {};
    memories.forEach(m => {
        m.tags.forEach(tag => {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
    });
    
    const tagCloud = document.getElementById('tagCloud');
    if (tagCloud && Object.keys(tagCount).length) {
        tagCloud.innerHTML = Object.entries(tagCount).map(([tag, count]) => 
            `<span onclick="document.getElementById('searchInput').value='${tag}'; switchView('dashboard'); renderMemories();">#${tag} (${count})</span>`
        ).join('');
    }
}

// Export Functions
function exportToPDF() {
    showToast('Generating PDF...');
    const element = document.createElement('div');
    element.innerHTML = `
        <div style="padding: 40px; font-family: Arial;">
            <h1>PiVolve Recall Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Total Memories: ${memories.length}</p>
            <hr>
            ${memories.map(m => `
                <div style="margin: 20px 0; padding: 20px; border-bottom: 1px solid #ddd;">
                    <p><strong>${escapeHtml(m.text)}</strong></p>
                    <p>Tags: ${m.tags.join(', ')}</p>
                    <p>Date: ${new Date(m.createdAt).toLocaleString()}</p>
                </div>
            `).join('')}
        </div>
    `;
    document.body.appendChild(element);
    html2pdf().set({ margin: 0.5, filename: `pivolve-report-${Date.now()}.pdf` }).from(element).save();
    setTimeout(() => element.remove(), 1000);
}

function exportToJSON() {
    const data = JSON.stringify(memories, null, 2);
    downloadFile(data, `pivolve-export-${Date.now()}.json`, 'application/json');
    showToast('JSON exported!');
}

function exportToMarkdown() {
    let md = `# PiVolve Recall Export\n\n**Generated:** ${new Date().toLocaleString()}\n**Total:** ${memories.length} memories\n\n---\n\n`;
    memories.forEach(m => {
        md += `## Memory\n\n**Content:** ${m.text}\n\n`;
        if (m.notes) md += `**Notes:** ${m.notes}\n\n`;
        if (m.tags.length) md += `**Tags:** ${m.tags.join(', ')}\n\n`;
        md += `**Date:** ${new Date(m.createdAt).toLocaleString()}\n\n---\n\n`;
    });
    downloadFile(md, `pivolve-export-${Date.now()}.md`, 'text/markdown');
    showToast('Markdown exported!');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// Reminders
function scheduleNotification(memory) {
    if (!memory.reminderTime || !('Notification' in window)) return;
    Notification.requestPermission();
    const delay = memory.reminderTime - Date.now();
    if (delay > 0 && delay < 30 * 24 * 60 * 60 * 1000) {
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification('PiVolve Recall', {
                    body: `Review: ${memory.text.substring(0, 100)}`,
                    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a855f7"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"%3E%3C/path%3E%3C/svg%3E'
                });
            }
        }, delay);
    }
}

function checkReminders() {
    const now = Date.now();
    memories.forEach(memory => {
        if (memory.reminderTime && memory.reminderTime <= now && !memory.notified) {
            if (Notification.permission === 'granted') {
                new Notification('PiVolve Recall Reminder', {
                    body: `Time to review: ${memory.text.substring(0, 100)}`,
                    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a855f7"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"%3E%3C/path%3E%3C/svg%3E'
                });
                memory.notified = true;
                saveMemories();
            }
        }
    });
}

// Helper Functions
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getReminderText(hours) {
    if (hours === 1) return '1 hour';
    if (hours === 24) return '1 day';
    if (hours === 168) return '1 week';
    return `${hours} hours`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission(), 3000);
}