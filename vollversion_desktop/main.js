// Global variables 
let currentFolderId = 'root';
 
// Mobile device detection
function isMobileDevice() {
  return (typeof window.orientation !== "undefined") || 
         (navigator.userAgent.indexOf('IEMobile') !== -1) ||
         (navigator.userAgent.match(/Android/i) ||
          navigator.userAgent.match(/webOS/i) ||
          navigator.userAgent.match(/iPhone/i) ||
          navigator.userAgent.match(/iPad/i) ||
          navigator.userAgent.match(/iPod/i) ||
          navigator.userAgent.match(/BlackBerry/i) ||
          navigator.userAgent.match(/Windows Phone/i));
}

function redosDialog({ title = 'redOS', message = '', input = null, buttons = [] } = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('redosDialogOverlay');
    const titleEl = document.getElementById('redosDialogTitle');
    const msgEl = document.getElementById('redosDialogMessage');
    const inputEl = document.getElementById('redosDialogInput');
    const actionsEl = document.getElementById('redosDialogActions');
    if (!overlay || !titleEl || !msgEl || !actionsEl || !inputEl) {
      resolve(null);
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    actionsEl.innerHTML = '';

    if (input && typeof input === 'object') {
      inputEl.classList.remove('hidden');
      inputEl.type = input.type === 'password' ? 'password' : 'text';
      inputEl.value = typeof input.value === 'string' ? input.value : '';
      inputEl.placeholder = typeof input.placeholder === 'string' ? input.placeholder : '';
    } else {
      inputEl.classList.add('hidden');
      inputEl.value = '';
    }

    const cleanup = () => {
      overlay.classList.add('hidden');
      actionsEl.innerHTML = '';
      inputEl.classList.add('hidden');
      document.removeEventListener('keydown', onKeyDown, true);
    };

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(null);
      }
      if (e.key === 'Enter' && !inputEl.classList.contains('hidden')) {
        e.preventDefault();
        const primary = actionsEl.querySelector('button.primary');
        if (primary) primary.click();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    const btns = Array.isArray(buttons) && buttons.length ? buttons : [{ label: 'OK', value: true, variant: 'primary' }];
    btns.forEach((b, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `setup-btn ${b.variant === 'primary' ? 'primary' : 'ghost'}`;
      if (b.variant === 'primary') btn.classList.add('primary');
      btn.textContent = b.label || (idx === 0 ? 'OK' : 'Abbrechen');
      btn.addEventListener('click', () => {
        if (input && typeof input === 'object') {
          finish(inputEl.value);
        } else {
          finish(b.value);
        }
      });
      actionsEl.append(btn);
    });

    overlay.classList.remove('hidden');
    setTimeout(() => {
      if (!inputEl.classList.contains('hidden')) {
        inputEl.focus();
        inputEl.select();
      } else {
        const primary = actionsEl.querySelector('button.primary') || actionsEl.querySelector('button');
        primary?.focus?.();
      }
    }, 0);
  });
}

function redosConfirm(message, title = 'Bestätigung') {
  return redosDialog({
    title,
    message,
    buttons: [
      { label: 'Abbrechen', value: false, variant: 'ghost' },
      { label: 'OK', value: true, variant: 'primary' }
    ]
  }).then(v => v === true);
}

function redosPrompt(message, { title = 'Eingabe', placeholder = '', value = '' } = {}) {
  return redosDialog({
    title,
    message,
    input: { type: 'text', placeholder, value },
    buttons: [
      { label: 'Abbrechen', value: null, variant: 'ghost' },
      { label: 'OK', value: true, variant: 'primary' }
    ]
  }).then(v => (typeof v === 'string' ? v : null));
}

function shouldSkipContextMenu(e, kind, id) {
  if (typeof state === 'undefined') return false;
  try {
    const now = Date.now();
    const key = `${String(kind || '')}|${String(id || '')}|${e?.clientX ?? ''}|${e?.clientY ?? ''}`;
    if (state._lastContextMenuKey === key && now - (state._lastContextMenuTs || 0) < 140) {
      return true;
    }
    state._lastContextMenuKey = key;
    state._lastContextMenuTs = now;
  } catch (err) {
    return false;
  }
  return false;
}

function showBackgroundContextMenu(e, context) {
  if (shouldSkipContextMenu(e, 'background', context)) return;
  document.querySelectorAll('.context-menu').forEach(menu => menu.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.addEventListener('mousedown', (ev) => ev.stopPropagation());
  menu.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    z-index: 10000;
  `;

  const divider = document.createElement('div');
  divider.className = 'context-menu-divider';

  const newFile = document.createElement('div');
  newFile.className = 'context-menu-item';
  newFile.innerHTML = '<i>📄</i> <span>Neue Datei</span>';
  newFile.onclick = async () => {
    if (context === 'files') {
      if (window.redosFiles && typeof window.redosFiles.openDialog === 'function') {
        window.redosFiles.openDialog({ mode: 'file', title: 'Neue Datei' });
      }
    } else {
      const name = await redosPrompt('Dateiname', { title: 'Neue Datei', placeholder: 'z.B. Notizen.txt' });
      if (name && name.trim()) createDesktopFile(name.trim(), '', e.clientX, e.clientY, false, null, null);
    }
    menu.remove();
  };

  const newFolder = document.createElement('div');
  newFolder.className = 'context-menu-item';
  newFolder.innerHTML = '<i>📁➕</i> <span>Neuer Ordner</span>';
  newFolder.onclick = async () => {
    if (context === 'files') {
      if (window.redosFiles && typeof window.redosFiles.openDialog === 'function') {
        window.redosFiles.openDialog({ mode: 'folder', title: 'Neuer Ordner' });
      }
    } else {
      const name = await redosPrompt('Ordnername', { title: 'Neuer Ordner', placeholder: 'z.B. Projekte' });
      if (name && name.trim()) createDesktopFile(name.trim(), '', e.clientX, e.clientY, true, null, null);
    }
    menu.remove();
  };

  const pasteItem = document.createElement('div');
  pasteItem.className = 'context-menu-item';
  pasteItem.innerHTML = '<i>📋</i> <span>Einfügen</span>';
  pasteItem.onclick = () => {
    if (!state.clipboard || state.clipboard.action !== 'cut') {
      menu.remove();
      return;
    }
    if (context === 'desktop' && state.clipboard.source === 'desktop') {
      const files = loadDesktopFiles();
      const item = files.find(f => f.id === state.clipboard.id);
      if (item) {
        item.x = e.clientX;
        item.y = e.clientY;
        saveDesktopFiles(files);
        renderDesktopFiles();
        state.clipboard = null;
        showNotification('Eingefügt');
      }
      menu.remove();
      return;
    }

    if (context === 'files' && state.clipboard.source === 'files') {
      const files = loadFiles();
      const moving = files.find(f => f.id === state.clipboard.id);
      if (moving) {
        moving.parentId = currentFolderId;
        moving.updatedAt = new Date().toISOString();
        saveFiles(files);
        state.clipboard = null;
        if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
        showNotification('Eingefügt');
      }
      menu.remove();
      return;
    }

    menu.remove();
  };

  menu.append(newFile, newFolder);
  if (state.clipboard?.action === 'cut') {
    menu.append(divider, pasteItem);
  }
  document.body.append(menu);

  // Close menu when clicking outside
  setTimeout(() => {
    const closeMenu = (ev) => {
      const isContextClick = (typeof ev.button === 'number' && ev.button === 2) ||
        (typeof ev.button === 'number' && ev.button === 0 && (ev.ctrlKey || ev.metaKey));
      if (isContextClick) return;
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu, true);
      }
    };
    document.addEventListener('mousedown', closeMenu, true);
  }, 10);
}

function renderSettingsApp(body) {
  body.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'height: 100%; padding: 20px; overflow: auto; color: white; font-family: inherit;';

  const title = document.createElement('h2');
  title.textContent = 'Einstellungen';
  title.style.cssText = 'margin: 0 0 12px 0; font-size: 18px;';

  const section = document.createElement('div');
  section.style.cssText = 'display: grid; gap: 10px;';

  const defaultRow = document.createElement('div');
  defaultRow.style.cssText = 'display: grid; gap: 6px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08);';
  const defaultTitle = document.createElement('div');
  defaultTitle.textContent = 'Standard-App (Doppelklick auf Datei)';
  defaultTitle.style.cssText = 'font-weight: 600; font-size: 13px;';
  const defaultSelect = document.createElement('select');
  defaultSelect.style.cssText = 'padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.25); color: white;';
  defaultSelect.innerHTML = `
    <option value="editor">Editor</option>
    <option value="coder">Coder</option>
    <option value="files">Dateien (Dialog)</option>
  `;
  try {
    defaultSelect.value = localStorage.getItem('default_open_app') || 'editor';
  } catch (e) {
    defaultSelect.value = 'editor';
  }
  defaultSelect.addEventListener('change', () => {
    try { localStorage.setItem('default_open_app', defaultSelect.value); } catch (e) { /* ignore */ }
    showNotification('Gespeichert');
  });
  defaultRow.append(defaultTitle, defaultSelect);

  const mkBtn = (label, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: white; cursor: pointer; text-align: left;';
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.12)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.08)'; });
    btn.addEventListener('click', onClick);
    return btn;
  };

  section.append(
    defaultRow,
    mkBtn('Desktop-Icons leeren', () => {
      try {
        localStorage.removeItem(DESKTOP_FILES_KEY);
        renderDesktopFiles();
        showNotification('Desktop wurde geleert');
      } catch (e) {
        showNotification('Fehler beim Leeren des Desktops');
      }
    }),
    mkBtn('Dateien-App Daten leeren', () => {
      try {
        localStorage.removeItem(FILE_KEY);
        if (window.redosFiles && typeof window.redosFiles.refresh === 'function') {
          window.redosFiles.refresh();
        }
        showNotification('Dateien wurden gelöscht');
      } catch (e) {
        showNotification('Fehler beim Löschen der Dateien');
      }
    }),
    mkBtn('System zurücksetzen', () => {
      resetSystem();
    })
  );

  wrap.append(title, section);
  body.append(wrap);
}

function openFileWithApp(file, appId) {
  const id = appId || (localStorage.getItem('default_open_app') || 'editor');
  if (id === 'files') {
    if (window.redosFiles && typeof window.redosFiles.openDialog === 'function') {
      window.redosFiles.openDialog({ mode: 'file', title: 'Datei bearbeiten', entry: file });
    } else {
      openFileInEditor(file);
    }
    return;
  }

  const isDesktopEntry = !!file?.id && String(file.id).startsWith('desktop-file-');
  if (isDesktopEntry && file.linkedFileId) {
    const filesAll = loadFiles();
    const linked = filesAll.find(f => f.id === file.linkedFileId);
    if (linked) {
      state.openTarget = { appId: id, file: linked, originalDesktopId: file.id };
      const app = apps.find(a => a.id === id);
      if (app) openApp(app);
      return;
    }
  }

  state.openTarget = { appId: id, file, originalDesktopId: isDesktopEntry ? file.id : null };
  const app = apps.find(a => a.id === id);
  if (app) openApp(app);
}

function openFolderAsCoderProject(folder, isDesktopEntry) {
  if (!folder || !folder.isFolder) return;
  const rootId = isDesktopEntry ? (folder.linkedFolderId || null) : folder.id;
  if (!rootId) return;
  state.openTarget = { appId: 'coder', projectRootId: rootId };
  const app = apps.find(a => a.id === 'coder');
  if (app) openApp(app);
}

function renderEditorApp(body, initial) {
  body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; color: white;';

  const header = document.createElement('div');
  header.style.cssText = 'display: flex; gap: 10px; align-items: center;';
  const name = document.createElement('div');
  name.style.cssText = 'flex: 1; font-weight: 700;';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Speichern';
  saveBtn.style.cssText = 'padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: white; cursor: pointer;';
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download';
  downloadBtn.style.cssText = saveBtn.style.cssText;

  const textarea = document.createElement('textarea');
  textarea.style.cssText = 'flex: 1; width: 100%; resize: none; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.25); color: white; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; line-height: 1.4;';

  let current = initial && typeof initial === 'object' ? { ...initial } : null;
  name.textContent = current?.name || 'Unbenannt';
  textarea.value = current?.content || '';

  saveBtn.onclick = () => {
    const content = textarea.value;
    if (current?.id && !String(current.id).startsWith('desktop-file-')) {
      const files = loadFiles();
      const idx = files.findIndex(f => f.id === current.id);
      if (idx >= 0) {
        files[idx].content = content;
        files[idx].updatedAt = new Date().toISOString();
        saveFiles(files);
        if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
        showNotification('Gespeichert');
        return;
      }
    }

    if (String(current?.id || '').startsWith('desktop-file-')) {
      const desktopFiles = loadDesktopFiles();
      const didx = desktopFiles.findIndex(f => f.id === current.id);
      if (didx >= 0) {
        desktopFiles[didx].content = content;
        saveDesktopFiles(desktopFiles);
        renderDesktopFiles();
        showNotification('Gespeichert');
        return;
      }
    }

    showNotification('Nicht gespeichert');
  };

  downloadBtn.onclick = () => {
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (current?.name || 'datei.txt');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };

  header.append(name, saveBtn, downloadBtn);
  wrap.append(header, textarea);
  body.append(wrap);
}

function renderCoderApp(body, initial) {
  body.innerHTML = '';
  const target = initial && typeof initial === 'object' ? initial : {};

  const wrap = document.createElement('div');
  wrap.style.cssText = 'height: 100%; display: flex; flex-direction: column; background: rgba(0,0,0,0.12); color: white;';

  const topbar = document.createElement('div');
  topbar.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.12); background: rgba(20,20,25,0.35);';
  const title = document.createElement('div');
  title.style.cssText = 'flex: 1; font-weight: 700; font-size: 13px; opacity: 0.95;';

  const btnStyle = 'padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: white; cursor: pointer; font-size: 12px;';
  const runBtn = document.createElement('button');
  runBtn.textContent = 'Run';
  runBtn.style.cssText = btnStyle;
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = btnStyle;
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download';
  downloadBtn.style.cssText = btnStyle;
  const upload = document.createElement('input');
  upload.type = 'file';
  upload.style.cssText = 'max-width: 240px;';

  const contentRow = document.createElement('div');
  contentRow.style.cssText = 'flex: 1; display: flex; min-height: 0;';
  const sidebar = document.createElement('div');
  sidebar.style.cssText = 'width: 240px; border-right: 1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.18); padding: 10px; overflow: auto;';
  const editorCol = document.createElement('div');
  editorCol.style.cssText = 'flex: 1; display: flex; flex-direction: column; min-width: 0;';

  const tabs = document.createElement('div');
  tabs.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.18); overflow: auto;';
  const textarea = document.createElement('textarea');
  textarea.style.cssText = 'flex: 1; width: 100%; resize: none; padding: 12px; border: none; outline: none; background: rgba(0,0,0,0.28); color: white; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; line-height: 1.45;';

  const filesAll = loadFiles();
  const projectRootId = target.projectRootId || null;
  let selectedFolderId = projectRootId;
  let current = null;
  let openTabs = [];
  let activeId = null;
  const originalDesktopId = target.originalDesktopId || null;

  function getChildren(parentId) {
    return filesAll.filter(f => (f.parentId || null) === (parentId || null));
  }

  function inferExt(name) {
    const n = String(name || '').toLowerCase();
    const i = n.lastIndexOf('.');
    return i >= 0 ? n.slice(i + 1) : '';
  }

  function runContent(fileName, code) {
    const ext = inferExt(fileName);
    let html = '';
    if (ext === 'html' || ext === 'htm') {
      html = String(code || '');
    } else if (ext === 'js') {
      html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${String(code || '')}</script></body></html>`;
    } else if (ext === 'css') {
      html = `<!doctype html><html><head><meta charset="utf-8"><style>${String(code || '')}</style></head><body></body></html>`;
    } else {
      const safe = String(code || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      html = `<!doctype html><html><head><meta charset="utf-8"></head><body><pre>${safe}</pre></body></html>`;
    }
    const w = window.open();
    if (w && w.document) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  }

  function setActiveTab(id) {
    const entry = openTabs.find(t => t.id === id);
    if (!entry) return;
    activeId = id;
    current = entry;
    textarea.value = entry.content || '';
    title.textContent = `Coder — ${entry.name || ''}`;
    renderTabs();
  }

  function openFileById(id) {
    const f = filesAll.find(x => x.id === id);
    if (!f || f.isFolder) return;
    const existing = openTabs.find(t => t.id === f.id);
    if (!existing) {
      openTabs.push({ id: f.id, name: f.name, content: f.content || '' });
    }
    setActiveTab(f.id);
  }

  function ensureFolderByName(parentId, name) {
    const existing = filesAll.find(f => f.isFolder && (f.parentId || null) === (parentId || null) && f.name === name);
    if (existing) return existing;
    const now = new Date().toISOString();
    const folder = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      content: '',
      isFolder: true,
      parentId: parentId || 'root',
      createdAt: now,
      updatedAt: now
    };
    filesAll.push(folder);
    return folder;
  }

  function createEntryAt(parentId, name, isFolder) {
    const now = new Date().toISOString();
    const entry = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      content: isFolder ? '' : '',
      isFolder: !!isFolder,
      parentId: parentId || 'root',
      createdAt: now,
      updatedAt: now
    };
    filesAll.push(entry);
    saveFiles(filesAll);
    if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
    return entry;
  }

  async function createInProject(isFolder) {
    if (!projectRootId) {
      showNotification('Kein Projekt geöffnet');
      return;
    }
    if (!selectedFolderId) selectedFolderId = projectRootId;

    const label = isFolder ? 'Ordnername' : 'Dateiname';
    const placeholder = isFolder ? 'z.B. src' : 'z.B. index.js';
    const raw = await redosPrompt(label, { title: isFolder ? 'Neuer Ordner' : 'Neue Datei', placeholder });
    const name = (raw || '').trim();
    if (!name) return;

    const parts = name.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    let parentId = selectedFolderId;
    for (let i = 0; i < parts.length - 1; i++) {
      const folder = ensureFolderByName(parentId, parts[i]);
      parentId = folder.id;
    }

    const baseName = parts[parts.length - 1];
    const entry = createEntryAt(parentId, baseName, isFolder);
    if (entry.isFolder) {
      selectedFolderId = entry.id;
      renderTree();
      showNotification('Ordner erstellt');
      return;
    }

    renderTree();
    openFileById(entry.id);
    showNotification('Datei erstellt');
  }

  function renderTabs() {
    tabs.innerHTML = '';
    openTabs.forEach(t => {
      const tab = document.createElement('div');
      tab.style.cssText = `display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: ${t.id === activeId ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}; cursor:pointer; white-space: nowrap;`;
      const label = document.createElement('div');
      label.textContent = t.name;
      label.style.cssText = 'font-size: 12px;';
      tab.onclick = () => setActiveTab(t.id);
      tab.append(label);
      tabs.append(tab);
    });
    if (openTabs.length === 0) {
      const hint = document.createElement('div');
      hint.textContent = projectRootId ? 'Datei links auswählen…' : 'Datei öffnen (Upload) oder per Kontextmenü starten…';
      hint.style.cssText = 'opacity: 0.7; font-size: 12px; padding: 2px 4px;';
      tabs.append(hint);
    }
  }

  function renderTree() {
    sidebar.innerHTML = '';
    if (!projectRootId) {
      const empty = document.createElement('div');
      empty.textContent = 'Kein Projekt geöffnet';
      empty.style.cssText = 'opacity: 0.7; font-size: 12px;';
      sidebar.append(empty);
      return;
    }

    if (!selectedFolderId) selectedFolderId = projectRootId;

    const root = filesAll.find(f => f.id === projectRootId);
    const rootName = root?.name || 'Projekt';
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; align-items:center; justify-content: space-between; gap: 8px; margin: 0 0 8px 0;';
    const rootTitle = document.createElement('div');
    rootTitle.textContent = rootName;
    rootTitle.style.cssText = 'font-weight: 800; font-size: 12px; opacity: 0.95; overflow:hidden; text-overflow: ellipsis; white-space: nowrap;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:6px;';
    const mkSmallBtn = (label, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'padding: 5px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: white; cursor: pointer; font-size: 12px; line-height: 1;';
      b.onclick = onClick;
      return b;
    };
    const newFileBtn = mkSmallBtn('+ Datei', () => createInProject(false));
    const newFolderBtn = mkSmallBtn('+ Ordner', () => createInProject(true));
    actions.append(newFileBtn, newFolderBtn);
    header.append(rootTitle, actions);
    sidebar.append(header);

    const makeNode = (entry, depth) => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius: 8px; cursor: pointer; margin-left: ${depth * 10}px; background: ${entry.isFolder && entry.id === selectedFolderId ? 'rgba(255,255,255,0.10)' : 'transparent'};`;
      let isHover = false;
      const updateBg = () => {
        if (isHover) {
          row.style.background = 'rgba(255,255,255,0.06)';
          return;
        }
        row.style.background = entry.isFolder && entry.id === selectedFolderId
          ? 'rgba(255,255,255,0.10)'
          : 'transparent';
      };
      row.addEventListener('mouseenter', () => {
        isHover = true;
        updateBg();
      });
      row.addEventListener('mouseleave', () => {
        isHover = false;
        updateBg();
      });
      const ico = document.createElement('div');
      ico.textContent = entry.isFolder ? '📁' : '📄';
      const lab = document.createElement('div');
      lab.textContent = entry.name;
      lab.style.cssText = 'font-size: 12px; overflow:hidden; text-overflow: ellipsis; white-space: nowrap;';
      row.append(ico, lab);
      row.onclick = () => {
        if (entry.isFolder) {
          selectedFolderId = entry.id;
          renderTree();
          return;
        }
        openFileById(entry.id);
      };
      sidebar.append(row);

      if (entry.isFolder) {
        getChildren(entry.id)
          .slice()
          .sort((a, b) => (a.isFolder === b.isFolder ? String(a.name).localeCompare(String(b.name)) : (a.isFolder ? -1 : 1)))
          .forEach(child => makeNode(child, depth + 1));
      }
    };

    makeNode(root || { id: projectRootId, name: rootName, isFolder: true }, 0);
  }

  // Initial state
  if (target.file && target.file.id) {
    current = { id: target.file.id, name: target.file.name, content: target.file.content || '' };
    openTabs = [current];
    activeId = current.id;
    textarea.value = current.content || '';
  }
  title.textContent = current?.name ? `Coder — ${current.name}` : 'Coder';

  textarea.addEventListener('input', () => {
    if (!current) return;
    current.content = textarea.value;
    const tab = openTabs.find(t => t.id === current.id);
    if (tab) tab.content = current.content;
  });

  upload.addEventListener('change', () => {
    const f = upload.files && upload.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const tmpId = `upload-${Date.now()}`;
      openTabs.push({ id: tmpId, name: f.name, content });
      setActiveTab(tmpId);
      showNotification('Geladen');
    };
    reader.readAsText(f);
  });

  saveBtn.onclick = () => {
    if (!current) return;
    const content = textarea.value;
    const idx = filesAll.findIndex(f => f.id === current.id);
    if (idx >= 0) {
      filesAll[idx].content = content;
      filesAll[idx].updatedAt = new Date().toISOString();
      saveFiles(filesAll);
      if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
      showNotification('Gespeichert');
      return;
    }

    if (originalDesktopId && String(originalDesktopId).startsWith('desktop-file-')) {
      const desktopFiles = loadDesktopFiles();
      const didx = desktopFiles.findIndex(f => f.id === originalDesktopId);
      if (didx >= 0) {
        desktopFiles[didx].content = content;
        saveDesktopFiles(desktopFiles);
        renderDesktopFiles();
        showNotification('Gespeichert');
        return;
      }
    }

    showNotification('Nicht gespeichert');
  };

  downloadBtn.onclick = () => {
    if (!current) return;
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (current?.name || 'code.txt');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };

  runBtn.onclick = () => {
    if (!current) return;
    runContent(current.name, textarea.value);
  };

  topbar.append(title, runBtn, saveBtn, downloadBtn, upload);
  editorCol.append(tabs, textarea);
  contentRow.append(sidebar, editorCol);
  wrap.append(topbar, contentRow);
  body.append(wrap);
  renderTree();
  renderTabs();
}

// Show mobile message if on mobile device
if (isMobileDevice()) {
  const mobileMessage = document.getElementById('mobileMessage');
  if (mobileMessage) mobileMessage.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

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
    id: 'settings',
    name: 'Einstellungen',
    url: '',
    desc: 'Systemeinstellungen',
    color: 'linear-gradient(135deg, #64748b, #334155)',
    icon: '⚙️'
  },
  {
    id: 'editor',
    name: 'Editor',
    url: '',
    desc: 'Text bearbeiten',
    color: 'linear-gradient(135deg, #22c55e, #16a34a)',
    icon: '📝'
  },
  {
    id: 'coder',
    name: 'Coder',
    url: '',
    desc: 'Code schreiben (HTML/CSS/JS)',
    color: 'linear-gradient(135deg, #a855f7, #6366f1)',
    icon: '💻'
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
  clipboard: null,
  selectedFiles: new Set(),
  _lastContextMenuTs: 0,
  _lastContextMenuKey: ''
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
  const setupCompletedCookie = getCookie('setup_completed');
  const setupCompletedStorage = localStorage.getItem('setup_complete');
  const isCompleted = setupCompletedCookie === 'true' || setupCompletedStorage === 'true';
  if (!isCompleted) {
    showSetup();
  } else {
    hideSetup();
  }
}

async function renameEntry(file, isDesktopEntry) {
  const currentName = typeof file?.name === 'string' ? file.name : '';
  const newNameRaw = await redosPrompt('Neuer Name', { title: 'Umbenennen', value: currentName });
  const newName = (newNameRaw || '').trim();
  if (!newName || newName === currentName) return;

  if (isDesktopEntry) {
    const desktopFiles = loadDesktopFiles();
    const idx = desktopFiles.findIndex(f => f.id === file.id);
    if (idx >= 0) {
      desktopFiles[idx].name = newName;
      saveDesktopFiles(desktopFiles);
      state.desktopFiles = desktopFiles;
      renderDesktopFiles();
    }

    if (file?.isFolder && file.linkedFolderId) {
      const filesAll = loadFiles();
      const fIdx = filesAll.findIndex(f => f.id === file.linkedFolderId);
      if (fIdx >= 0) {
        filesAll[fIdx].name = newName;
        filesAll[fIdx].updatedAt = new Date().toISOString();
        saveFiles(filesAll);
        if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
      }
    }

    if (!file?.isFolder && file.linkedFileId) {
      const filesAll = loadFiles();
      const fIdx = filesAll.findIndex(f => f.id === file.linkedFileId);
      if (fIdx >= 0) {
        filesAll[fIdx].name = newName;
        filesAll[fIdx].updatedAt = new Date().toISOString();
        saveFiles(filesAll);
        if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
      }
    }

    showNotification('Umbenannt');
    return;
  }

  const filesAll = loadFiles();
  const fIdx = filesAll.findIndex(f => f.id === file.id);
  if (fIdx >= 0) {
    const isFolder = !!filesAll[fIdx].isFolder;
    filesAll[fIdx].name = newName;
    filesAll[fIdx].updatedAt = new Date().toISOString();
    saveFiles(filesAll);
    if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();

    const desktopFiles = loadDesktopFiles();
    let changed = false;
    desktopFiles.forEach(df => {
      if (isFolder && df.linkedFolderId === file.id) {
        df.name = newName;
        changed = true;
      }
      if (!isFolder && df.linkedFileId === file.id) {
        df.name = newName;
        changed = true;
      }
    });
    if (changed) {
      saveDesktopFiles(desktopFiles);
      state.desktopFiles = desktopFiles;
      renderDesktopFiles();
    }

    showNotification('Umbenannt');
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
  localStorage.setItem('setup_complete', 'true');
  hideSetup();
  init();

  try {
    const offered = localStorage.getItem('tutorial_offered') === 'true';
    if (!offered) {
      localStorage.setItem('tutorial_offered', 'true');
      setTimeout(() => {
        showTutorialPrompt();
      }, 250);
    }
  } catch (e) {
    // ignore
  }
}

function showTutorialPrompt() {
  const overlay = document.getElementById('tutorialPromptOverlay');
  const yesBtn = document.getElementById('tutorialPromptYes');
  const noBtn = document.getElementById('tutorialPromptNo');
  if (!overlay || !yesBtn || !noBtn) return;

  overlay.classList.remove('hidden');

  const close = () => {
    overlay.classList.add('hidden');
    yesBtn.removeEventListener('click', onYes);
    noBtn.removeEventListener('click', onNo);
  };

  const onYes = () => {
    close();
    startTutorial();
  };

  const onNo = () => {
    close();
  };

  yesBtn.addEventListener('click', onYes);
  noBtn.addEventListener('click', onNo);
}

function startTutorial() {
  const overlay = document.getElementById('tutorialOverlay');
  const titleEl = document.getElementById('tutorialTitle');
  const textEl = document.getElementById('tutorialText');
  const progressEl = document.getElementById('tutorialProgress');
  const prevBtn = document.getElementById('tutorialPrev');
  const nextBtn = document.getElementById('tutorialNext');
  const closeBtn = document.getElementById('tutorialClose');
  if (!overlay || !titleEl || !textEl || !progressEl || !prevBtn || !nextBtn || !closeBtn) return;

  const steps = [
    {
      title: 'Willkommen',
      text: 'Willkommen bei redOS! Ich zeige dir jetzt kurz die wichtigsten Funktionen. Hinweis: Das OS hat noch viele Fehler und ist in Entwicklung.'
    },
    {
      title: 'Desktop Rechtsklick',
      text: 'Auf dem leeren Desktop kannst du rechtsklicken: Neue Datei / Neuer Ordner / Einfügen (wenn etwas ausgeschnitten ist).'
    },
    {
      title: 'Dateien-App',
      text: 'Öffne die Dateien-App über das Dock. Dort kannst du Ordner/Dateien erstellen, öffnen und per Rechtsklick verwalten.'
    },
    {
      title: 'Ausschneiden / Einfügen',
      text: 'Rechtsklick auf Datei/Ordner -> Ausschneiden. Danach kannst du im Zielordner (oder Hintergrund) Einfügen.'
    },
    {
      title: 'Drag & Drop',
      text: 'In der Dateien-App kannst du Dateien/Ordner auf andere Ordner ziehen, um sie zu verschieben.'
    },
    {
      title: 'Desktop Ordner-Drop',
      text: 'Desktop-Dateien, die aus der Dateien-App stammen, kannst du auf Desktop-Ordner (verlinkt) ziehen, um sie in den Ordner zu verschieben.'
    },
    {
      title: 'Fertig',
      text: 'Das war’s! Du kannst das Tutorial jederzeit beenden.'
    }
  ];

  let idx = 0;

  const render = () => {
    const s = steps[idx];
    if (!s) return;
    titleEl.textContent = s.title;
    textEl.textContent = s.text;
    progressEl.textContent = `${idx + 1} / ${steps.length}`;
    prevBtn.disabled = idx === 0;
    nextBtn.textContent = idx === steps.length - 1 ? 'Fertig' : 'Weiter';
  };

  const cleanup = () => {
    overlay.classList.add('hidden');
    prevBtn.removeEventListener('click', onPrev);
    nextBtn.removeEventListener('click', onNext);
    closeBtn.removeEventListener('click', onClose);
  };

  const onPrev = () => {
    idx = Math.max(0, idx - 1);
    render();
  };

  const onNext = () => {
    if (idx >= steps.length - 1) {
      cleanup();
      return;
    }
    idx = Math.min(steps.length - 1, idx + 1);
    render();
  };

  const onClose = () => {
    cleanup();
  };

  overlay.classList.remove('hidden');
  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);
  closeBtn.addEventListener('click', onClose);

  try { localStorage.setItem('tutorial_completed', 'true'); } catch (e) { /* ignore */ }
  render();
}

// Reset-Funktion: Löscht alle Daten und führt zurück zum Setup
function resetSystem() {
  // Bestätigung anfordern
  redosConfirm('Möchtest du wirklich alle Daten zurücksetzen?\n\nDies wird:\n- Alle Cookies löschen\n- Alle gespeicherten Dateien löschen\n- Zum Setup zurückführen', 'System zurücksetzen').then((ok) => {
    if (!ok) return;

    // Alle Cookies löschen
    deleteCookie('setup_completed');
    deleteCookie('user_password_hash');

    // Setup-Status in localStorage ebenfalls löschen
    try {
      localStorage.removeItem('setup_complete');
    } catch (e) {
      // ignore
    }

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
  });
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

function createDesktopFile(name, content, x, y, isFolder = false, linkedFileId = null, linkedFolderId = null) {
  const id = `desktop-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const file = {
    id,
    name,
    content,
    isFolder,
    linkedFileId,
    linkedFolderId,
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
    icon.textContent = file.isFolder ? '📁' : '📄';
    
    const label = document.createElement('div');
    label.className = 'desktop-file-label';
    label.textContent = file.name;
    
    fileEl.append(icon, label);
    
    // Doppelklick zum Öffnen
    fileEl.addEventListener('dblclick', () => {
      if (file.isFolder && file.linkedFolderId) {
        const filesApp = apps.find(a => a.id === 'files');
        if (filesApp) {
          openApp(filesApp);
          setTimeout(() => {
            if (window.redosFiles && typeof window.redosFiles.navigateToFolderId === 'function') {
              window.redosFiles.navigateToFolderId(file.linkedFolderId);
            }
          }, 150);
        }
        return;
      }
      openFileWithApp(file);
    });

    // Rechtsklick Fallback (manche Browser/Trackpads)
    fileEl.addEventListener('mousedown', (e) => {
      const isContextClick = e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey));
      if (!isContextClick) return;
      e.preventDefault();
      e.stopPropagation();
      showFileContextMenu(e, file);
    }, true);
    
    // Drag & Drop
    applyDesktopFileDraggable(fileEl, file);
    
    // Rechtsklick-Menü
    fileEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
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
  let lastSaveTime = 0;
  const SAVE_DEBOUNCE = 100; // Save at most every 100ms during drag
  
  // Select file on click
  fileEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    
    // Toggle selection with Ctrl/Cmd key
    const isCtrlPressed = e.ctrlKey || e.metaKey;
    
    if (!isCtrlPressed) {
      // Deselect all other files if Ctrl is not pressed
      document.querySelectorAll('.desktop-file').forEach(el => {
        if (el !== fileEl) el.classList.remove('selected');
      });
    }
    
    // Toggle selection for the clicked file
    fileEl.classList.toggle('selected', true);
    
    // Start dragging
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = file.x || 0;
    startTop = file.y || 0;
    
    fileEl.style.cursor = 'grabbing';
    fileEl.style.zIndex = '10'; // Bring to front while dragging
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
    e.preventDefault();
    e.stopPropagation();
  });
  
  // Handle desktop click to clear selection
  windowArea.addEventListener('mousedown', (e) => {
    if (e.target === windowArea) {
      document.querySelectorAll('.desktop-file').forEach(el => {
        el.classList.remove('selected');
      });
    }
  });
  
  const onMouseMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const areaRect = windowArea.getBoundingClientRect();
    const newX = Math.max(0, Math.min(startLeft + dx, areaRect.width - 80));
    const newY = Math.max(0, Math.min(startTop + dy, areaRect.height - 100));
    
    // Update position immediately
    fileEl.style.left = `${newX}px`;
    fileEl.style.top = `${newY}px`;
    
    // Update the file object
    file.x = newX;
    file.y = newY;
    
    // Save position with debounce
    const now = Date.now();
    if (now - lastSaveTime > SAVE_DEBOUNCE) {
      saveFilePosition(file.id, newX, newY);
      lastSaveTime = now;
    }
  };
  
  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    
    // Final save to ensure position is saved
    saveFilePosition(file.id, file.x, file.y);
    
    fileEl.style.cursor = 'pointer';
    fileEl.style.zIndex = '';

    // Drop desktop file onto desktop folder => move into linked folder
    try {
      const areaRect = windowArea.getBoundingClientRect();
      const vx = areaRect.left + (file.x || 0) + 10;
      const vy = areaRect.top + (file.y || 0) + 10;
      const dropTarget = document.elementFromPoint(vx, vy);
      const folderEl = dropTarget?.closest?.('.desktop-file');
      if (folderEl && folderEl !== fileEl) {
        const folderId = folderEl.dataset.fileId;
        const desktopFiles = loadDesktopFiles();
        const folder = desktopFiles.find(f => f.id === folderId);
        if (folder?.isFolder) {
          const filesAll = loadFiles();

          let targetFolderId = folder.linkedFolderId;
          if (!targetFolderId) {
            const created = createNewFile(folder.name, '', true, 'root');
            targetFolderId = created?.id;
            const idx = desktopFiles.findIndex(f => f.id === folder.id);
            if (idx >= 0) {
              desktopFiles[idx].linkedFolderId = targetFolderId;
              saveDesktopFiles(desktopFiles);
            }
          }

          if (targetFolderId) {
            if (file.isFolder) {
              if (file.linkedFolderId) {
                const movingFolder = filesAll.find(f => f.id === file.linkedFolderId);
                if (movingFolder) {
                  movingFolder.parentId = targetFolderId;
                  movingFolder.updatedAt = new Date().toISOString();
                }
              } else {
                createNewFile(file.name, '', true, targetFolderId);
              }
            } else {
              if (file.linkedFileId) {
                const movingFile = filesAll.find(f => f.id === file.linkedFileId);
                if (movingFile) {
                  movingFile.parentId = targetFolderId;
                  movingFile.updatedAt = new Date().toISOString();
                }
              } else {
                createNewFile(file.name, file.content || '', false, targetFolderId);
              }
            }

            saveFiles(filesAll);
            deleteDesktopFile(file.id);
            showNotification('Verschoben');
          }
        }
      }
    } catch (e) {
      // ignore
    }
    
    document.removeEventListener('mousemove', onMouseMove);
  };
  
  // Helper function to save file position
  function saveFilePosition(fileId, x, y) {
    const files = loadDesktopFiles();
    const fileIndex = files.findIndex(f => f.id === fileId);
    if (fileIndex >= 0) {
      files[fileIndex].x = x;
      files[fileIndex].y = y;
      saveDesktopFiles(files);
    }
  }
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
  if (shouldSkipContextMenu(e, 'file', file?.id || file?.name)) return;
  // Remove any existing context menus
  document.querySelectorAll('.context-menu').forEach(menu => menu.remove());

  const isDesktopEntry = !!file?.id && String(file.id).startsWith('desktop-file-');
  
  // Create the context menu
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.addEventListener('mousedown', (ev) => {
    ev.stopPropagation();
  });
  menu.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    z-index: 10000;
  `;
  
  // Open option
  const openItem = document.createElement('div');
  openItem.className = 'context-menu-item';
  openItem.innerHTML = '<i>📂</i> <span>Öffnen</span>';
  openItem.onclick = () => {
    if (file.isFolder) {
      const filesApp = apps.find(a => a.id === 'files');
      if (filesApp) {
        openApp(filesApp);
        setTimeout(() => {
          if (window.redosFiles && typeof window.redosFiles.navigateToFolderId === 'function') {
            const folderId = isDesktopEntry ? (file.linkedFolderId || null) : file.id;
            if (folderId) window.redosFiles.navigateToFolderId(folderId);
          }
        }, 150);
      }
    } else {
      openFileWithApp(file);
    }
    menu.remove();
  };

  const openWithEditorItem = document.createElement('div');
  openWithEditorItem.className = 'context-menu-item';
  openWithEditorItem.innerHTML = '<i>📝</i> <span>Mit Editor öffnen</span>';
  openWithEditorItem.onclick = () => {
    if (!file.isFolder) openFileWithApp(file, 'editor');
    menu.remove();
  };

  const openWithCoderItem = document.createElement('div');
  openWithCoderItem.className = 'context-menu-item';
  openWithCoderItem.innerHTML = '<i>💻</i> <span>Mit Coder öffnen</span>';
  openWithCoderItem.onclick = () => {
    if (file.isFolder) {
      openFolderAsCoderProject(file, isDesktopEntry);
    } else {
      openFileWithApp(file, 'coder');
    }
    menu.remove();
  };

  const openWithFilesItem = document.createElement('div');
  openWithFilesItem.className = 'context-menu-item';
  openWithFilesItem.innerHTML = '<i>📁</i> <span>Mit Dateien-Explorer öffnen</span>';
  openWithFilesItem.onclick = () => {
    if (file.isFolder) {
      const filesApp = apps.find(a => a.id === 'files');
      if (filesApp) {
        openApp(filesApp);
        setTimeout(() => {
          if (window.redosFiles && typeof window.redosFiles.navigateToFolderId === 'function') {
            const folderId = isDesktopEntry ? (file.linkedFolderId || null) : file.id;
            if (folderId) window.redosFiles.navigateToFolderId(folderId);
          }
        }, 150);
      }
    } else {
      openFileWithApp(file, 'files');
    }
    menu.remove();
  };
  
  // Cut option
  const cutItem = document.createElement('div');
  cutItem.className = 'context-menu-item';
  cutItem.innerHTML = '<i>✂️</i> <span>Ausschneiden</span>';
  cutItem.onclick = () => {
    state.clipboard = {
      action: 'cut',
      source: isDesktopEntry ? 'desktop' : 'files',
      id: file.id
    };
    showNotification(`"${file.name}" ausgeschnitten`);
    menu.remove();
  };

  const renameItem = document.createElement('div');
  renameItem.className = 'context-menu-item';
  renameItem.innerHTML = '<i>✏️</i> <span>Umbenennen</span>';
  renameItem.onclick = async () => {
    const oldName = file?.name || '';
    const next = await redosPrompt('Neuer Name', {
      title: 'Umbenennen',
      placeholder: oldName || 'Neuer Name',
      value: oldName
    });
    const newName = (next || '').trim();
    if (!newName || newName === oldName) {
      menu.remove();
      return;
    }

    if (isDesktopEntry) {
      const desktopFiles = loadDesktopFiles();
      const desktopItem = desktopFiles.find(f => f.id === file.id);
      if (desktopItem) {
        desktopItem.name = newName;
        saveDesktopFiles(desktopFiles);
        renderDesktopFiles();
      }

      const linkedId = file.linkedFileId || file.linkedFolderId;
      if (linkedId) {
        const filesAll = loadFiles();
        const linked = filesAll.find(f => f.id === linkedId);
        if (linked) {
          linked.name = newName;
          linked.updatedAt = new Date().toISOString();
          saveFiles(filesAll);
          if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
        }
      }

      showNotification(`"${oldName}" umbenannt`);
      menu.remove();
      return;
    }

    const files = loadFiles();
    const target = files.find(f => f.id === file.id) || files.find(f => f.name === file.name);
    if (!target) {
      menu.remove();
      return;
    }
    target.name = newName;
    target.updatedAt = new Date().toISOString();
    saveFiles(files);
    if (window.redosFiles && typeof window.redosFiles.refresh === 'function') {
      window.redosFiles.refresh();
    } else {
      const fileGrid = document.querySelector('.file-grid');
      if (fileGrid) {
        const fileItem = Array.from(fileGrid.querySelectorAll('.file-item')).find(
          item => item.dataset.fileId === (target.id || '')
        );
        const nameEl = fileItem ? fileItem.querySelector('.file-name') : null;
        if (nameEl) nameEl.textContent = newName;
      }
    }
    showNotification(`"${oldName}" umbenannt`);
    menu.remove();
  };

  // Add to desktop option (only for file-manager entries)
  const addToDesktopItem = document.createElement('div');
  addToDesktopItem.className = 'context-menu-item';
  addToDesktopItem.innerHTML = '<i>⬇️</i> <span>Zu Desktop verschieben</span>';
  addToDesktopItem.onclick = () => {
    if (file.isFolder) {
      createDesktopFile(file.name, '', undefined, undefined, true, null, file.id);
    } else {
      createDesktopFile(file.name, file.content, undefined, undefined, false, file.id, null);
    }
    showNotification(`"${file.name}" wurde auf dem Desktop abgelegt`);
    menu.remove();
  };

  // Paste option
  const pasteItem = document.createElement('div');
  pasteItem.className = 'context-menu-item';
  pasteItem.innerHTML = '<i>📋</i> <span>Einfügen</span>';
  pasteItem.onclick = () => {
    if (!state.clipboard || state.clipboard.action !== 'cut') {
      menu.remove();
      return;
    }

    // Desktop paste just drops back onto desktop at cursor
    if (isDesktopEntry && state.clipboard.source === 'desktop') {
      const files = loadDesktopFiles();
      const item = files.find(f => f.id === state.clipboard.id);
      if (item) {
        item.x = e.clientX;
        item.y = e.clientY;
        saveDesktopFiles(files);
        renderDesktopFiles();
        state.clipboard = null;
        showNotification('Eingefügt');
      }
      menu.remove();
      return;
    }

    // Files paste: if right-clicked on a folder -> paste into it, else paste into current folder
    if (state.clipboard.source === 'files') {
      const files = loadFiles();
      const moving = files.find(f => f.id === state.clipboard.id);
      if (!moving) {
        state.clipboard = null;
        menu.remove();
        return;
      }
      const targetFolderId = file.isFolder ? file.id : currentFolderId;
      moving.parentId = targetFolderId;
      moving.updatedAt = new Date().toISOString();
      saveFiles(files);
      state.clipboard = null;
      if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
      showNotification('Eingefügt');
      menu.remove();
      return;
    }

    if (!isDesktopEntry && state.clipboard.source === 'desktop') {
      const desktopFiles = loadDesktopFiles();
      const item = desktopFiles.find(f => f.id === state.clipboard.id);
      if (!item) {
        state.clipboard = null;
        menu.remove();
        return;
      }

      const targetFolderId = file.isFolder ? file.id : currentFolderId;
      const filesAll = loadFiles();

      if (item.isFolder) {
        if (item.linkedFolderId) {
          const movingFolder = filesAll.find(f => f.id === item.linkedFolderId);
          if (movingFolder) {
            movingFolder.parentId = targetFolderId;
            movingFolder.updatedAt = new Date().toISOString();
          }
        } else {
          createNewFile(item.name, '', true, targetFolderId);
        }
      } else {
        if (item.linkedFileId) {
          const movingFile = filesAll.find(f => f.id === item.linkedFileId);
          if (movingFile) {
            movingFile.parentId = targetFolderId;
            movingFile.updatedAt = new Date().toISOString();
          }
        } else {
          createNewFile(item.name, item.content || '', false, targetFolderId);
        }
      }

      saveFiles(filesAll);
      deleteDesktopFile(item.id);
      state.clipboard = null;
      if (window.redosFiles && typeof window.redosFiles.refresh === 'function') window.redosFiles.refresh();
      showNotification('Eingefügt');
      menu.remove();
      return;
    }

    menu.remove();
  };
  
  // Divider
  const divider = document.createElement('div');
  divider.className = 'context-menu-divider';

  // Delete option
  const deleteItem = document.createElement('div');
  deleteItem.className = 'context-menu-item danger';
  deleteItem.innerHTML = isDesktopEntry
    ? '<i>🗑️</i> <span>Vom Desktop entfernen</span>'
    : '<i>🗑️</i> <span>Löschen</span>';
  deleteItem.onclick = () => {
    if (isDesktopEntry) {
      deleteDesktopFile(file.id);
      showNotification(`"${file.name}" wurde vom Desktop entfernt`);
      menu.remove();
      return;
    }

    // Regular file/folder in file manager
    const files = loadFiles();

      const idsToDelete = new Set();
      const byParent = new Map();
      files.forEach(f => {
        const pid = f.parentId || 'root';
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid).push(f);
      });

      const collect = (id) => {
        idsToDelete.add(id);
        const children = byParent.get(id) || [];
        children.forEach(ch => collect(ch.id));
      };

      const target = files.find(f => f.id === file.id) || files.find(f => f.name === file.name);
      if (target?.id) {
        if (target.isFolder) {
          collect(target.id);
        } else {
          idsToDelete.add(target.id);
        }
      }

      const updatedFiles = files.filter(f => !idsToDelete.has(f.id));
      saveFiles(updatedFiles);

    // Update the UI
    const fileGrid = document.querySelector('.file-grid');
    if (fileGrid) {
      const fileItem = Array.from(fileGrid.querySelectorAll('.file-item')).find(
        item => item.dataset.fileId === (target?.id || '')
      );
      if (fileItem) {
        fileItem.remove();
      }
    }

    showNotification(`"${file.name}" wurde gelöscht`);
    menu.remove();
  };
  
  // Add all items to the menu
  if (isDesktopEntry) {
    menu.append(openItem);
    menu.append(openWithFilesItem, openWithCoderItem);
    if (!file.isFolder) menu.append(openWithEditorItem);
    menu.append(cutItem, renameItem);
    if (state.clipboard?.action === 'cut') {
      menu.append(pasteItem);
    }
    menu.append(divider, deleteItem);
  } else {
    menu.append(openItem);
    menu.append(openWithFilesItem, openWithCoderItem);
    if (!file.isFolder) menu.append(openWithEditorItem);
    menu.append(addToDesktopItem, cutItem, renameItem);
    if (state.clipboard?.action === 'cut') {
      menu.append(pasteItem);
    }
    menu.append(divider, deleteItem);
  }
  document.body.append(menu);
  
  // Close menu when clicking outside
  setTimeout(() => {
    const closeMenu = (e) => {
      // Ignore context clicks (right click or ctrl/cmd click)
      const isContextClick = (typeof e.button === 'number' && e.button === 2) ||
        (typeof e.button === 'number' && e.button === 0 && (e.ctrlKey || e.metaKey));
      if (isContextClick) return;
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu, true);
      }
    };
    document.addEventListener('mousedown', closeMenu, true);
  }, 10);
}

// Helper function to show notifications
function showNotification(message, duration = 2000) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 6px;
    z-index: 1000;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  document.body.append(notification);
  
  // Trigger reflow to enable transition
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // Remove notification after duration
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Drag & Drop für Dateien aus der Dateien-App
function setupDesktopDropZone() {
  if (!windowArea) return;

  const resolveDesktopFileFromEvent = (e) => {
    const el = e.target && e.target.closest ? e.target.closest('.desktop-file') : null;
    if (!el) return null;
    const id = el.dataset.fileId;
    const files = state.desktopFiles && Array.isArray(state.desktopFiles) ? state.desktopFiles : loadDesktopFiles();
    return files.find(f => f.id === id) || null;
  };

  windowArea.addEventListener('contextmenu', (e) => {
    const file = resolveDesktopFileFromEvent(e);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    showFileContextMenu(e, file);
  }, true);

  windowArea.addEventListener('mousedown', (e) => {
    const isContextClick = e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey));
    if (!isContextClick) return;
    const file = resolveDesktopFileFromEvent(e);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    showFileContextMenu(e, file);
  }, true);

  // Global background context menu on desktop
  windowArea.addEventListener('contextmenu', (e) => {
    if (e.target !== windowArea) return;
    e.preventDefault();
    e.stopPropagation();
    showBackgroundContextMenu(e, 'desktop');
  });
  
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

    if (e.target !== windowArea) return;

    const appData = e.dataTransfer.getData('application/x-redos-file');
    if (appData) {
      try {
        const parsed = JSON.parse(appData);
        if (parsed?.source === 'files' && parsed?.id) {
          const files = loadFiles();
          const entry = files.find(f => f.id === parsed.id);
          if (entry) {
            const rect = windowArea.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (entry.isFolder) {
              createDesktopFile(entry.name, '', x, y, true, null, entry.id);
            } else {
              createDesktopFile(entry.name, entry.content || '', x, y, false, entry.id, null);
            }
          }
        }
      } catch (err) {
        // ignore
      }
      return;
    }
    
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
      if (filesApp) {
        openApp(filesApp);
        setTimeout(() => {
          if (window.redosFiles && typeof window.redosFiles.openDialog === 'function') {
            window.redosFiles.openDialog({ mode: 'file', title: 'Neue Datei' });
          }
        }, 150);
      }
    }},
    { label: 'Neuer Ordner', icon: '📁', action: () => {
      const filesApp = apps.find(a => a.id === 'files');
      if (filesApp) {
        openApp(filesApp);
        setTimeout(() => {
          if (window.redosFiles && typeof window.redosFiles.openDialog === 'function') {
            window.redosFiles.openDialog({ mode: 'folder', title: 'Neuer Ordner' });
          }
        }, 150);
      }
    }},
    '---',
    { label: 'Dateien öffnen', icon: '📂', action: () => {
      const filesApp = apps.find(a => a.id === 'files');
      if (filesApp) openApp(filesApp);
    }},
    '---',
    { label: 'Einstellungen', icon: '⚙️', action: () => {
      const settingsApp = apps.find(a => a.id === 'settings');
      if (settingsApp) openApp(settingsApp);
    }},
    '---',
    { label: 'Beenden', icon: '🚪', action: () => {
      redosConfirm('Möchtest du redOS wirklich beenden?', 'Beenden').then((ok) => {
        if (ok) window.close();
      });
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
      showNotification('Hilfe: Doppelklick auf Apps, Drag & Drop für Fenster, Rechtsklick für Menü', 5000);
    }},
    '---',
    { label: 'Über redOS', icon: 'ℹ️', action: () => {
      showNotification('redOS v1.2 - Ein modernes Browser-OS', 3000);
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
  if (!windowArea) return;
  
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
  if (!template || !windowArea) return;
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
  } else if (app.id === 'settings') {
    frame.remove();
    renderSettingsApp(body);
  } else if (app.id === 'editor') {
    frame.remove();
    const initial = state.openTarget?.appId === 'editor' ? state.openTarget.file : null;
    state.openTarget = null;
    renderEditorApp(body, initial);
  } else if (app.id === 'coder') {
    frame.remove();
    const initial = state.openTarget?.appId === 'coder' ? state.openTarget : null;
    state.openTarget = null;
    renderCoderApp(body, initial);
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

function closeAll() {
  Object.keys(state.windows).forEach(appId => closeWindow(appId));
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
  if (!windowArea) return;
  
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
  if (!win || !windowArea) return;
  state.z += 1;
  win.style.zIndex = state.z;
  win.classList.add('focused');
  Array.from(windowArea.children).forEach((w) => {
    if (w !== win) w.classList.remove('focused');
  });
  renderDock();
}

function randomizePosition(win) {
  if (!windowArea) return;
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
  if (!head) return;
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
    if (!windowArea) return;
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
    if (!windowArea) return;
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
    if (!windowArea) return;
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
    const parsed = raw ? JSON.parse(raw) : [];
    const files = Array.isArray(parsed) ? parsed : [];
    let changed = false;
    const normalized = files.map((f) => {
      if (!f || typeof f !== 'object') {
        changed = true;
        return null;
      }

      const isFolder = !!f.isFolder;
      const id = typeof f.id === 'string' && f.id.length
        ? f.id
        : `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      if (!f.id) changed = true;
      if (typeof f.parentId !== 'string') changed = true;
      if (typeof f.createdAt !== 'string') changed = true;
      if (typeof f.updatedAt !== 'string') changed = true;
      if (typeof f.isFolder !== 'boolean') changed = true;

      return {
        id,
        name: typeof f.name === 'string' ? f.name : 'Unbenannt',
        content: typeof f.content === 'string' ? f.content : '',
        isFolder,
        parentId: typeof f.parentId === 'string' ? f.parentId : 'root',
        createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date().toISOString(),
        updatedAt: typeof f.updatedAt === 'string' ? f.updatedAt : new Date().toISOString()
      };
    }).filter(Boolean);

    if (changed) saveFiles(normalized);
    return normalized;
  } catch (e) {
    return [];
  }
}

function saveFiles(files) {
  localStorage.setItem(FILE_KEY, JSON.stringify(files));
}

function createNewFile(name, content = '', isFolder = false, parentId = currentFolderId, fixedId = null) {
  const files = loadFiles();
  const newFile = {
    id: fixedId || `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name,
    content: content,
    isFolder: isFolder,
    parentId: parentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  files.push(newFile);
  saveFiles(files);
  return newFile;
}

function renderFilesApp(body) {
  body.innerHTML = '';

  const ensureSystemFolder = (id, name, parentId = 'root') => {
    const files = loadFiles();
    const exists = files.some(f => f.id === id);
    if (!exists) {
      files.push({
        id,
        name,
        content: '',
        isFolder: true,
        parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saveFiles(files);
    }
  };

  ensureSystemFolder('folder-documents', 'Dokumente');
  ensureSystemFolder('folder-pictures', 'Bilder');
  ensureSystemFolder('folder-music', 'Musik');
  ensureSystemFolder('folder-videos', 'Videos');
  ensureSystemFolder('folder-downloads', 'Downloads');
  ensureSystemFolder('folder-home', 'Home');
  ensureSystemFolder('folder-computer', 'Computer');
  
  // Main container
  const app = document.createElement('div');
  app.className = 'file-app';
  
  // Sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'file-sidebar';
  
  // Favorites section
  const favoritesSection = document.createElement('div');
  favoritesSection.className = 'sidebar-section';
  favoritesSection.innerHTML = `
    <h4>Favoriten</h4>
    <div class="sidebar-item" data-folder-id="folder-documents">
      <i>📁</i> <span>Dokumente</span>
    </div>
    <div class="sidebar-item" data-folder-id="folder-pictures">
      <i>📷</i> <span>Bilder</span>
    </div>
    <div class="sidebar-item" data-folder-id="folder-music">
      <i>🎵</i> <span>Musik</span>
    </div>
    <div class="sidebar-item" data-folder-id="folder-videos">
      <i>📽️</i> <span>Videos</span>
    </div>
  `;
  
  // Locations section
  const locationsSection = document.createElement('div');
  locationsSection.className = 'sidebar-section';
  locationsSection.innerHTML = `
    <h4>Orte</h4>
    <div class="sidebar-item" data-folder-id="folder-computer">
      <i>💻</i> <span>Computer</span>
    </div>
    <div class="sidebar-item" data-folder-id="folder-home">
      <i>🏠</i> <span>Home</span>
    </div>
    <div class="sidebar-item" data-folder-id="folder-downloads">
      <i>📥</i> <span>Downloads</span>
    </div>
  `;
  
  sidebar.append(favoritesSection, locationsSection);
  
  // Main content
  const content = document.createElement('div');
  content.className = 'file-content';
  
  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'file-toolbar';
  
  // Navigation buttons
  const navGroup = document.createElement('div');
  navGroup.className = 'toolbar-group';
  navGroup.innerHTML = `
    <button class="toolbar-button" title="Zurück">◀</button>
    <button class="toolbar-button" title="Vor">▶</button>
    <button class="toolbar-button" title="Nach oben">↑</button>
  `;
  
  // Path bar
  const pathBar = document.createElement('input');
  pathBar.className = 'path-bar';
  pathBar.type = 'text';
  pathBar.value = 'redOS';
  pathBar.spellcheck = false;
  
  // Action buttons
  const actionGroup = document.createElement('div');
  actionGroup.className = 'toolbar-group';
  actionGroup.innerHTML = `
    <button class="toolbar-button" title="Ansicht">≡</button>
    <button class="toolbar-button" title="Teilen">⇧</button>
  `;
  
  toolbar.append(navGroup, pathBar, actionGroup);
  
  // File grid
  const fileGrid = document.createElement('div');
  fileGrid.className = 'file-grid';
  
  // Native dialog for create/edit
  const dialog = document.createElement('dialog');
  dialog.className = 'file-native-dialog';
  dialog.innerHTML = `
    <form method="dialog">
      <h3 id="fileDialogTitle">Neu</h3>
      <div class="form-group">
        <label for="fileName">Name</label>
        <input type="text" id="fileName" placeholder="z.B. Notizen.txt" />
      </div>
      <div class="form-group" id="fileContentGroup">
        <label for="fileContent">Inhalt</label>
        <textarea id="fileContent" placeholder="Füge hier deinen Inhalt ein..."></textarea>
      </div>
      <menu class="form-actions">
        <button value="cancel" id="fileCancelBtn">Abbrechen</button>
        <button value="save" id="fileSaveBtn">Speichern</button>
      </menu>
    </form>
  `;
  
  // Add file button in the grid
  const addFileItem = document.createElement('div');
  addFileItem.className = 'file-item';
  addFileItem.innerHTML = `
    <div class="file-icon">➕</div>
    <div class="file-name">Neue Datei</div>
  `;
  addFileItem.style.cursor = 'pointer';
  
  const addFolderItem = document.createElement('div');
  addFolderItem.className = 'file-item';
  addFolderItem.innerHTML = `
    <div class="file-icon file-icon--with-plus">
      📁
      <span class="file-icon-plus">+</span>
    </div>
    <div class="file-name">Neuer Ordner</div>
  `;
  addFolderItem.style.cursor = 'pointer';

  let dialogMode = 'file';
  let editingEntryId = null;
  const dialogTitleEl = dialog.querySelector('#fileDialogTitle');
  const nameInput = dialog.querySelector('#fileName');
  const contentGroup = dialog.querySelector('#fileContentGroup');
  const contentInput = dialog.querySelector('#fileContent');

  const openDialog = ({ mode, title, entry } = {}) => {
    dialogMode = mode || 'file';
    editingEntryId = entry?.id || null;
    if (dialogTitleEl) dialogTitleEl.textContent = title || (dialogMode === 'folder' ? 'Neuer Ordner' : 'Neue Datei');

    if (nameInput) nameInput.value = entry?.name || '';
    if (contentInput) contentInput.value = entry?.content || '';
    if (contentGroup) contentGroup.style.display = dialogMode === 'folder' ? 'none' : '';

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  };

  addFileItem.onclick = () => openDialog({ mode: 'file', title: 'Neue Datei' });
  addFolderItem.onclick = () => openDialog({ mode: 'folder', title: 'Neuer Ordner' });
  
  fileGrid.append(addFileItem, addFolderItem);
  
  // Render file list
  const getPathIds = () => {
    const files = loadFiles();
    const byId = new Map(files.map(f => [f.id, f]));
    const path = [];
    let cur = currentFolderId;
    const guard = new Set();
    while (cur && cur !== 'root' && !guard.has(cur)) {
      guard.add(cur);
      path.unshift(cur);
      const entry = byId.get(cur);
      cur = entry?.parentId;
    }
    return path;
  };

  const resolvePathToFolderId = (rawPath) => {
    const input = (rawPath || '').trim();
    if (!input) return 'root';

    // Accept: "redOS > Dokumente", "Dokumente/Projekte", "redOS/Dokumente"
    const normalized = input
      .replace(/\\/g, '/')
      .replace(/\s*>\s*/g, '/')
      .replace(/\s*\/\s*/g, '/')
      .trim();

    const parts = normalized.split('/').map(p => p.trim()).filter(Boolean);
    const segments = parts[0]?.toLowerCase() === 'redos' ? parts.slice(1) : parts;
    if (segments.length === 0) return 'root';

    const files = loadFiles();
    let parentId = 'root';

    for (const seg of segments) {
      const next = files.find(f => f.isFolder && f.parentId === parentId && (f.name || '').toLowerCase() === seg.toLowerCase());
      if (!next) return null;
      parentId = next.id;
    }

    return parentId;
  };

  const updatePathBar = () => {
    const files = loadFiles();
    const byId = new Map(files.map(f => [f.id, f]));
    const parts = ['redOS'];
    getPathIds().forEach(id => {
      const e = byId.get(id);
      if (e?.name) parts.push(e.name);
    });
    pathBar.value = parts.join(' > ');
  };

  const navigateToPath = (rawPath) => {
    const targetFolderId = resolvePathToFolderId(rawPath);
    if (!targetFolderId) {
      showNotification('Pfad existiert nicht');
      updatePathBar();
      return;
    }
    currentFolderId = targetFolderId;
    renderFileList();
  };

  const navigateToFolderId = (folderId) => {
    if (!folderId) return;
    currentFolderId = folderId;
    renderFileList();
  };

  pathBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateToPath(pathBar.value);
      pathBar.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      updatePathBar();
      pathBar.blur();
    }
  });

  pathBar.addEventListener('blur', () => {
    // If user typed something and just left the field, try to navigate
    const typed = (pathBar.value || '').trim();
    const current = (pathBar.value || '').trim();
    if (typed && typed !== current) {
      navigateToPath(typed);
    } else {
      updatePathBar();
    }
  });

  const renderFileList = () => {
    const files = loadFiles();
    const visible = files.filter(f => f.parentId === currentFolderId);
    updatePathBar();
    
    // Clear existing files (except the add file button)
    while (fileGrid.children.length > 2) {
      fileGrid.removeChild(fileGrid.lastChild);
    }
    
    if (!visible.length) {
      // No files message
      const noFiles = document.createElement('div');
      noFiles.style.gridColumn = '1 / -1';
      noFiles.style.textAlign = 'center';
      noFiles.style.padding = '40px 0';
      noFiles.style.color = '#86868b';
      noFiles.textContent = 'Keine Dateien vorhanden';
      fileGrid.append(noFiles);
      return;
    }
    
    // Add files to grid
    visible.forEach((file) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.draggable = true;
      fileItem.dataset.fileId = file.id;
      fileItem.dataset.fileName = file.name;
      fileItem.dataset.fileContent = file.content;
      
      // Simple file type detection for icons
      let icon = '📄'; // Default icon
      if (file.isFolder) {
        icon = '📁';
      } else {
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          icon = '🖼️';
        } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
          icon = '🎵';
        } else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
          icon = '🎬';
        } else if (['pdf'].includes(ext)) {
          icon = '📕';
        } else if (['doc', 'docx', 'pages'].includes(ext)) {
          icon = '📝';
        } else if (['xls', 'xlsx', 'numbers'].includes(ext)) {
          icon = '📊';
        } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
          icon = '🗜️';
        }
      }
      
      fileItem.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-name">${file.name}</div>
      `;
      
      // Drag & Drop for desktop
      fileItem.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          name: file.name,
          content: file.content
        }));
        e.dataTransfer.setData('application/x-redos-file', JSON.stringify({
          source: 'files',
          id: file.id
        }));
        fileItem.style.opacity = '0.5';
      });
      
      fileItem.addEventListener('dragend', () => {
        fileItem.style.opacity = '1';
      });
      
      // Double click to edit / open folder
      fileItem.addEventListener('dblclick', () => {
        if (file.isFolder) {
          currentFolderId = file.id;
          renderFileList();
          return;
        }
        openFileWithApp(file);
      });

      // Rechtsklick Fallback (manche Browser/Trackpads)
      fileItem.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;
        e.preventDefault();
        e.stopPropagation();
        showFileContextMenu(e, file);
      });
      
      // Context menu
      fileItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Select the file
        document.querySelectorAll('.file-item').forEach(item => {
          item.classList.remove('selected');
        });
        fileItem.classList.add('selected');
        
        // Show context menu
        const fileId = fileItem.dataset.fileId;
        const file = files.find(f => f.id === fileId) || {
          id: fileId || ('temp_' + Date.now()),
          name: fileItem.dataset.fileName,
          content: fileItem.dataset.fileContent,
          isFolder: false,
          parentId: currentFolderId
        };
        
        // Create a temporary ID for the file if it doesn't have one
        if (!file.id) {
          file.id = 'temp_' + Date.now();
        }
        
        // Show the context menu
        showFileContextMenu(e, file);
      });
      
      fileGrid.append(fileItem);

      // Drop into folder (move)
      if (file.isFolder) {
        fileItem.addEventListener('dragover', (e) => {
          e.preventDefault();
          fileItem.classList.add('drag-over');
        });
        fileItem.addEventListener('dragleave', () => {
          fileItem.classList.remove('drag-over');
        });
        fileItem.addEventListener('drop', (e) => {
          e.preventDefault();
          fileItem.classList.remove('drag-over');
          const raw = e.dataTransfer.getData('application/x-redos-file');
          if (!raw) return;
          try {
            const data = JSON.parse(raw);
            if (data?.source !== 'files' || !data?.id) return;
            if (data.id === file.id) return;
            const filesAll = loadFiles();
            const moving = filesAll.find(f => f.id === data.id);
            if (!moving) return;
            moving.parentId = file.id;
            moving.updatedAt = new Date().toISOString();
            saveFiles(filesAll);
            renderFileList();
            showNotification('Verschoben');
          } catch (err) {
            // ignore
          }
        });
      }
    });
  };

  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'save') return;
    const name = (nameInput?.value || '').trim();
    const content = contentInput?.value || '';
    if (!name) return;

    const files = loadFiles();
    const now = new Date().toISOString();

    if (editingEntryId) {
      const idx = files.findIndex(f => f.id === editingEntryId);
      if (idx >= 0) {
        const prev = files[idx];
        files[idx] = {
          ...prev,
          name,
          content: dialogMode === 'folder' ? '' : content,
          isFolder: dialogMode === 'folder' ? true : !!prev.isFolder,
          updatedAt: now
        };
        saveFiles(files);
        showNotification(`"${name}" wurde gespeichert`);
        renderFileList();
        return;
      }
    }

    if (dialogMode === 'folder') {
      createNewFile(name, '', true);
      showNotification(`Ordner "${name}" wurde erstellt`);
    } else {
      createNewFile(name, content, false);
      showNotification(`Datei "${name}" wurde erstellt`);
    }
    renderFileList();
  });
  
  // Add to desktop button in the toolbar
  const addToDesktopBtn = document.createElement('button');
  addToDesktopBtn.className = 'toolbar-button';
  addToDesktopBtn.title = 'Auf Desktop ablegen';
  addToDesktopBtn.textContent = '⬇️';
  addToDesktopBtn.style.marginLeft = '8px';
  
  addToDesktopBtn.onclick = () => {
    const selectedFile = document.querySelector('.file-item.selected');
    if (selectedFile) {
      const fileName = selectedFile.dataset.fileName;
      const fileContent = selectedFile.dataset.fileContent;
      if (fileName) {
        createDesktopFile(fileName, fileContent);
        showNotification(`"${fileName}" wurde auf dem Desktop abgelegt`);
      }
    }
  };
  
  actionGroup.prepend(addToDesktopBtn);
  
  // Assemble the app
  content.append(toolbar, fileGrid);
  app.append(sidebar, content);
  app.append(dialog);
  body.append(app);
  
  // Initial render
  renderFileList();

  window.redosFiles = {
    openDialog,
    refresh: renderFileList
    ,navigateToFolderId
  };

  // Global background context menu in file grid
  fileGrid.addEventListener('contextmenu', (e) => {
    if (e.target !== fileGrid) return;
    e.preventDefault();
    e.stopPropagation();
    showBackgroundContextMenu(e, 'files');
  });

  // Fallback for trackpads/browsers where contextmenu is blocked
  fileGrid.addEventListener('mousedown', (e) => {
    if (e.button !== 2) return;
    if (e.target !== fileGrid) return;
    e.preventDefault();
    e.stopPropagation();
    showBackgroundContextMenu(e, 'files');
  });

  // Sidebar navigation
  sidebar.querySelectorAll('.sidebar-item[data-folder-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const folderId = el.getAttribute('data-folder-id');
      if (!folderId) return;
      currentFolderId = folderId;
      renderFileList();
    });
  });

  // Up button
  const upBtn = navGroup.querySelectorAll('button')[2];
  if (upBtn) {
    upBtn.addEventListener('click', () => {
      if (currentFolderId === 'root') return;
      const files = loadFiles();
      const cur = files.find(f => f.id === currentFolderId);
      currentFolderId = cur?.parentId || 'root';
      renderFileList();
    });
  }
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

// Globale Setup-Funktionen für HTML onclick
window.setupNextStep = setupNextStep;
window.setupPrevStep = setupPrevStep;
window.setupCreatePassword = setupCreatePassword;
window.setupComplete = setupComplete;

// Sicherstellen, dass Funktionen auch nach DOMContentLoaded verfügbar sind
document.addEventListener('DOMContentLoaded', () => {
  const startupOverlay = document.getElementById('startupOverlay');
  const startupProgressBar = document.getElementById('startupProgressBar');

  const startMainFlow = () => {
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

    const setupCompletedCookie = getCookie('setup_completed');
    const setupCompletedStorage = localStorage.getItem('setup_complete');
    const setupCompleted = setupCompletedCookie === 'true' || setupCompletedStorage === 'true';
    if (setupCompleted) {
      // Setup bereits abgeschlossen - direkt initialisieren
      hideSetup();
      init();
    } else {
      // Setup noch nicht abgeschlossen - Setup anzeigen
      showSetup();
    }
  };

  // Startup screen (3-6s) before main flow
  if (startupOverlay) {
    const duration = 3000 + Math.floor(Math.random() * 3000); // 3000-6000
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      if (startupProgressBar) startupProgressBar.style.width = `${Math.round(p * 100)}%`;
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        startupOverlay.classList.add('hidden');
        startMainFlow();
      }
    };

    requestAnimationFrame(tick);
    return;
  }

  // Funktionen erneut zuweisen für Sicherheit
  window.setupNextStep = setupNextStep;
  window.setupPrevStep = setupPrevStep;
  window.setupCreatePassword = setupCreatePassword;
  window.setupComplete = setupComplete;

  startMainFlow();
});
