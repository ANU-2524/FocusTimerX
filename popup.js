document.getElementById("start-timer").onsubmit = (e) => {
  e.preventDefault() ;
  const minutes = parseInt(document.getElementById("minutes").value, 10);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage(
      {
        action: "START_TIMER",
        tabId: tabId,
        minutes: minutes
      },
      (response) => {
        document.getElementById("status").textContent = response?.status || "Timer Started...";
      }
    );
  });
};

// Show remaining time on load (and update every second)
function updateTimerStatus(tabId) {
  chrome.storage.local.get('ftx_timer_' + tabId, (result) => {
    const timer = result['ftx_timer_' + tabId];
    if (timer) {
      const msLeft = timer.endTime - Date.now();
      if (msLeft > 0) {
        const mins = Math.floor(msLeft / 60000);
        const secs = Math.floor((msLeft % 60000) / 1000);
        document.getElementById("status").textContent = `Time left: ${mins} min ${secs} sec`;
      } else {
        document.getElementById("status").textContent = `No timer running.`;
      }
    } else {
      document.getElementById("status").textContent = "No timer running.";
    }
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id;
  updateTimerStatus(tabId);
  setInterval(() => updateTimerStatus(tabId), 1000);
});
