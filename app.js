// PiVolve Recall - Complete App Logic
let ideas = [];
let editId = null;
let currentReminder = 'none';
let currentView = 'dashboard';
let activityChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas();
    setupEventListeners();
    updateStats();
    renderMemoryGrid();
    setupDate();
    setupKeyboardShortcuts();
    setupCursorGlow();
    generateInsights();
    setupChart();
});

function loadIdeas() {
    const saved = localStorage.getItem('pivolve_ideas');
    if (saved) {
        ideas = JSON.parse(saved);
    }
}

function saveIdeas() {
    localStorage.setItem('pivolve_ideas', JSON.stringify(ideas));
    updateStats();
    renderMemoryGrid();
    updateNotepadView();
    generateInsights();
    updateChart();
}

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
    
    document.getElementById('quickSavePremium').onclick = () => openModal();
    document.querySelector('.modal-close').onclick = closeModal;
    document.getElementById('modalCancel').onclick = closeModal;
    document.getElementById('modalSave').onclick = saveIdea;
    
    document.getElementById('globalSearch').oninput = debounce(renderMemoryGrid, 300);
    document.getElementById('tagFilterPremium')?.addEventListener('input', renderMemoryGrid);
    document.getElementById('clearFiltersPremium')?.addEventListener('click', () => {
        document.getElementById('globalSearch').value = '';
        document.getElementById('tagFilterPremium').value = '';
        renderMemoryGrid();
        showToast('Filters cleared', 'info');
    });
    
    document.querySelectorAll('.reminder-option').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.reminder-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReminder = btn.dataset.hours;
        };
    });
    
    const tagsInput = document.getElementById('modalTagsInput');
    if (tagsInput) {
        tagsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagsInput.value.trim());
                tagsInput.value = '';
            }
        });
    }
    
    document.getElementById('modalText')?.addEventListener('input', (e) => {
        document.getElementById('charCount').textContent = e.target.value.length;
    });
    
    document.getElementById('newSpaceBtn')?.addEventListener('click', () => {
        showToast('Spaces feature coming soon!', 'info');
    });
}

function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view === view) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}View`).classList.add('active');
    
    if (view === 'notepad') updateNotepadView();
    if (view === 'insights') generateInsights();
}

function openModal(idea = null) {
    const modal = document.getElementById('premiumModal');
    if (idea) {
        editId = idea.id;
        document.getElementById('modalText').value = idea.text;
        document.getElementById('modalNotes').value = idea.notes || '';
        document.getElementById('modalUrl').value = idea.url || '';
        document.getElementById('modalSource').value = idea.source || '';
        
        if (idea.tags) {
            idea.tags.forEach(tag => addTag(tag));
        }
        
        if (idea.reminder) {
            currentReminder = idea.reminder.toString();
            document.querySelectorAll('.reminder-option').forEach(btn => {
                if (btn.dataset.hours === currentReminder) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    } else {
        editId = null;
        document.getElementById('modalText').value = '';
        document.getElementById('modalNotes').value = '';
        document.getElementById('modalUrl').value = '';
        document.getElementById('modalSource').value = '';
        document.getElementById('modalTagsList').innerHTML = '';
        document.getElementById('charCount').textContent = '0';
        currentReminder = 'none';
        document.querySelectorAll('.reminder-option').forEach(btn => {
            if (btn.dataset.hours === 'none') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('premiumModal').style.display = 'none';
    editId = null;
    document.getElementById('modalTagsList').innerHTML = '';
}

function addTag(tag) {
    if (!tag) return;
    const tagsList = document.getElementById('modalTagsList');
    const tagElement = document.createElement('div');
    tagElement.className = 'tag-chip';
    tagElement.style.cssText = 'background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.1)); padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; margin: 4px;';
    tagElement.innerHTML = `${escapeHtml(tag)} <i class="fas fa-times" style="cursor: pointer; font-size: 10px;" onclick="this.parentElement.remove()"></i>`;
    tagsList.appendChild(tagElement);
}

function getTags() {
    const tags = [];
    document.querySelectorAll('#modalTagsList .tag-chip').forEach(tag => {
        tags.push(tag.textContent.replace('×', '').trim());
    });
    return tags;
}

function saveIdea() {
    const text = document.getElementById('modalText').value.trim();
    if (!text) {
        showToast('Please enter some content', 'error');
        return;
    }
    
    const tags = getTags();
    const notes = document.getElementById('modalNotes').value;
    const url = document.getElementById('modalUrl').value;
    const source = document.getElementById('modalSource').value;
    const reminder = currentReminder !== 'none' ? parseInt(currentReminder) : null;
    const reminderTime = reminder ? Date.now() + (reminder * 3600000) : null;
    
    if (editId) {
        const index = ideas.findIndex(i => i.id === editId);
        if (index !== -1) {
            ideas[index] = {
                ...ideas[index],
                text,
                tags,
                notes,
                url,
                source,
                reminder,
                reminderTime,
                updatedAt: Date.now()
            };
            showToast('Memory updated!', 'success');
        }
    } else {
        const newIdea = {
            id: Date.now(),
            text,
            tags,
            notes,
            url,
            source,
            reminder,
            reminderTime,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        ideas.unshift(newIdea);
        showToast('Memory saved! 🧠', 'success');
        
        if (reminderTime) {
            scheduleReminder(newIdea);
        }
    }
    
    saveIdeas();
    closeModal();
}

function renderMemoryGrid() {
    const container = document.getElementById('memoryGrid');
    const searchTerm = document.getElementById('globalSearch').value.toLowerCase();
    
    let filtered = [...ideas];
    
    if (searchTerm) {
        filtered = filtered.filter(idea =>
            idea.text.toLowerCase().includes(searchTerm) ||
            (idea.notes && idea.notes.toLowerCase().includes(searchTerm)) ||
            idea.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state-premium">
                <div class="empty-icon">🧠</div>
                <h3>No memories found</h3>
                <p>Start capturing ideas by clicking "New Memory"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(idea => `
        <div class="memory-card" data-id="${idea.id}">
            <div class="memory-text">
                ${escapeHtml(idea.text.substring(0, 200))}${idea.text.length > 200 ? '...' : ''}
            </div>
            
            ${idea.notes ? `
                <div class="memory-notes">
                    <i class="fas fa-pen"></i> ${escapeHtml(idea.notes.substring(0, 100))}
                </div>
            ` : ''}
            
            <div class="memory-meta">
                <span><i class="far fa-clock"></i> ${timeAgo(idea.createdAt)}</span>
                ${idea.source ? `<span><i class="fas fa-mobile-alt"></i> ${escapeHtml(idea.source)}</span>` : ''}
                ${idea.reminder ? `<span><i class="fas fa-bell"></i> ${getReminderText(idea.reminder)}</span>` : ''}
            </div>
            
            ${idea.tags.length > 0 ? `
                <div class="memory-tags">
                    ${idea.tags.map(tag => `<span class="memory-tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="memory-actions">
                <button class="memory-btn edit" data-id="${idea.id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="memory-btn delete" data-id="${idea.id}"><i class="fas fa-trash"></i> Delete</button>
                ${idea.url ? `<a href="${idea.url}" target="_blank" class="memory-btn"><i class="fas fa-external-link-alt"></i> Source</a>` : ''}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.memory-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('memory-btn') && !e.target.closest('.memory-actions')) {
                const id = parseInt(card.dataset.id);
                const idea = ideas.find(i => i.id === id);
                if (idea) openModal(idea);
            }
        });
    });
    
    document.querySelectorAll('.memory-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('globalSearch').value = tag.dataset.tag;
            renderMemoryGrid();
        });
    });
    
    document.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const idea = ideas.find(i => i.id === id);
            if (idea) openModal(idea);
        });
    });
    
    document.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this memory?')) {
                const id = parseInt(btn.dataset.id);
                ideas = ideas.filter(i => i.id !== id);
                saveIdeas();
                showToast('Memory deleted', 'info');
            }
        });
    });
}

function updateNotepadView() {
    const container = document.getElementById('notepadContainer');
    if (!container) return;
    
    document.getElementById('notepadCount').textContent = ideas.length;
    
    if (ideas.length === 0) {
        container.innerHTML = `
            <div class="empty-state-premium">
                <div class="empty-icon">📓</div>
                <h3>Empty Notepad</h3>
                <p>Your memories will appear here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = ideas.map(idea => `
        <div class="memory-card" style="margin-bottom: 16px;">
            <div class="memory-text">${escapeHtml(idea.text)}</div>
            <div class="memory-meta">
                ${new Date(idea.createdAt).toLocaleString()}
            </div>
        </div>
    `).join('');
}

function generateInsights() {
    const tagCount = {};
    ideas.forEach(idea => {
        idea.tags.forEach(tag => {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
    });
    
    const tagCloud = document.getElementById('tagCloud');
    if (tagCloud) {
        if (Object.keys(tagCount).length === 0) {
            tagCloud.innerHTML = '<p style="color: #666">No tags yet</p>';
        } else {
            const maxCount = Math.max(...Object.values(tagCount));
            tagCloud.innerHTML = Object.entries(tagCount).map(([tag, count]) => `
                <span style="display: inline-block; margin: 8px; padding: 4px 12px; background: linear-gradient(135deg, rgba(168,85,247,${0.3 + (count/maxCount)*0.5}), rgba(59,130,246,0.1)); border-radius: 20px; font-size: ${12 + (count/maxCount)*16}px; cursor: pointer;" onclick="document.getElementById('globalSearch').value='${tag}'; renderMemoryGrid(); switchView('dashboard');">
                    #${tag} (${count})
                </span>
            `).join('');
        }
    }
    
    document.getElementById('tagCount').textContent = Object.keys(tagCount).length;
}

function updateStats() {
    const today = new Date().toDateString();
    const todayCount = ideas.filter(idea => 
        new Date(idea.createdAt).toDateString() === today
    ).length;
    
    const reminderCount = ideas.filter(idea => 
        idea.reminderTime && idea.reminderTime > Date.now()
    ).length;
    
    animateNumber('totalCount', 0, ideas.length);
    animateNumber('todayCount', 0, todayCount);
    animateNumber('reminderCount', 0, reminderCount);
}

function animateNumber(elementId, start, end) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const duration = 1000;
    const steps = 60;
    const increment = (end - start) / steps;
    let current = start;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, duration / steps);
}

function setupDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('globalSearch').focus();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            openModal();
        }
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function setupCursorGlow() {
    const glow = document.querySelector('.cursor-glow');
    document.addEventListener('mousemove', (e) => {
        glow.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
    });
}

function setupChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Memories Created',
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
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff' }
                }
            }
        }
    });
}

function updateChart() {
    if (!activityChart) return;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = new Array(7).fill(0);
    
    ideas.forEach(idea => {
        const day = new Date(idea.createdAt).getDay();
        counts[day]++;
    });
    
    activityChart.data.datasets[0].data = counts;
    activityChart.update();
}

function scheduleReminder(idea) {
    if (!idea.reminderTime) return;
    
    if ('Notification' in window) {
        Notification.requestPermission();
        const delay = idea.reminderTime - Date.now();
        if (delay > 0 && delay < 30 * 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                new Notification('🧠 PiVolve Recall', {
                    body: `Time to review: "${idea.text.substring(0, 100)}"`,
                    icon: '/icons/icon-192.png'
                });
            }, delay);
        }
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('premiumToast');
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;
    toast.style.display = 'flex';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
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
    if (hours <= 1) return '1 hour';
    if (hours < 24) return `${hours} hours`;
    if (hours === 24) return '1 day';
    if (hours < 168) return `${Math.floor(hours / 24)} days`;
    return `${Math.floor(hours / 168)} weeks`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => {
        Notification.requestPermission();
    }, 5000);
}

// PDF Export Function
document.getElementById('exportPDFBtn')?.addEventListener('click', exportToPDF);

async function exportToPDF() {
    showToast('Generating PDF report...', 'info');
    
    // Create export container
    const exportContainer = document.createElement('div');
    exportContainer.className = 'pdf-export-container';
    exportContainer.style.cssText = 'padding: 40px; background: white; color: black; font-family: Inter, sans-serif; max-width: 800px; margin: 0 auto;';
    
    // Add header
    exportContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🧠</div>
            <h1 style="color: #1f2937; font-size: 28px; margin-bottom: 8px;">PiVolve Recall Report</h1>
            <p style="color: #6b7280;">Generated on ${new Date().toLocaleString()}</p>
            <p style="color: #6b7280;">Total Entries: ${ideas.length}</p>
        </div>
        <div style="margin-bottom: 30px;">
            <h2 style="color: #374151; font-size: 20px; margin-bottom: 16px;">Summary Statistics</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div style="background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${ideas.length}</div>
                    <div style="color: #6b7280; font-size: 12px;">Total Entries</div>
                </div>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${ideas.filter(i => i.tags.length).length}</div>
                    <div style="color: #6b7280; font-size: 12px;">Tagged Entries</div>
                </div>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${ideas.filter(i => i.reminder).length}</div>
                    <div style="color: #6b7280; font-size: 12px;">With Reminders</div>
                </div>
            </div>
        </div>
        <h2 style="color: #374151; font-size: 20px; margin-bottom: 16px;">Knowledge Entries</h2>
    `;
    
    // Add each entry
    ideas.forEach(idea => {
        const entryDiv = document.createElement('div');
        entryDiv.style.cssText = 'margin-bottom: 30px; padding: 20px; border-bottom: 1px solid #e5e7eb;';
        entryDiv.innerHTML = `
            <div style="font-size: 14px; line-height: 1.6; margin-bottom: 12px; color: #1f2937;">${escapeHtml(idea.text)}</div>
            ${idea.notes ? `<div style="background: #fef3c7; padding: 12px; border-radius: 8px; font-size: 13px; color: #92400e; margin-bottom: 12px;">${escapeHtml(idea.notes)}</div>` : ''}
            <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: #6b7280;">
                <span>📅 ${new Date(idea.createdAt).toLocaleDateString()}</span>
                ${idea.tags.length ? `<span>🏷️ ${idea.tags.join(', ')}</span>` : ''}
                ${idea.source ? `<span>📱 ${escapeHtml(idea.source)}</span>` : ''}
            </div>
        `;
        exportContainer.appendChild(entryDiv);
    });
    
    document.body.appendChild(exportContainer);
    
    // Generate PDF
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `pivolve-report-${new Date().toISOString().slice(0,19)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        await html2pdf().set(opt).from(exportContainer).save();
        showToast('PDF exported successfully!', 'success');
    } catch (error) {
        console.error('PDF export failed:', error);
        showToast('PDF export failed', 'error');
    }
    
    document.body.removeChild(exportContainer);
}

// JSON Export
document.getElementById('exportJSONBtn')?.addEventListener('click', () => {
    const dataStr = JSON.stringify(ideas, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `pivolve-export-${new Date().toISOString().slice(0,19)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('JSON exported successfully!', 'success');
});

// Markdown Export
document.getElementById('exportMarkdownBtn')?.addEventListener('click', () => {
    let markdown = `# PiVolve Recall Export\n\n**Generated:** ${new Date().toLocaleString()}\n**Total Entries:** ${ideas.length}\n\n---\n\n`;
    
    ideas.forEach(idea => {
        markdown += `## Entry ${ideas.indexOf(idea) + 1}\n\n`;
        markdown += `**Content:** ${idea.text}\n\n`;
        if (idea.notes) markdown += `**Notes:** ${idea.notes}\n\n`;
        if (idea.tags.length) markdown += `**Tags:** ${idea.tags.join(', ')}\n\n`;
        markdown += `**Date:** ${new Date(idea.createdAt).toLocaleString()}\n`;
        if (idea.source) markdown += `**Source:** ${idea.source}\n`;
        markdown += `\n---\n\n`;
    });
    
    const dataUri = 'data:text/markdown;charset=utf-8,'+ encodeURIComponent(markdown);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `pivolve-export-${new Date().toISOString().slice(0,19)}.md`);
    linkElement.click();
    showToast('Markdown exported successfully!', 'success');
});

// Share Function
document.getElementById('shareBtn')?.addEventListener('click', showShareModal);

function showShareModal() {
    const modal = document.createElement('div');
    modal.className = 'share-modal-overlay';
    modal.innerHTML = `
        <div class="share-modal">
            <h3><i class="fas fa-share-alt"></i> Share Report</h3>
            <div class="share-options">
                <button class="share-option" id="shareCopyLink">
                    <i class="fas fa-copy"></i>
                    <span>Copy Summary to Clipboard</span>
                </button>
                <button class="share-option" id="shareEmail">
                    <i class="fas fa-envelope"></i>
                    <span>Send via Email</span>
                </button>
                <button class="share-option" id="shareTwitter">
                    <i class="fab fa-twitter"></i>
                    <span>Share on Twitter</span>
                </button>
                <button class="share-option" id="shareClose">
                    <i class="fas fa-times"></i>
                    <span>Close</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('shareCopyLink')?.addEventListener('click', () => {
        const summary = `PiVolve Recall Report\nTotal Entries: ${ideas.length}\nLast Entry: ${ideas[0]?.text.substring(0, 100) || 'None'}\n\nBuilt with PiVolve Technologies`;
        navigator.clipboard.writeText(summary);
        showToast('Summary copied to clipboard!', 'success');
        modal.remove();
    });
    
    document.getElementById('shareEmail')?.addEventListener('click', () => {
        const subject = encodeURIComponent('PiVolve Recall Knowledge Report');
        const body = encodeURIComponent(`Check out my knowledge report from PiVolve Recall!\n\nTotal Entries: ${ideas.length}\n\nView my full knowledge base at PiVolve Recall.`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        modal.remove();
    });
    
    document.getElementById('shareTwitter')?.addEventListener('click', () => {
        const text = encodeURIComponent(`I've captured ${ideas.length} knowledge entries with PiVolve Recall! Never lose an idea again. 🧠`);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
        modal.remove();
    });
    
    document.getElementById('shareClose')?.addEventListener('click', () => modal.remove());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}