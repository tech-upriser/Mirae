// 1. Dashboard Button
document.getElementById('dashboardBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
});

// 2. The Save Button
document.getElementById('saveBtn').addEventListener('click', () => {
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.innerText;

  saveBtn.innerText = 'Analyzing...';
  saveBtn.style.opacity = '0.7';
  saveBtn.disabled = true;

  chrome.runtime.sendMessage({ action: 'triggerScrapeFromPopup' }, (response) => {
    if (chrome.runtime.lastError) {
      alert('❌ Mirae Error: Could not reach the extension background service worker. Try reloading the extension.');
    } else if (!response?.success) {
      alert(`❌ Mirae Error: ${response?.error || 'Could not start scraping on this tab.'}`);
    }

    setTimeout(() => {
      saveBtn.innerText = originalText;
      saveBtn.style.opacity = '1';
      saveBtn.disabled = false;
    }, 1200);
  });
});
