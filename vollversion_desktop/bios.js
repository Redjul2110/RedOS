// BIOS Configuration
const biosConfig = {
  version: 'RedOS BIOS v1.0.0',
  buildDate: '2025-12-31',
  cpu: {
    model: 'WebCore Virtual CPU',
    speed: '3.2 GHz',
    cores: 4,
    threads: 8
  },
  memory: {
    total: 8, // GB
    used: 0,
    available: 8
  },
  storage: {
    total: 128, // GB
    used: 0,
    available: 128
  },
  boot: {
    mode: 'uefi',
    secureBoot: true,
    fastBoot: true,
    bootOrder: ['harddisk', 'usb', 'network', 'cdrom']
  },
  performance: {
    cpuProfile: 'balanced',
    turboBoost: true,
    memoryProfile: 'auto'
  },
  security: {
    adminPassword: null,
    secureBoot: true,
    tpmEnabled: true,
    secureBootPolicy: 'standard'
  },
  power: {
    profile: 'balanced',
    sleepMode: 's3',
    wakeOnLan: true,
    usbPowerShare: true
  }
};

// System files backup (these would be your default system files)
const systemFilesBackup = {
  'system.ini': '; System Configuration\n[System]\nVersion=1.0.0\nAuthor=redOS Team\n\n[Settings]\nAutoStart=true\nDebugMode=false',
  'config.json': '{\n  "system": {\n    "name": "redOS",\n    "version": "1.0.0",\n    "autoUpdate": true,\n    "theme": "default"\n  },\n  "security": {\n    "requirePassword": true,\n    "autoLock": false,\n    "autoLockTimeout": 300\n  }\n}',
  'help.txt': 'Willkommen bei redOS!\n\nDies ist eine Hilfedatei mit grundlegenden Informationen.\n\nTastenkombinationen:\n- Strg + Alt + Entf: Systemsteuerung öffnen\n- F1: Hilfe anzeigen\n- F5: Aktualisieren\n\nKontakt: support@redos.example.com',
  'default.theme': '{\n  "colors": {\n    "primary": "#007bff",\n    "secondary": "#6c757d",\n    "background": "#f8f9fa",\n    "text": "#212529"\n  },\n  "fontFamily": "Arial, sans-serif",\n  "fontSize": "14px"\n}'
};

// Initialize BIOS
function initBios() {
  // Set up BIOS button
  const biosBtn = document.getElementById('biosBtn');
  if (biosBtn) {
    biosBtn.addEventListener('click', () => {
      const biosOverlay = document.getElementById('biosOverlay');
      if (biosOverlay) {
        biosOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        updateBiosStats();
      }
    });
  }
  
  // Set up close button
  const biosClose = document.getElementById('biosClose');
  if (biosClose) {
    biosClose.addEventListener('click', () => {
      const biosOverlay = document.getElementById('biosOverlay');
      if (biosOverlay) {
        biosOverlay.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }
  
  // Set up event listeners for menu items
  document.querySelectorAll('.bios-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all menu items and sections
      document.querySelectorAll('.bios-menu-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.bios-section').forEach(s => s.classList.remove('active'));
      
      // Add active class to clicked menu item and corresponding section
      item.classList.add('active');
      const sectionId = `section-${item.dataset.section}`;
      document.getElementById(sectionId).classList.add('active');
    });
  });

  // Set up close button
  document.getElementById('biosClose').addEventListener('click', closeBios);

  // Initialize all sections
  updateSystemInfo();
  initBootSection();
  initPerformanceSection();
  initSecuritySection();
  initPowerSection();
  initRecoverySection();
  initEditorSection();
  initStorageSection();
  initResetSection();
  
  // Initialize recovery section event listener
  document.getElementById('restoreAllSystemFiles')?.addEventListener('click', restoreAllSystemFiles);

  // Start system time update
  updateSystemTime();
  setInterval(updateSystemTime, 1000);
}

// System Information
function updateSystemInfo() {
  // Update system information
  document.getElementById('bios-version').textContent = biosConfig.version;
  document.getElementById('bios-date').textContent = biosConfig.buildDate;
  document.getElementById('cpu-model').textContent = biosConfig.cpu.model;
  document.getElementById('cpu-speed').textContent = biosConfig.cpu.speed;
  document.getElementById('memory-total').textContent = `${biosConfig.memory.total} GB`;
  document.getElementById('storage-available').textContent = `${biosConfig.storage.available} GB available`;
  
  // Update refresh button
  document.getElementById('refreshStatsBtn')?.addEventListener('click', updateSystemInfo);
}

function updateSystemTime() {
  const now = new Date();
  document.getElementById('system-time').textContent = now.toLocaleTimeString();
  document.getElementById('system-date').textContent = now.toLocaleDateString();
}

// Boot Section
function initBootSection() {
  // Set initial values
  document.getElementById('boot-mode').value = biosConfig.boot.mode;
  document.getElementById('secure-boot').value = biosConfig.boot.secureBoot ? 'enabled' : 'disabled';
  document.getElementById('fast-boot').value = biosConfig.boot.fastBoot ? 'enabled' : 'disabled';
  
  // Populate boot order
  updateBootOrderUI();
  
  // Set up save/reset buttons
  document.getElementById('saveBootSettings')?.addEventListener('click', saveBootSettings);
  document.getElementById('resetBootSettings')?.addEventListener('click', resetBootSettings);
}

function updateBootOrderUI() {
  const bootOrderEl = document.getElementById('boot-order');
  if (!bootOrderEl) return;
  
  bootOrderEl.innerHTML = '';
  biosConfig.boot.bootOrder.forEach((device, index) => {
    const deviceEl = document.createElement('div');
    deviceEl.className = 'boot-device';
    deviceEl.innerHTML = `
      <span>${index + 1}. ${getDeviceName(device)}</span>
      <div class="boot-order-controls">
        <button class="bios-btn small" onclick="moveBootDeviceUp('${device}')" ${index === 0 ? 'disabled' : ''}>▲</button>
        <button class="bios-btn small" onclick="moveBootDeviceDown('${device}')" ${index === biosConfig.boot.bootOrder.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
    `;
    bootOrderEl.appendChild(deviceEl);
  });
}

function moveBootDeviceUp(device) {
  const index = biosConfig.boot.bootOrder.indexOf(device);
  if (index > 0) {
    [biosConfig.boot.bootOrder[index - 1], biosConfig.boot.bootOrder[index]] = 
    [biosConfig.boot.bootOrder[index], biosConfig.boot.bootOrder[index - 1]];
    updateBootOrderUI();
  }
}

function moveBootDeviceDown(device) {
  const index = biosConfig.boot.bootOrder.indexOf(device);
  if (index < biosConfig.boot.bootOrder.length - 1) {
    [biosConfig.boot.bootOrder[index], biosConfig.boot.bootOrder[index + 1]] = 
    [biosConfig.boot.bootOrder[index + 1], biosConfig.boot.bootOrder[index]];
    updateBootOrderUI();
  }
}

function getDeviceName(device) {
  const devices = {
    'harddisk': 'Hard Disk',
    'usb': 'USB Device',
    'network': 'Network Boot',
    'cdrom': 'CD/DVD Drive'
  };
  return devices[device] || device;
}

function saveBootSettings() {
  biosConfig.boot = {
    mode: document.getElementById('boot-mode').value,
    secureBoot: document.getElementById('secure-boot').value === 'enabled',
    fastBoot: document.getElementById('fast-boot').value === 'enabled',
    bootOrder: [...biosConfig.boot.bootOrder]
  };
  showNotification('Boot settings saved successfully');
}

function resetBootSettings() {
  // Reset to default values
  biosConfig.boot = {
    mode: 'uefi',
    secureBoot: true,
    fastBoot: true,
    bootOrder: ['harddisk', 'usb', 'network', 'cdrom']
  };
  
  // Update UI
  document.getElementById('boot-mode').value = biosConfig.boot.mode;
  document.getElementById('secure-boot').value = biosConfig.boot.secureBoot ? 'enabled' : 'disabled';
  document.getElementById('fast-boot').value = biosConfig.boot.fastBoot ? 'enabled' : 'disabled';
  updateBootOrderUI();
  
  showNotification('Boot settings reset to defaults');
}

// Performance Section
function initPerformanceSection() {
  // Set initial values
  document.getElementById('cpu-profile').value = biosConfig.performance.cpuProfile;
  document.getElementById('turbo-boost').value = biosConfig.performance.turboBoost ? 'enabled' : 'disabled';
  document.getElementById('memory-profile').value = biosConfig.performance.memoryProfile;
  
  // Set up save/reset buttons
  document.getElementById('savePerformanceSettings')?.addEventListener('click', savePerformanceSettings);
  document.getElementById('resetPerformanceSettings')?.addEventListener('click', resetPerformanceSettings);
}

function savePerformanceSettings() {
  biosConfig.performance = {
    cpuProfile: document.getElementById('cpu-profile').value,
    turboBoost: document.getElementById('turbo-boost').value === 'enabled',
    memoryProfile: document.getElementById('memory-profile').value
  };
  showNotification('Performance settings saved successfully');
}

function resetPerformanceSettings() {
  // Reset to default values
  biosConfig.performance = {
    cpuProfile: 'balanced',
    turboBoost: true,
    memoryProfile: 'auto'
  };
  
  // Update UI
  document.getElementById('cpu-profile').value = biosConfig.performance.cpuProfile;
  document.getElementById('turbo-boost').value = biosConfig.performance.turboBoost ? 'enabled' : 'disabled';
  document.getElementById('memory-profile').value = biosConfig.performance.memoryProfile;
  
  showNotification('Performance settings reset to defaults');
}

// Security Section
function initSecuritySection() {
  // Set initial values
  document.getElementById('secure-boot-mode').value = biosConfig.security.secureBoot ? 'enabled' : 'disabled';
  document.getElementById('tpm-mode').value = biosConfig.security.tpmEnabled ? 'enabled' : 'disabled';
  document.getElementById('secure-boot-policy').value = biosConfig.security.secureBootPolicy;
  
  // Set up save/reset buttons
  document.getElementById('saveSecuritySettings')?.addEventListener('click', saveSecuritySettings);
  document.getElementById('resetSecuritySettings')?.addEventListener('click', resetSecuritySettings);
  
  // Set up password change button
  document.getElementById('changeAdminPasswordBtn')?.addEventListener('click', changeAdminPassword);
}

function saveSecuritySettings() {
  biosConfig.security = {
    ...biosConfig.security,
    secureBoot: document.getElementById('secure-boot-mode').value === 'enabled',
    tpmEnabled: document.getElementById('tpm-mode').value === 'enabled',
    secureBootPolicy: document.getElementById('secure-boot-policy').value
  };
  showNotification('Security settings saved successfully');
}

function resetSecuritySettings() {
  // Reset to default values
  biosConfig.security = {
    adminPassword: null,
    secureBoot: true,
    tpmEnabled: true,
    secureBootPolicy: 'standard'
  };
  
  // Update UI
  document.getElementById('secure-boot-mode').value = biosConfig.security.secureBoot ? 'enabled' : 'disabled';
  document.getElementById('tpm-mode').value = biosConfig.security.tpmEnabled ? 'enabled' : 'disabled';
  document.getElementById('secure-boot-policy').value = biosConfig.security.secureBootPolicy;
  
  showNotification('Security settings reset to defaults');
}

async function changeAdminPassword() {
  const newPassword = await redosPrompt('Enter new admin password:', { 
    title: 'Change Admin Password',
    placeholder: 'New password',
    type: 'password'
  });
  
  if (newPassword) {
    biosConfig.security.adminPassword = await hashPassword(newPassword);
    showNotification('Admin password changed successfully');
  }
}

// Power Management Section
function initPowerSection() {
  // Set initial values
  document.getElementById('power-profile').value = biosConfig.power.profile;
  document.getElementById('sleep-mode').value = biosConfig.power.sleepMode;
  document.getElementById('wol-mode').value = biosConfig.power.wakeOnLan ? 'enabled' : 'disabled';
  document.getElementById('usb-power-share').value = biosConfig.power.usbPowerShare ? 'enabled' : 'disabled';
  
  // Set up save/reset buttons
  document.getElementById('savePowerSettings')?.addEventListener('click', savePowerSettings);
  document.getElementById('resetPowerSettings')?.addEventListener('click', resetPowerSettings);
}

function savePowerSettings() {
  biosConfig.power = {
    profile: document.getElementById('power-profile').value,
    sleepMode: document.getElementById('sleep-mode').value,
    wakeOnLan: document.getElementById('wol-mode').value === 'enabled',
    usbPowerShare: document.getElementById('usb-power-share').value === 'enabled'
  };
  showNotification('Power settings saved successfully');
}

function resetPowerSettings() {
  // Reset to default values
  biosConfig.power = {
    profile: 'balanced',
    sleepMode: 's3',
    wakeOnLan: true,
    usbPowerShare: true
  };
  
  // Update UI
  document.getElementById('power-profile').value = biosConfig.power.profile;
  document.getElementById('sleep-mode').value = biosConfig.power.sleepMode;
  document.getElementById('wol-mode').value = biosConfig.power.wakeOnLan ? 'enabled' : 'disabled';
  document.getElementById('usb-power-share').value = biosConfig.power.usbPowerShare ? 'enabled' : 'disabled';
  
  showNotification('Power settings reset to defaults');
}

// Recovery Section
function initRecoverySection() {
  // No initialization needed for the simplified version
}

// Restore all system files with a single click
function restoreAllSystemFiles() {
  const statusEl = document.getElementById('recovery-status');
  const restoreBtn = document.getElementById('restoreAllSystemFiles');
  
  if (!statusEl || !restoreBtn) return;

  // Disable button during restoration
  restoreBtn.disabled = true;
  statusEl.textContent = 'Stelle Systemdateien wieder her...';
  statusEl.className = 'recovery-status';
  statusEl.style.display = 'block';

  // Define the system files that should be in the System (redOS) folder
  const systemFiles = [
    { id: 'sys-bootloader', name: 'bootloader.sys', content: 'System Bootloader' },
    { id: 'sys-kernel', name: 'kernel.sys', content: 'System Kernel' },
    { id: 'sys-config', name: 'config.sys', content: 'System Configuration' },
    { id: 'sys-systemdll', name: 'system.dll', content: 'System Library' }
  ];

  // Ensure the System (redOS) folder exists
  const systemFolderId = 'system-folder';
  let files = loadFiles();
  let systemFolder = files.find(f => f.id === systemFolderId);
  
  // Create the System (redOS) folder if it doesn't exist
  if (!systemFolder) {
    systemFolder = createNewFile('System (redOS)', '', true, 'root', systemFolderId);
    files = loadFiles(); // Reload files to include the new folder
  }

  let restoredCount = 0;
  const errors = [];

  // Process each system file
  systemFiles.forEach(file => {
    try {
      // Check if file already exists
      const fileExists = files.some(f => f.id === file.id);
      
      if (!fileExists) {
        // Create the file in the System (redOS) folder
        createNewFile(
          file.name,
          file.content,
          false,
          systemFolderId,
          file.id
        );
        restoredCount++;
      }
    } catch (e) {
      errors.push(`Fehler bei ${file.name}: ${e.message}`);
    }
  });

  // Create the drivers directory if it doesn't exist
  const driversFolderId = 'system-drivers-folder';
  const driversFolderExists = files.some(f => f.id === driversFolderId);
  if (!driversFolderExists) {
    try {
      createNewFile(
        'drivers',
        '',
        true,
        systemFolderId,
        driversFolderId
      );
      restoredCount++;
    } catch (e) {
      errors.push(`Fehler beim Erstellen des drivers-Ordners: ${e.message}`);
    }
  }

  // Update status
  if (errors.length === 0) {
    statusEl.textContent = `Erfolgreich ${restoredCount} Systemdateien im System (redOS) Ordner wiederhergestellt.`;
    statusEl.className = 'recovery-status success';
  } else {
    statusEl.innerHTML = [
      `Erfolgreich ${restoredCount} Dateien wiederhergestellt.`,
      'Fehler:',
      ...errors.map(e => `• ${e}`)
    ].join('<br>');
    statusEl.className = 'recovery-status error';
  }
  
  // Re-enable the button after a short delay
  setTimeout(() => {
    restoreBtn.disabled = false;
    // Refresh the recovery section to show updated status
    initRecoverySection();
    // Update BIOS stats
    updateBiosStats();
  }, 1000);
}

// Editor Section
function initEditorSection() {
  // Set up system file selector
  const systemFileSelect = document.getElementById('systemFileSelect');
  if (systemFileSelect) {
    // Add some example system files (in a real implementation, these would be real system files)
    const systemFiles = [
      { id: 'boot-config', name: 'Boot Configuration' },
      { id: 'network-config', name: 'Network Configuration' },
      { id: 'user-settings', name: 'User Settings' },
      { id: 'system-log', name: 'System Log' }
    ];
    
    systemFiles.forEach(file => {
      const option = document.createElement('option');
      option.value = file.id;
      option.textContent = file.name;
      systemFileSelect.appendChild(option);
    });
    
    // Set up file selection handler
    systemFileSelect.addEventListener('change', (e) => {
      const fileId = e.target.value;
      if (fileId) {
        // In a real implementation, this would load the actual file content
        document.getElementById('codeEditor').value = `// Content of ${fileId} would be loaded here\n// This is a preview of how the system file editor would work.`;
      } else {
        document.getElementById('codeEditor').value = '';
      }
    });
  }
  
  // Set up save button
  document.getElementById('saveCodeBtn')?.addEventListener('click', () => {
    const fileId = systemFileSelect.value;
    const content = document.getElementById('codeEditor').value;
    if (fileId && content) {
      // In a real implementation, this would save the file
      showNotification(`Changes to ${fileId} saved successfully`);
    }
  });
  
  // Set up reload button
  document.getElementById('reloadCodeBtn')?.addEventListener('click', () => {
    const fileId = systemFileSelect.value;
    if (fileId) {
      // In a real implementation, this would reload the file
      document.getElementById('codeEditor').value = `// Content of ${fileId} reloaded\n// This is a preview of how the system file editor would work.`;
      showNotification(`Reloaded ${fileId}`);
    }
  });
}

// Storage Section
function initStorageSection() {
  // Set up storage information
  updateStorageInfo();
  
  // Set up clear cache button
  document.getElementById('clearCacheBtn')?.addEventListener('click', clearCache);
  
  // Set up optimize storage button
  document.getElementById('optimizeStorageBtn')?.addEventListener('click', optimizeStorage);
}

function updateStorageInfo() {
  // In a real implementation, this would fetch actual storage information
  const totalStorage = biosConfig.storage.total;
  const usedStorage = biosConfig.storage.used;
  const availableStorage = biosConfig.storage.available;
  
  const storageInfoEl = document.getElementById('storageInfo');
  if (storageInfoEl) {
    storageInfoEl.innerHTML = `
      <div class="storage-metric">
        <span class="storage-label">Total:</span>
        <span class="storage-value">${totalStorage} GB</span>
      </div>
      <div class="storage-metric">
        <span class="storage-label">Used:</span>
        <span class="storage-value">${usedStorage} GB</span>
      </div>
      <div class="storage-metric">
        <span class="storage-label">Available:</span>
        <span class="storage-value">${availableStorage} GB</span>
      </div>
      <div class="storage-bar">
        <div class="storage-used" style="width: ${(usedStorage / totalStorage) * 100}%"></div>
      </div>
    `;
  }
}

function clearCache() {
  // In a real implementation, this would clear the application cache
  showNotification('Cache cleared successfully');
  updateStorageInfo();
}

function optimizeStorage() {
  // In a real implementation, this would optimize storage
  showNotification('Storage optimized successfully');
  updateStorageInfo();
}

// Reset Section
function initResetSection() {
  // Set up reset buttons
  document.getElementById('softResetBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to perform a soft reset? This will restart the system.')) {
      softReset();
    }
  });
  
  document.getElementById('hardResetBtn')?.addEventListener('click', () => {
    if (confirm('WARNING: This will erase all data and restore the system to factory settings. Are you sure?')) {
      hardReset();
    }
  });
}

function softReset() {
  // In a real implementation, this would perform a soft reset
  showNotification('System reset initiated. Please wait...');
  setTimeout(() => {
    showNotification('System reset complete');
    // Reload the page to simulate a restart
    window.location.reload();
  }, 2000);
}

function hardReset() {
  // In a real implementation, this would perform a hard reset
  showNotification('Performing factory reset. This may take a few minutes...');
  
  // Simulate a delay for the reset process
  setTimeout(() => {
    // Clear all data
    localStorage.clear();
    sessionStorage.clear();
    
    // Show completion message and reload
    showNotification('Factory reset complete. The system will now restart.');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }, 3000);
}

// Helper function to create a centered popup
function showPopup(options) {
  const { 
    title, 
    message, 
    type = 'info', 
    buttons = [{ text: 'OK', action: null }],
    showCloseButton = true
  } = options;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  
  // Create popup
  const popup = document.createElement('div');
  popup.className = `popup popup-${type}`;
  
  // Add icon based on type
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
    question: '❓'
  };
  
  // Build popup content
  popup.innerHTML = `
    ${showCloseButton ? '<div class="popup-close">×</div>' : ''}
    <div class="popup-content">
      <span class="popup-icon">${icons[type] || icons.info}</span>
      <h3>${title || ''}</h3>
      <p>${message || ''}</p>
      <div class="popup-buttons">
        ${buttons.map((btn, index) => 
          `<button class="bios-btn ${btn.primary ? 'primary' : ''}" data-action="${index}">${btn.text}</button>`
        ).join('')}
      </div>
    </div>
  `;
  
  // Add to DOM
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  // Handle close button
  const closeBtn = popup.querySelector('.popup-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }
  
  // Handle button clicks
  const buttonElements = popup.querySelectorAll('.popup-buttons button');
  buttonElements.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      if (buttons[index].action) {
        buttons[index].action();
      }
      document.body.removeChild(overlay);
    });
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
  
  // Return close function
  return {
    close: () => document.body.removeChild(overlay)
  };
}

// Helper function for confirmation dialogs
function showConfirm(options) {
  return new Promise((resolve) => {
    const popup = showPopup({
      ...options,
      type: options.type || 'question',
      buttons: [
        {
          text: options.cancelText || 'Abbrechen',
          action: () => resolve(false)
        },
        {
          text: options.confirmText || 'Bestätigen',
          primary: true,
          action: () => resolve(true)
        }
      ]
    });
  });
}

// Helper function for notifications
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Trigger reflow
  void notification.offsetWidth;
  
  // Show with animation
  notification.classList.add('show');
  
  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
  
  return {
    close: () => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  };
}

// Initialize BIOS when the DOM is loaded
document.addEventListener('DOMContentLoaded', initBios);

// Make functions available globally
window.moveBootDeviceUp = moveBootDeviceUp;
window.moveBootDeviceDown = moveBootDeviceDown;
window.saveBootSettings = saveBootSettings;
window.resetBootSettings = resetBootSettings;
window.savePerformanceSettings = savePerformanceSettings;
window.resetPerformanceSettings = resetPerformanceSettings;
window.saveSecuritySettings = saveSecuritySettings;
window.resetSecuritySettings = resetSecuritySettings;
window.changeAdminPassword = changeAdminPassword;
window.savePowerSettings = savePowerSettings;
window.resetPowerSettings = resetPowerSettings;
window.clearCache = clearCache;
window.optimizeStorage = optimizeStorage;
window.softReset = softReset;
window.hardReset = hardReset;
window.restoreAllSystemFiles = restoreAllSystemFiles;
