const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('capyAPI', {
  // Gửi lệnh từ Panel → Main → Pet Window
  send: (channel, ...args) => {
    const validChannels = [
      'panel-toggle-orange',
      'panel-toggle-wood',
      'panel-trigger-hide',
      'panel-test-hungry',
      'panel-trigger-water',
      'panel-trigger-gate',
      'panel-save-settings',
      'panel-quit-app',
      'panel-request-state',
      'panel-minimize',
      'panel-close',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  // Nhận dữ liệu từ Main → Panel
  on: (channel, callback) => {
    const validChannels = [
      'state-update',      // Pet window gửi trạng thái (mode, stats, mood...)
      'settings-synced',   // Xác nhận settings đã lưu
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  // Nhận 1 lần
  once: (channel, callback) => {
    ipcRenderer.once(channel, (event, ...args) => callback(...args));
  }
});
