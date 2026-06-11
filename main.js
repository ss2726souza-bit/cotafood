const { app, BrowserWindow } = require('electron');
const path = require('path');

const PORT = 3001;

// Inicia o servidor Express em segundo plano
require('./server.js');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    title: 'CotaFood',
    autoHideMenuBar: true,
    backgroundColor: '#FFF7ED',
    icon: path.join(__dirname, 'icone.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  setTimeout(() => {
    win.loadURL(`http://localhost:${PORT}`);
  }, 1500);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});