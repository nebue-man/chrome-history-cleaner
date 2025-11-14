const urlInput = document.getElementById('url');
const clearBtn = document.getElementById('clearBtn');
const message = document.getElementById('message');

// Normalize URL input to extract domain
function normalizeUrl(input) {
  let url = input.trim();
  
  if (!url) {
    throw new Error('Please enter a URL or domain');
  }
  
  // Remove protocol if present
  url = url.replace(/^https?:\/\//, '');
  
  // Remove www. prefix
  url = url.replace(/^www\./, '');
  
  // Remove trailing slash and path
  url = url.split('/')[0];
  
  // Basic validation
  if (!url.includes('.')) {
    throw new Error('Invalid domain format');
  }
  
  return url;
}

// Show message to user
function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
  message.style.display = 'block';
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      message.style.display = 'none';
    }, 3000);
  }
}

// Clear history for specific domain
async function clearHistoryForDomain(domain) {
  try {
    clearBtn.disabled = true;
    showMessage(`Searching history for ${domain}...`, 'info');
    
    // Search for all history items containing the domain
    const historyItems = await chrome.history.search({
      text: domain,
      maxResults: 0, // 0 means no limit
      startTime: 0
    });
    
    if (historyItems.length === 0) {
      showMessage(`No history found for ${domain}`, 'info');
      return;
    }
    
    // Filter to exact domain matches
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
      showMessage(`No exact matches found for ${domain}`, 'info');
      return;
    }
    
    // Delete each matching history item
    const deletePromises = exactMatches.map(item => 
      chrome.history.deleteUrl({ url: item.url })
    );
    
    await Promise.all(deletePromises);
    
    showMessage(
      `✓ Cleared ${exactMatches.length} history ${exactMatches.length === 1 ? 'entry' : 'entries'} for ${domain}`,
      'success'
    );
    
    // Clear input
    urlInput.value = '';
    
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    clearBtn.disabled = false;
  }
}

// Handle clear button click
clearBtn.addEventListener('click', async () => {
  try {
    const domain = normalizeUrl(urlInput.value);
    await clearHistoryForDomain(domain);
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

// Handle Enter key press
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !clearBtn.disabled) {
    clearBtn.click();
  }
});

// Auto-focus input on popup open
urlInput.focus();