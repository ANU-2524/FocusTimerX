const activeTimers = {};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action == "START_TIMER") {
    const tabId = msg.tabId;
    const minutes = msg.minutes;

    if (activeTimers[tabId]) {
      clearTimeout(activeTimers[tabId].timeoutId);
      clearTimeout(activeTimers[tabId].warningId);
    }

    const halfTime = (minutes * 60 * 1000) / 2;
    const warningId = setTimeout(() => {
      chrome.notifications.create('', {
        type: "basic",
        iconUrl: "FocusTimerX.png",
        title: "FocusTimerX",
        message: "Half your time is up on this TAB! Get ready to wrap it up."
      });
    }, halfTime);

    const timeoutId = setTimeout(() => {
      chrome.tabs.remove(tabId, () => {
        chrome.notifications.create('', {
          type: "basic",
          iconUrl: "FocusTimerX.png",
          title: "FocusTimerX",
          message: "Your allowed time is up. Tab closed..."
        });
      });
      delete activeTimers[tabId];
      chrome.storage.local.remove('ftx_timer_' + tabId); // Clean up storage!
    }, minutes * 60 * 1000);

    chrome.storage.local.set({
      ['ftx_timer_' + tabId]: {
        tabId: tabId,
        endTime: Date.now() + minutes * 60 * 1000,
        warnTime: Date.now() + (minutes * 60 * 1000) / 2
      }
    });

    activeTimers[tabId] = { timeoutId, warningId };
    sendResponse({ status: `Timer set : Tab will close in ${minutes} minutes!` });
  }
  return true;
});

function restoreTimers() {
  chrome.storage.local.get(null, (items) => {
    Object.keys(items).forEach((key) => {
      if (key.startsWith('ftx_timer_')) {
        const timer = items[key];
        const timeLeft = timer.endTime - Date.now();
        const warnLeft = timer.warnTime - Date.now();
        if (timeLeft > 0) {
          const warningId = setTimeout(() => {
            chrome.notifications.create('', {
              type: "basic",
              iconUrl: "FocusTimerX.png",
              title: "FocusTimerX",
              message: "⏳ Half your time is up on this tab! Get ready to wrap up."
            });
          }, warnLeft);
          const timeoutId = setTimeout(() => {
            chrome.tabs.remove(timer.tabId, () => {
              chrome.notifications.create('', {
                type: "basic",
                iconUrl: "FocusTimerX.png",
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
