# Chrome History Cleaner Extension

A Chrome extension to clear browsing history for specific websites with **Stealth Mode Scheduling**.

## ✨ Features
- 🗑️ **Manual Clear**: Clear history for any website instantly
- ⏰ **Stealth Mode Schedule**: Automatically clear history at specific times
- 📅 **Day Selection**: Choose which days to auto-clear
- 🔄 **Enable/Disable**: Toggle schedules on/off
- 📊 **Schedule Management**: View and manage all your schedules

## 🚀 Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder

## 📖 Usage

### Manual Clear:
1. Click the extension icon
2. Go to "Manual Clear" tab
3. Enter a domain (e.g., youtube.com)
4. Click "Clear History Now"

### Schedule Auto-Clear:
1. Click the extension icon
2. Go to "Schedules" tab
3. Enter domain (e.g., reddit.com)
4. Set time (e.g., 23:00)
5. Select days (e.g., Mon-Fri)
6. Click "Add Schedule"

## 📁 Files
- `manifest.json` - Extension configuration
- `popup.html` - User interface with tabs
- `popup.js` - UI logic and schedule management
- `background.js` - Background worker for scheduled tasks

## 🔒 Permissions
- `history` - To read and delete browsing history
- `alarms` - To schedule automatic clearing
- `storage` - To save schedule preferences

## 📝 Version
**v2.0.0** - Added Stealth Mode Schedule feature
