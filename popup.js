// Tab switching
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'schedule') {
      loadSchedules();
    }
  });
});

// Manual Clear Tab
const urlInput = document.getElementById('url');
const clearBtn = document.getElementById('clearBtn');
const manualMessage = document.getElementById('manualMessage');

function normalizeUrl(input) {
  let url = input.trim();
  
  if (!url) {
    throw new Error('Please enter a URL or domain');
  }
  
  url = url.replace(/^https?:\/\//, '');
  url = url.replace(/^www\./, '');
  url = url.split('/')[0];
  
  if (!url.includes('.')) {
    throw new Error('Invalid domain format');
  }
  
  return url;
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
  element.style.display = 'block';
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
}

async function clearHistoryForDomain(domain) {
  try {
    clearBtn.disabled = true;
    showMessage(manualMessage, `Searching history for ${domain}...`, 'info');
    
    const historyItems = await chrome.history.search({
      text: domain,
      maxResults: 0,
      startTime: 0
    });
    
    if (historyItems.length === 0) {
      showMessage(manualMessage, `No history found for ${domain}`, 'info');
      return;
    }
    
    const exactMatches = historyItems.filter(item => {
      try {
        const itemUrl = new URL(item.url);
        const itemDomain = itemUrl.hostname.replace(/^www\./, '');
        return itemDomain === domain || itemDomain.endsWith(`.${domain}`);
      } catch {
        return false;
      }
    });
    
    if (exactMatches.length === 0) {
      showMessage(manualMessage, `No exact matches found for ${domain}`, 'info');
      return;
    }
    
    const deletePromises = exactMatches.map(item => 
      chrome.history.deleteUrl({ url: item.url })
    );
    
    await Promise.all(deletePromises);
    
    showMessage(
      manualMessage,
      `✓ Cleared ${exactMatches.length} history ${exactMatches.length === 1 ? 'entry' : 'entries'} for ${domain}`,
      'success'
    );
    
    urlInput.value = '';
    
  } catch (error) {
    showMessage(manualMessage, `Error: ${error.message}`, 'error');
  } finally {
    clearBtn.disabled = false;
  }
}

clearBtn.addEventListener('click', async () => {
  try {
    const domain = normalizeUrl(urlInput.value);
    await clearHistoryForDomain(domain);
  } catch (error) {
    showMessage(manualMessage, error.message, 'error');
  }
});

urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !clearBtn.disabled) {
    clearBtn.click();
  }
});

// Schedule Tab
const scheduleDomain = document.getElementById('scheduleDomain');
const scheduleTime = document.getElementById('scheduleTime');
const addScheduleBtn = document.getElementById('addScheduleBtn');
const testScheduleBtn = document.getElementById('testScheduleBtn');
const scheduleMessage = document.getElementById('scheduleMessage');
const scheduleList = document.getElementById('scheduleList');
const dayButtons = document.querySelectorAll('.day-btn');

let selectedDays = [];

dayButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const day = parseInt(btn.dataset.day);
    
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(d => d !== day);
      btn.classList.remove('selected');
    } else {
      selectedDays.push(day);
      btn.classList.add('selected');
    }
  });
});

addScheduleBtn.addEventListener('click', async () => {
  try {
    const domain = normalizeUrl(scheduleDomain.value);
    const time = scheduleTime.value;
    
    if (selectedDays.length === 0) {
      showMessage(scheduleMessage, 'Please select at least one day', 'error');
      return;
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    
    const schedule = {
      id: Date.now(),
      domain,
      hours,
      minutes,
      days: [...selectedDays],
      enabled: true,
      lastRun: 0
    };
    
    const { schedules = [] } = await chrome.storage.local.get('schedules');
    schedules.push(schedule);
    await chrome.storage.local.set({ schedules });
    
    showMessage(scheduleMessage, `✓ Schedule added for ${domain}`, 'success');
    
    scheduleDomain.value = '';
    selectedDays = [];
    dayButtons.forEach(btn => btn.classList.remove('selected'));
    
    loadSchedules();
    
  } catch (error) {
    showMessage(scheduleMessage, error.message, 'error');
  }
});

testScheduleBtn.addEventListener('click', async () => {
  showMessage(scheduleMessage, 'Testing schedule system...', 'info');
  
  // Force check schedules now
  chrome.runtime.sendMessage({ action: 'forceCheck' }, (response) => {
    if (response && response.success) {
      showMessage(scheduleMessage, '✓ Schedule check executed! Check console for logs.', 'success');
    }
  });
});

async function loadSchedules() {
  const { schedules = [] } = await chrome.storage.local.get('schedules');
  
  if (schedules.length === 0) {
    scheduleList.innerHTML = '<div class="empty-state">No schedules yet. Add one above!</div>';
    return;
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  scheduleList.innerHTML = schedules.map(schedule => {
    const timeStr = `${String(schedule.hours).padStart(2, '0')}:${String(schedule.minutes).padStart(2, '0')}`;
    const daysStr = schedule.days.sort().map(d => dayNames[d]).join(', ');
    
    return `
      <div class="schedule-item">
        <div class="schedule-info">
          <div class="schedule-domain">${schedule.domain}</div>
          <div class="schedule-time">⏰ ${timeStr}</div>
          <div class="schedule-days">📅 ${daysStr}</div>
        </div>
        <div class="schedule-actions">
          <div class="toggle-switch ${schedule.enabled ? 'active' : ''}" data-id="${schedule.id}"></div>
          <button class="icon-btn btn-secondary" data-id="${schedule.id}" data-action="delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners for toggle and delete
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', async () => {
      const id = parseInt(toggle.dataset.id);
      await toggleSchedule(id);
    });
  });
  
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      await deleteSchedule(id);
    });
  });
}

async function toggleSchedule(id) {
  const { schedules = [] } = await chrome.storage.local.get('schedules');
  const schedule = schedules.find(s => s.id === id);
  
  if (schedule) {
    schedule.enabled = !schedule.enabled;
    await chrome.storage.local.set({ schedules });
    loadSchedules();
  }
}

async function deleteSchedule(id) {
  const { schedules = [] } = await chrome.storage.local.get('schedules');
  const filtered = schedules.filter(s => s.id !== id);
  await chrome.storage.local.set({ schedules: filtered });
  loadSchedules();
}

// Initial load
urlInput.focus();
