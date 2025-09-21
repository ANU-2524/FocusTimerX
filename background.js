// background.js

// Helper: saves timer info for a tab
function saveTabTimer(tabId, endTime, warnTime) {
  chrome.storage.local.set({
    ['ftx_timer_' + tabId]: { tabId, endTime, warnTime }
  });
}

// Start a focus timer (listen for popup message)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "START_TIMER") {
    const tabId = String(msg.tabId);
    const minutes = Number(msg.minutes);

    const now = Date.now();
    const warnTime = now + (minutes * 60 * 1000) / 2;
    const endTime = now + minutes * 60 * 1000;

    // Remove old alarms if present
    chrome.alarms.clear('warn_' + tabId);
    chrome.alarms.clear('close_' + tabId);

    // Create new alarms
    chrome.alarms.create('warn_' + tabId, { when: warnTime });
    chrome.alarms.create('close_' + tabId, { when: endTime });

    // Save timers to storage (crucial for service worker sleep-revive!)
    saveTabTimer(tabId, endTime, warnTime);

    sendResponse({ status: `Timer set: Tab will close in ${minutes} minutes!` });
  }
  return true;
});

// On alarm trigger (either warning or close)
chrome.alarms.onAlarm.addListener((alarm) => {
  // Tab ID is always after the underscore in alarm name
  if (alarm.name.startsWith('warn_')) {
    const tabId = alarm.name.replace('warn_', '');
    chrome.notifications.create('', {
  type: "basic",
  iconUrl: "./FocusTimerX.png",
  title: "FocusTimerX",
  message: "⏳ Half your time is up on this tab! Get ready to wrap up."
}, (notificationId) => {
  if (chrome.runtime.lastError) {
    console.error('WARN Notification error:', chrome.runtime.lastError, JSON.stringify(chrome.runtime.lastError));

  } else {
    console.log('WARN Notification created, id:', notificationId);
  }
});

  }
  else if (alarm.name.startsWith('close_')) {
    const tabId = alarm.name.replace('close_', '');
    chrome.tabs.remove(Number(tabId), () => {
      chrome.notifications.create('', {
  type: "basic",
  iconUrl: "./FocusTimerX.png",
  title: "FocusTimerX",
  message: "Your allowed time is up. Tab closed!"
}, (notificationId) => {
  if (chrome.runtime.lastError) {
    console.error('CLOSE Notification error:', chrome.runtime.lastError, JSON.stringify(chrome.runtime.lastError));

  } else {
    console.log('CLOSE Notification created, id:', notificationId);
  }
});

      // Remove from chrome.storage
      chrome.storage.local.remove('ftx_timer_' + tabId);
      // Clean up alarms
      chrome.alarms.clear('warn_' + tabId);
      chrome.alarms.clear('close_' + tabId);
    });
  }
});

// On service worker start (or Chrome re-launch): re-arm alarms for all tabs
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    Object.values(items).forEach((timer) => {
      if (timer.endTime && timer.endTime > now) {
        const tabId = String(timer.tabId);
        if (timer.warnTime > now) {
          chrome.alarms.create('warn_' + tabId, { when: timer.warnTime });
        }
        chrome.alarms.create('close_' + tabId, { when: timer.endTime });
      }
    });
  });
});
