// Simple test - this should log immediately
console.log('🚀 Background script loaded!');

// Set up alarm when extension starts
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Extension started');
  setupAlarm();
});

// Set up alarm when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('⚙️ Extension installed or updated');
  setupAlarm();
});

function setupAlarm() {
  console.log('⏰ Setting up alarm...');
  chrome.alarms.create('checkSchedules', { 
    periodInMinutes: 1,
    delayInMinutes: 0
  });
  console.log('✅ Alarm created');
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('🔔 Alarm fired!', alarm.name, new Date().toLocaleTimeString());
  if (alarm.name === 'checkSchedules') {
    checkAndExecuteSchedules();
  }
});

async function checkAndExecuteSchedules() {
  console.log('📋 Checking schedules...');
  
  try {
    const result = await chrome.storage.local.get('schedules');
    const schedules = result.schedules || [];
    
    console.log(`📊 Found ${schedules.length} schedule(s)`);
    
    if (schedules.length === 0) {
      console.log('⚠️ No schedules to check');
      return;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon, etc.
    
    console.log(`🕐 Current time: ${currentHour}:${currentMinute}, Day: ${currentDay}`);
    
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      console.log(`\n📌 Schedule ${i + 1}:`, {
        domain: schedule.domain,
        time: `${schedule.hours}:${schedule.minutes}`,
        days: schedule.days,
        enabled: schedule.enabled
      });
      
      // Check if enabled
      if (!schedule.enabled) {
        console.log('⏸️ Schedule is disabled, skipping');
        continue;
      }
      
      // Check if today is in the schedule
      if (!schedule.days.includes(currentDay)) {
        console.log(`📅 Today (${currentDay}) not in schedule days`);
        continue;
      }
      
      // Check if time matches (within 1 minute)
      const hourMatch = schedule.hours === currentHour;
      const minuteMatch = Math.abs(schedule.minutes - currentMinute) <= 1;
      
      console.log(`⏰ Time check: hour=${hourMatch}, minute=${minuteMatch}`);
      
      if (hourMatch && minuteMatch) {
        // Check if already ran recently
        const lastRun = schedule.lastRun || 0;
        const timeSinceLastRun = Date.now() - lastRun;
        const twoMinutes = 2 * 60 * 1000;
        
        if (timeSinceLastRun < twoMinutes) {
          console.log('⏭️ Already ran recently, skipping');
          continue;
        }
        
        // Execute!
        console.log(`🗑️ EXECUTING CLEAR for ${schedule.domain}`);
        const count = await clearHistoryForDomain(schedule.domain);
        console.log(`✅ Cleared ${count} entries`);
        
        // Update last run time
        schedule.lastRun = Date.now();
        await chrome.storage.local.set({ schedules });
        
        // Show notification
        try {
          await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><text y="38" font-size="38">🗑️</text></svg>',
            title: 'History Cleared',
            message: `Cleared ${count} entries for ${schedule.domain}`
          });
        } catch (e) {
          console.log('Notification error:', e);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in checkAndExecuteSchedules:', error);
  }
}

async function clearHistoryForDomain(domain) {
  console.log(`🔍 Searching history for: ${domain}`);
  
  try {
    const historyItems = await chrome.history.search({
      text: domain,
      maxResults: 0,
      startTime: 0
    });
    
    console.log(`📚 Found ${historyItems.length} total items`);
    
    // Filter to exact domain matches
    const exactMatches = historyItems.filter(item => {
      try {
        const url = new URL(item.url);
        const hostname = url.hostname.replace(/^www\./, '');
        const matches = hostname === domain || hostname.endsWith(`.${domain}`);
        return matches;
      } catch {
        return false;
      }
    });
    
    console.log(`✅ Found ${exactMatches.length} exact matches`);
    
    // Delete all matches
    for (const item of exactMatches) {
      await chrome.history.deleteUrl({ url: item.url });
    }
    
    return exactMatches.length;
  } catch (error) {
    console.error('❌ Clear error:', error);
    return 0;
  }
}

// Test message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);
  
  if (request.action === 'forceCheck') {
    console.log('🔨 Force check triggered!');
    checkAndExecuteSchedules().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Initial setup
console.log('🎬 Running initial setup...');
setupAlarm();
