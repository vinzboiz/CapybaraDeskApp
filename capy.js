// Capybara 2D Desktop Pet Engine - Fullscreen Edition with Work & Bath Dashboard
// Tính năng: Dashboard Đi dạo / Đi tắm / Làm việc, Đẩy bàn & xô tắm từ phải sang trái bằng đầu, Rơi tự do > 30% ngã chóng mặt, Click-through 100%
const { ipcRenderer } = require('electron');
if (typeof Messages === 'undefined') {
  var Messages = (typeof require !== 'undefined') ? require('./messages.js') : (window.Messages || {});
}

const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');

// 1. CẤU HÌNH KÍCH THƯỚC MÀN HÌNH VÀ SÀN TASKBAR
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  groundY = canvas.height - 3;
}
var groundY = window.innerHeight - 3;
resizeCanvas();
// Cấu hình FPS
const TARGET_FPS = 45;
const FRAME_DURATION = 1000 / TARGET_FPS;

window.addEventListener('resize', () => {
  resizeCanvas();
  if (tub.visible) tub.y = groundY - tub.height;
  if (desk.visible) desk.y = groundY - desk.height;
  if (capy.state !== CapyState.FALLING && capy.state !== CapyState.DRAGGED) {
    capy.y = groundY;
  }
});

// 2. TẢI TÀI NGUYÊN HÌNH ẢNH PIXEL ART (8 ẢNH)
const spriteSheet = new Image();
spriteSheet.src = 'assets/cap/capy_spritesheet.png?v=' + Date.now();

const orangeImg = new Image();
orangeImg.src = 'assets/fruits/orange.png?v=' + Date.now();

const sleepImg = new Image();
sleepImg.src = 'assets/cap/capy_sleep.png?v=' + Date.now();

var tubImg = new Image();
tubImg.src = 'assets/items/tub.png?v=' + Date.now();

var tubBathImg = new Image();
tubBathImg.src = 'assets/cap/tub_bath.png?v=' + Date.now();

var parachuteImg = new Image();
parachuteImg.src = 'assets/items/parachute.png?v=' + Date.now();

var deskImg = new Image();
deskImg.src = 'assets/items/capy_desk.png?v=' + Date.now();

var workImg = new Image();
workImg.src = 'assets/cap/capy_work.png?v=' + Date.now();

var bottleImg = new Image();
bottleImg.src = 'assets/items/bottle.png?v=' + Date.now();

var bindleImg = new Image();
bindleImg.src = 'assets/items/bindle.png?v=' + Date.now();

// Kích thước chuẩn
const FRAME_W = 420;
const FRAME_H = 380;
const RENDER_W = 56;
const RENDER_H = 50;
const SLEEP_W = 60;
const SLEEP_H = 47;
const PARACHUTE_W = 64;
const PARACHUTE_H = 64;
const FALLEN_W = 56;
const FALLEN_H = 46;

// Kích thước Bàn làm việc & Ghế xoay
var DESK_W = 76;
var DESK_H = 76;
var WORK_H = 82; // Chiều cao ảnh khi có Capy ngồi

// Bồn tắm Onsen
var tub = {
  width: 66,
  height: 69,
  x: -999,
  y: groundY - 69,
  visible: false,
  targetX: 0
};

// Bàn làm việc
var desk = {
  width: DESK_W,
  height: DESK_H,
  x: -999,
  y: groundY - DESK_H,
  visible: false,
  targetX: 0
};

// 3. MÁY TRẠNG THÁI CAPYBARA
var CapyState = {
  WALK_RIGHT: 'WALK_RIGHT',
  IDLE_RIGHT: 'IDLE_RIGHT',
  WALK_LEFT: 'WALK_LEFT',
  IDLE_LEFT: 'IDLE_LEFT',
  DRAGGED: 'DRAGGED',
  FALLING: 'FALLING',
  LOST_ORANGE: 'LOST_ORANGE',
  SLEEPING: 'SLEEPING',
  BATHING: 'BATHING',
  PUSHING_TUB: 'PUSHING_TUB',       // Dùng đầu đẩy bồn tắm từ phải sang trái vào góc
  PUSHING_DESK: 'PUSHING_DESK',     // Dùng đầu đẩy bàn làm việc từ phải sang trái vào góc
  WORKING: 'WORKING',               // Ngồi làm việc trước laptop
  RETRACTING_DESK: 'RETRACTING_DESK', // Dùng đầu đẩy bàn cất đi sang phải ra ngoài màn hình
  RETRACTING_TUB: 'RETRACTING_TUB',    // Dùng đầu đẩy xô cất đi sang phải ra ngoài màn hình
  FETCHING_DESK: 'FETCHING_DESK',     // Đi nhanh sang phải để đón và đẩy bàn ra
  FETCHING_TUB: 'FETCHING_TUB',       // Đi nhanh sang phải để đón và đẩy xô ra
  APPROACHING_DESK: 'APPROACHING_DESK', // Đi dần về hướng bàn để cất đi
  APPROACHING_TUB: 'APPROACHING_TUB',   // Đi dần về hướng xô để cất đi
  HIDING_RUN: 'HIDING_RUN',             // Chạy nhanh sang góc phải để trốn
  HIDDEN: 'HIDDEN',                     // Đang trốn ở góc phải, hở 10% phần đít
  JUMPING: 'JUMPING',                   // Nhảy vòng cung qua chướng ngại vật (khúc gỗ)
  WOOD_LOG_INTERACT: 'WOOD_LOG_INTERACT', // Tương tác với khúc gỗ (dừng 2s, lùi đà, nhảy 50/50)
  HUNGRY_STANDING: 'HUNGRY_STANDING',   // Đứng im đòi ăn
  HUNGRY_STRIKE_SLEEP: 'HUNGRY_STRIKE_SLEEP', // Ngủ đình công vì không được cho ăn
  LEAVING_RUNAWAY: 'LEAVING_RUNAWAY',   // Hết năng lượng (0%) bỏ nhà ra đi
  FETCHING_WATER_GLASS: 'FETCHING_WATER_GLASS', // Chạy đi đón ly nước khổng lồ
  PUSHING_WATER_GLASS: 'PUSHING_WATER_GLASS',   // Đẩy ly nước khổng lồ vào giữa màn hình
  WAITING_WATER_DRINK: 'WAITING_WATER_DRINK',   // Đứng chờ người dùng nhấn uống nước
  RETRACTING_WATER_GLASS: 'RETRACTING_WATER_GLASS', // Đẩy ly rỗng ra ngoài màn hình cất đi
  RETURNING_TO_TUB: 'RETURNING_TO_TUB',         // Quay lại nhảy vào bồn tắm
  RETURNING_TO_DESK: 'RETURNING_TO_DESK',       // Quay lại ngồi vào bàn làm việc
  GATE_ENTER: 'GATE_ENTER',                     // Đi vào cổng dịch chuyển không gian
  GATE_EMERGE: 'GATE_EMERGE',                   // Bước ra từ cổng không gian sau 1s
  DIZZY: 'DIZZY'                                // Bị chóng mặt ngã xoay vòng
};

// Biến đếm dừng lại để nói chuyện trước khi cất bàn/xô
var retractWaitTimer = 0;
var retractTarget = null; // 'desk' hoặc 'tub'
var nextActionAfterRetract = null;
var bathStartTime = 0;
var bathRelaxSpoken = false;

var capy = {
  x: Math.max(60, window.innerWidth - 280),
  y: groundY,
  speed: 1.55,
  facing: -1, // -1: Trái, 1: Phải
  state: CapyState.WALK_LEFT,
  walkPhase: 0,
  idleTimer: 0,
  breathPhase: 0,
  lostOrangeTimer: 0,
  vy: 0,
  fallingFromHigh: false,
  dizzyAngle: 0,
  droppedFromLow: false,
  angryUntil: 0,
  maxDragHeight: 0
};

// 5. HIỆU ỨNG HẠT (Đã tách sang js/effects/particles.js)


// 6. CƠ CHẾ CLICK-THROUGH
var isDraggingCapy = false;
window.isDraggingCapy = false;
let isDraggingTub = false;
let isDraggingDesk = false;
let deskClickStartX = 0;
let deskClickStartY = 0;
var isDraggingDash = false;
var dashDragCandidate = false;
let lastMouseX = 0;
let lastMouseY = 0;
let prevDeltaX = 0;

let isIgnoringMouse = true;
function setMouseIgnore(ignore) {
  if (isIgnoringMouse !== ignore) {
    isIgnoringMouse = ignore;
    if (ignore) {
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    } else {
      ipcRenderer.send('set-ignore-mouse-events', false);
    }
  }
}

function isOverInteractive(mx, my) {
  if (isDraggingCapy || isDraggingTub || isDraggingDesk || isDraggingDash || dashDragCandidate) return true;

  // 1. Quả cam
  const orangePad = 10;
  if (
    mx >= orange.x - orangePad &&
    mx <= orange.x + orange.width + orangePad &&
    my >= orange.y - orangePad &&
    my <= orange.y + orange.height + orangePad
  ) {
    return true;
  }

  for (const o of groundOranges) {
    if (
      mx >= o.x - orangePad &&
      mx <= o.x + o.width + orangePad &&
      my >= o.y - orangePad &&
      my <= o.y + o.height + orangePad
    ) {
      return true;
    }
  }

  // 2. Chậu tắm Onsen (nếu đang hiển thị)
  if (tub.visible) {
    if (
      mx >= tub.x - 4 &&
      mx <= tub.x + tub.width + 4 &&
      my >= tub.y - 14 &&
      my <= tub.y + tub.height + 4
    ) {
      return true;
    }
  }

  // 3. Bàn làm việc (nếu đang hiển thị)
  if (desk.visible) {
    if (
      mx >= desk.x - 4 &&
      mx <= desk.x + desk.width + 4 &&
      my >= groundY - WORK_H - 10 &&
      my <= groundY + 4
    ) {
      return true;
    }
  }

  // 4. Capybara khi ngã chóng mặt
  if (capy.state === CapyState.DIZZY) {
    const halfW = FALLEN_W / 2 + 10;
    if (
      mx >= capy.x - halfW &&
      mx <= capy.x + halfW &&
      my >= capy.y - FALLEN_H - 14 &&
      my <= capy.y + 6
    ) {
      return true;
    }
  }

  // 5. Capybara khi ở ngoài (đi, đứng, ngủ, rơi, trốn)
  if (capy.state === CapyState.HIDDEN) {
    if (mx >= canvas.width - 28 && my >= groundY - RENDER_H - 12 && my <= groundY + 8) {
      return true;
    }
  } else if (capy.state !== CapyState.BATHING && capy.state !== CapyState.WORKING && capy.state !== CapyState.DIZZY) {
    const isSleeping = (capy.state === CapyState.SLEEPING);
    const halfW = isSleeping ? SLEEP_W / 2 + 10 : RENDER_W / 2 + 10;
    const h = isSleeping ? SLEEP_H + 10 : RENDER_H + 12;
    if (
      mx >= capy.x - halfW &&
      mx <= capy.x + halfW &&
      my >= capy.y - h &&
      my <= capy.y + 6
    ) {
      return true;
    }
  }

  // 6. Dashboard pill UI
  const dash = document.getElementById('dashboard');
  if (dash) {
    const r = dash.getBoundingClientRect();
    if (mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom) {
      return true;
    }
  }

  // 7. Settings modal UI
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal && !settingsModal.classList.contains('modal-hidden')) {
    const r = settingsModal.getBoundingClientRect();
    if (mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom) {
      return true;
    }
  }

  // 8. Ly nước nhắc uống nước (cao bằng Capybara ~ 50px)
  if (typeof waterReminderState !== 'undefined' && waterReminderState.glass && waterReminderState.glass.visible) {
    const g = waterReminderState.glass;
    if (mx >= g.x - 12 && mx <= g.x + g.width + 12 && my >= groundY - g.height - 15 && my <= groundY + 8) {
      return true;
    }
  }

  // 8. Khúc gỗ chướng ngại vật
  if (typeof isOverWoodLog === 'function' && isOverWoodLog(mx, my)) return true;

  return false;
}

// 7. CẤU HÌNH CÀI ĐẶT & THỜI GIAN LÀM VIỆC / UỐNG NƯỚC / TỐC ĐỘ CHẠY / CHẾ ĐỘ NGỒI MÁY
const SETTINGS_KEY = 'capy_pet_settings_v2';
var settings = {
  workFocusEnabled: true,
  workDurationSec: 3600, // Mặc định 1 tiếng (30s, 15p, 30p, 1h, 2h... 8h)
  waterIntervalSec: 3600, // Mặc định 1 tiếng
  walkSpeed: 1.55,        // Tốc độ đi dạo mặc định (Chuẩn)
  computerMode: 'focus',  // 'focus' (Làm việc tập trung) hoặc 'chill' (Chỉ ngồi máy tính lướt web)
  hungryIntervalSec: 10,  // Dành cho tương thích cũ
  hungryStandDurationSec: 10,
  hungryStrikeTimeoutSec: 15,
  energyDurationSec: 7200, // Mặc định 2 tiếng tiêu hao hết năng lượng (có option 15s test)
  orangeModeEnabled: false,
  woodModeEnabled: false
};

try {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    settings = Object.assign(settings, JSON.parse(saved));
    if (typeof settings.walkSpeed === 'number') {
      capy.speed = settings.walkSpeed;
    }
    if (typeof settings.orangeModeEnabled === 'boolean') {
      isOrangeModeEnabled = settings.orangeModeEnabled;
    }
    if (typeof settings.woodModeEnabled === 'boolean') {
      isWoodModeEnabled = settings.woodModeEnabled;
    }
    if (!settings.energyDurationSec) {
      settings.energyDurationSec = 7200;
    }
  }
} catch (e) {
  console.warn('Lỗi đọc settings:', e);
}

// Biến trạng thái chu kỳ nước & phiên làm việc
var lastWaterReminderTime = Date.now();
var waterReminderActive = false;
var workSessionStartTime = 0;
var workSessionActive = false;

// Trạng thái lời nói (Đã tách sang js/ui/speech-bubble.js)


// Kiểm tra phiên làm việc tập trung có đang khóa không (tính từ lúc bắt đầu ngồi vào bàn)
function isWorkSessionLocked() {
  if (settings.computerMode === 'chill') return false; // Chế độ chill ngồi máy tính không bị khóa
  if (!settings.workFocusEnabled || !workSessionActive) return false;
  const elapsed = Math.floor((Date.now() - workSessionStartTime) / 1000);
  return elapsed < settings.workDurationSec;
}

function getWorkRemainingTimeString() {
  if (!workSessionActive) return '0 giây';
  const elapsed = Math.floor((Date.now() - workSessionStartTime) / 1000);
  const remaining = Math.max(0, settings.workDurationSec - elapsed);
  if (remaining < 60) {
    return `${remaining} giây`;
  }
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return secs > 0 ? `${mins} phút ${secs} giây` : `${mins} phút`;
}

// 7. ĐIỀU KHIỂN DASHBOARD (Đã tách sang js/ui/dashboard.js)


// HÀM BẬT/TẮT MODE CAM (dùng chung cho dashboard + IPC từ Panel)
function setOrangeMode(enabled) {
  isOrangeModeEnabled = !!enabled;
  settings.orangeModeEnabled = isOrangeModeEnabled;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}

  if (isOrangeModeEnabled) {
    if (typeof scheduleNextOrangeThrow === 'function') scheduleNextOrangeThrow(5000);
  } else {
    if (nextOrangeThrowTimer) {
      clearTimeout(nextOrangeThrowTimer);
      nextOrangeThrowTimer = null;
    }

    // Tắt mode xếp cam: Đảm bảo Capy luôn giữ lại đúng 1 quả cam (trên đầu hoặc dưới sàn)
    if (orange.state === 'ON_HEAD') {
      // Nếu đang xếp nhiều quả trên đầu: chỉ giữ lại 1 quả
      if (typeof capyOrangeCount !== 'undefined') {
        capyOrangeCount = 1;
      }
      // Dọn các quả ném phụ thừa trên sàn
      if (typeof groundOranges !== 'undefined') {
        groundOranges.length = 0;
      }
    } else if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      // Quả chính đang ở dưới sàn / đang rơi: GIỮ NGUYÊN quả chính để người dùng nhặt lại!
      if (typeof groundOranges !== 'undefined') {
        groundOranges.length = 0;
      }
    } else {
      // orange.state === 'NONE': nếu trên sàn đang có quả cam ném nào, giữ lại 1 quả làm quả chính
      if (typeof groundOranges !== 'undefined' && groundOranges.length > 0) {
        const kept = groundOranges[0];
        orange.x = kept.x;
        orange.y = groundY - orange.height;
        orange.vx = 0;
        orange.vy = 0;
        orange.state = 'ON_GROUND';
        orange.rotation = 0;
        groundOranges.length = 0;
      }
    }
  }
}

// HÀM BẬT/TẮT MODE GỖ (dùng chung cho dashboard + IPC từ Panel)
function setWoodMode(enabled) {
  isWoodModeEnabled = !!enabled;
  settings.woodModeEnabled = isWoodModeEnabled;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}

  if (isWoodModeEnabled) {
    if (typeof scheduleNextWoodLog === 'function') scheduleNextWoodLog();
  } else {
    if (typeof woodLog !== 'undefined') {
      if (woodLog.nextSpawnTimer) {
        clearTimeout(woodLog.nextSpawnTimer);
        woodLog.nextSpawnTimer = null;
      }
      // Tắt mode khúc gỗ: Biến mất lập tức khúc gỗ thừa trên sàn/màn hình
      woodLog.active = false;
      woodLog.state = 'NONE';
      woodLog.x = -999;
      woodLog.y = -999;
    }
  }
}
// Stats tracking cho Control Panel
var capyStats = {
  workMinutesToday: 0,
  waterCount: 0,
  moodPercent: 75,
  workStartedAt: null
};

// updateDashboardUI đã tách sang js/ui/dashboard.js


// Gửi state cho Control Panel qua IPC
function sendStateToPanel() {
  try {
    const { ipcRenderer } = require('electron');
    // Cập nhật work minutes
    if (capyStats.workStartedAt && (capy.state === CapyState.WORKING)) {
      capyStats.workMinutesToday = Math.floor((Date.now() - capyStats.workStartedAt) / 60000);
    }
    ipcRenderer.send('state-for-panel', {
      orangeMode: isOrangeModeEnabled,
      woodMode: isWoodModeEnabled,
      workMinutesToday: capyStats.workMinutesToday,
      waterCount: capyStats.waterCount,
      moodPercent: capyStats.moodPercent,
      energy: (typeof feedingSystem !== 'undefined' ? Math.round(feedingSystem.energy) : 100),
      settings: {
        workDuration: String(settings.workDurationSec || 3600),
        computerMode: settings.computerMode || 'focus',
        workFocusLock: !!settings.workFocusEnabled,
        waterInterval: String(settings.waterIntervalSec || 3600),
        walkSpeed: String(settings.walkSpeed || 1.55),
        energyDuration: String(settings.energyDurationSec || 7200)
      }
    });
  } catch (e) {}
}
window.sendStateToPanel = sendStateToPanel;

// Nhận lệnh IPC từ Control Panel
(function setupPanelIPC() {
  try {
    const { ipcRenderer } = require('electron');

    // Panel yêu cầu state
    ipcRenderer.on('request-state-for-panel', () => {
      sendStateToPanel();
    });

    // Panel toggle Orange mode
    ipcRenderer.on('panel-toggle-orange', (event, isOn) => {
      setOrangeMode(isOn);
    });

    // Panel toggle Wood mode
    ipcRenderer.on('panel-toggle-wood', (event, isOn) => {
      setWoodMode(isOn);
    });

    // Panel trigger Hide
    ipcRenderer.on('panel-trigger-hide', () => {
      triggerHide();
    });

    // Panel test hungry / runaway
    ipcRenderer.on('panel-test-hungry', () => {
      if (typeof feedingSystem !== 'undefined') {
        if (feedingSystem.energy > 30) {
          feedingSystem.energy = 30; // Test đói 30%
        } else {
          feedingSystem.energy = 0;  // Test cạn kiệt 0% bỏ đi
        }
        if (typeof updateEnergyUI === 'function') updateEnergyUI();
      }
    });

    // Panel trigger water reminder
    ipcRenderer.on('panel-trigger-water', () => {
      if (typeof startWaterReminder === 'function') {
        startWaterReminder();
      }
    });

    // Panel save settings
    ipcRenderer.on('panel-save-settings', (event, s) => {
      if (s.workDuration) settings.workDurationSec = parseInt(s.workDuration, 10) || 3600;
      if (s.computerMode) settings.computerMode = s.computerMode;
      if (s.workFocusLock !== undefined) settings.workFocusEnabled = s.workFocusLock;
      if (s.waterInterval) settings.waterIntervalSec = parseInt(s.waterInterval, 10) || 3600;
      if (s.walkSpeed) {
        settings.walkSpeed = parseFloat(s.walkSpeed) || 1.55;
        capy.speed = settings.walkSpeed;
      }
      if (s.energyDuration !== undefined) {
        settings.energyDurationSec = parseInt(s.energyDuration, 10) || 7200;
      }
      // Lưu trữ
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (err) {}
      // Reset đồng hồ nước
      lastWaterReminderTime = Date.now();
      waterReminderActive = false;
      showSpeechBubble(Messages.settingsSavedSuccess, 3000, false);
    });
  } catch (e) {
    console.warn('IPC Panel setup failed:', e);
  }
})();

// Dashboard event listeners & kéo thả đã tách sang js/ui/dashboard.js


// (Settings modal & save logic đã chuyển sang Control Panel window)

// Dựng Capy dậy khi bị ngã: đứng yên trong 3s càm ràm rồi mới đi tiếp
function wakeCapyFromDizzy() {
  if (capy.state !== CapyState.DIZZY) return;
  capy.dizzyTimer = 0;
  spawnWakeStars(capy.x, groundY - 25);
  // Đứng yên trong 3s (IDLE)
  capy.state = (capy.facing === 1) ? CapyState.IDLE_RIGHT : CapyState.IDLE_LEFT;
  capy.idleTimer = Math.round(3 * TARGET_FPS); // 3 giây đứng yên (135 frames ở 45 FPS)
  capy.vy = 0;
  capy.fallingFromHigh = false;
  capy.walkPhase = 0;
  capy.y = groundY;
  capy.angryUntil = Date.now() + 3500; // Biểu tượng giận 💢 trong lúc càm ràm
  capy.lostNoticeTimer = 0; // Đặt lại timer tìm cam để không làm gián đoạn 3s đứng yên
  updateDashboardUI('roam');

  // Chọn ngẫu nhiên 1 câu thoại càm ràm bực bội khi dậy và hiện trong 3s
  if (Messages.wakeDizzyQuotes && Messages.wakeDizzyQuotes.length > 0) {
    const quote = Messages.wakeDizzyQuotes[Math.floor(Math.random() * Messages.wakeDizzyQuotes.length)];
    showSpeechBubble(quote, 3000, true);
  }
}

// 8. SỰ KIỆN CHUỘT
window.addEventListener('mousedown', (e) => {
  if (capy.state === CapyState.LEAVING_RUNAWAY) return; // Đang bỏ đi không thể can thiệp
  if (e.button === 0) {
    const mx = e.clientX;
    const my = e.clientY;

    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    prevDeltaX = 0;

    // A00. CLICK/KÉO THẢ KHÚC GỖ
    if (typeof handleWoodLogMouseDown === 'function' && handleWoodLogMouseDown(mx, my)) {
      return;
    }

    // A000. CLICK NHẤN UỐNG NƯỚC / LY NƯỚC KHỔNG LỒ
    if (typeof handleWaterReminderMouseDown === 'function' && handleWaterReminderMouseDown(mx, my)) {
      return;
    }

    // A0. CLICK VÀO PHẦN MÔNG BỊ LỘ KHI ĐANG TRỐN
    if (capy.state === CapyState.HIDDEN) {
      if (mx >= canvas.width - 28 && my >= groundY - RENDER_H - 12 && my <= groundY + 8) {
        capy.vy = -3.2;
        capy.facing = -1;
        capy.state = CapyState.WALK_LEFT;
        showSpeechBubble('Vãi thấy kiểu gì hay thế!', 2500, true);
        updateDashboardUI('roam');
        return;
      }
    }

    // A. CLICK VÀO CAPYBARA KHI ĐANG BỊ NGÃ (DIZZY) -> DỰNG DẬY ĐỨNG YÊN 3S VÀ HIỆN CÂU THOẠI
    if (capy.state === CapyState.DIZZY) {
      const halfW = FALLEN_W / 2 + 12;
      const isClickDizzy = (
        mx >= capy.x - halfW &&
        mx <= capy.x + halfW &&
        my >= capy.y - FALLEN_H - 15 &&
        my <= capy.y + 10
      );

      if (isClickDizzy) {
        wakeCapyFromDizzy();
        return;
      }
    }

    // B. CLICK QUẢ CAM DƯỚI ĐẤT -> BAY VỀ XẾP CHỒNG LÊN ĐẦU CAPY (Cho phép nhặt bất kể mode bật/tắt)
    let clickedGroundOrange = null;
    const pad = 14;

    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      if (
        mx >= orange.x - pad &&
        mx <= orange.x + orange.width + pad &&
        my >= orange.y - pad &&
        my <= orange.y + orange.height + pad
      ) {
        clickedGroundOrange = orange;
      }
    }

    if (!clickedGroundOrange) {
      for (const o of groundOranges) {
        if (o.state === 'ON_GROUND' || o.state === 'FALLING') {
          if (
            mx >= o.x - pad &&
            mx <= o.x + o.width + pad &&
            my >= o.y - pad &&
            my <= o.y + o.height + pad
          ) {
            clickedGroundOrange = o;
            break;
          }
        }
      }
    }

    if (clickedGroundOrange) {
      // Nếu đang trong chế độ làm việc tập trung (không phải chill):
      if (
        capy.state === CapyState.WORKING ||
        capy.state === CapyState.FETCHING_DESK ||
        capy.state === CapyState.PUSHING_DESK
      ) {
        if (settings.computerMode !== 'chill') {
          // Vẫn tiếp tục làm việc chứ không được đi chơi, chỉ khi ngồi chill mới nhặt được!
          if (typeof isWorkSessionLocked === 'function' && isWorkSessionLocked()) {
            const timeStr = getWorkRemainingTimeString();
            showSpeechBubble(Messages.workRemainingWarning(timeStr), 3200, true);
          } else {
            showSpeechBubble('Đang tập trung làm việc mà! Làm xong rồi mới đi chơi nhé 💼✨', 3000, true);
          }
          return;
        }
      }

      clickedGroundOrange.state = 'RETURNING';

      // 1. Nếu đang ngồi tắm: đứng dậy nói "nóng vãi chưởng ra thôi" rồi cất xô đi dạo!
      if (capy.state === CapyState.BATHING) {
        triggerRoam();
      }
      // 2. Nếu đang ngồi máy tính chill: đứng dậy rời bàn đi dạo!
      else if (capy.state === CapyState.WORKING) {
        workSessionActive = false;
        triggerRoam();
        showSpeechBubble(Messages.foundOrange, 3200, false);
      }
      // 3. Nếu đang nằm ngủ hoặc đang ngơ ngác tìm cam: thức dậy đi dạo
      else if (capy.state === CapyState.SLEEPING || capy.state === CapyState.LOST_ORANGE) {
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
        zzzParticles.length = 0;
      }
      // 4. Nếu đang đẩy xô/bàn vào hoặc đang cất đồ: GIỮ NGUYÊN để Capy hoàn thành đẩy/cất xong rồi mới đi dạo!
      return;
    }

    // B1. CLICK VÀO QUẢ CAM TRÊN ĐẦU CAPYBARA -> LÀM RỚT CAM XUỐNG ĐẤT
    if (orange.state === 'ON_HEAD' && capy.state !== CapyState.WORKING) {
      const pad = 8;
      if (
        mx >= orange.x - pad &&
        mx <= orange.x + orange.width + pad &&
        my >= orange.y - pad &&
        my <= orange.y + orange.height + pad
      ) {
        // Hất quả cam nảy lên rơi xuống sàn
        const dropDir = (capy.facing || 1) * (Math.random() > 0.4 ? 1 : -1);
        dropOrange(dropDir, -3.8);
        return;
      }
    }



    // C. KHI ĐANG TẮM TRONG CHẬU ONSEN
    if (capy.state === CapyState.BATHING && tub.visible) {
      const isOverBath = (mx >= tub.x && mx <= tub.x + tub.width && my >= tub.y && my <= tub.y + tub.height);
      if (isOverBath) {
        if (my < tub.y + 24) {
          isDraggingCapy = true;
          capy.state = CapyState.DRAGGED;
          capy.x = mx;
          capy.y = my;
          updateDashboardUI('roam');
          return;
        } else {
          isDraggingTub = true;
          return;
        }
      }
    }

    // D. KHI ĐANG LÀM VIỆC TẠI BÀN -> KÉO BÀN VÀ CAPYBARA
    if (capy.state === CapyState.WORKING && desk.visible) {
      const isOverWork = (mx >= desk.x && mx <= desk.x + desk.width && my >= groundY - WORK_H && my <= groundY);
      if (isOverWork) {
        deskClickStartX = e.screenX;
        deskClickStartY = e.screenY;
        isDraggingDesk = true;
        return;
      }
    }

    // E. KHI BÀN LÀM VIỆC ĐANG TRỐNG -> NHẤP VÀO ĐỂ NGỒI VÀO BÀN
    if (desk.visible && capy.state !== CapyState.WORKING && capy.state !== CapyState.PUSHING_DESK) {
      const isOverDesk = (mx >= desk.x && mx <= desk.x + desk.width && my >= groundY - DESK_H && my <= groundY);
      if (isOverDesk) {
        triggerWork();
        return;
      }
    }

    // F. KHI Ở NGOÀI: CLICK CAPY HOẶC CLICK CHẬU
    const capyHalfW = RENDER_W / 2 + 8;
    const isClickCapy = (
      mx >= capy.x - capyHalfW &&
      mx <= capy.x + capyHalfW &&
      my >= capy.y - RENDER_H - 12 &&
      my <= capy.y + 10
    );

    const isBusyWithProps = (
      capy.state === CapyState.PUSHING_DESK ||
      capy.state === CapyState.PUSHING_TUB ||
      capy.state === CapyState.RETRACTING_DESK ||
      capy.state === CapyState.RETRACTING_TUB ||
      capy.state === CapyState.FETCHING_DESK ||
      capy.state === CapyState.FETCHING_TUB ||
      capy.state === CapyState.APPROACHING_DESK ||
      capy.state === CapyState.APPROACHING_TUB ||
      capy.state === CapyState.FETCHING_WATER_GLASS ||
      capy.state === CapyState.PUSHING_WATER_GLASS ||
      capy.state === CapyState.WAITING_WATER_DRINK ||
      capy.state === CapyState.RETRACTING_WATER_GLASS ||
      capy.state === CapyState.RETURNING_TO_TUB ||
      capy.state === CapyState.RETURNING_TO_DESK
    );

    if (isClickCapy && capy.state !== CapyState.DIZZY && capy.state !== CapyState.LEAVING_RUNAWAY && !isBusyWithProps) {
      if (isWorkSessionLocked() && capy.state === CapyState.WORKING) {
        showSpeechBubble(Messages.workDragWarning, 3000, true);
        return;
      }
      clearSpeechBubble();
      isDraggingCapy = true;
      window.isDraggingCapy = true;
      capy.maxDragHeight = 0;
      capy.state = CapyState.DRAGGED;
      capy.lostOrangeTimer = 0;
      capy.lostNoticeTimer = 0;
      // Nhấn giữ chuột vào Capybara là quả cam trên đầu rơi xuống ngay lập tức
      if (orange.state === 'ON_HEAD') {
        dropOrange(-capy.facing, -3.2);
      }
      return;
    }

    if (tub.visible) {
      const isClickTub = (mx >= tub.x && mx <= tub.x + tub.width && my >= tub.y && my <= tub.y + tub.height);
      if (isClickTub) {
        isDraggingTub = true;
        return;
      }
    }
  }
});

let lastMouseMoveCheck = 0;

window.addEventListener('mousemove', (e) => {
  const mx = e.clientX;
  const my = e.clientY;

  if (isDraggingDash) return;


  // KÉO THẢ CAPYBARA TOÀN MÀN HÌNH - Xử lý ngay lập tức
  if (isDraggingCapy) {
    const deltaX = e.screenX - lastMouseX;
    const deltaY = e.screenY - lastMouseY;
    lastMouseX = e.screenX;
    lastMouseY = e.screenY;

    capy.x = Math.max(30, Math.min(canvas.width - 30, mx));
    capy.y = Math.max(40, Math.min(groundY, my));

    const currentHeight = groundY - capy.y;
    if (currentHeight > capy.maxDragHeight) {
      capy.maxDragHeight = currentHeight;
    }

    // Khi kéo Capy theo bất kỳ hướng nào (ngang, dọc, kéo thẳng lên trên): làm quả cam rơi ngay lập tức
    if (orange.state === 'ON_HEAD') {
      const dropDir = (deltaX !== 0) ? Math.sign(deltaX) : (-capy.facing);
      dropOrange(dropDir, -3.5);
    }
    return;
  }

  // KÉO THẢ KHÚC GỖ CHƯỚNG NGẠI VẬT - Xử lý ngay lập tức
  if (typeof handleWoodLogMouseMove === 'function' && typeof isDraggingWoodLog !== 'undefined' && isDraggingWoodLog) {
    canvas.style.cursor = 'grabbing';
    const deltaX = e.screenX - lastMouseX;
    const deltaY = e.screenY - lastMouseY;
    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    handleWoodLogMouseMove(mx, my, deltaX, deltaY);
    return;
  }

  // KÉO THẢ BỒN TẮM ONSEN - Xử lý ngay lập tức
  if (isDraggingTub && tub.visible) {
    canvas.style.cursor = 'grabbing';
    const deltaX = e.screenX - lastMouseX;
    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    tub.x = Math.max(10, Math.min(canvas.width - tub.width - 10, tub.x + deltaX));
    tub.y = groundY - tub.height;
    return;
  }

  // KÉO THẢ BÀN LÀM VIỆC & CAPYBARA - Xử lý ngay lập tức
  if (isDraggingDesk && desk.visible) {
    canvas.style.cursor = 'grabbing';
    const deltaX = e.screenX - lastMouseX;
    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    desk.x = Math.max(10, Math.min(canvas.width - desk.width - 10, desk.x + deltaX));
    desk.y = groundY - DESK_H;
    capy.x = desk.x;
    desk.targetX = desk.x;
    return;
  }

  lastMouseX = e.screenX;
  lastMouseY = e.screenY;

  // Giảm tải CPU khi di chuột tự do: giới hạn kiểm tra hit-test tối đa 30ms/lần (~33Hz)
  const now = Date.now();
  if (now - lastMouseMoveCheck < 30) return;
  lastMouseMoveCheck = now;

  const isOver = isOverInteractive(mx, my);
  setMouseIgnore(!isOver);

  // Di chuột qua cổng không gian
  if (typeof handleGateMouseMove === 'function' && handleGateMouseMove(mx, my)) {
    return;
  }

  // Đổi con trỏ chuột
  if (capy.state === CapyState.DIZZY) {
    const halfW = FALLEN_W / 2 + 10;
    if (mx >= capy.x - halfW && mx <= capy.x + halfW && my >= capy.y - FALLEN_H - 10 && my <= capy.y + 6) {
      canvas.style.cursor = 'pointer';
      return;
    }
  }

  // 1. Quả cam dưới đất hoặc trên đầu
  const pad = 10;
  if (orange.state === 'ON_GROUND' || (orange.state === 'ON_HEAD' && capy.state !== CapyState.WORKING)) {
    if (
      mx >= orange.x - pad &&
      mx <= orange.x + orange.width + pad &&
      my >= orange.y - pad &&
      my <= orange.y + orange.height + pad
    ) {
      canvas.style.cursor = 'pointer';
      return;
    }
  }

  for (const o of groundOranges) {
    if (o.state === 'ON_GROUND' || o.state === 'FALLING') {
      if (
        mx >= o.x - pad &&
        mx <= o.x + o.width + pad &&
        my >= o.y - pad &&
        my <= o.y + o.height + pad
      ) {
        canvas.style.cursor = 'pointer';
        return;
      }
    }
  }

  // 1.5. Khúc gỗ chướng ngại vật
  if (typeof isOverWoodLog === 'function' && isOverWoodLog(mx, my)) {
    canvas.style.cursor = 'pointer';
    return;
  }

  // 1.6. Ly nước khổng lồ / Nút bấm Uống nước
  if (typeof handleWaterReminderMouseMove === 'function' && handleWaterReminderMouseMove(mx, my)) {
    return;
  }

  // 2. Chậu tắm Onsen, Bàn làm việc, hoặc Capybara -> grab
  const isNearTub = tub.visible && (mx >= tub.x && mx <= tub.x + tub.width && my >= tub.y && my <= tub.y + tub.height);
  const isNearDesk = desk.visible && (mx >= desk.x && mx <= desk.x + desk.width && my >= groundY - WORK_H && my <= groundY);
  const capyHalfW = RENDER_W / 2 + 8;
  const isNearCapy = (mx >= capy.x - capyHalfW && mx <= capy.x + capyHalfW && my >= capy.y - RENDER_H && my <= capy.y + 10);

  if (isNearTub || isNearDesk || isNearCapy) {
    canvas.style.cursor = 'grab';
  } else {
    canvas.style.cursor = 'default';
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    if (typeof handleWoodLogMouseUp === 'function') {
      handleWoodLogMouseUp();
    }

    if (isDraggingCapy) {
      isDraggingCapy = false;
      window.isDraggingCapy = false;

      // 1. Kiểm tra thả vào chậu tắm Onsen
      const isOverTub = tub.visible && (
        capy.x >= tub.x - 16 &&
        capy.x <= tub.x + tub.width + 16 &&
        capy.y >= tub.y - 25 &&
        capy.y <= tub.y + tub.height + 25
      );

      if (isOverTub) {
        capy.state = CapyState.BATHING;
        capy.facing = -1;
        capy.x = tub.x + tub.width / 2;
        capy.y = groundY;
        updateDashboardUI('bath');

        if (orange.state === 'ON_HEAD') {
          dropOrange(-1, -3.2);
          orange.x = tub.x - 12;
          orange.y = tub.y + 15;
        }
      } else {
        // 2. RƠI TỰ DO & BỊ NGÃ CHÓNG MẶT NẾU > 30% CHIỀU CAO MÀN HÌNH
        const heightAboveGround = groundY - capy.y;
        const threshold = canvas.height * 0.30;

        if (heightAboveGround > threshold) {
          capy.state = CapyState.FALLING;
          capy.vy = 2.0;
          capy.fallStartY = capy.y;
          capy.fallingFromHigh = true;

          if (orange.state === 'ON_HEAD') {
            dropOrange(-capy.facing, -4.5);
          }
        } else if (heightAboveGround > 15) {
          capy.state = CapyState.FALLING;
          capy.vy = 1.0;
          capy.fallStartY = capy.y;
          capy.fallingFromHigh = false;
          capy.droppedFromLow = true; // Kéo lên cao nhưng chưa qua 30%
        } else {
          capy.y = groundY;
          // Thả chuột rơi xuống đất: Capy đứng dậy đi dạo, TUYỆT ĐỐI không hiện ? ngay lập tức
          capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
          capy.walkPhase = 0;
          capy.lostNoticeTimer = 0;

          // Nếu trong lúc kéo đã từng nhấc bổng lên cao (> 25px và <= threshold) rồi đặt xuống
          if (capy.maxDragHeight > 25 && capy.maxDragHeight <= threshold) {
            capy.angryUntil = Date.now() + 4000;
            if (Messages.dropLowQuotes && Messages.dropLowQuotes.length > 0) {
              const quote = Messages.dropLowQuotes[Math.floor(Math.random() * Messages.dropLowQuotes.length)];
              showSpeechBubble(quote, 4000, true);
            }
          }
          capy.maxDragHeight = 0;
        }
      }
    }

    if (isDraggingTub) {
      isDraggingTub = false;
      tub.y = groundY - tub.height;
    }

    if (isDraggingDesk) {
      isDraggingDesk = false;
      desk.y = groundY - DESK_H;
      // Nếu chỉ click nhẹ vào bàn/Capy mà không kéo:
      const dragDist = Math.hypot(e.screenX - deskClickStartX, e.screenY - deskClickStartY);
      if (dragDist < 5 && capy.state === CapyState.WORKING) {
        if (isWorkSessionLocked()) {
          const timeStr = getWorkRemainingTimeString();
          showSpeechBubble(Messages.workRemainingEncourage(timeStr), 3000, false);
        } else if (settings.computerMode === 'chill') {
          showSpeechBubble(Messages.workChill, 3000, false);
        } else if (Messages.workQuotes && Messages.workQuotes.length > 0) {
          const quote = Messages.workQuotes[Math.floor(Math.random() * Messages.workQuotes.length)];
          showSpeechBubble(quote, 3000, false);
        }
      }
    }

    const mx = e.clientX;
    const my = e.clientY;
    setMouseIgnore(!isOverInteractive(mx, my));
  }
});

window.addEventListener('mouseleave', () => {
  if (!isDraggingCapy && !isDraggingTub && !isDraggingDesk) {
    setMouseIgnore(true);
  }
});

window.addEventListener('blur', () => {
  if (isDraggingCapy) {
    isDraggingCapy = false;
    window.isDraggingCapy = false;
    if (capy.state === CapyState.DRAGGED) {
      if (capy.y >= groundY - 15) {
        capy.y = groundY;
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      } else {
        capy.state = CapyState.FALLING;
        capy.vy = 1.0;
        capy.fallStartY = capy.y;
      }
    }
  }
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ipcRenderer.send('show-context-menu');
});

ipcRenderer.on('reset-capy-position', () => {
  capy.x = Math.max(100, canvas.width - 240);
  capy.y = groundY;
  capy.state = CapyState.WALK_LEFT;
  capy.vy = 0;
  capy.fallingFromHigh = false;
  updateDashboardUI('roam');
});

ipcRenderer.on('panel-trigger-gate', () => {
  if (typeof triggerGate === 'function') {
    triggerGate();
  }
});

ipcRenderer.on('screen-switched', () => {
  resizeCanvas();
});

// 13. HIỂN THỊ LỜI NÓI (Đã tách sang js/ui/speech-bubble.js)


// 12. HIỆU ỨNG MẮT X, XOÁY ỐC CHÓNG MẶT MÀU TÍM, MỒ HÔI
function drawPixelX(c, x, y, size = 7, color = '#1a1008') {
  c.save();
  c.fillStyle = '#b0583b';
  c.fillRect(x - size / 2 - 1, y - 2, size + 2, 4);

  c.strokeStyle = color;
  c.lineWidth = 2.4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - size / 2, y - size / 2);
  c.lineTo(x + size / 2, y + size / 2);
  c.moveTo(x + size / 2, y - size / 2);
  c.lineTo(x - size / 2, y + size / 2);
  c.stroke();
  c.restore();
}

function drawPurpleDizzySpiral(c, cx, cy, angle) {
  c.save();
  c.translate(cx, cy);
  c.rotate(angle * 1.8);

  c.strokeStyle = '#B388FF';
  c.lineWidth = 1.6;
  c.lineCap = 'round';
  c.beginPath();

  const maxTurns = 2.4;
  for (let theta = 0; theta < Math.PI * 2 * maxTurns; theta += 0.15) {
    const r = 0.5 + theta * 0.55;
    const px = Math.cos(theta) * r;
    const py = Math.sin(theta) * r;
    if (theta === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();

  c.fillStyle = '#7C4DFF';
  c.beginPath();
  c.arc(0, 0, 1.2, 0, Math.PI * 2);
  c.fill();

  c.restore();
}

function drawSweatDrop(c, x, y, size = 2.3) {
  c.save();
  c.fillStyle = '#64B5F6';
  c.strokeStyle = '#1E88E5';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(x, y - size);
  c.quadraticCurveTo(x + size * 0.75, y - size * 0.25, x + size * 0.75, y + size * 0.5);
  c.arc(x, y + size * 0.5, size * 0.75, 0, Math.PI, false);
  c.quadraticCurveTo(x - size * 0.75, y - size * 0.25, x, y - size);
  c.fill();
  c.stroke();
  c.restore();
}

// 12b. HIỆU ỨNG ĐỎ MẶT XẤU HỔ (4 GẠCH NHỎ SỌC XÉO ĐỎ TRÊN MÁ) KHI CẤT BÀN & XÔ
function drawShyBlush(c, x, y) {
  c.save();
  c.imageSmoothingEnabled = false;

  // Lớp má hồng phớt nhẹ làm nền
  const pulse = 0.35 + Math.sin(Date.now() * 0.005) * 0.08;
  c.fillStyle = `rgba(255, 95, 120, ${pulse})`;
  c.beginPath();
  c.ellipse(x, y, 7.5, 4.2, 0, 0, Math.PI * 2);
  c.fill();

  // 4 gạch nhỏ sọc xéo đỏ sắc nét phong cách anime/manga (////)
  c.strokeStyle = '#e11d48';
  c.lineWidth = 1.3;
  c.lineCap = 'round';

  const spacing = 2.6; // Khoảng cách giữa các gạch
  const startX = x - (3 * spacing) / 2; // Căn giữa 4 gạch tại x
  const lineDx = 1.6; // Độ nghiêng x
  const lineDy = 2.4; // Độ dài y

  for (let i = 0; i < 4; i++) {
    const lx = startX + i * spacing;
    c.beginPath();
    c.moveTo(lx - lineDx, y - lineDy);
    c.lineTo(lx + lineDx, y + lineDy);
    c.stroke();
  }

  c.restore();
}

// 12c. BIỂU TƯỢNG GIẬN 💢 PHONG CÁCH ANIME KHI BỊ KÉO LÊN RỒI TIẾP ĐẤT
function drawAngerMark(c, x, y) {
  c.save();
  const pulse = 1 + Math.sin(Date.now() * 0.018) * 0.16; // Nhịp đập phập phồng tức giận
  const jumpY = Math.abs(Math.sin(Date.now() * 0.014)) * 3;
  c.translate(x, y - jumpY);
  c.scale(pulse, pulse);
  c.font = 'bold 15px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('💢', 0, 0);
  c.restore();
}
window.drawAngerMark = drawAngerMark;

// 13. VẼ CAPYBARA
function drawCapybaraOutside(c) {
  // Khi đang tắm Onsen hoặc đang ngồi làm việc, hình ảnh đã được vẽ trọn vẹn trong drawTubAndBath / drawDesk
  if (capy.state === CapyState.BATHING || capy.state === CapyState.WORKING) return;

  const isWalking = (
    capy.state === CapyState.WALK_RIGHT ||
    capy.state === CapyState.WALK_LEFT ||
    capy.state === CapyState.FETCHING_DESK ||
    capy.state === CapyState.FETCHING_TUB ||
    capy.state === CapyState.FETCHING_WATER_GLASS ||
    capy.state === CapyState.RETURNING_TO_TUB ||
    capy.state === CapyState.RETURNING_TO_DESK ||
    capy.state === CapyState.APPROACHING_DESK ||
    capy.state === CapyState.APPROACHING_TUB ||
    capy.state === CapyState.HIDING_RUN ||
    capy.state === CapyState.LEAVING_RUNAWAY ||
    capy.state === CapyState.GATE_ENTER ||
    capy.state === CapyState.GATE_EMERGE
  );
  const isPushing = (
    capy.state === CapyState.PUSHING_DESK ||
    capy.state === CapyState.PUSHING_TUB ||
    capy.state === CapyState.PUSHING_WATER_GLASS ||
    capy.state === CapyState.RETRACTING_DESK ||
    capy.state === CapyState.RETRACTING_TUB ||
    capy.state === CapyState.RETRACTING_WATER_GLASS
  );
  const isDragged = (capy.state === CapyState.DRAGGED);
  const isSleeping = (capy.state === CapyState.SLEEPING || capy.state === CapyState.HUNGRY_STRIKE_SLEEP);
  const isFalling = (capy.state === CapyState.FALLING);

  let bodyYOffset = 0;
  if (isWalking || isPushing) {
    bodyYOffset = Math.sin(capy.walkPhase * 2) * 1.5;
  } else if (!isDragged && !isSleeping && !isFalling) {
    bodyYOffset = Math.sin(capy.breathPhase) * 1.2;
  }

  c.save();
  c.translate(capy.x, capy.y);
  c.scale(capy.facing, 1);
  if ((capy.state === CapyState.JUMPING || capy.state === CapyState.WOOD_LOG_INTERACT) && capy.jumpAngle) {
    c.rotate(capy.jumpAngle);
  }
  c.imageSmoothingEnabled = false;

  const distToGround = Math.max(0, groundY - capy.y);
  const shadowAlpha = Math.max(0.06, 0.25 - distToGround * 0.0015);
  const shadowScale = isSleeping ? 1.15 : (isDragged || isFalling ? Math.max(0.35, 1 - distToGround * 0.003) : 1);

  c.fillStyle = `rgba(20, 20, 30, ${shadowAlpha})`;
  c.beginPath();
  c.ellipse(0, distToGround, 24 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  c.fill();

  // A. VẼ CHIẾC DÙ LƯỢN TRÊN LƯNG CAPYBARA KHI RƠI TỪ ĐỘ CAO > 30% MÀN HÌNH VÀ ĐÃ RƠI QUA 30% QUÃNG ĐƯỜNG
  const startY = (typeof capy.fallStartY === 'number') ? capy.fallStartY : (groundY - 100);
  const totalFallDist = Math.max(1, groundY - startY);
  const fallenDist = capy.y - startY;
  const hasPassed30Percent = (fallenDist / totalFallDist) >= 0.30;

  if (isFalling && capy.fallingFromHigh && hasPassed30Percent && parachuteImg.complete && parachuteImg.naturalWidth > 0) {
    c.save();
    // Dù đứng yên không lắc lư
    const paraW = PARACHUTE_W;
    const paraH = PARACHUTE_H;
    const paraX = -paraW / 2;
    const paraY = -RENDER_H - paraH + 18;

    c.drawImage(
      parachuteImg,
      0, 0, parachuteImg.naturalWidth, parachuteImg.naturalHeight,
      paraX, paraY, paraW, paraH
    );
    c.restore();
  }

  // B. DÁNG NGỦ (SLEEPING)
  if (isSleeping && sleepImg.complete && sleepImg.naturalWidth > 0) {
    const drawX = -SLEEP_W / 2;
    const drawY = -SLEEP_H + 2 + bodyYOffset;

    c.drawImage(
      sleepImg,
      0, 0, sleepImg.naturalWidth, sleepImg.naturalHeight,
      drawX, drawY, SLEEP_W, SLEEP_H
    );

    drawZzz(c);
    c.restore();
    return;
  }

  // C. DÁNG ĐI / ĐẨY BÀN / BỊ KÉO / RƠI TỰ DO
  let frameIndex = 0;
  if (isWalking || isPushing) {
    const walkCycle = [1, 0, 2, 3];
    const step = Math.floor(capy.walkPhase * 1.8) % walkCycle.length;
    frameIndex = walkCycle[step];
  } else if (isDragged) {
    frameIndex = 2;
  } else if (capy.state === CapyState.JUMPING || (capy.state === CapyState.WOOD_LOG_INTERACT && capy.woodLogPhase === 'JUMP')) {
    frameIndex = 2; // Co chân bật nhảy trên không
  } else if (isFalling) {
    frameIndex = 0; // Chân thả lỏng đứng yên không cựa quậy
  } else if (capy.state === CapyState.LOST_ORANGE) {
    frameIndex = 0;
  }

  if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
    const drawX = -RENDER_W / 2;
    const drawY = -RENDER_H + 2 + bodyYOffset;

    if (typeof gateState !== 'undefined' && typeof gateState.capyAlpha === 'number' && (capy.state === CapyState.GATE_ENTER || capy.state === CapyState.GATE_EMERGE)) {
      c.globalAlpha = gateState.capyAlpha;
    }

    // Gậy nải hành lý (bindle stick) khi bỏ nhà ra đi - vẽ nằm DƯỚI ảnh Capybara
    const isRunaway = (capy.state === CapyState.LEAVING_RUNAWAY || (typeof feedingSystem !== 'undefined' && feedingSystem.isLeavingRunaway));
    if (isRunaway && bindleImg.complete && bindleImg.naturalWidth > 0) {
      c.save();
      c.scale(-1, 1);
      const bW = 46;
      const bH = 42;
      const bX = -8;
      const bY = -RENDER_H - 7 + bodyYOffset;
      c.drawImage(bindleImg, bX, bY, bW, bH);
      c.restore();
    }

    c.drawImage(
      spriteSheet,
      frameIndex * FRAME_W, 0, FRAME_W, FRAME_H,
      drawX, drawY, RENDER_W, RENDER_H
    );

    // Khi chạy ra cất bàn và xô hoặc cất ly nước: hiện đỏ mặt thể hiện xấu hổ
    const isRetractingProps = (
      capy.state === CapyState.RETRACTING_DESK ||
      capy.state === CapyState.RETRACTING_TUB ||
      capy.state === CapyState.RETRACTING_WATER_GLASS ||
      capy.state === CapyState.APPROACHING_DESK ||
      capy.state === CapyState.APPROACHING_TUB ||
      retractWaitTimer > 0
    );

    if (isRetractingProps) {
      // Đỏ mặt (4 gạch nhỏ sọc xéo đỏ) thể hiện xấu hổ
      drawShyBlush(c, 8.5, -27 + bodyYOffset);
    } else if (
      capy.state === CapyState.PUSHING_DESK ||
      capy.state === CapyState.PUSHING_TUB ||
      capy.state === CapyState.PUSHING_WATER_GLASS
    ) {
      // Mồ hôi gắng sức khi đẩy bàn/xô vào
      const dripProgress = (Date.now() * 0.003) % 1; // 0 -> 1 tuần hoàn
      const dripY = -37 + dripProgress * 7; // Chảy từ -37 xuống -30
      const dripAlpha = Math.sin(dripProgress * Math.PI);
      c.save();
      c.globalAlpha = Math.max(0.25, dripAlpha);
      drawSweatDrop(c, 12, dripY, 2.3);
      c.restore();
    } else {
      const heightAboveGround = groundY - capy.y;
      if ((isDragged && heightAboveGround > canvas.height * 0.30) || (isFalling && capy.fallingFromHigh)) {
        drawSweatDrop(c, -RENDER_W / 2 - 4, -RENDER_H + 8, 2.3);
        drawSweatDrop(c, RENDER_W / 2 + 4, -RENDER_H + 12, 2.3);
      } else if (capyOrangeCount >= 3 && orange.state === 'ON_HEAD' && capy.state !== CapyState.WORKING) {
        // Khi xếp từ 3 quả cam trở lên: hiện giọt mồ hôi lăn vất vả gánh nặng
        const dripProgress = (Date.now() * 0.003) % 1;
        const dripY = -34 + dripProgress * 6;
        const dripAlpha = Math.sin(dripProgress * Math.PI);
        c.save();
        c.globalAlpha = Math.max(0.3, dripAlpha);
        drawSweatDrop(c, 13, dripY, 2.2);
        c.restore();
      }
    }

    if (capy.state === CapyState.LOST_ORANGE) {
      const iconBounce = Math.sin(Date.now() * 0.005) * 2;
      c.save();
      c.translate(0, -RENDER_H - 5 + iconBounce);
      c.fillStyle = '#FFA500';
      c.font = 'bold 13px sans-serif';
      c.textAlign = 'center';
      c.fillText('?', 0, 0);
      c.restore();
    }

    // Giọt mồ hôi nhỏ ở mông khi đang trốn (hở 10% phần đít)
    if (capy.state === CapyState.HIDDEN) {
      const dripProgress = (Date.now() * 0.0025) % 1;
      const dripY = -RENDER_H + 26 + Math.sin(dripProgress * Math.PI) * 1.5;
      drawSweatDrop(c, -RENDER_W / 2 + 5, dripY, 1.8);
    }

    // Biểu tượng giận 💢 trên mặt Capybara khi bị kéo lên cao tiếp đất HOẶC khi đang ĐÓI HOẶC khi giận dỗi bỏ đi
    const hasFoodArrived = (typeof droppedFoods !== 'undefined' && droppedFoods.length > 0);
    const isHungryAngry = (typeof feedingSystem !== 'undefined' && feedingSystem.isHungry && !hasFoodArrived && !feedingSystem.isEatingFood);
    const isLeavingRunaway = (capy.state === CapyState.LEAVING_RUNAWAY || (typeof feedingSystem !== 'undefined' && feedingSystem.isLeavingRunaway));
    if ((capy.angryUntil && Date.now() < capy.angryUntil) || isHungryAngry || isLeavingRunaway) {
      drawAngerMark(c, 10, -32 + bodyYOffset);
    }
  }

  c.restore();
}

// 14. CẬP NHẬT LOGIC VÀ MÁY TRẠNG THÁI
function updateCapy() {
  capy.breathPhase += 0.04;

  // Đếm thời gian đứng lại trò chuyện rồi cất bàn / xô đi
  if (retractWaitTimer > 0) {
    retractWaitTimer--;
    if (retractWaitTimer === 0) {
      if (retractTarget === 'desk' && desk.visible) {
        capy.state = CapyState.APPROACHING_DESK;
        if (!speechBubble.active) showSpeechBubble(Messages.almostForgot, 2500, false);
      } else if (retractTarget === 'tub' && tub.visible) {
        capy.state = CapyState.APPROACHING_TUB;
        if (!speechBubble.active) showSpeechBubble(Messages.almostForgot, 2500, false);
      } else {
        retractTarget = null;
      }
    }
  }

  // Quản lý đếm thời gian ngâm bồn Onsen
  if (capy.state !== CapyState.BATHING) {
    if (bathRelaxSpoken) {
      if (Messages.bathQuotes && Messages.bathQuotes.includes(speechBubble.text)) {
        clearSpeechBubble();
      }
    }
    bathStartTime = 0;
    bathRelaxSpoken = false;
  }

  // Khi đang đi dạo mà quả cam bị rơi dưới đất: Capy sẽ đi dạo thêm ~2s rồi mới nhận ra bị mất cam (không bao giờ hiện ? ngay khi vừa rơi xuống)
  const isRoamingState = (
    capy.state === CapyState.WALK_RIGHT ||
    capy.state === CapyState.WALK_LEFT ||
    capy.state === CapyState.IDLE_RIGHT ||
    capy.state === CapyState.IDLE_LEFT
  );

  // QUAN TRỌNG: Chỉ đếm timer tìm cam khi KHÔNG trong thời gian đứng yên và Cổng KHÔNG hoạt động
  const isGateActive = (typeof gateState !== 'undefined' && gateState.active);
  if (isRoamingState && orange.state === 'ON_GROUND' && capy.idleTimer <= 0 && !isGateActive) {
    if (!capy.lostNoticeTimer) capy.lostNoticeTimer = 0;
    capy.lostNoticeTimer++;
    if (capy.lostNoticeTimer >= 60) { // ~2 giây đi dạo rồi mới ngơ ngác tìm cam
      capy.lostNoticeTimer = 0;
      capy.state = CapyState.LOST_ORANGE;
      capy.lostOrangeTimer = 0;
      capy.walkPhase = 0;
      zzzParticles.length = 0;
    }
  } else {
    capy.lostNoticeTimer = 0;
  }

  switch (capy.state) {
    case CapyState.WALK_RIGHT: {
      capy.facing = 1;

      // Cứ mỗi quả cam được xếp chồng thêm, tốc độ giảm 30% hiện tại (0.7 ^ (capyOrangeCount - 1))
      const orangeWeightFactor = Math.pow(0.70, Math.max(0, capyOrangeCount - 1));
      const currentWalkSpeed = capy.speed * orangeWeightFactor;

      capy.x += currentWalkSpeed;
      capy.walkPhase += 0.07 * orangeWeightFactor;

      let rightLimit = canvas.width - 45;
      if (tub.visible && tub.x > capy.x) rightLimit = Math.min(rightLimit, tub.x - 34);
      if (desk.visible && desk.x > capy.x) rightLimit = Math.min(rightLimit, desk.x - 34);

      if (capy.x >= rightLimit) {
        capy.x = rightLimit;
        capy.state = CapyState.IDLE_RIGHT;
        capy.idleTimer = Math.floor(Math.random() * 30 + 30);
      }
      break;
    }

    case CapyState.HUNGRY_STANDING:
    case CapyState.HUNGRY_STRIKE_SLEEP:
      capy.breathPhase += 0.04;
      break;

    case CapyState.LEAVING_RUNAWAY:
      capy.facing = -1;
      capy.x -= 2.2;
      capy.walkPhase += 0.18;
      if (capy.x < -80) {
        if (!window._quittingApp) {
          window._quittingApp = true;
          if (typeof ipcRenderer !== 'undefined') {
            ipcRenderer.send('panel-quit-app');
          }
        }
      }
      break;

    case CapyState.IDLE_RIGHT:
      capy.idleTimer--;
      if (capy.idleTimer <= 0) {
        capy.state = (capy.x >= canvas.width - 60) ? CapyState.WALK_LEFT : CapyState.WALK_RIGHT;
      }
      break;

    case CapyState.WALK_LEFT: {
      capy.facing = -1;

      // Cứ mỗi quả cam được xếp chồng thêm, tốc độ giảm 30% hiện tại
      const orangeWeightFactor = Math.pow(0.70, Math.max(0, capyOrangeCount - 1));
      const currentWalkSpeed = capy.speed * orangeWeightFactor;

      capy.x -= currentWalkSpeed;
      capy.walkPhase += 0.07 * orangeWeightFactor;

      if (capy.x <= 40) {
        capy.x = 40;
        capy.state = CapyState.IDLE_LEFT;
        capy.idleTimer = Math.floor(Math.random() * 30 + 30);
      }
      break;
    }

    case CapyState.IDLE_LEFT:
      capy.idleTimer--;
      if (capy.idleTimer <= 0) {
        capy.state = (capy.x <= 60) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      }
      break;

    // A0. CHẠY SIÊU NHANH VỀ PHÍA BÊN PHẢI ĐỂ ĐÓN BÀN LÀM VIỆC (TỐC ĐỘ GẤP ĐÔI HIỆN TẠI ~ 4X BÌNH THƯỜNG)
    case CapyState.FETCHING_DESK: {
      const fetchSpeed = Math.max(2.8, capy.speed * 4);
      capy.facing = 1;
      capy.x += fetchSpeed;
      capy.walkPhase += 0.28;

      const targetBehindDesk = desk.x + DESK_W + 21;
      if (capy.x >= targetBehindDesk) {
        capy.x = targetBehindDesk;
        capy.facing = -1;
        capy.state = CapyState.PUSHING_DESK;
      }
      break;
    }

    // A. ĐẨY BÀN LÀM VIỆC TỪ PHẢI SANG TRÁI BẰNG ĐẦU
    case CapyState.PUSHING_DESK: {
      const pushSpeed = 1.35;
      desk.x -= pushSpeed;
      // Bàn ở bên trái, Capy ở ngay sát bên phải cách ra 1 chút xíu, đầu chúc sang trái đẩy
      capy.facing = -1;
      capy.x = desk.x + DESK_W + 21;
      capy.walkPhase += 0.12;

      // Đã đẩy tới vị trí đích
      if (desk.x <= desk.targetX) {
        desk.x = desk.targetX;
        // Capybara ngồi vào ghế làm việc!
        capy.state = CapyState.WORKING;
        capy.x = desk.x;
        capy.y = groundY;
        spawnWakeStars(desk.x + DESK_W / 2, groundY - 40);

        if (orange.state === 'ON_HEAD') {
          dropOrange(-1, -3.2);
          orange.x = desk.x + 20;
          orange.y = groundY - WORK_H + 10;
        }

        if (settings.computerMode === 'chill') {
          showSpeechBubble(Messages.workChill, 3500, false);
        } else if (settings.workFocusEnabled) {
          workSessionActive = true;
          workSessionStartTime = Date.now();
          const durText = (settings.workDurationSec < 60)
            ? `${settings.workDurationSec} giây (Test)`
            : (settings.workDurationSec < 3600)
              ? `${Math.round(settings.workDurationSec / 60)} phút`
              : `${Math.round(settings.workDurationSec / 3600)} tiếng`;
          showSpeechBubble(Messages.workStart(durText), 3500, false);
        }
      }
      break;
    }

    // B0. CHẠY SIÊU NHANH VỀ PHÍA BÊN PHẢI ĐỂ ĐÓN XÔ TẮM (TỐC ĐỘ GẤP ĐÔI HIỆN TẠI ~ 4X BÌNH THƯỜNG)
    case CapyState.FETCHING_TUB: {
      const fetchSpeed = Math.max(2.8, capy.speed * 4);
      capy.facing = 1;
      capy.x += fetchSpeed;
      capy.walkPhase += 0.28;

      const targetBehindTub = tub.x + tub.width + 21;
      if (capy.x >= targetBehindTub) {
        capy.x = targetBehindTub;
        capy.facing = -1;
        capy.state = CapyState.PUSHING_TUB;
      }
      break;
    }

    // B. ĐẨY BỒN TẮM ONSEN TỪ PHẢI SANG TRÁI BẰNG ĐẦU
    case CapyState.PUSHING_TUB: {
      const pushSpeed = 1.35;
      tub.x -= pushSpeed;
      // Xô ở bên trái, Capy ở ngay sát bên phải cách ra 1 chút xíu, đầu chúc sang trái đẩy
      capy.facing = -1;
      capy.x = tub.x + tub.width + 21;
      capy.walkPhase += 0.12;

      // Đã đẩy tới vị trí đích
      if (tub.x <= tub.targetX) {
        tub.x = tub.targetX;
        // Capybara nhảy vào ngâm bồn!
        capy.state = CapyState.BATHING;
        capy.facing = -1;
        capy.x = tub.x + tub.width / 2;
        capy.y = groundY;
        bathStartTime = Date.now();
        bathRelaxSpoken = false;
        spawnWakeStars(tub.x + tub.width / 2, groundY - 30);

        if (orange.state === 'ON_HEAD') {
          dropOrange(-1, -3.2);
          orange.x = tub.x - 14;
          orange.y = tub.y + 15;
        }
      }
      break;
    }

    // C0. ĐI DẦN VỀ HƯỚNG BÀN ĐỂ CẤT ĐI (TỐC ĐỘ NHANH GỌN THAY VÌ TELEPORT)
    case CapyState.APPROACHING_DESK: {
      if (!desk.visible) {
        capy.state = CapyState.WALK_LEFT;
        capy.facing = -1;
        retractTarget = null;
        break;
      }
      const approachSpeed = Math.max(2.4, capy.speed * 3.5);
      const targetX = desk.x - 21;
      const dist = targetX - capy.x;
      capy.walkPhase += 0.24;

      if (Math.abs(dist) <= approachSpeed) {
        capy.x = targetX;
        capy.facing = 1;
        capy.state = CapyState.RETRACTING_DESK;
      } else if (dist > 0) {
        capy.facing = 1;
        capy.x += approachSpeed;
      } else {
        capy.facing = -1;
        capy.x -= approachSpeed;
      }
      break;
    }

    // C. ĐẨY BÀN LÀM VIỆC TỪ TRÁI SANG PHẢI RA NGOÀI MÀN HÌNH ĐỂ CẤT ĐI
    case CapyState.RETRACTING_DESK: {
      const pushSpeed = 1.45;
      desk.x += pushSpeed;
      // Capy ở bên trái bàn, mặt hướng sang phải (+1), đầu chạm mép trái của bàn đẩy đi
      capy.facing = 1;
      capy.x = desk.x - 21;
      capy.walkPhase += 0.12;

      // Khi bàn đã ra khỏi mép phải màn hình
      if (desk.x >= canvas.width + 15) {
        desk.visible = false;
        retractTarget = null;
        const nextAct = nextActionAfterRetract;
        nextActionAfterRetract = null;

        if (nextAct === 'bath') triggerBath();
        else if (nextAct === 'work') triggerWork();
        else if (nextAct === 'hide') triggerHide();
        else if (nextAct === 'roam') triggerRoam();
        else if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
          capy.state = CapyState.LOST_ORANGE;
          capy.lostOrangeTimer = 0;
          capy.walkPhase = 0;
          zzzParticles.length = 0;
        } else {
          capy.state = CapyState.WALK_LEFT;
          capy.facing = -1;
        }
      }
      break;
    }

    // D0. ĐI DẦN VỀ HƯỚNG XÔ ĐỂ CẤT ĐI (TỐC ĐỘ NHANH GỌN THAY VÌ TELEPORT)
    case CapyState.APPROACHING_TUB: {
      if (!tub.visible) {
        capy.state = CapyState.WALK_LEFT;
        capy.facing = -1;
        retractTarget = null;
        break;
      }
      const approachSpeed = Math.max(2.4, capy.speed * 3.5);
      const targetX = tub.x - 21;
      const dist = targetX - capy.x;
      capy.walkPhase += 0.24;

      if (Math.abs(dist) <= approachSpeed) {
        capy.x = targetX;
        capy.facing = 1;
        capy.state = CapyState.RETRACTING_TUB;
      } else if (dist > 0) {
        capy.facing = 1;
        capy.x += approachSpeed;
      } else {
        capy.facing = -1;
        capy.x -= approachSpeed;
      }
      break;
    }

    // D. ĐẨY XÔ TẮM ONSEN TỪ TRÁI SANG PHẢI RA NGOÀI MÀN HÌNH ĐỂ CẤT ĐI
    case CapyState.RETRACTING_TUB: {
      const pushSpeed = 1.45;
      tub.x += pushSpeed;
      // Capy ở bên trái xô, mặt hướng sang phải (+1), đầu chạm mép trái của xô đẩy đi
      capy.facing = 1;
      capy.x = tub.x - 21;
      capy.walkPhase += 0.12;

      // Khi xô đã ra khỏi mép phải màn hình
      if (tub.x >= canvas.width + 15) {
        tub.visible = false;
        retractTarget = null;
        const nextAct = nextActionAfterRetract;
        nextActionAfterRetract = null;

        if (nextAct === 'bath') triggerBath();
        else if (nextAct === 'work') triggerWork();
        else if (nextAct === 'hide') triggerHide();
        else if (nextAct === 'roam') triggerRoam();
        else if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
          capy.state = CapyState.LOST_ORANGE;
          capy.lostOrangeTimer = 0;
          capy.walkPhase = 0;
          zzzParticles.length = 0;
        } else {
          capy.state = CapyState.WALK_LEFT;
          capy.facing = -1;
        }
      }
      break;
    }

    case CapyState.JUMPING:
      if (typeof updateCapyJump === 'function') updateCapyJump();
      break;

    case CapyState.WOOD_LOG_INTERACT:
      if (typeof updateCapyWoodLogInteract === 'function') updateCapyWoodLogInteract();
      break;

    case CapyState.FETCHING_WATER_GLASS:
    case CapyState.PUSHING_WATER_GLASS:
    case CapyState.WAITING_WATER_DRINK:
    case CapyState.RETRACTING_WATER_GLASS:
    case CapyState.RETURNING_TO_TUB:
    case CapyState.RETURNING_TO_DESK:
      if (typeof updateWaterReminderSystem === 'function') updateWaterReminderSystem();
      break;

    case CapyState.WORKING:
      // Đang ngồi làm việc trước laptop
      break;

    case CapyState.BATHING:
      if (bathStartTime === 0) {
        bathStartTime = Date.now();
        bathRelaxSpoken = false;
        lastBathQuoteEndTime = Date.now() - 5000;
      } else if (!bathRelaxSpoken && Date.now() - bathStartTime >= 2500) {
        bathRelaxSpoken = true;
        const initialQuote = (Messages.bathQuotes && Messages.bathQuotes.length > 0) ? Messages.bathQuotes[0] : Messages.bathRelax;
        lastSpokenBathQuote = initialQuote;
        showSpeechBubble(initialQuote, 5000, false);
        spawnWakeStars(tub.x + tub.width / 2, tub.y + 10);
        lastBathQuoteEndTime = Date.now() + 5000;
      }
      break;

    case CapyState.FALLING: {
      const startY = (typeof capy.fallStartY === 'number') ? capy.fallStartY : (groundY - 100);
      const totalFallDist = Math.max(1, groundY - startY);
      const fallenDist = capy.y - startY;
      const fallRatio = Math.max(0, fallenDist / totalFallDist);

      // Nếu kéo nhấc lên thấp (<= 30% màn hình): Rơi thẳng xuống tiếp đất bình thường, không bung dù
      if (!capy.fallingFromHigh) {
        capy.vy += 0.55;
      }
      // Nếu kéo lên cao (> 30% màn hình): Rơi 30% quãng đường đầu tự do, sau đó bung dù hạ cánh
      else if (fallRatio < 0.30) {
        capy.vy += 0.55; // Trọng lực rơi nhanh
      } else {
        // Đã qua 30% quãng đường & Rơi từ trên cao: Bung dù hãm phanh
        if (!capy.hasSpokenDizzyQuote) {
          capy.hasSpokenDizzyQuote = true;
          if (typeof showSpeechBubble === 'function' && Messages.wakeDizzyQuotes && Messages.wakeDizzyQuotes.length > 0) {
            const quote = Messages.wakeDizzyQuotes[Math.floor(Math.random() * Messages.wakeDizzyQuotes.length)];
            showSpeechBubble(quote, 2500, false);
          }
        }
        capy.vy = Math.min(capy.vy + 0.12, 2.2);
        // Capybara lắc đung đưa nhẹ xíu (không lắc dù)
        capy.x += Math.sin(Date.now() * 0.008) * 0.7;
      }
      capy.y += capy.vy;
      capy.walkPhase += 0.08;

      if (capy.y >= groundY) {
        capy.y = groundY;
        capy.vy = 0;
        capy.fallStartY = undefined;
        capy.hasSpokenDizzyQuote = false;

        // Tiếp đất nhẹ nhàng bằng chân ở trạng thái bình thản (không hiện message nữa)
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;

        if (capy.fallingFromHigh) {
          capy.fallingFromHigh = false;
        } else if (capy.droppedFromLow) {
          capy.droppedFromLow = false;
          capy.angryUntil = Date.now() + 3000;
          if (Messages.dropLowQuotes && Messages.dropLowQuotes.length > 0) {
            const quote = Messages.dropLowQuotes[Math.floor(Math.random() * Messages.dropLowQuotes.length)];
            showSpeechBubble(quote, 3000, true);
          }
        }
      }
      break;
    }

    case CapyState.LOST_ORANGE:
      capy.lostOrangeTimer++;
      if (capy.lostOrangeTimer >= 180) {
        capy.state = CapyState.SLEEPING;
        showSpeechBubble(Messages.sleepAfterLostOrange || 'Đèo mẹ, ngủ thôi', 3500, false);
      }
      break;

    case CapyState.SLEEPING:
      break;

    case CapyState.DRAGGED:
      capy.walkPhase += 0.06;
      break;

    // E. CHẠY NHANH SANG GÓC PHẢI ĐỂ TRỐN (HỞ 10% PHẦN ĐÍT)
    case CapyState.HIDING_RUN: {
      capy.facing = 1;
      const hideSpeed = Math.max(3.2, capy.speed * 4.2);
      capy.x += hideSpeed;
      capy.walkPhase += 0.28;

      const hideExposedW = 9; // Hở ~10% phần đít (khoảng 8-9px) ở góc phải
      const targetX = canvas.width - hideExposedW + RENDER_W / 2;

      if (capy.x >= targetX) {
        capy.x = targetX;
        capy.state = CapyState.HIDDEN;
        capy.walkPhase = 0;
        showSpeechBubble(Messages.hideQuote || 'Chắc ko ai thấy mình', 3000, false);
      }
      break;
    }

    case CapyState.HIDDEN:
      capy.walkPhase = 0;
      capy.facing = 1;
      break;

    case CapyState.LEAVING_RUNAWAY: {
      capy.facing = -1;
      capy.x -= 2.2;
      capy.walkPhase += 0.22;
      if (capy.x < -80) {
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('panel-quit-app');
        } catch (e) {
          window.close();
        }
      }
      break;
    }
  }
}

// 14b. CẬP NHẬT ĐỒNG HỒ LÀM VIỆC & NHẮC NƯỚC
function updateWorkAndHydrationTimers() {
  // Khi đang trốn: tuyệt đối không can thiệp hay nhắc giờ làm việc / nhắc uống nước
  if (capy.state === CapyState.HIDING_RUN || capy.state === CapyState.HIDDEN) {
    return;
  }

  // 1. Kiểm tra phiên làm việc tập trung
  if (workSessionActive && capy.state === CapyState.WORKING) {
    const elapsed = Math.floor((Date.now() - workSessionStartTime) / 1000);
    if (elapsed >= settings.workDurationSec) {
      workSessionActive = false;
      updateDashboardUI('roam');
      capy.state = CapyState.IDLE_RIGHT;
      capy.facing = 1;
      capy.y = groundY;
      showSpeechBubble(Messages.workGiveUp, 4500, false);
      spawnWakeStars(desk.x + 36, groundY - 30);
      retractWaitTimer = 120;
      retractTarget = 'desk';
    }
  }

  // 2. Kiểm tra chu kỳ nhắc uống nước
  const nowMs = Date.now();
  if (!waterReminderActive && (nowMs - lastWaterReminderTime) >= settings.waterIntervalSec * 1000) {
    if (typeof startWaterReminder === 'function') {
      startWaterReminder();
    } else {
      waterReminderActive = true;
    }
  }
}

// 15. VÒNG LẶP CHÍNH (TỐI ƯU HÓA CPU: KHÓA 45 FPS & DIRTY RECTANGLE CLEAR)
let lastFrameTimestamp = 0;
let needsFullClear = true;

function loop(timestamp) {
  requestAnimationFrame(loop);

  if (!timestamp) timestamp = performance.now();
  const elapsed = timestamp - lastFrameTimestamp;
  if (elapsed < FRAME_DURATION - 2) {
    return;
  }
  lastFrameTimestamp = timestamp;

  // Xóa màn hình thông minh (Dirty Clear):
  // 99% thời gian Capybara ở mặt đất (y >= groundY - 180). Chỉ xóa dải sàn dưới đáy màn hình thay vì toàn bộ màn hình 2K/4K.
  const isHighAction = (
    isDraggingCapy ||
    capy.state === CapyState.FALLING ||
    capy.state === CapyState.JUMPING ||
    capy.state === CapyState.WOOD_LOG_INTERACT ||
    capy.y < groundY - 20 ||
    orange.state === 'FALLING' ||
    capyOrangeCount >= 3 ||
    groundOranges.length > 0 ||
    (typeof isWoodLogFlying === 'function' && isWoodLogFlying()) ||
    (typeof droppedFoods !== 'undefined' && droppedFoods.some(f => f.state === 'FALLING_WITH_PARACHUTE' || f.y < groundY - 320))
  );

  if (isHighAction || needsFullClear) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    needsFullClear = isHighAction;
  } else {
    const stripH = 350;
    ctx.clearRect(0, groundY - stripH, canvas.width, stripH + 20);
  }

  updateWorkAndHydrationTimers();
  updateCapy();
  if (typeof updateGateSystem === 'function') updateGateSystem();
  if (typeof updateFeedingSystem === 'function') updateFeedingSystem();
  updateRoamRandomQuotes();
  updateWorkRandomQuotes();
  updateBathRandomQuotes();
  if (typeof updateWoodLog === 'function') updateWoodLog();
  updateOrange();
  updateZzz();
  updateSteam();
  updateImpactParticles();

  // 1. Vẽ bồn tắm (kèm bình nước bên trái nếu có nhắc nước)
  drawTubAndBath(ctx);

  // 2. Vẽ bàn làm việc & ghế xoay (kèm đồng hồ cát và bình nước trên bàn nếu có nhắc)
  drawDesk(ctx);

  // 2.5. Vẽ khúc gỗ chướng ngại vật (vẽ trước Capy để Capy nhảy đè lên phía trên)
  if (typeof drawWoodLog === 'function') drawWoodLog(ctx);

  // 2.8. Vẽ Cổng dịch chuyển không gian (Gate)
  if (typeof drawGateSystem === 'function') drawGateSystem(ctx);

  // 3. Vẽ Capybara bên ngoài (đi / đứng / đẩy / rơi / ngã / nhảy)
  drawCapybaraOutside(ctx);

  // 3.5. Vẽ Bảng đòi ăn trên đầu Capy khi đang đói
  if (typeof drawFeedingSystem === 'function') drawFeedingSystem(ctx);

  // KHI NHẮC UỐNG NƯỚC: VẼ LY NƯỚC KHỔNG LỒ & NÚT BẤM "UỐNG NGAY ĐI BRO"
  if (typeof drawWaterReminderSystem === 'function') {
    drawWaterReminderSystem(ctx);
  }

  // 4. Hiệu ứng va đập / Thức dậy
  drawImpactParticles(ctx);

  // 5. Hơi nước Onsen
  drawSteam(ctx);

  // 6. Quả cam
  drawOrange(ctx);

  // 7. Lời nhắc thoại (Speech bubble)
  drawSpeechBubbleUI(ctx);
}

// 16. KHỞI CHẠY SAU KHI TẢI ĐỦ 9 ẢNH
let loadedCount = 0;
function checkStart() {
  loadedCount++;
  if (loadedCount >= 9) {
    console.log('Capybara da tai xong 9 anh va bat dau di dao tren desktop!');
    setMouseIgnore(true);
    lastWaterReminderTime = Date.now();
    requestAnimationFrame(loop);
  }
}

if (spriteSheet.complete) checkStart(); else spriteSheet.onload = checkStart;
if (orangeImg.complete) checkStart(); else orangeImg.onload = checkStart;
if (sleepImg.complete) checkStart(); else sleepImg.onload = checkStart;
if (tubImg.complete) checkStart(); else tubImg.onload = checkStart;
if (tubBathImg.complete) checkStart(); else tubBathImg.onload = checkStart;
if (parachuteImg.complete) checkStart(); else parachuteImg.onload = checkStart;
if (deskImg.complete) checkStart(); else deskImg.onload = checkStart;
if (workImg.complete) checkStart(); else workImg.onload = checkStart;
if (bottleImg.complete) checkStart(); else bottleImg.onload = checkStart;
