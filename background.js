const activeTimers = {};

// Listen for timer start commands from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action == "START_TIMER") {
    const tabId = msg.tabId;
    const minutes = msg.minutes;

    // Clear any existing timers for this tab if restarting
    if (activeTimers[tabId]) {
      clearTimeout(activeTimers[tabId].timeoutId);
      clearTimeout(activeTimers[tabId].warningId);
    }

    // Set half-time warning notification
    const halfTime = (minutes * 60 * 1000) / 2;
    const warningId = setTimeout(() => {
        console.log("[FocusTimerX] Half-time notification should show now.");
      chrome.notifications.create('', {
        type: "basic",
        iconUrl: "./FocusTimerX.png",
        title: "FocusTimerX",
        message: "Half your time is up on this TAB! Get ready to wrap it up."
      });
    }, halfTime);

    // Set time-up tab close
    const timeoutId = setTimeout(() => {
      chrome.tabs.remove(tabId, () => {
        chrome.notifications.create('', {
          type: "basic",
          iconUrl: "./FocusTimerX.png",
          title: "FocusTimerX",
          message: "Your allowed time is up. Tab closed..."
        });
      });
      delete activeTimers[tabId];
      chrome.storage.local.remove('ftx_timer_' + tabId); // Clean up storage!
    }, minutes * 60 * 1000);

    // Persist to storage for resilience
    chrome.storage.local.set({
      ['ftx_timer_' + tabId]: {
        tabId: tabId,
        endTime: Date.now() + minutes * 60 * 1000,
        warnTime: Date.now() + halfTime
      }
    });

    // Save timer references in activeTimers object
    activeTimers[tabId] = { timeoutId, warningId };
    sendResponse({ status: `Timer set: Tab will close in ${minutes} minutes!` });
  }
  return true; // allow async sendResponse
});

// Restore all timers persisted in storage when extension loads or Chrome restarts
function restoreTimers() {
  chrome.storage.local.get(null, (items) => {
    Object.keys(items).forEach((key) => {
      if (key.startsWith('ftx_timer_')) {
        const timer = items[key];
        const timeLeft = timer.endTime - Date.now();
        const warnLeft = timer.warnTime - Date.now();
        if (timeLeft > 0) {
          // Re-arm half-time warning
          const warningId = setTimeout(() => {
            console.log("[FocusTimerX] Half-time notification should show now.");
            chrome.notifications.create('', {
              type: "basic",
              iconUrl: "./FocusTimerX.png",
              title: "FocusTimerX",
              message: "⏳ Half your time is up on this tab! Get ready to wrap up."
            });
          }, warnLeft > 0 ? warnLeft : 0); // if late, trigger immediately

          // Re-arm tab removal at time up
          const timeoutId = setTimeout(() => {
            chrome.tabs.remove(timer.tabId, () => {
              chrome.notifications.create('', {
                type: "basic",
                iconUrl: "./FocusTimerX.png",
                title: "FocusTimerX",
                message: "Your allowed time is up. Tab closed!"
              });
            });
            chrome.storage.local.remove(key);
            delete activeTimers[timer.tabId];
          }, timeLeft);

          activeTimers[timer.tabId] = { timeoutId, warningId };
        } else {
          chrome.storage.local.remove(key);
        }
      }
    });
  });
}

restoreTimers();
chrome.runtime.onStartup.addListener(restoreTimers);
