const { app, BrowserWindow, screen, ipcMain, Menu, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

// Tự động tách nền và trích xuất assets/bottle.png từ ảnh raw_bottle.png
function ensureBottleAsset() {
  try {
    const outPath = path.join(__dirname, 'assets', 'bottle.png');
    if (fs.existsSync(outPath)) return;
    const inPath = path.join(__dirname, 'assets', 'raw_bottle.png');
    if (!fs.existsSync(inPath)) return;

    const img = nativeImage.createFromPath(inPath);
    const { width: w, height: h } = img.getSize();
    if (!w || !h) return;
    const b = img.toBitmap();

    const bgB = b[0], bgG = b[1], bgR = b[2];
    function isBg(idx) {
      const pb = b[idx], pg = b[idx + 1], pr = b[idx + 2];
      const dist = Math.hypot(pr - bgR, pg - bgG, pb - bgB);
      return dist < 32;
    }

    const visited = new Uint8Array(w * h);
    const queueX = [];
    const queueY = [];

    for (let x = 0; x < w; x++) {
      if (isBg(x * 4)) { visited[x] = 1; queueX.push(x); queueY.push(0); }
      const btm = (h - 1) * w + x;
      if (isBg(btm * 4)) { visited[btm] = 1; queueX.push(x); queueY.push(h - 1); }
    }
    for (let y = 0; y < h; y++) {
      const lft = y * w;
      if (isBg(lft * 4)) { visited[lft] = 1; queueX.push(0); queueY.push(y); }
      const rgt = y * w + (w - 1);
      if (isBg(rgt * 4)) { visited[rgt] = 1; queueX.push(w - 1); queueY.push(y); }
    }

    let head = 0;
    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!visited[nidx] && isBg(nidx * 4)) {
            visited[nidx] = 1;
            queueX.push(nx);
            queueY.push(ny);
          }
        }
      }
    }

    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x > w * 0.78 && y > h * 0.78) continue;
        const idx = y * w + x;
        if (!visited[idx]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) return;

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const outBuf = Buffer.alloc(cw * ch * 4);

    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const sx = minX + cx;
        const sy = minY + cy;
        const sidx = sy * w + sx;
        const didx = (cy * cw + cx) * 4;

        if (!visited[sidx] && !(sx > w * 0.78 && sy > h * 0.78)) {
          outBuf[didx] = b[sidx * 4];
          outBuf[didx + 1] = b[sidx * 4 + 1];
          outBuf[didx + 2] = b[sidx * 4 + 2];
          outBuf[didx + 3] = 255;
        } else {
          outBuf[didx + 3] = 0;
        }
      }
    }

    const cropped = nativeImage.createFromBitmap(outBuf, { width: cw, height: ch });
    fs.writeFileSync(outPath, cropped.toPNG());
    console.log('Đã tạo thành công assets/bottle.png:', cw, 'x', ch);
  } catch (err) {
    console.error('Lỗi trích xuất chai nước:', err);
  }
}

// Cập nhật ảnh capy_work.png mới từ raw_work_new.png
function processNewWorkAsset() {
  try {
    const inPath = path.join(__dirname, 'assets', 'raw_work_new.png');
    if (!fs.existsSync(inPath)) return;
    const outPath = path.join(__dirname, 'assets', 'capy_work.png');

    const img = nativeImage.createFromPath(inPath);
    const { width: w, height: h } = img.getSize();
    console.log('raw_work_new dimensions:', w, h);
    const b = img.toBitmap();

    function isBg(idx) {
      const alpha = b[idx + 3];
      if (alpha < 20) return true;
      const pb = b[idx], pg = b[idx + 1], pr = b[idx + 2];
      return pr > 240 && pg > 240 && pb > 240;
    }

    const visited = new Uint8Array(w * h);
    const queueX = [];
    const queueY = [];

    for (let x = 0; x < w; x++) {
      if (isBg(x * 4)) { visited[x] = 1; queueX.push(x); queueY.push(0); }
      const btm = (h - 1) * w + x;
      if (isBg(btm * 4)) { visited[btm] = 1; queueX.push(x); queueY.push(h - 1); }
    }
    for (let y = 0; y < h; y++) {
      const lft = y * w;
      if (isBg(lft * 4)) { visited[lft] = 1; queueX.push(0); queueY.push(y); }
      const rgt = y * w + (w - 1);
      if (isBg(rgt * 4)) { visited[rgt] = 1; queueX.push(w - 1); queueY.push(y); }
    }

    let head = 0;
    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!visited[nidx] && isBg(nidx * 4)) {
            visited[nidx] = 1;
            queueX.push(nx);
            queueY.push(ny);
          }
        }
      }
    }

    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!visited[idx] && b[idx * 4 + 3] > 20) {
          const pb = b[idx * 4], pg = b[idx * 4 + 1], pr = b[idx * 4 + 2];
          if (!(pr > 245 && pg > 245 && pb > 245)) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    console.log(`Work bbox: ${minX}..${maxX}, ${minY}..${maxY}`);
    if (maxX <= minX || maxY <= minY) return;

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const outBuf = Buffer.alloc(cw * ch * 4);

    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const sx = minX + cx;
        const sy = minY + cy;
        const sidx = sy * w + sx;
        const didx = (cy * cw + cx) * 4;

        if (!visited[sidx]) {
          const pb = b[sidx * 4], pg = b[sidx * 4 + 1], pr = b[sidx * 4 + 2], pa = b[sidx * 4 + 3];
          if (pr > 245 && pg > 245 && pb > 245) {
            outBuf[didx + 3] = 0;
          } else {
            outBuf[didx] = pb;
            outBuf[didx + 1] = pg;
            outBuf[didx + 2] = pr;
            outBuf[didx + 3] = pa;
          }
        } else {
          outBuf[didx + 3] = 0;
        }
      }
    }

    const cropped = nativeImage.createFromBitmap(outBuf, { width: cw, height: ch });
    fs.writeFileSync(outPath, cropped.toPNG());
    console.log('Đã cập nhật assets/capy_work.png thành công:', cw, 'x', ch);
    fs.unlinkSync(inPath);
  } catch (err) {
    console.error('Lỗi cập nhật capy_work:', err);
  }
}

// Tối ưu hóa GPU & Ngăn chạy nhiều bản Capybara trùng lặp
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const { x: areaX, y: areaY } = primaryDisplay.workArea;

  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: areaX,
    y: areaY,
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

  // Mặc định cho phép click xuyên qua các vùng trong suốt của cửa sổ
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Lắng nghe bật/tắt click-through từ renderer
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setIgnoreMouseEvents(ignore, options || {});
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
        label: '🏠 Đưa về vị trí mặc định',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('reset-capy-position');
          }
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
  ensureBottleAsset();
  processNewWorkAsset();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
