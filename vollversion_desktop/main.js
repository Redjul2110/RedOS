const apps = [
  {
    id: 'files',
    name: 'Dateien',
    url: '',
    desc: 'Lokale Dateien verwalten',
    color: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    icon: '📁'
  },
  {
    id: 'jumper-netlify',
    name: 'Jumper (2)',
    url: 'https://jumper-redjgames.netlify.app/',
    desc: 'Platformer Netlify Build',
    color: 'linear-gradient(135deg, #f97316, #fb7185)',
    icon: '🎮'
  },
  {
    id: 'pyscript',
    name: 'PyScript Starter',
    url: 'https://pyton-scripts-redjgames.netlify.app/',
    desc: 'Python im Browser',
    color: 'linear-gradient(135deg, #a855f7, #6366f1)',
    icon: '🐍'
  },
  {
    id: 'aktien',
    name: 'Aktien-Simulator',
    url: 'https://aktien-sim-redjgames.netlify.app/',
    desc: 'Börse & Risiko',
    color: 'linear-gradient(135deg, #22d3ee, #7c3aed)',
    icon: '📈'
  },
  {
    id: 'controller',
    name: 'Controller Flight',
    url: 'https://redjul2110.github.io/controller-flight/',
    desc: 'Flug mit Pad',
    color: 'linear-gradient(135deg, #7cf5ff, #3b82f6)',
    icon: '✈️'
  },
  {
    id: 'jumper',
    name: 'Jumper (1)',
    url: 'https://redjul2110.github.io/Jumper-Web/Jumper.html',
    desc: 'Arcade Plattform',
    color: 'linear-gradient(135deg, #ff2e74, #ff6ea3)',
    icon: '🕹️'
  },
  {
    id: 'browser',
    name: 'Google',
    url: 'https://www.google.com/webhp?igu=1',
    desc: 'Google Suche',
    color: 'linear-gradient(135deg, #00f2ff, #7c3aed)',
    icon: '🔍'
  },
  {
    id: 'web-browser',
    name: 'Web Browser',
    url: 'https://redjgames.wixsite.com/redjgames',
    desc: 'Browser mit URL Eingabe',
    color: 'linear-gradient(135deg, #10b981, #059669)',
    icon: '🌐'
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    url: 'https://pacmanonline.org/index-de',
    desc: 'Pac-Man Arcade',
    color: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    icon: '👾'
  },
  {
    id: 'flappy',
    name: 'Flappy Bird',
    url: 'https://flappybird.io/',
    desc: 'Flappy Bird Klon',
    color: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    icon: '🐦'
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    url: 'https://sudoku.com/',
    desc: 'Sudoku Rätsel',
    color: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    icon: '🔲'
  }
];

const state = {
  z: 4,
  windows: {},
  setupStep: 1,
  desktopFiles: [],
  selectedFiles: new Set()
};

const windowArea = document.getElementById('windowArea');
const template = document.getElementById('windowTemplate');
const dock = document.getElementById('dock')?.querySelector('.dock-container');
const clockMenu = document.getElementById('clockMenu');
const setupOverlay = document.getElementById('setupOverlay');
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const FILE_KEY = 'redos_files';
const DESKTOP_FILES_KEY = 'redos_desktop_files';

// Cookie-Hilfsfunktionen
function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
}

// Passwort-Hashing (SHA-256)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Setup-System
function checkSetup() {
  const setupCompleted = getCookie('setup_completed');
  if (!setupCompleted || setupCompleted !== 'true') {
    showSetup();
  } else {
    hideSetup();
  }
}

function showSetup() {
  if (setupOverlay) {
    setupOverlay.classList.remove('hidden');
    state.setupStep = 1;
    showSetupStep(1);
    // Event Listener für Setup-Buttons hinzufügen
    attachSetupListeners();
  }
}

function attachSetupListeners() {
  // Event Listener als Backup hinzufügen (onclick sollte bereits funktionieren)
  const setupBtn1 = document.getElementById('setupBtn1');
  const setupBtn2 = document.getElementById('setupBtn2');
  const setupBtnBack = document.getElementById('setupBtnBack');
  const setupBtn3 = document.getElementById('setupBtn3');
  
  if (setupBtn1 && !setupBtn1.onclick) {
    setupBtn1.addEventListener('click', setupNextStep);
  }
  if (setupBtn2 && !setupBtn2.onclick) {
    setupBtn2.addEventListener('click', setupCreatePassword);
  }
  if (setupBtnBack && !setupBtnBack.onclick) {
    setupBtnBack.addEventListener('click', setupPrevStep);
  }
  if (setupBtn3 && !setupBtn3.onclick) {
    setupBtn3.addEventListener('click', setupComplete);
  }
}

function hideSetup() {
  if (setupOverlay) {
    setupOverlay.classList.add('hidden');
  }
}

function showSetupStep(step) {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`setupStep${i}`);
    if (stepEl) {
      if (i === step) {
        stepEl.classList.remove('hidden');
      } else {
        stepEl.classList.add('hidden');
      }
    }
  }
  state.setupStep = step;
}

function setupNextStep() {
  if (state.setupStep < 3) {
    showSetupStep(state.setupStep + 1);
  }
}

function setupPrevStep() {
  if (state.setupStep > 1) {
    showSetupStep(state.setupStep - 1);
  }
}

async function setupCreatePassword() {
  const passwordInput = document.getElementById('passwordInput');
  const passwordConfirm = document.getElementById('passwordConfirm');
  const errorEl = document.getElementById('passwordError');
  
  if (!passwordInput || !passwordConfirm || !errorEl) return;
  
  const password = passwordInput.value;
  const confirm = passwordConfirm.value;
  
  if (!password || password.length < 4) {
    errorEl.textContent = 'Passwort muss mindestens 4 Zeichen lang sein';
    return;
  }
  
  if (password !== confirm) {
    errorEl.textContent = 'Passwörter stimmen nicht überein';
    return;
  }
  
  errorEl.textContent = '';
  const passwordHash = await hashPassword(password);
  setCookie('user_password_hash', passwordHash);
  
  // Eingabefelder leeren
  passwordInput.value = '';
  passwordConfirm.value = '';
  
  setupNextStep();
}

function setupComplete() {
  setCookie('setup_completed', 'true');
  hideSetup();
  init();
}

// Reset-Funktion: Löscht alle Daten und führt zurück zum Setup
function resetSystem() {
  // Bestätigung anfordern
  if (!confirm('Möchtest du wirklich alle Daten zurücksetzen?\n\nDies wird:\n- Alle Cookies löschen\n- Alle gespeicherten Dateien löschen\n- Zum Setup zurückführen')) {
    return;
  }
  
  // Alle Cookies löschen
  deleteCookie('setup_completed');
  deleteCookie('user_password_hash');
  
  // Alle localStorage-Daten löschen
  try {
    localStorage.removeItem(FILE_KEY);
    localStorage.removeItem(DESKTOP_FILES_KEY);
    localStorage.clear();
  } catch (e) {
    console.error('Fehler beim Löschen von localStorage:', e);
  }
  
  // Seite sofort neu laden
  window.location.reload();
}

// Desktop-Dateien System
function loadDesktopFiles() {
  try {
    const raw = localStorage.getItem(DESKTOP_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveDesktopFiles(files) {
  localStorage.setItem(DESKTOP_FILES_KEY, JSON.stringify(files));
}

function createDesktopFile(name, content, x, y) {
  const id = `desktop-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const file = {
    id,
    name,
    content,
    x: x || Math.random() * (window.innerWidth - 200),
    y: y || Math.random() * (window.innerHeight - 200),
    createdAt: Date.now()
  };
  const files = loadDesktopFiles();
  files.push(file);
  saveDesktopFiles(files);
  state.desktopFiles = files;
  renderDesktopFiles();
  return file;
}

function deleteDesktopFile(id) {
  const files = loadDesktopFiles().filter(f => f.id !== id);
  saveDesktopFiles(files);
  state.desktopFiles = files;
  renderDesktopFiles();
}

function renderDesktopFiles() {
  if (!windowArea) return;
  
  // Entferne alte Desktop-Dateien (nicht Fenster)
  const existingFiles = windowArea.querySelectorAll('.desktop-file');
  existingFiles.forEach(el => el.remove());
  
  const files = loadDesktopFiles();
  state.desktopFiles = files;
  
  files.forEach(file => {
    const fileEl = document.createElement('div');
    fileEl.className = 'desktop-file';
    fileEl.dataset.fileId = file.id;
    fileEl.style.left = `${file.x}px`;
    fileEl.style.top = `${file.y}px`;
    fileEl.style.zIndex = '1';
    
    const icon = document.createElement('div');
    icon.className = 'desktop-file-icon';
    icon.textContent = '📄';
    
    const label = document.createElement('div');
    label.className = 'desktop-file-label';
    label.textContent = file.name;
    
    fileEl.append(icon, label);
    
    // Doppelklick zum Öffnen
    fileEl.addEventListener('dblclick', () => {
      openFileInEditor(file);
    });
    
    // Drag & Drop
    applyDesktopFileDraggable(fileEl, file);
    
    // Rechtsklick-Menü
    fileEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showFileContextMenu(e, file);
    });
    
    windowArea.append(fileEl);
  });
}

function applyDesktopFileDraggable(fileEl, file) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  
  fileEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Nur Linksklick
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = file.x;
    startTop = file.y;
    
    fileEl.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  });
  
  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const areaRect = windowArea.getBoundingClientRect();
    const newX = Math.max(0, Math.min(startLeft + dx, areaRect.width - 80));
    const newY = Math.max(0, Math.min(startTop + dy, areaRect.height - 100));
    
    fileEl.style.left = `${newX}px`;
    fileEl.style.top = `${newY}px`;
  };
  
  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    fileEl.style.cursor = 'pointer';
    
    // Position speichern
    const files = loadDesktopFiles();
    const fileIndex = files.findIndex(f => f.id === file.id);
    if (fileIndex >= 0) {
      files[fileIndex].x = parseInt(fileEl.style.left);
      files[fileIndex].y = parseInt(fileEl.style.top);
      saveDesktopFiles(files);
    }
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

function openFileInEditor(file) {
  // Öffne Datei im Dateien-App
  const filesApp = apps.find(a => a.id === 'files');
  if (filesApp) {
    openApp(filesApp);
    // Nach kurzer Verzögerung Datei laden
    setTimeout(() => {
      const fileNameInput = document.getElementById('fileName');
      const fileContentInput = document.getElementById('fileContent');
      if (fileNameInput && fileContentInput) {
        fileNameInput.value = file.name;
        fileContentInput.value = file.content;
      }
    }, 300);
  }
}

function showFileContextMenu(e, file) {
  // Einfaches Kontextmenü
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 4px;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `;
  
  const openBtn = document.createElement('div');
  openBtn.textContent = 'Öffnen';
  openBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; border-radius: 4px;';
  openBtn.onmouseover = () => openBtn.style.background = 'rgba(255, 255, 255, 0.1)';
  openBtn.onmouseout = () => openBtn.style.background = 'transparent';
  openBtn.onclick = () => {
    openFileInEditor(file);
    menu.remove();
  };
  
  const deleteBtn = document.createElement('div');
  deleteBtn.textContent = 'Löschen';
  deleteBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; border-radius: 4px; color: #ff3b30;';
  deleteBtn.onmouseover = () => deleteBtn.style.background = 'rgba(255, 59, 48, 0.2)';
  deleteBtn.onmouseout = () => deleteBtn.style.background = 'transparent';
  deleteBtn.onclick = () => {
    if (confirm(`Möchtest du "${file.name}" wirklich löschen?`)) {
      deleteDesktopFile(file.id);
    }
    menu.remove();
  };
  
  menu.append(openBtn, deleteBtn);
  document.body.append(menu);
  
  // Menü schließen bei Klick außerhalb
  setTimeout(() => {
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 10);
}

// Drag & Drop für Dateien aus der Dateien-App
function setupDesktopDropZone() {
  if (!windowArea) return;
  
  windowArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    windowArea.style.backgroundColor = 'rgba(0, 122, 255, 0.1)';
  });
  
  windowArea.addEventListener('dragleave', () => {
    windowArea.style.backgroundColor = '';
  });
  
  windowArea.addEventListener('drop', (e) => {
    e.preventDefault();
    windowArea.style.backgroundColor = '';
    
    const data = e.dataTransfer.getData('text/plain');
    if (data) {
      try {
        const fileData = JSON.parse(data);
        const rect = windowArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        createDesktopFile(fileData.name, fileData.content, x, y);
      } catch (err) {
        console.error('Fehler beim Erstellen der Desktop-Datei:', err);
      }
    }
  });
}

// Menü-System
function setupMenus() {
  setupFileMenu();
  setupEditMenu();
  setupViewMenu();
  setupWindowMenu();
  setupHelpMenu();
}

function createDropdownMenu(items) {
  const menu = document.createElement('div');
  menu.className = 'menu-dropdown-menu';
  
  items.forEach(item => {
    if (item === '---') {
      const separator = document.createElement('div');
      separator.className = 'menu-dropdown-separator';
      menu.append(separator);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = `menu-dropdown-item${item.disabled ? ' disabled' : ''}`;
      menuItem.textContent = item.label;
      if (item.icon) {
        menuItem.innerHTML = `${item.icon} ${item.label}`;
      }
      if (!item.disabled && item.action) {
        menuItem.addEventListener('click', () => {
          item.action();
          closeAllDropdowns();
        });
      }
      menu.append(menuItem);
    }
  });
  
  return menu;
}

function closeAllDropdowns() {
  document.querySelectorAll('.menu-dropdown-menu').forEach(menu => {
    menu.classList.remove('show');
  });
}

function setupFileMenu() {
  const menuFile = document.getElementById('menuFile');
  if (!menuFile) return;
  
  const menu = createDropdownMenu([
    { label: 'Neue Datei', icon: '📄', action: () => {
      const filesApp = apps.find(a => a.id === 'files');
      if (filesApp) openApp(filesApp);
    }},
    { label: 'Neuer Ordner', icon: '📁', action: () => {
      alert('Ordner-Funktion kommt bald!');
    }},
    '---',
    { label: 'Dateien öffnen', icon: '📂', action: () => {
      const filesApp = apps.find(a => a.id === 'files');
      if (filesApp) openApp(filesApp);
    }},
    '---',
    { label: 'Einstellungen', icon: '⚙️', action: () => {
      alert('Einstellungen kommen bald!');
    }},
    '---',
    { label: 'Beenden', icon: '🚪', action: () => {
      if (confirm('Möchtest du redOS wirklich beenden?')) {
        window.close();
      }
    }}
  ]);
  
  menuFile.append(menu);
  menuFile.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
      menu.classList.add('show');
    }
  });
}

function setupEditMenu() {
  const menuEdit = document.getElementById('menuEdit');
  if (!menuEdit) return;
  
  const menu = createDropdownMenu([
    { label: 'Rückgängig', icon: '↶', action: () => {
      document.execCommand('undo');
    }},
    { label: 'Wiederholen', icon: '↷', action: () => {
      document.execCommand('redo');
    }},
    '---',
    { label: 'Ausschneiden', icon: '✂️', action: () => {
      document.execCommand('cut');
    }},
    { label: 'Kopieren', icon: '📋', action: () => {
      document.execCommand('copy');
    }},
    { label: 'Einfügen', icon: '📄', action: () => {
      document.execCommand('paste');
    }},
    '---',
    { label: 'Alles auswählen', icon: '☑️', action: () => {
      document.execCommand('selectAll');
    }}
  ]);
  
  menuEdit.append(menu);
  menuEdit.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
      menu.classList.add('show');
    }
  });
}

function setupViewMenu() {
  const menuView = document.getElementById('menuView');
  if (!menuView) return;
  
  const menu = createDropdownMenu([
    { label: 'Fenster vergrößern', icon: '🔍', action: () => {
      const focusedWin = Object.values(state.windows).find(w => w.classList.contains('focused'));
      if (focusedWin) {
        maximizeWindow(focusedWin.dataset.appId);
      }
    }},
    { label: 'Fenster verkleinern', icon: '🔍', action: () => {
      const focusedWin = Object.values(state.windows).find(w => w.classList.contains('focused'));
      if (focusedWin && focusedWin.classList.contains('maximized')) {
        maximizeWindow(focusedWin.dataset.appId);
      }
    }},
    '---',
    { label: 'Desktop anzeigen', icon: '🖥️', action: () => {
      closeAll();
    }},
    '---',
    { label: 'Vollbild', icon: '⛶', action: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }}
  ]);
  
  menuView.append(menu);
  menuView.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
      menu.classList.add('show');
    }
  });
}

function setupWindowMenu() {
  const menuWindow = document.getElementById('menuWindow');
  if (!menuWindow) return;
  
  const menu = createDropdownMenu([
    { label: 'Alle Fenster minimieren', icon: '⬇️', action: () => {
      Object.keys(state.windows).forEach(appId => minimizeWindow(appId));
    }},
    { label: 'Alle Fenster schließen', icon: '✕', action: () => {
      closeAll();
    }},
    '---',
    { label: 'Fenster anordnen', icon: '📐', action: () => {
      arrangeWindows();
    }}
  ]);
  
  menuWindow.append(menu);
  menuWindow.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
      menu.classList.add('show');
    }
  });
}

function setupHelpMenu() {
  const menuHelp = document.getElementById('menuHelp');
  if (!menuHelp) return;
  
  const menu = createDropdownMenu([
    { label: 'Hilfe', icon: '❓', action: () => {
      alert('redOS Hilfe\n\n• Doppelklick auf Apps im Dock zum Öffnen\n• Fenster per Drag & Drop verschieben\n• Dateien auf Desktop ablegen\n• Rechtsklick für Kontextmenü\n• Reset-Button zum Zurücksetzen');
    }},
    '---',
    { label: 'Über redOS', icon: 'ℹ️', action: () => {
      alert('redOS v1.0\n\nEin modernes Browser-OS');
    }}
  ]);
  
  menuHelp.append(menu);
  menuHelp.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
      menu.classList.add('show');
    }
  });
}

function arrangeWindows() {
  const windows = Object.values(state.windows);
  if (windows.length === 0) return;
  
  const areaRect = windowArea.getBoundingClientRect();
  const cols = Math.ceil(Math.sqrt(windows.length));
  const rows = Math.ceil(windows.length / cols);
  const cellWidth = areaRect.width / cols;
  const cellHeight = areaRect.height / rows;
  
  windows.forEach((win, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth + 20;
    const y = row * cellHeight + 20;
    
    win.style.left = `${x}px`;
    win.style.top = `${y}px`;
    focusWindow(win);
  });
}

// Initialisierung
function init() {
  // Setup wurde bereits geprüft, direkt initialisieren
  renderDock();
  updateClock();
  setInterval(updateClock, 1000);
  
  // Desktop-Dateien laden und rendern
  renderDesktopFiles();
  setupDesktopDropZone();
  
  // Menüs einrichten
  setupMenus();
  
  // Klick außerhalb schließt Menüs
  document.addEventListener('click', closeAllDropdowns);
  
  // Reset-Button Event Listener
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSystem);
  }
}

function openApp(app) {
  // Wenn Fenster bereits existiert und minimiert ist, wieder anzeigen
  if (state.windows[app.id]) {
    const win = state.windows[app.id];
    if (win.style.display === 'none') {
      win.style.display = 'flex';
      win.style.opacity = '1';
      win.style.transform = 'scale(1)';
      win.style.transition = '';
    }
    focusWindow(win);
    return;
  }
  
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.appId = app.id;
  node.querySelector('.title-line').textContent = app.name;
  
  const body = node.querySelector('.window-body');
  const frame = node.querySelector('.app-frame');
  
  // Cookie-Zugriff für iframes sicherstellen
  // allow-same-origin ist bereits vorhanden, was Cookies ermöglicht
  
  if (app.id === 'files') {
    frame.remove();
    renderFilesApp(body);
  } else if (app.id === 'web-browser') {
    const toolbar = document.createElement('div');
    toolbar.className = 'browser-toolbar';
    toolbar.style.cssText = 'display: flex; gap: 8px; padding: 10px 12px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.1);';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = app.url;
    input.placeholder = 'URL eingeben...';
    input.style.cssText = 'flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; font-size: 13px;';
    
    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.style.cssText = 'padding: 8px 16px; border-radius: 6px; border: none; background: #007aff; color: white; font-weight: 600; cursor: pointer;';
    
    goBtn.onclick = () => {
      let url = input.value.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      frame.src = url;
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') goBtn.click();
    };
    
    toolbar.append(input, goBtn);
    node.querySelector('.window-body').prepend(toolbar);
    frame.src = app.url;
  } else {
    // Normale Apps direkt laden
    frame.src = app.url;
  }
  
  // Traffic Lights Event Handler
  const closeBtn = node.querySelector('.traffic-light-close');
  const minimizeBtn = node.querySelector('.traffic-light-minimize');
  const maximizeBtn = node.querySelector('.traffic-light-maximize');
  const refreshBtn = node.querySelector('.window-refresh');
  
  closeBtn.onclick = () => closeWindow(app.id);
  minimizeBtn.onclick = () => minimizeWindow(app.id);
  maximizeBtn.onclick = () => maximizeWindow(app.id);
  if (refreshBtn && frame) {
    refreshBtn.onclick = () => reloadFrame(frame, app.url, app.id);
  }
  
  applyDraggable(node);
  applyResizable(node);
  windowArea.append(node);
  randomizePosition(node);
  focusWindow(node);
  state.windows[app.id] = node;
  renderDock();
}

function reloadFrame(frame, url, appId) {
  if (!frame) return;
  frame.src = '';
  requestAnimationFrame(() => { frame.src = url; });
  if (appId === 'web-browser') {
    const win = Object.values(state.windows).find(w => w.querySelector('.app-frame') === frame);
    if (win) {
      const input = win.querySelector('input[type="text"]');
      if (input) input.value = url;
    }
  }
}

function closeWindow(appId) {
  const win = state.windows[appId];
  if (!win) return;
  win.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  win.style.opacity = '0';
  win.style.transform = 'scale(0.9)';
  setTimeout(() => {
    win.remove();
    delete state.windows[appId];
    renderDock();
  }, 200);
}

function minimizeWindow(appId) {
  const win = state.windows[appId];
  if (!win) return;
  win.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  win.style.opacity = '0';
  win.style.transform = 'scale(0.95) translateY(20px)';
  setTimeout(() => {
    win.style.display = 'none';
    renderDock();
  }, 200);
}

function restoreWindow(appId) {
  const win = state.windows[appId];
  if (!win) return;
  win.style.display = 'flex';
  win.style.opacity = '1';
  win.style.transform = 'scale(1)';
  win.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  focusWindow(win);
  renderDock();
}

function maximizeWindow(appId) {
  const win = state.windows[appId];
  if (!win) return;
  
  if (win.classList.contains('maximized')) {
    win.classList.remove('maximized');
    win.style.width = '800px';
    win.style.height = '600px';
    win.style.left = '';
    win.style.top = '';
    win.style.right = '';
    win.style.bottom = '';
  } else {
    win.classList.add('maximized');
    const areaRect = windowArea.getBoundingClientRect();
    win.style.width = `${areaRect.width}px`;
    win.style.height = `${areaRect.height}px`;
    win.style.left = '0';
    win.style.top = '0';
    win.style.right = '0';
    win.style.bottom = '0';
  }
  renderDock();
}

function focusWindow(win) {
  state.z += 1;
  win.style.zIndex = state.z;
  win.classList.add('focused');
  Array.from(windowArea.children).forEach((w) => {
    if (w !== win) w.classList.remove('focused');
  });
  renderDock();
}

function randomizePosition(win) {
  const areaRect = windowArea.getBoundingClientRect();
  const winWidth = win.offsetWidth || 800;
  const winHeight = win.offsetHeight || 600;
  const maxLeft = Math.max(0, areaRect.width - winWidth - 40);
  const maxTop = Math.max(0, areaRect.height - winHeight - 40);
  
  // Verteile Fenster etwas, damit sie sich nicht überlappen
  const existingWindows = Object.keys(state.windows).length;
  const offsetX = (existingWindows % 3) * 30;
  const offsetY = (existingWindows % 3) * 30;
  
  const left = Math.min(40 + offsetX, maxLeft);
  const top = Math.min(40 + offsetY, maxTop);
  
  win.style.position = 'absolute';
  win.style.left = `${left}px`;
  win.style.top = `${top}px`;
}

function applyDraggable(win) {
  const head = win.querySelector('.window-head');
  let isDown = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onMouseDown = (e) => {
    // Ignoriere Traffic Lights und andere Buttons
    if (e.target.closest('.traffic-light') || 
        e.target.closest('.window-refresh') ||
        e.target.closest('.window-actions')) {
      return;
    }
    
    // Ignoriere wenn maximiert
    if (win.classList.contains('maximized')) {
      return;
    }
    
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // Aktuelle Position des Fensters relativ zum windowArea
    const rect = win.getBoundingClientRect();
    const areaRect = windowArea.getBoundingClientRect();
    startLeft = rect.left - areaRect.left;
    startTop = rect.top - areaRect.top;
    
    focusWindow(win);
    win.style.cursor = 'grabbing';
    head.style.cursor = 'grabbing';
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!isDown) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const areaRect = windowArea.getBoundingClientRect();
    const newLeft = startLeft + dx;
    const newTop = startTop + dy;
    
    // Begrenze auf windowArea
    const maxLeft = areaRect.width - win.offsetWidth;
    const maxTop = areaRect.height - win.offsetHeight;
    
    win.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
    win.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
  };

  const onMouseUp = () => {
    isDown = false;
    win.style.cursor = '';
    head.style.cursor = 'grab';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  head.addEventListener('mousedown', onMouseDown);
  head.addEventListener('dblclick', () => maximizeWindow(win.dataset.appId));
}

function applyResizable(win) {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  win.append(handle);

  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  const onMouseDown = (e) => {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = win.offsetWidth;
    startH = win.offsetHeight;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    focusWindow(win);
  };

  const onMouseMove = (e) => {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const areaRect = windowArea.getBoundingClientRect();
    const rect = win.getBoundingClientRect();
    const maxW = areaRect.width - (rect.left - areaRect.left) - 8;
    const maxH = areaRect.height - (rect.top - areaRect.top) - 8;
    const nextW = Math.min(Math.max(MIN_WIDTH, startW + dx), maxW);
    const nextH = Math.min(Math.max(MIN_HEIGHT, startH + dy), maxH);
    win.style.width = `${nextW}px`;
    win.style.height = `${nextH}px`;
  };

  const onMouseUp = () => {
    isResizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  handle.addEventListener('mousedown', onMouseDown);
}

function renderDock() {
  if (!dock) return;
  dock.innerHTML = '';
  
  apps.forEach((app) => {
    const active = !!state.windows[app.id];
    const item = document.createElement('div');
    item.className = `dock-item${active ? ' active' : ''}`;
    
    const icon = document.createElement('div');
    icon.className = 'dock-item-icon';
    icon.textContent = app.icon || '📱';
    icon.style.background = app.color || 'linear-gradient(135deg, #007aff, #5856d6)';
    
    const label = document.createElement('div');
    label.className = 'dock-item-label';
    label.textContent = app.name;
    
    item.append(icon, label);
    
    item.onclick = () => {
      if (active) {
        const win = state.windows[app.id];
        if (win && win.style.display === 'none') {
          restoreWindow(app.id);
        } else {
          focusWindow(win);
        }
      } else {
        openApp(app);
      }
    };
    
    dock.append(item);
  });
}

function updateClock() {
  if (!clockMenu) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  clockMenu.textContent = `${hh}:${mm}`;
}

// Datei-App (lokal per localStorage)
function loadFiles() {
  try {
    const raw = localStorage.getItem(FILE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFiles(files) {
  localStorage.setItem(FILE_KEY, JSON.stringify(files));
}

function renderFilesApp(body) {
  body.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'file-app';

  const form = document.createElement('div');
  form.className = 'file-form';
  form.innerHTML = `
    <h3>Datei anlegen</h3>
    <input type=\"text\" id=\"fileName\" placeholder=\"Dateiname\" />
    <textarea id=\"fileContent\" placeholder=\"Inhalt\"></textarea>
    <div style=\"display: flex; gap: 8px;\">
      <button id=\"fileSaveBtn\">Speichern</button>
      <button id=\"fileToDesktopBtn\" style=\"background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);\">Auf Desktop</button>
    </div>
    <div class=\"file-hint\">Dateien werden lokal im Browser gespeichert. Ziehe Dateien auf den Desktop!</div>
  `;

  const list = document.createElement('div');
  list.className = 'file-list';

  const renderList = () => {
    const files = loadFiles();
    list.innerHTML = '';
    if (!files.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Keine Dateien vorhanden.';
      list.append(empty);
      return;
    }
    files.forEach((file) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.draggable = true;
      card.dataset.fileName = file.name;
      card.dataset.fileContent = file.content;
      card.innerHTML = `<h4>${file.name}</h4><p>${file.content.slice(0, 180) || 'Leer'}</p>`;
      
      // Drag & Drop für Desktop
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          name: file.name,
          content: file.content
        }));
        card.style.opacity = '0.5';
      });
      
      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });
      
      // Doppelklick zum Öffnen
      card.addEventListener('dblclick', () => {
        const nameInput = form.querySelector('#fileName');
        const contentInput = form.querySelector('#fileContent');
        if (nameInput && contentInput) {
          nameInput.value = file.name;
          contentInput.value = file.content;
        }
      });
      
      list.append(card);
    });
  };

  form.querySelector('#fileSaveBtn').onclick = () => {
    const name = form.querySelector('#fileName').value.trim();
    const content = form.querySelector('#fileContent').value;
    if (!name) return;
    const files = loadFiles();
    const existingIdx = files.findIndex(f => f.name === name);
    const entry = { name, content, updated: Date.now() };
    if (existingIdx >= 0) {
      files[existingIdx] = entry;
    } else {
      files.push(entry);
    }
    saveFiles(files);
    renderList();
  };
  
  form.querySelector('#fileToDesktopBtn').onclick = () => {
    const name = form.querySelector('#fileName').value.trim();
    const content = form.querySelector('#fileContent').value;
    if (!name) {
      alert('Bitte gib einen Dateinamen ein.');
      return;
    }
    createDesktopFile(name, content);
    alert(`Datei "${name}" wurde auf dem Desktop erstellt!`);
  };

  wrapper.append(form, list);
  body.append(wrapper);
  renderList();
}

// Fallback für blockierte iframes (nur bei echten Fehlern)
function attachFrameGuard(frame, fallbackEl, url) {
  if (!frame || !fallbackEl) return;
  
  let loaded = false;
  const showFallback = () => {
    if (!loaded) {
      fallbackEl.classList.remove('hidden');
    }
  };
  const hideFallback = () => {
    fallbackEl.classList.add('hidden');
    loaded = true;
  };

  // Nur bei echten Fehlern zeigen
  frame.addEventListener('load', () => {
    try {
      const doc = frame.contentDocument;
      if (doc && doc.body && doc.body.children.length > 0) {
        hideFallback();
      } else {
        // Leere Seite könnte ein Problem sein, aber nicht sofort zeigen
        setTimeout(() => {
          if (!loaded) {
            // Prüfe nochmal nach kurzer Zeit
            try {
              const doc2 = frame.contentDocument;
              if (!doc2 || !doc2.body || doc2.body.children.length === 0) {
                showFallback();
              }
            } catch (e) {
              // Cross-Origin Fehler - das ist normal bei externen Seiten
              // Nicht als Fehler behandeln
            }
          }
        }, 3000);
      }
    } catch (e) {
      // Cross-Origin Fehler sind normal - nicht als Fehler behandeln
      // Die Seite lädt trotzdem
      hideFallback();
    }
  });
  
  // Nur bei echten Netzwerkfehlern zeigen
  frame.addEventListener('error', () => {
    setTimeout(() => {
      if (!loaded) {
        showFallback();
      }
    }, 1000);
  });
}

// Globale Setup-Funktionen für HTML onclick (sofort verfügbar machen)
// Diese müssen VOR dem DOMContentLoaded verfügbar sein
window.setupNextStep = function() {
  if (state.setupStep < 3) {
    showSetupStep(state.setupStep + 1);
  }
};
window.setupPrevStep = function() {
  if (state.setupStep > 1) {
    showSetupStep(state.setupStep - 1);
  }
};
window.setupCreatePassword = setupCreatePassword;
window.setupComplete = function() {
  setCookie('setup_completed', 'true');
  hideSetup();
  init();
};

// Sicherstellen, dass Funktionen auch nach DOMContentLoaded verfügbar sind
document.addEventListener('DOMContentLoaded', () => {
  // Funktionen erneut zuweisen für Sicherheit
  window.setupNextStep = setupNextStep;
  window.setupPrevStep = setupPrevStep;
  window.setupCreatePassword = setupCreatePassword;
  window.setupComplete = setupComplete;
  
  // Event Listener für Setup-Buttons hinzufügen
  attachSetupListeners();
  
  // Reset-Button Event Listener (auch wenn Setup noch nicht abgeschlossen)
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSystem);
  }
  
  // Menüs auch beim Setup einrichten
  setupMenus();
  document.addEventListener('click', closeAllDropdowns);
  
  const setupCompleted = getCookie('setup_completed');
  if (setupCompleted === 'true') {
    // Setup bereits abgeschlossen - direkt initialisieren
    hideSetup();
    init();
  } else {
    // Setup noch nicht abgeschlossen - Setup anzeigen
    showSetup();
  }
});
