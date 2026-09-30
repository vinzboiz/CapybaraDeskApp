const { app, BrowserWindow, screen, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const { x: areaX, y: areaY } = primaryDisplay.workArea;

  const windowWidth = 380;
  const windowHeight = 160;

  // Neo cửa sổ ở góc dưới bên phải, ngay sát trên thanh Taskbar
  const posX = Math.round(areaX + screenWidth - windowWidth - 20);
  const posY = Math.round(areaY + screenHeight - windowHeight);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: posX,
    y: posY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.loadFile('index.html');

  // Lắng nghe yêu cầu di chuyển cửa sổ (khi kéo thả Capy)
  ipcMain.on('window-drag', (event, { deltaX, deltaY }) => {
    if (!mainWindow) return;
    const [currentX, currentY] = mainWindow.getPosition();
    mainWindow.setPosition(currentX + deltaX, currentY + deltaY);
  });

  // Menu chuột phải để thoát hoặc thao tác
  ipcMain.on('show-context-menu', () => {
    const template = [
      {
        label: '🌿 Capy Desktop v1.0',
        enabled: false
      },
      { type: 'separator' },
      {
        label: '🏠 Đưa về góc màn hình',
        click: () => {
          mainWindow.setPosition(posX, posY);
        }
      },
      {
        label: '🚪 Thoát Capy',
        click: () => {
          app.quit();
        }
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(mainWindow);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
