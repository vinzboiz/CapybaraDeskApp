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
let groundY = window.innerHeight - 3;
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
spriteSheet.src = 'assets/capy_spritesheet.png?v=' + Date.now();

const orangeImg = new Image();
orangeImg.src = 'assets/orange.png?v=' + Date.now();

const sleepImg = new Image();
sleepImg.src = 'assets/capy_sleep.png?v=' + Date.now();

const tubImg = new Image();
tubImg.src = 'assets/tub.png?v=' + Date.now();

const tubBathImg = new Image();
tubBathImg.src = 'assets/tub_bath.png?v=' + Date.now();

const fallenImg = new Image();
fallenImg.src = 'assets/capy_fallen.png?v=' + Date.now();

const deskImg = new Image();
deskImg.src = 'assets/capy_desk.png?v=' + Date.now();

const workImg = new Image();
workImg.src = 'assets/capy_work.png?v=' + Date.now();

const bottleImg = new Image();
bottleImg.src = 'assets/bottle.png?v=' + Date.now();

// Kích thước chuẩn
const FRAME_W = 420;
const FRAME_H = 380;
const RENDER_W = 56;
const RENDER_H = 50;
const SLEEP_W = 60;
const SLEEP_H = 47;
const FALLEN_W = 68;
const FALLEN_H = 48;

// Kích thước Bàn làm việc & Ghế xoay
const DESK_W = 76;
const DESK_H = 76;
const WORK_H = 82; // Chiều cao ảnh khi có Capy ngồi

// Bồn tắm Onsen
const tub = {
  width: 66,
  height: 69,
  x: -999,
  y: groundY - 69,
  visible: false,
  targetX: 0
};

// Bàn làm việc
const desk = {
  width: DESK_W,
  height: DESK_H,
  x: -999,
  y: groundY - DESK_H,
  visible: false,
  targetX: 0
};

// 3. MÁY TRẠNG THÁI CAPYBARA
const CapyState = {
  WALK_RIGHT: 'WALK_RIGHT',
  IDLE_RIGHT: 'IDLE_RIGHT',
  WALK_LEFT: 'WALK_LEFT',
  IDLE_LEFT: 'IDLE_LEFT',
  DRAGGED: 'DRAGGED',
  FALLING: 'FALLING',
  DIZZY: 'DIZZY',
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
  HIDDEN: 'HIDDEN'                      // Đang trốn ở góc phải, hở 10% phần đít
};

// Biến đếm dừng lại để nói chuyện trước khi cất bàn/xô
let retractWaitTimer = 0;
let retractTarget = null; // 'desk' hoặc 'tub'
let bathStartTime = 0;
let bathRelaxSpoken = false;

const capy = {
  x: Math.max(60, window.innerWidth - 280),
  y: groundY,
  speed: 0.55,
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

// 4. QUẢ CAM
const orange = {
  x: capy.x,
  y: groundY - RENDER_H - 12,
  vx: 0,
  vy: 0,
  width: 18,
  height: 19,
  state: 'ON_HEAD',
  bounceCount: 0,
  rotation: 0,
  rotSpeed: 0
};

// 5. HIỆU ỨNG HẠT
const zzzParticles = [];
let zzzSpawnTimer = 0;
function updateZzz() {
  if (capy.state === CapyState.SLEEPING) {
    zzzSpawnTimer++;
    if (zzzSpawnTimer >= 36) {
      zzzSpawnTimer = 0;
      zzzParticles.push({
        x: 25,
        y: -30,
        text: Math.random() > 0.4 ? 'z' : 'Z',
        opacity: 0.9,
        vy: -0.45,
        vx: 0.28
      });
    }
  }
  for (let i = zzzParticles.length - 1; i >= 0; i--) {
    const p = zzzParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.opacity -= 0.007;
    if (p.opacity <= 0) zzzParticles.splice(i, 1);
  }
}
function drawZzz(c) {
  c.save();
  c.font = 'bold 12px "Courier New", monospace';
  for (const p of zzzParticles) {
    c.fillStyle = `rgba(100, 180, 255, ${p.opacity})`;
    c.fillText(p.text, p.x, p.y);
  }
  c.restore();
}

const steamParticles = [];
let steamTimer = 0;
function updateSteam() {
  if (capy.state === CapyState.BATHING && tub.visible) {
    steamTimer++;
    if (steamTimer >= 22) {
      steamTimer = 0;
      steamParticles.push({
        x: tub.x + 16 + Math.random() * (tub.width - 32),
        y: tub.y + 14,
        radius: Math.random() * 3 + 2.5,
        opacity: 0.75,
        vy: -(Math.random() * 0.35 + 0.35),
        vx: (Math.random() - 0.5) * 0.3
      });
    }
  }
  for (let i = steamParticles.length - 1; i >= 0; i--) {
    const s = steamParticles[i];
    s.x += s.vx;
    s.y += s.vy;
    s.radius += 0.04;
    s.opacity -= 0.012;
    if (s.opacity <= 0) steamParticles.splice(i, 1);
  }
}
function drawSteam(c) {
  if (steamParticles.length === 0) return;
  c.save();
  for (const s of steamParticles) {
    c.fillStyle = `rgba(255, 255, 255, ${s.opacity * 0.55})`;
    c.beginPath();
    c.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

const impactStars = [];
function spawnImpactStars(x, y) {
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 / 7) * i + Math.random() * 0.2;
    const speed = Math.random() * 2.5 + 1.8;
    impactStars.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 26, maxLife: 26,
      size: Math.random() * 3 + 3,
      color: Math.random() > 0.5 ? '#FFD700' : '#FFA500'
    });
  }
}

function spawnWakeStars(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    impactStars.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      life: 20, maxLife: 20,
      size: Math.random() * 3 + 2.5,
      color: '#64B5F6'
    });
  }
}

function updateImpactParticles() {
  for (let i = impactStars.length - 1; i >= 0; i--) {
    const p = impactStars[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) impactStars.splice(i, 1);
  }
}

function drawImpactParticles(c) {
  for (const p of impactStars) {
    const alpha = p.life / p.maxLife;
    c.save();
    c.fillStyle = p.color;
    c.globalAlpha = alpha;
    c.beginPath();
    c.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// 6. CƠ CHẾ CLICK-THROUGH
let isDraggingCapy = false;
let isDraggingTub = false;
let isDraggingDesk = false;
let isDraggingDash = false;
let dashDragCandidate = false;
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

  // 8. Bình nước (khi có lời nhắc uống nước)
  if (waterReminderActive) {
    let bx = 0, by = 0;
    if (capy.state === CapyState.WORKING && desk.visible) {
      bx = desk.x + 53; by = groundY - 44;
    } else if (tub.visible) {
      bx = tub.x - 22; by = groundY - 3;
    } else {
      bx = (capy.facing === 1) ? (capy.x + 28) : (capy.x - 28 - 14);
      by = groundY - 3;
    }
    if (mx >= bx - 8 && mx <= bx + 22 && my >= by - 36 && my <= by + 8) {
      return true;
    }
  }

  return false;
}

function dropOrange(dir = 1, impulseY = -3.8) {
  if (orange.state !== 'ON_HEAD') return;
  orange.state = 'FALLING';
  orange.vx = dir * 2.4;
  orange.vy = impulseY;
  orange.rotSpeed = dir * 0.18;
  orange.bounceCount = 0;

  // Khi click vào quả cam trên đầu hoặc đẩy đồ: không hiện ? ngay lập tức.
  // Capy sẽ tiếp tục bước đi rồi mới ngơ ngác tìm cam sau khoảng 2s tự nhiên.
  if (!capy.lostNoticeTimer) capy.lostNoticeTimer = 0;
}

// 7. CẤU HÌNH CÀI ĐẶT & THỜI GIAN LÀM VIỆC / UỐNG NƯỚC / TỐC ĐỘ CHẠY / CHẾ ĐỘ NGỒI MÁY
const SETTINGS_KEY = 'capy_pet_settings_v2';
let settings = {
  workFocusEnabled: true,
  workDurationSec: 3600, // Mặc định 1 tiếng (30s, 15p, 30p, 1h, 2h... 8h)
  waterIntervalSec: 3600, // Mặc định 1 tiếng
  walkSpeed: 0.55,        // Tốc độ đi dạo mặc định
  computerMode: 'focus'   // 'focus' (Làm việc tập trung) hoặc 'chill' (Chỉ ngồi máy tính lướt web)
};

try {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    settings = Object.assign(settings, JSON.parse(saved));
    if (typeof settings.walkSpeed === 'number') {
      capy.speed = settings.walkSpeed;
    }
  }
} catch (e) {
  console.warn('Lỗi đọc settings:', e);
}

// Biến trạng thái chu kỳ nước & phiên làm việc
let lastWaterReminderTime = Date.now();
let waterReminderActive = false;
let workSessionStartTime = 0;
let workSessionActive = false;

// Trạng thái lời nói (Speech bubble)
let speechBubble = {
  text: '',
  active: false,
  expiresAt: 0,
  persistent: false,
  isWarning: false
};

function showSpeechBubble(text, durationMs = 3000, isWarning = false) {
  speechBubble.text = text;
  speechBubble.active = true;
  speechBubble.persistent = (durationMs === 0);
  speechBubble.expiresAt = (durationMs > 0) ? (Date.now() + durationMs) : 0;
  speechBubble.isWarning = isWarning;
}

function clearSpeechBubble() {
  speechBubble.active = false;
  speechBubble.text = '';
  speechBubble.persistent = false;
}

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

// 7. ĐIỀU KHIỂN DASHBOARD
const btnRoam = document.getElementById('btn-roam');
const btnBath = document.getElementById('btn-bath');
const btnWork = document.getElementById('btn-work');
const btnHide = document.getElementById('btn-hide');
const btnToggleDash = document.getElementById('btn-toggle-dash');
const btnSettings = document.getElementById('btn-settings');
const settingsModalEl = document.getElementById('settings-modal');
const modalCloseBtn = document.getElementById('modal-close');
const btnSaveSettings = document.getElementById('btn-save-settings');
const workFocusToggle = document.getElementById('work-focus-toggle');
const workDurationSelect = document.getElementById('work-duration-select');
const waterIntervalSelect = document.getElementById('water-interval-select');
const walkSpeedSelect = document.getElementById('walk-speed-select');
const computerModeSelect = document.getElementById('computer-mode-select');
const btnCancelWork = document.getElementById('btn-cancel-work');
const workStatusText = document.getElementById('work-status-text');

function updateDashboardUI(activeType) {
  btnRoam.classList.remove('active');
  btnBath.classList.remove('active', 'bath');
  btnWork.classList.remove('active', 'work');
  if (btnHide) btnHide.classList.remove('active', 'hide');

  if (activeType === 'roam') {
    btnRoam.classList.add('active');
  } else if (activeType === 'bath') {
    btnBath.classList.add('active', 'bath');
  } else if (activeType === 'work') {
    btnWork.classList.add('active', 'work');
  } else if (activeType === 'hide') {
    if (btnHide) btnHide.classList.add('active', 'hide');
  }
}

// Cập nhật giá trị vào modal form
function syncSettingsToUI() {
  if (workFocusToggle) workFocusToggle.checked = !!settings.workFocusEnabled;
  if (workDurationSelect) workDurationSelect.value = String(settings.workDurationSec || 3600);
  if (waterIntervalSelect) waterIntervalSelect.value = String(settings.waterIntervalSec || 3600);
  if (walkSpeedSelect) walkSpeedSelect.value = String(settings.walkSpeed || 0.55);
  if (computerModeSelect) computerModeSelect.value = settings.computerMode || 'focus';

  if (workStatusText) {
    if (settings.computerMode === 'chill') {
      workStatusText.textContent = '☕ Chế độ ngồi chill: Capy chỉ ngồi máy tính thư thái, không đếm giờ & không mồ hôi.';
    } else if (!settings.workFocusEnabled) {
      workStatusText.textContent = 'Khóa làm việc đang tắt. Capy tự do đổi chế độ.';
    } else if (isWorkSessionLocked()) {
      const timeStr = getWorkRemainingTimeString();
      workStatusText.textContent = `💻 Đang trong giờ làm việc (Còn ${timeStr}).`;
    } else {
      const durText = (settings.workDurationSec < 60)
        ? `${settings.workDurationSec} giây (Test)`
        : (settings.workDurationSec < 3600)
          ? `${Math.round(settings.workDurationSec / 60)} phút`
          : `${Math.round(settings.workDurationSec / 3600)} tiếng`;
      workStatusText.textContent = `🌱 Đã sẵn sàng. Thời gian làm việc ${durText}.`;
    }
  }
}
syncSettingsToUI();

// Khi nhấn "Làm việc"
function triggerWork() {
  if (
    capy.state === CapyState.WORKING ||
    capy.state === CapyState.PUSHING_DESK ||
    capy.state === CapyState.FETCHING_DESK
  ) return;

  updateDashboardUI('work');
  tub.visible = false; // Ẩn bồn tắm nếu có
  retractTarget = null;
  retractWaitTimer = 0;

  // Khởi động phiên làm việc tập trung
  if (settings.workFocusEnabled && !workSessionActive) {
    workSessionActive = true;
    workSessionStartTime = Date.now();
  }

  const targetX = Math.max(120, canvas.width - 155);
  desk.targetX = targetX;

  // Nếu bàn đã ở vị trí sẵn: Capy chỉ việc chạy tới ngồi vào bàn
  if (desk.visible && Math.abs(desk.x - targetX) < 10) {
    capy.state = CapyState.WORKING;
    capy.x = desk.x;
    capy.y = groundY;
    if (settings.computerMode === 'chill') {
      showSpeechBubble(Messages.workChill, 3500, false);
    } else {
      const durText = (settings.workDurationSec < 60)
        ? `${settings.workDurationSec} giây (Test)`
        : (settings.workDurationSec < 3600)
          ? `${Math.round(settings.workDurationSec / 60)} phút`
          : `${Math.round(settings.workDurationSec / 3600)} tiếng`;
      showSpeechBubble(Messages.workStart(durText), 3500, false);
    }
    return;
  }

  // Đặt bàn ngoài mép phải màn hình
  desk.visible = true;
  desk.x = canvas.width + 10;
  desk.y = groundY - DESK_H;

  // Capybara KHÔNG teleport ra ngoài mép phải!
  // Capybara quay sang phải và đi nhanh về phía bên phải để đón và đẩy bàn ra ngoài màn hình vào
  capy.facing = 1;
  capy.y = groundY;
  capy.vy = 0;
  capy.state = CapyState.FETCHING_DESK;
  showSpeechBubble(Messages.fetchDesk, 3500, false);
}

// Khi nhấn "Đi tắm"
function triggerBath() {
  // KHÓA LÀM VIỆC TẬP TRUNG: Nếu đang trong phiên làm việc thì không cho đi tắm
  if (isWorkSessionLocked()) {
    const timeStr = getWorkRemainingTimeString();
    showSpeechBubble(Messages.workRemainingWarning(timeStr), 3200, true);
    return;
  }

  if (
    capy.state === CapyState.BATHING ||
    capy.state === CapyState.PUSHING_TUB ||
    capy.state === CapyState.FETCHING_TUB
  ) return;

  updateDashboardUI('bath');
  desk.visible = false; // Ẩn bàn làm việc nếu có
  retractTarget = null;
  retractWaitTimer = 0;

  const targetX = Math.max(120, canvas.width - 145);
  tub.targetX = targetX;

  // Nếu bồn tắm đã ở vị trí sẵn: Capy nhảy vào ngâm bồn
  if (tub.visible && Math.abs(tub.x - targetX) < 10) {
    capy.state = CapyState.BATHING;
    capy.facing = -1;
    capy.x = tub.x + tub.width / 2;
    capy.y = groundY;
    if (orange.state === 'ON_HEAD') {
      dropOrange(-1, -3.2);
      orange.x = tub.x - 14;
      orange.y = tub.y + 15;
    }
    return;
  }

  // Đặt xô ngoài mép phải màn hình
  tub.visible = true;
  tub.x = canvas.width + 10;
  tub.y = groundY - tub.height;

  // Capybara KHÔNG teleport ra ngoài mép phải!
  // Capybara quay sang phải và đi nhanh về phía bên phải để đón và đẩy xô ra
  capy.facing = 1;
  capy.y = groundY;
  capy.vy = 0;
  capy.state = CapyState.FETCHING_TUB;
  showSpeechBubble(Messages.fetchTub, 3500, false);
}

// Khi nhấn "Đi dạo"
function triggerRoam() {
  // KHÓA LÀM VIỆC TẬP TRUNG: Nếu đang trong phiên làm việc thì không cho đi dạo
  if (isWorkSessionLocked()) {
    const timeStr = getWorkRemainingTimeString();
    showSpeechBubble(Messages.workRemainingWarning(timeStr), 3200, true);
    return;
  }

  clearSpeechBubble();
  updateDashboardUI('roam');

  if (capy.state === CapyState.WORKING || (desk.visible && desk.x < canvas.width)) {
    // Đứng tại chỗ hiện tại, hiện message rồi cất bàn đi
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    retractWaitTimer = 110;
    retractTarget = 'desk';
  } else if (capy.state === CapyState.BATHING || (tub.visible && tub.x < canvas.width)) {
    // Đứng tại chỗ hiện tại, nói "nóng vãi chưởng ra thôi" rồi cất xô đi
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    showSpeechBubble(Messages.bathTooHot, 3200, false);
    retractWaitTimer = 110;
    retractTarget = 'tub';
    if (orange.state !== 'ON_HEAD') {
      orange.state = 'RETURNING';
    }
  } else if (capy.state === CapyState.DIZZY || capy.state === CapyState.SLEEPING) {
    capy.state = CapyState.WALK_LEFT;
    capy.facing = -1;
    capy.y = groundY;
  } else {
    desk.visible = false;
    tub.visible = false;
    retractTarget = null;
    retractWaitTimer = 0;
    capy.state = CapyState.WALK_LEFT;
    capy.facing = -1;
    capy.y = groundY;
  }
}

// Kéo thả thanh Dashboard (Tabboard) & Ngăn kích hoạt click nhầm khi kéo
let hasMovedDash = false;
let preventBtnClick = false;
let dashDragStartX = 0;
let dashDragStartY = 0;
let dashElemStartX = 0;
let dashElemStartY = 0;

btnWork.addEventListener('click', (e) => {
  e.stopPropagation();
  if (preventBtnClick) return;
  triggerWork();
});
btnBath.addEventListener('click', (e) => {
  e.stopPropagation();
  if (preventBtnClick) return;
  triggerBath();
});
btnRoam.addEventListener('click', (e) => {
  e.stopPropagation();
  if (preventBtnClick) return;
  triggerRoam();
});
if (btnHide) {
  btnHide.addEventListener('click', (e) => {
    e.stopPropagation();
    if (preventBtnClick) return;
    triggerHide();
  });
}

// Khi nhấn "Trốn"
function triggerHide() {
  if (isWorkSessionLocked()) {
    const timeStr = getWorkRemainingTimeString();
    showSpeechBubble(Messages.workRemainingWarning(timeStr), 3200, true);
    return;
  }

  // Tắt mọi text và nhắc nhở đang có, hoãn chu kỳ nước
  clearSpeechBubble();
  waterReminderActive = false;
  lastWaterReminderTime = Date.now();

  updateDashboardUI('hide');

  // Đang ngồi làm việc hoặc đang có bàn -> dọn bàn
  if (capy.state === CapyState.WORKING || (desk.visible && desk.x < canvas.width)) {
    desk.visible = false;
    retractTarget = null;
    retractWaitTimer = 0;
  }
  // Đang ngồi tắm hoặc đang có bồn -> dọn bồn
  if (capy.state === CapyState.BATHING || (tub.visible && tub.x < canvas.width)) {
    tub.visible = false;
    retractTarget = null;
    retractWaitTimer = 0;
  }

  capy.state = CapyState.HIDING_RUN;
  capy.facing = 1;
  capy.vy = 0;
  capy.y = groundY;
  capy.walkPhase = 0;
}

// Thu nhỏ / Mở rộng thanh Dashboard (Tabboard)
let isDashCollapsed = false;
try {
  isDashCollapsed = localStorage.getItem('capy_dash_collapsed') === '1';
} catch (e) {}

function setDashboardCollapsed(collapsed) {
  isDashCollapsed = collapsed;
  const dashContainer = document.getElementById('dashboard');
  if (!dashContainer) return;
  if (isDashCollapsed) {
    dashContainer.classList.add('collapsed');
    if (btnToggleDash) {
      btnToggleDash.innerHTML = '<span class="icon">🐾</span>';
      btnToggleDash.title = 'Mở rộng thanh công cụ';
    }
  } else {
    dashContainer.classList.remove('collapsed');
    if (btnToggleDash) {
      btnToggleDash.innerHTML = '<span class="icon">🤏</span>';
      btnToggleDash.title = 'Thu nhỏ thanh công cụ';
    }
  }
  try {
    localStorage.setItem('capy_dash_collapsed', isDashCollapsed ? '1' : '0');
  } catch (e) {}
}

if (btnToggleDash) {
  btnToggleDash.addEventListener('click', (e) => {
    e.stopPropagation();
    if (preventBtnClick) return;
    setDashboardCollapsed(!isDashCollapsed);
  });
}
// Khôi phục trạng thái thu nhỏ ban đầu
setDashboardCollapsed(isDashCollapsed);

// Định vị Modal Cài đặt thông minh bám theo vị trí của Dashboard
function repositionSettingsModal() {
  if (!settingsModalEl || !dashEl) return;
  const dashRect = dashEl.getBoundingClientRect();
  const modalW = settingsModalEl.offsetWidth || 295;
  const modalH = settingsModalEl.offsetHeight || 370;

  // Nếu dashboard nằm ở nửa phải màn hình, mở modal sang bên trái dashboard
  let modalLeft = (dashRect.left > window.innerWidth / 2)
    ? (dashRect.left - modalW - 14)
    : (dashRect.right + 14);

  // Giới hạn trong khung nhìn màn hình
  modalLeft = Math.max(10, Math.min(window.innerWidth - modalW - 10, modalLeft));

  let modalTop = dashRect.top - 20;
  modalTop = Math.max(10, Math.min(window.innerHeight - modalH - 10, modalTop));

  settingsModalEl.style.left = `${modalLeft}px`;
  settingsModalEl.style.top = `${modalTop}px`;
  settingsModalEl.style.right = 'auto';
  settingsModalEl.style.bottom = 'auto';
}

// Khôi phục vị trí Dashboard đã lưu
const DASH_POS_KEY = 'capy_dash_position_v1';
const dashEl = document.getElementById('dashboard');

function restoreDashboardPosition() {
  if (!dashEl) return;
  try {
    const saved = localStorage.getItem(DASH_POS_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        const clampedX = Math.max(5, Math.min(window.innerWidth - 60, pos.x));
        const clampedY = Math.max(5, Math.min(window.innerHeight - 150, pos.y));
        dashEl.style.left = `${clampedX}px`;
        dashEl.style.top = `${clampedY}px`;
        dashEl.style.right = 'auto';
        dashEl.style.bottom = 'auto';
      }
    }
  } catch (err) {
    console.warn('Lỗi khôi phục vị trí dashboard:', err);
  }
}
restoreDashboardPosition();
window.addEventListener('resize', restoreDashboardPosition);

if (dashEl) {
  // Nhấn giữ bất kỳ đâu trên thân Tabboard để bắt đầu kéo
  dashEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dashDragCandidate = true;
    hasMovedDash = false;
    dashDragStartX = e.clientX;
    dashDragStartY = e.clientY;
    const rect = dashEl.getBoundingClientRect();
    dashElemStartX = rect.left;
    dashElemStartY = rect.top;
    setMouseIgnore(false);
  });

  dashEl.addEventListener('mouseenter', () => setMouseIgnore(false));
  dashEl.addEventListener('mouseleave', (e) => {
    if (dashDragCandidate || isDraggingDash) return;
    const mx = e.clientX, my = e.clientY;
    setMouseIgnore(!isOverInteractive(mx, my));
  });
}

// Nút Cài đặt mở Modal
if (btnSettings && settingsModalEl) {
  btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    if (preventBtnClick) return;
    syncSettingsToUI();
    const isHidden = settingsModalEl.classList.contains('modal-hidden');
    if (isHidden) {
      settingsModalEl.classList.remove('modal-hidden');
      repositionSettingsModal();
      setMouseIgnore(false);
    } else {
      settingsModalEl.classList.add('modal-hidden');
    }
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsModalEl.classList.add('modal-hidden');
    });
  }

  // Nút Hủy / Dừng làm việc ngay trong Settings
  if (btnCancelWork) {
    btnCancelWork.addEventListener('click', (e) => {
      e.stopPropagation();
      if (workSessionActive || capy.state === CapyState.WORKING || capy.state === CapyState.PUSHING_DESK || capy.state === CapyState.FETCHING_DESK || desk.visible) {
        workSessionActive = false;
        updateDashboardUI('roam');
        capy.state = CapyState.IDLE_RIGHT;
        capy.facing = 1;
        capy.y = groundY;
        showSpeechBubble(Messages.workEscape, 3500, false);
        retractWaitTimer = 110;
        retractTarget = 'desk';
        settingsModalEl.classList.add('modal-hidden');
      } else {
        showSpeechBubble(Messages.workNoSession, 2500, false);
      }
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      settings.workFocusEnabled = !!workFocusToggle.checked;
      if (workDurationSelect) {
        settings.workDurationSec = parseInt(workDurationSelect.value, 10) || 3600;
      }
      settings.waterIntervalSec = parseInt(waterIntervalSelect.value, 10) || 3600;
      if (walkSpeedSelect) {
        settings.walkSpeed = parseFloat(walkSpeedSelect.value) || 0.55;
        capy.speed = settings.walkSpeed;
      }
      if (computerModeSelect) {
        settings.computerMode = computerModeSelect.value;
      }

      // Lưu trữ
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (err) {
        console.warn('Lỗi lưu cài đặt:', err);
      }

      // Reset đồng hồ nước để chu kỳ mới được áp dụng ngay
      lastWaterReminderTime = Date.now();
      waterReminderActive = false;

      // Cập nhật trạng thái
      syncSettingsToUI();
      settingsModalEl.classList.add('modal-hidden');

      const durText = (settings.workDurationSec < 60)
        ? `${settings.workDurationSec}s (Test)`
        : (settings.workDurationSec < 3600)
          ? `${Math.round(settings.workDurationSec / 60)} phút`
          : `${Math.round(settings.workDurationSec / 3600)} tiếng`;
      const intervalText = (settings.waterIntervalSec < 60)
        ? `${settings.waterIntervalSec}s (Test)`
        : `${Math.round(settings.waterIntervalSec / 60)} phút`;

      if (capy.state === CapyState.WORKING) {
        if (settings.computerMode === 'chill') {
          showSpeechBubble(Messages.settingsSavedChill, 3500, false);
        } else {
          workSessionStartTime = Date.now();
          workSessionActive = true;
          showSpeechBubble(Messages.settingsSavedWork(durText, intervalText), 3500, false);
        }
      } else {
        showSpeechBubble(Messages.settingsSavedSuccess, 3000, false);
      }
    });
  }

  // Bắt chuột trên modal để không bị click xuyên thấu
  settingsModalEl.addEventListener('mouseenter', () => setMouseIgnore(false));
  settingsModalEl.addEventListener('mouseleave', (e) => {
    const mx = e.clientX, my = e.clientY;
    setMouseIgnore(!isOverInteractive(mx, my));
  });
}

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
  if (e.button === 0) {
    const mx = e.clientX;
    const my = e.clientY;

    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    prevDeltaX = 0;

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

    // B. CLICK QUẢ CAM DƯỚI ĐẤT -> BAY VỀ ĐẦU
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      const pad = 14;
      if (
        mx >= orange.x - pad &&
        mx <= orange.x + orange.width + pad &&
        my >= orange.y - pad &&
        my <= orange.y + orange.height + pad
      ) {
        orange.state = 'RETURNING';

        // 1. Nếu đang ngồi tắm: đứng dậy nói "nóng vãi chưởng ra thôi" rồi cất xô đi dạo!
        if (capy.state === CapyState.BATHING) {
          triggerRoam();
        }
        // 2. Nếu đang ngồi máy tính: đứng dậy rời bàn đi dạo!
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

    // B2. XÁC NHẬN ĐÃ UỐNG NƯỚC KHI CLICK VÀO CAPYBARA HOẶC BÀN / XÔ / CHAI NƯỚC
    const bottleW = 14, bottleH = 31;
    let isClickBottle = false;

    if (capy.state === CapyState.WORKING && desk.visible) {
      const bx = desk.x + 53, by = groundY - 44;
      isClickBottle = (mx >= bx - 8 && mx <= bx + bottleW + 8 && my >= by - bottleH - 8 && my <= by + 8);
    } else if (tub.visible) {
      const bx = tub.x - 22, by = groundY - 3;
      isClickBottle = (mx >= bx - 8 && mx <= bx + bottleW + 8 && my >= by - bottleH - 8 && my <= by + 8);
    } else {
      const bx = (capy.facing === 1) ? (capy.x + 28) : (capy.x - 28 - bottleW);
      const by = groundY - 3;
      isClickBottle = (mx >= bx - 8 && mx <= bx + bottleW + 8 && my >= by - bottleH - 8 && my <= by + 8);
    }

    const isNearWaterTarget = isClickBottle || (
      (mx >= capy.x - 45 && mx <= capy.x + 45 && my >= capy.y - 70 && my <= capy.y + 15) ||
      (desk.visible && mx >= desk.x - 10 && mx <= desk.x + desk.width + 10 && my >= groundY - WORK_H - 15 && my <= groundY + 10) ||
      (tub.visible && mx >= tub.x - 10 && mx <= tub.x + tub.width + 10 && my >= tub.y - 15 && my <= tub.y + tub.height + 10)
    );

    if (waterReminderActive && isNearWaterTarget) {
      waterReminderActive = false;
      lastWaterReminderTime = Date.now();
      showSpeechBubble(Messages.waterDrank, 3500, false);
      spawnWakeStars(desk.visible ? desk.x + 55 : capy.x, groundY - 35);
      // Tiếp tục đi dạo nếu đang ở mode roam
      if (capy.state === CapyState.IDLE_RIGHT) capy.state = CapyState.WALK_RIGHT;
      else if (capy.state === CapyState.IDLE_LEFT) capy.state = CapyState.WALK_LEFT;
      return;
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

    // D. KHI ĐANG LÀM VIỆC TẠI BÀN
    if (capy.state === CapyState.WORKING && desk.visible) {
      const isOverWork = (mx >= desk.x && mx <= desk.x + desk.width && my >= groundY - WORK_H && my <= groundY);
      if (isOverWork) {
        if (isWorkSessionLocked()) {
          const timeStr = getWorkRemainingTimeString();
          showSpeechBubble(Messages.workRemainingEncourage(timeStr), 3000, false);
          return;
        }
        // Nhấp vào bàn làm việc -> Capy đứng dậy đi dạo
        triggerRoam();
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
      capy.state === CapyState.APPROACHING_TUB
    );

    if (isClickCapy && capy.state !== CapyState.DIZZY && !isBusyWithProps) {
      if (isWorkSessionLocked() && capy.state === CapyState.WORKING) {
        showSpeechBubble(Messages.workDragWarning, 3000, true);
        return;
      }
      clearSpeechBubble();
      isDraggingCapy = true;
      capy.maxDragHeight = 0;
      if (capy.state !== CapyState.LOST_ORANGE && capy.state !== CapyState.SLEEPING) {
        capy.state = CapyState.DRAGGED;
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

  // XỬ LÝ KÉO THẢ THANH TABBOARD (DASHBOARD) - Xử lý ngay lập tức khi đang kéo
  if (dashDragCandidate && dashEl) {
    const dx = e.clientX - dashDragStartX;
    const dy = e.clientY - dashDragStartY;
    if (!hasMovedDash && Math.hypot(dx, dy) > 4) {
      hasMovedDash = true;
      isDraggingDash = true;
      dashEl.classList.add('is-dragging');
    }
    if (isDraggingDash) {
      const clampedX = Math.max(5, Math.min(window.innerWidth - dashEl.offsetWidth - 5, dashElemStartX + dx));
      const clampedY = Math.max(5, Math.min(window.innerHeight - dashEl.offsetHeight - 5, dashElemStartY + dy));
      dashEl.style.left = `${clampedX}px`;
      dashEl.style.top = `${clampedY}px`;
      dashEl.style.right = 'auto';
      dashEl.style.bottom = 'auto';
      repositionSettingsModal();
      setMouseIgnore(false);
      return;
    }
  }

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

    const moveDist = Math.hypot(deltaX, deltaY);
    const isViolentMove = moveDist > 55; // Chỉ khi vẩy chuột cực nhanh mới làm rớt cam
    const isViolentShake = (deltaX > 20 && prevDeltaX < -20) || (deltaX < -20 && prevDeltaX > 20); // Lắc chuột qua lại mạnh
    prevDeltaX = deltaX;

    if ((isViolentMove || isViolentShake) && orange.state === 'ON_HEAD') {
      dropOrange(Math.sign(deltaX) || 1, -3.5);
    }
    return;
  }

  // KÉO THẢ BỒN TẮM ONSEN - Xử lý ngay lập tức
  if (isDraggingTub && tub.visible) {
    const deltaX = e.screenX - lastMouseX;
    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    tub.x = Math.max(10, Math.min(canvas.width - tub.width - 10, tub.x + deltaX));
    tub.y = groundY - tub.height;
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

  // Đổi con trỏ chuột
  if (capy.state === CapyState.DIZZY) {
    const halfW = FALLEN_W / 2 + 10;
    if (mx >= capy.x - halfW && mx <= capy.x + halfW && my >= capy.y - FALLEN_H - 10 && my <= capy.y + 6) {
      canvas.style.cursor = 'pointer';
      return;
    }
  }

  if (desk.visible) {
    if (mx >= desk.x && mx <= desk.x + desk.width && my >= groundY - WORK_H && my <= groundY) {
      canvas.style.cursor = 'pointer';
      return;
    }
  }

  if (orange.state === 'ON_GROUND' || (orange.state === 'ON_HEAD' && capy.state !== CapyState.WORKING)) {
    const pad = 8;
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

  const isNearTub = tub.visible && (mx >= tub.x && mx <= tub.x + tub.width && my >= tub.y && my <= tub.y + tub.height);
  const capyHalfW = RENDER_W / 2 + 8;
  const isNearCapy = (mx >= capy.x - capyHalfW && mx <= capy.x + capyHalfW && my >= capy.y - RENDER_H && my <= capy.y + 10);

  if (isNearTub || isNearCapy) {
    canvas.style.cursor = 'grab';
  } else {
    canvas.style.cursor = 'default';
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    // THẢ THANH TABBOARD (DASHBOARD)
    if (dashDragCandidate || isDraggingDash) {
      if (hasMovedDash && dashEl) {
        preventBtnClick = true;
        setTimeout(() => { preventBtnClick = false; }, 150);
        const rect = dashEl.getBoundingClientRect();
        try {
          localStorage.setItem(DASH_POS_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
        } catch (err) {}
      }
      dashDragCandidate = false;
      isDraggingDash = false;
      if (dashEl) dashEl.classList.remove('is-dragging');
    }
    if (isDraggingCapy) {
      isDraggingCapy = false;

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
          capy.fallingFromHigh = true;

          if (orange.state === 'ON_HEAD') {
            dropOrange(-capy.facing, -4.5);
          }
        } else if (heightAboveGround > 15) {
          capy.state = CapyState.FALLING;
          capy.vy = 1.0;
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

    const mx = e.clientX;
    const my = e.clientY;
    setMouseIgnore(!isOverInteractive(mx, my));
  }
});

window.addEventListener('mouseleave', () => {
  if (!isDraggingCapy && !isDraggingTub) {
    setMouseIgnore(true);
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

// 9. VẬT LÝ QUẢ CAM
function updateOrange() {
  const floorY = groundY - orange.height;

  if (orange.state === 'ON_HEAD') {
    if (capy.state !== CapyState.WORKING) {
      const isWalking = (
        capy.state === CapyState.WALK_RIGHT ||
        capy.state === CapyState.WALK_LEFT ||
        capy.state === CapyState.FETCHING_DESK ||
        capy.state === CapyState.FETCHING_TUB ||
        capy.state === CapyState.APPROACHING_DESK ||
        capy.state === CapyState.APPROACHING_TUB
      );
      const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
      const orangeBounce = isWalking ? Math.cos(capy.walkPhase * 2) * 1 : 0;
      const headX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3);
      const headY = capy.y - RENDER_H + bodyYOffset + orangeBounce - 7;
      orange.x = headX - orange.width / 2;
      orange.y = headY;
    }
  } else if (orange.state === 'FALLING') {
    orange.x += orange.vx;
    orange.y += orange.vy;
    orange.vy += 0.38;
    orange.vx *= 0.98;
    orange.rotation += orange.rotSpeed;

    if (orange.y >= floorY) {
      orange.y = floorY;
      orange.vy = -orange.vy * 0.42;
      orange.rotSpeed *= 0.6;
      orange.bounceCount++;

      if (Math.abs(orange.vy) < 0.6 || orange.bounceCount >= 3) {
        orange.state = 'ON_GROUND';
        orange.y = floorY;
        orange.vx = 0;
        orange.vy = 0;
        orange.rotSpeed = 0;
        orange.rotation = 0;
      }
    }

    if (orange.x <= 8) {
      orange.x = 8;
      orange.vx = -orange.vx * 0.5;
    } else if (orange.x >= canvas.width - orange.width - 8) {
      orange.x = canvas.width - orange.width - 8;
      orange.vx = -orange.vx * 0.5;
    }
  } else if (orange.state === 'RETURNING') {
    const isWalking = (
      capy.state === CapyState.WALK_RIGHT ||
      capy.state === CapyState.WALK_LEFT ||
      capy.state === CapyState.FETCHING_DESK ||
      capy.state === CapyState.FETCHING_TUB ||
      capy.state === CapyState.APPROACHING_DESK ||
      capy.state === CapyState.APPROACHING_TUB
    );
    const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
    const targetX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3) - orange.width / 2;
    const targetY = capy.y - RENDER_H + bodyYOffset - 7;

    orange.x += (targetX - orange.x) * 0.22;
    orange.y += (targetY - orange.y) * 0.22;
    orange.rotation *= 0.75;

    if (Math.hypot(targetX - orange.x, targetY - orange.y) < 3.5) {
      orange.state = 'ON_HEAD';
      orange.rotation = 0;
      // Chỉ chuyển sang đi dạo nếu Capy đang ở trạng thái ngơ ngác mất cam hoặc đang ngủ
      if (capy.state === CapyState.LOST_ORANGE || capy.state === CapyState.SLEEPING) {
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      }
      capy.lostOrangeTimer = 0;
      zzzParticles.length = 0;
    }
  }
}

function drawOrange(c) {
  if (!orangeImg.complete || orangeImg.naturalWidth === 0) return;

  const isWalking = (
    capy.state === CapyState.WALK_RIGHT ||
    capy.state === CapyState.WALK_LEFT ||
    capy.state === CapyState.FETCHING_DESK ||
    capy.state === CapyState.FETCHING_TUB ||
    capy.state === CapyState.APPROACHING_DESK ||
    capy.state === CapyState.APPROACHING_TUB
  );
  const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
  const orangeBounce = isWalking ? Math.cos(capy.walkPhase * 2) * 1 : 0;

  c.save();
  c.imageSmoothingEnabled = false;

  if (orange.state === 'ON_HEAD') {
    if (capy.state === CapyState.WORKING) {
      // Khi đang làm việc, laptop đã có logo quả cam nên không vẽ cam trên đầu
      c.restore();
      return;
    }
    const headX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3);
    const headY = capy.y - RENDER_H + bodyYOffset + orangeBounce - 7;

    orange.x = headX - orange.width / 2;
    orange.y = headY;

    const tilt = isWalking ? Math.sin(capy.walkPhase) * 0.08 : 0;
    c.translate(headX, headY + orange.height / 2);
    c.rotate(tilt);
    c.drawImage(orangeImg, -orange.width / 2, -orange.height / 2, orange.width, orange.height);
  } else {
    const distToGround = Math.max(0, groundY - (orange.y + orange.height));
    const shadowAlpha = Math.max(0.08, 0.25 - distToGround * 0.003);
    const shadowScale = Math.max(0.4, 1 - distToGround * 0.015);

    c.fillStyle = `rgba(20, 20, 30, ${shadowAlpha})`;
    c.beginPath();
    c.ellipse(orange.x + orange.width / 2, groundY, 7 * shadowScale, 2.5 * shadowScale, 0, 0, Math.PI * 2);
    c.fill();

    c.translate(orange.x + orange.width / 2, orange.y + orange.height / 2);
    c.rotate(orange.rotation);
    c.drawImage(orangeImg, -orange.width / 2, -orange.height / 2, orange.width, orange.height);

    if (orange.state === 'ON_GROUND') {
      const pulse = Math.sin(Date.now() * 0.006) * 0.5 + 0.5;
      c.strokeStyle = `rgba(255, 195, 30, ${0.45 * pulse})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 0, orange.width / 2 + 3 + pulse * 2, 0, Math.PI * 2);
      c.stroke();
    }
  }

  c.restore();
}

// 10. VẼ BỒN TẮM ONSEN
function drawTubAndBath(c) {
  if (!tub.visible) return;

  c.save();
  c.imageSmoothingEnabled = false;

  c.fillStyle = 'rgba(20, 20, 30, 0.28)';
  c.beginPath();
  c.ellipse(tub.x + tub.width / 2, groundY, tub.width * 0.44, 4.5, 0, 0, Math.PI * 2);
  c.fill();

  if (capy.state === CapyState.BATHING) {
    if (tubBathImg.complete && tubBathImg.naturalWidth > 0) {
      c.drawImage(tubBathImg, tub.x, tub.y, tub.width, tub.height);

      const cheekPulse = 0.4 + Math.sin(Date.now() * 0.004) * 0.12;
      c.fillStyle = `rgba(255, 115, 115, ${cheekPulse})`;
      c.beginPath();
      c.ellipse(tub.x + tub.width * 0.45, tub.y + tub.height * 0.28, 4.2, 2.6, 0, 0, Math.PI * 2);
      c.fill();

      // Giọt mồ hôi nhỏ cố định trên thái dương khi ngâm nước nóng Onsen (dịch sang phải để không giống khóc)
      drawSweatDrop(c, tub.x + 39, tub.y + 14, 2.2);
    }
  } else {
    if (tubImg.complete && tubImg.naturalWidth > 0) {
      c.drawImage(tubImg, tub.x, tub.y, tub.width, tub.height);
    }
  }

  // KHI NHẮC UỐNG NƯỚC Ở MODE TẮM: HIỆN BÊN TRÁI XÔ TẮM
  if (waterReminderActive && bottleImg.complete && bottleImg.naturalWidth > 0) {
    const bottleW = 14;
    const bottleH = 30.5;
    const bottleX = tub.x - 22; // Bên trái xô tắm
    const bottleY = groundY - 3;
    const bounce = Math.sin(Date.now() * 0.006) * 1.5;

    // Bóng đổ nhẹ dưới đáy chai nước
    c.fillStyle = 'rgba(10, 10, 20, 0.35)';
    c.beginPath();
    c.ellipse(bottleX + bottleW / 2, groundY, 6, 2, 0, 0, Math.PI * 2);
    c.fill();

    // Vẽ chai nước
    c.drawImage(bottleImg, bottleX, bottleY - bottleH + bounce, bottleW, bottleH);

    // Giọt nước nhỏ nhấp nháy phát sáng trên chai
    const dripY = bottleY - bottleH - 5 + Math.sin(Date.now() * 0.008) * 2;
    drawSweatDrop(c, bottleX + bottleW / 2, dripY, 1.8);
  }

  c.restore();
}

// 11. ĐỒNG HỒ CÁT LOADING TRÊN ĐẦU CAPYBARA (ĐỨNG THẲNG ĐỀU ĐẶN)
function drawHourglass(c, cx, cy) {
  c.save();
  c.translate(cx, cy);

  const now = Date.now();
  const period = 2000; // 2 giây mỗi chu kỳ cát chảy
  const t = now % period;

  const hw = 5;  // Bề rộng 10px
  const hh = 7;  // Chiều cao 14px

  // Hai đầu thanh gỗ/đồng
  c.fillStyle = '#b45309';
  c.fillRect(-hw - 1, -hh, (hw + 1) * 2, 2);
  c.fillRect(-hw - 1, hh - 2, (hw + 1) * 2, 2);

  // Thân bóng thủy tinh
  c.fillStyle = 'rgba(224, 242, 254, 0.45)';
  c.strokeStyle = '#38bdf8';
  c.lineWidth = 1;

  c.beginPath();
  c.moveTo(-hw, -hh + 2);
  c.lineTo(hw, -hh + 2);
  c.lineTo(1.2, 0);
  c.lineTo(hw, hh - 2);
  c.lineTo(-hw, hh - 2);
  c.lineTo(-1.2, 0);
  c.closePath();
  c.fill();
  c.stroke();

  // Cát ở bầu trên (vơi dần)
  const sandProgress = Math.min(1, t / 1550);
  const topSandH = (1 - sandProgress) * 4;
  if (topSandH > 0.4) {
    c.fillStyle = '#fbbf24';
    c.beginPath();
    c.moveTo(-1 - topSandH * 0.7, -topSandH);
    c.lineTo(1 + topSandH * 0.7, -topSandH);
    c.lineTo(0.6, -0.2);
    c.lineTo(-0.6, -0.2);
    c.closePath();
    c.fill();
  }

  // Tia cát rơi ở eo
  if (sandProgress < 0.95) {
    c.strokeStyle = '#f59e0b';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, hh - 2.5);
    c.stroke();
  }

  // Đụn cát ở bầu dưới (đầy dần)
  const btmSandH = sandProgress * 3.8;
  if (btmSandH > 0.4) {
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.moveTo(-hw + 1, hh - 2);
    c.lineTo(hw - 1, hh - 2);
    c.lineTo(0, hh - 2 - btmSandH);
    c.closePath();
    c.fill();
  }

  // Phản quang sáng trên kính thủy tinh
  c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-hw + 1.2, -hh + 3.2);
  c.lineTo(-1.5, -1);
  c.stroke();

  c.restore();
}

// 12. VẼ BÀN LÀM VIỆC, GHẾ XOAY, ĐỒNG HỒ CÁT & CHAI NƯỚC TRÊN BÀN
function drawDesk(c) {
  if (!desk.visible) return;

  c.save();
  c.imageSmoothingEnabled = false;

  // Bóng đổ dưới sàn bàn làm việc
  c.fillStyle = 'rgba(20, 20, 30, 0.28)';
  c.beginPath();
  c.ellipse(desk.x + desk.width / 2, groundY, desk.width * 0.45, 5, 0, 0, Math.PI * 2);
  c.fill();

  if (capy.state === CapyState.WORKING) {
    // Khi đang làm việc: vẽ hình Capybara ngồi ghế trước laptop
    if (workImg.complete && workImg.naturalWidth > 0) {
      c.drawImage(workImg, desk.x, groundY - WORK_H, DESK_W, WORK_H);

      // Nếu là chế độ làm việc tập trung (không phải chill): vẽ mồ hôi và đồng hồ cát
      if (settings.computerMode !== 'chill') {
        // Giọt mồ hôi nhỏ cố định trên trán khi làm việc
        drawSweatDrop(c, desk.x + 40, groundY - WORK_H + 16, 2.2);

        // ĐỒNG HỒ CÁT LOADING TRÊN ĐẦU CAPYBARA
        drawHourglass(c, desk.x + 36, groundY - WORK_H - 12);
      }
    }
  } else {
    // Khi chưa ngồi vào: vẽ hình bàn ghế và laptop trống
    if (deskImg.complete && deskImg.naturalWidth > 0) {
      c.drawImage(deskImg, desk.x, groundY - DESK_H, DESK_W, DESK_H);
    }
  }

  // KHI NHẮC UỐNG NƯỚC: CHAI NƯỚC ĐƯỢC ĐẶT TRÊN MẶT BÀN
  if (waterReminderActive && bottleImg.complete && bottleImg.naturalWidth > 0) {
    const bottleW = 14;
    const bottleH = 30.5;
    const bottleX = desk.x + 53;
    const bottleY = groundY - 44; // Mặt bàn
    const bounce = Math.sin(Date.now() * 0.006) * 1.5;

    // Bóng đổ nhẹ dưới đáy chai nước
    c.fillStyle = 'rgba(10, 10, 20, 0.35)';
    c.beginPath();
    c.ellipse(bottleX + bottleW / 2, bottleY + 1, 6, 2, 0, 0, Math.PI * 2);
    c.fill();

    // Vẽ chai nước (đã trích xuất từ ảnh người dùng)
    c.drawImage(bottleImg, bottleX, bottleY - bottleH + bounce, bottleW, bottleH);

    // Giọt nước nhỏ nhấp nháy phát sáng trên chai
    const dripY = bottleY - bottleH - 5 + Math.sin(Date.now() * 0.008) * 2;
    drawSweatDrop(c, bottleX + bottleW / 2, dripY, 1.8);
  }

  c.restore();
}

// 13. HIỂN THỊ LỜI NÓI (SPEECH BUBBLE: CHỮ ĐEN NỀN TRẮNG, DỒN SANG TRÁI, TAM GIÁC GÓC DƯỚI BÊN PHẢI)
function drawSpeechBubbleUI(c) {
  const isHiding = (capy.state === CapyState.HIDDEN || capy.state === CapyState.HIDING_RUN);
  // Khi đang trốn: tuyệt đối không hiện nhắc uống nước, chỉ hiện lời thoại của trốn (nếu có)
  const canShowWaterReminder = waterReminderActive && !isHiding;

  if (!speechBubble.active && !canShowWaterReminder) return;

  const now = Date.now();
  if (speechBubble.active && !speechBubble.persistent && now > speechBubble.expiresAt) {
    speechBubble.active = false;
    if (!canShowWaterReminder) return;
  }

  let text = '';
  let isWarning = false;
  let anchorX = capy.x;
  let anchorY = capy.y - RENDER_H;

  // ƯU TIÊN 1: Lời thoại của hành động mới nhất (luôn thay thế và tắt text cũ)
  if (speechBubble.active) {
    text = speechBubble.text;
    isWarning = speechBubble.isWarning;
    if (capy.state === CapyState.WORKING && desk.visible) {
      anchorX = desk.x + 36;
      anchorY = groundY - WORK_H;
    } else if (capy.state === CapyState.BATHING && tub.visible) {
      anchorX = tub.x + tub.width / 2;
      anchorY = tub.y;
    } else if (isHiding) {
      anchorX = canvas.width - 15;
      anchorY = groundY - RENDER_H;
    } else {
      anchorX = capy.x;
      anchorY = capy.y - RENDER_H;
    }
  }
  // ƯU TIÊN 2: Nhắc uống nước khi không có hành động nào khác đang nói và không ở chế độ trốn
  else if (canShowWaterReminder) {
    text = Messages.waterReminder;
    if (capy.state === CapyState.WORKING && desk.visible) {
      anchorX = desk.x + 36;
      anchorY = groundY - WORK_H;
    } else if (capy.state === CapyState.BATHING && tub.visible) {
      anchorX = tub.x + tub.width / 2;
      anchorY = tub.y;
    } else {
      anchorX = capy.x;
      anchorY = capy.y - RENDER_H;
    }
  }

  c.save();
  c.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const textMetrics = c.measureText(text);
  const padX = 14;
  const padY = 8;
  const boxW = textMetrics.width + padX * 2;
  const boxH = 30;

  // Dồn sang trái tính từ đầu Capybara:
  // Cạnh phải của khung chat nằm tại (anchorX + 16), toàn bộ khung mở rộng về bên trái
  let boxX = anchorX - boxW + 16;
  boxX = Math.max(12, Math.min(canvas.width - boxW - 12, boxX));
  let boxY = anchorY - boxH - 12;
  boxY = Math.max(10, Math.min(canvas.height - boxH - 20, boxY));

  // Bóng đổ nhẹ
  c.fillStyle = 'rgba(0, 0, 0, 0.22)';
  c.beginPath();
  c.roundRect(boxX + 2, boxY + 2.5, boxW, boxH, 8);
  c.fill();

  // Nền trắng, viền
  const borderColor = isWarning ? '#e11d48' : (waterReminderActive ? '#0284c7' : '#cbd5e1');
  c.fillStyle = '#ffffff';
  c.strokeStyle = borderColor;
  c.lineWidth = 1.6;
  c.beginPath();
  c.roundRect(boxX, boxY, boxW, boxH, 8);
  c.fill();
  c.stroke();

  // Tam giác ở góc dưới bên phải trỏ xuống đầu Capybara
  const tailX = Math.min(boxX + boxW - 14, Math.max(boxX + 14, anchorX));
  c.fillStyle = '#ffffff';
  c.strokeStyle = borderColor;
  c.beginPath();
  c.moveTo(tailX - 6, boxY + boxH);
  c.lineTo(tailX, boxY + boxH + 8);
  c.lineTo(tailX + 6, boxY + boxH);
  c.closePath();
  c.fill();
  c.stroke();

  // Xóa đường viền đè giữa tam giác và thân khung chat
  c.fillStyle = '#ffffff';
  c.fillRect(tailX - 5.5, boxY + boxH - 1.5, 11, 2.5);

  // Chữ đen nền trắng
  c.fillStyle = isWarning ? '#9f1239' : '#0f172a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, boxX + boxW / 2, boxY + boxH / 2);

  c.restore();
}

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

// 13. VẼ CAPYBARA
function drawCapybaraOutside(c) {
  // Khi đang tắm Onsen hoặc đang ngồi làm việc, hình ảnh đã được vẽ trọn vẹn trong drawTubAndBath / drawDesk
  if (capy.state === CapyState.BATHING || capy.state === CapyState.WORKING) return;

  const isWalking = (
    capy.state === CapyState.WALK_RIGHT ||
    capy.state === CapyState.WALK_LEFT ||
    capy.state === CapyState.FETCHING_DESK ||
    capy.state === CapyState.FETCHING_TUB ||
    capy.state === CapyState.APPROACHING_DESK ||
    capy.state === CapyState.APPROACHING_TUB ||
    capy.state === CapyState.HIDING_RUN
  );
  const isPushing = (capy.state === CapyState.PUSHING_DESK || capy.state === CapyState.PUSHING_TUB || capy.state === CapyState.RETRACTING_DESK || capy.state === CapyState.RETRACTING_TUB);
  const isDragged = (capy.state === CapyState.DRAGGED);
  const isSleeping = (capy.state === CapyState.SLEEPING);
  const isDizzy = (capy.state === CapyState.DIZZY);
  const isFalling = (capy.state === CapyState.FALLING);

  let bodyYOffset = 0;
  if (isWalking || isPushing) {
    bodyYOffset = Math.sin(capy.walkPhase * 2) * 1.5;
  } else if (!isDragged && !isSleeping && !isDizzy && !isFalling) {
    bodyYOffset = Math.sin(capy.breathPhase) * 1.2;
  }

  c.save();
  c.translate(capy.x, capy.y);
  c.scale(capy.facing, 1);
  c.imageSmoothingEnabled = false;

  const distToGround = Math.max(0, groundY - capy.y);
  const shadowAlpha = Math.max(0.06, 0.25 - distToGround * 0.0015);
  const shadowScale = isDizzy ? 1.25 : (isSleeping ? 1.15 : (isDragged || isFalling ? Math.max(0.35, 1 - distToGround * 0.003) : 1));

  c.fillStyle = `rgba(20, 20, 30, ${shadowAlpha})`;
  c.beginPath();
  c.ellipse(0, distToGround, 24 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  c.fill();

  // A. DÁNG NGÃ CHÓNG MẶT (DIZZY)
  if (isDizzy) {
    const drawX = -FALLEN_W / 2;
    const drawY = -FALLEN_H + 2;

    if (fallenImg.complete && fallenImg.naturalWidth > 0) {
      c.drawImage(
        fallenImg,
        0, 0, fallenImg.naturalWidth, fallenImg.naturalHeight,
        drawX, drawY, FALLEN_W, FALLEN_H
      );
    }

    const eyeX = drawX + 24;
    const eyeY = drawY + 33;
    drawPixelX(c, eyeX, eyeY, 7, '#1a1008');
    drawPurpleDizzySpiral(c, eyeX, drawY - 8, capy.dizzyAngle);

    c.restore();
    return;
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
  } else if (isFalling) {
    frameIndex = (Math.floor(capy.walkPhase * 2.5) % 2 === 0) ? 1 : 2;
  } else if (capy.state === CapyState.LOST_ORANGE) {
    frameIndex = 0;
  }

  if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
    const drawX = -RENDER_W / 2;
    const drawY = -RENDER_H + 2 + bodyYOffset;

    c.drawImage(
      spriteSheet,
      frameIndex * FRAME_W, 0, FRAME_W, FRAME_H,
      drawX, drawY, RENDER_W, RENDER_H
    );

    // Khi chạy ra cất bàn và xô: hiện đỏ mặt (4 gạch nhỏ sọc xéo đỏ) thể hiện xấu hổ thay vì mồ hôi
    const isRetractingProps = (
      capy.state === CapyState.RETRACTING_DESK ||
      capy.state === CapyState.RETRACTING_TUB ||
      capy.state === CapyState.APPROACHING_DESK ||
      capy.state === CapyState.APPROACHING_TUB ||
      retractWaitTimer > 0
    );

    if (isRetractingProps) {
      // Đỏ mặt (4 gạch nhỏ sọc xéo đỏ) thể hiện xấu hổ
      drawShyBlush(c, 8.5, -27 + bodyYOffset);
    } else if (capy.state === CapyState.PUSHING_DESK || capy.state === CapyState.PUSHING_TUB) {
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

    // Biểu tượng giận 💢 trên đầu Capybara khi bị kéo lên cao (< 30%) tiếp đất
    if (capy.angryUntil && Date.now() < capy.angryUntil) {
      drawAngerMark(c, 12, -RENDER_H + 4 + bodyYOffset);
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
        showSpeechBubble(Messages.almostForgot, 2500, false);
      } else if (retractTarget === 'tub' && tub.visible) {
        capy.state = CapyState.APPROACHING_TUB;
        showSpeechBubble(Messages.almostForgot, 2500, false);
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

  // QUAN TRỌNG: Chỉ đếm timer tìm cam khi KHÔNG trong thời gian đứng yên (capy.idleTimer <= 0) để bảo đảm Capy đứng yên trọn vẹn 3s khi ngã dậy
  if (isRoamingState && orange.state === 'ON_GROUND' && capy.idleTimer <= 0) {
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
      if (waterReminderActive && capy.state !== CapyState.WORKING && capy.state !== CapyState.BATHING) {
        capy.state = CapyState.IDLE_RIGHT;
        break;
      }
      capy.facing = 1;
      capy.x += capy.speed;
      capy.walkPhase += 0.07;

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

    case CapyState.IDLE_RIGHT:
      if (waterReminderActive && capy.state !== CapyState.WORKING && capy.state !== CapyState.BATHING) {
        break; // Đứng yên trước bình nước
      }
      capy.idleTimer--;
      if (capy.idleTimer <= 0) {
        capy.state = (capy.x >= canvas.width - 60) ? CapyState.WALK_LEFT : CapyState.WALK_RIGHT;
      }
      break;

    case CapyState.WALK_LEFT: {
      if (waterReminderActive && capy.state !== CapyState.WORKING && capy.state !== CapyState.BATHING) {
        capy.state = CapyState.IDLE_LEFT;
        break;
      }
      capy.facing = -1;
      capy.x -= capy.speed;
      capy.walkPhase += 0.07;

      if (capy.x <= 40) {
        capy.x = 40;
        capy.state = CapyState.IDLE_LEFT;
        capy.idleTimer = Math.floor(Math.random() * 30 + 30);
      }
      break;
    }

    case CapyState.IDLE_LEFT:
      if (waterReminderActive && capy.state !== CapyState.WORKING && capy.state !== CapyState.BATHING) {
        break; // Đứng yên trước bình nước
      }
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
        if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
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
        if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
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

    case CapyState.FALLING:
      capy.vy += 0.75;
      capy.y += capy.vy;
      capy.walkPhase += 0.25;

      if (capy.y >= groundY) {
        capy.y = groundY;
        capy.vy = 0;

        if (capy.fallingFromHigh) {
          capy.state = CapyState.DIZZY;
          capy.fallingFromHigh = false;
          capy.dizzyAngle = 0;
          capy.dizzyTimer = 0;
          spawnImpactStars(capy.x, groundY - 10);
        } else {
          capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;

          // KHI BỊ KÉO LÊN CAO (CHƯA QUÁ 30% ĐỂ NGÃ) HIỆN NGAY KHI TIẾP ĐẤT:
          if (capy.droppedFromLow) {
            capy.droppedFromLow = false;
            capy.angryUntil = Date.now() + 4000;
            if (Messages.dropLowQuotes && Messages.dropLowQuotes.length > 0) {
              const quote = Messages.dropLowQuotes[Math.floor(Math.random() * Messages.dropLowQuotes.length)];
              showSpeechBubble(quote, 4000, true);
            }
          }
        }
      }
      break;

    case CapyState.DIZZY:
      capy.dizzyAngle += 0.08;
      if (!capy.dizzyTimer) capy.dizzyTimer = 0;
      capy.dizzyTimer++;
      // Sau khoảng 2.4s nằm ngã chóng mặt nếu không click, Capy tự gượng dậy đứng yên 3s càm ràm
      if (capy.dizzyTimer >= 110) {
        wakeCapyFromDizzy();
      }
      break;

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
    waterReminderActive = true;
    // Nếu đang ở mode đi dạo: dừng Capy lại không cho đi dạo nữa
    if (capy.state === CapyState.WALK_RIGHT) {
      capy.state = CapyState.IDLE_RIGHT;
    } else if (capy.state === CapyState.WALK_LEFT) {
      capy.state = CapyState.IDLE_LEFT;
    }
  }
}

// 14c. CÁC CÂU THOẠI NGU NGƠ RANDOM KHI ĐI DẠO (MỖI 10S HIỆN 5S RỒI TẮT)
let lastRoamQuoteEndTime = Date.now();
let lastSpokenRoamQuote = '';
const ROAM_QUOTE_PAUSE_MS = 8000;    // Nghỉ 10s giữa các lần hiện
const ROAM_QUOTE_DURATION_MS = 5000;  // Mỗi lần hiện 5s rồi tự tắt

function updateRoamRandomQuotes() {
  const isRoaming = (
    capy.state === CapyState.WALK_RIGHT ||
    capy.state === CapyState.WALK_LEFT ||
    capy.state === CapyState.IDLE_RIGHT ||
    capy.state === CapyState.IDLE_LEFT
  );

  // Chỉ hiện khi đi dạo (không ngủ, không ngơ ngác mất cam, không nhắc nước, không tắm, không làm việc, không đẩy đồ)
  if (!isRoaming || waterReminderActive || capy.state === CapyState.LOST_ORANGE || capy.state === CapyState.SLEEPING) {
    lastRoamQuoteEndTime = Date.now();
    return;
  }

  // Nếu đang có câu thoại nào đang hiển thị thì không chèn thêm
  if (speechBubble.active) return;

  const now = Date.now();
  if (now - lastRoamQuoteEndTime >= ROAM_QUOTE_PAUSE_MS) {
    if (Messages.roamQuotes && Messages.roamQuotes.length > 0) {
      let quote = Messages.roamQuotes[Math.floor(Math.random() * Messages.roamQuotes.length)];
      if (Messages.roamQuotes.length > 1 && quote === lastSpokenRoamQuote) {
        quote = Messages.roamQuotes[Math.floor(Math.random() * Messages.roamQuotes.length)];
      }
      lastSpokenRoamQuote = quote;
      showSpeechBubble(quote, ROAM_QUOTE_DURATION_MS, false);
      lastRoamQuoteEndTime = now + ROAM_QUOTE_DURATION_MS; // Bắt đầu tính 10s sau khi câu thoại 5s này biến mất
    }
  }
}

// 14d. CÂU THOẠI VU VƠ KHI NGỒI LÀM VIỆC (MỖI 10S HIỆN 5S RỒI TẮT)
let lastWorkQuoteEndTime = Date.now();
let lastSpokenWorkQuote = '';
const WORK_QUOTE_PAUSE_MS = 8000;    // Nghỉ 10s giữa các lần hiện
const WORK_QUOTE_DURATION_MS = 5000;  // Mỗi lần hiện 5s rồi tự tắt

function updateWorkRandomQuotes() {
  // Chỉ hiện khi Capybara đang ngồi làm việc tại bàn
  if (capy.state !== CapyState.WORKING || !desk.visible || waterReminderActive) {
    lastWorkQuoteEndTime = Date.now();
    return;
  }

  // Nếu đang có câu thoại nào đang hiển thị thì không chèn thêm
  if (speechBubble.active) return;

  const now = Date.now();
  if (now - lastWorkQuoteEndTime >= WORK_QUOTE_PAUSE_MS) {
    if (Messages.workQuotes && Messages.workQuotes.length > 0) {
      let quote = Messages.workQuotes[Math.floor(Math.random() * Messages.workQuotes.length)];
      if (Messages.workQuotes.length > 1 && quote === lastSpokenWorkQuote) {
        quote = Messages.workQuotes[Math.floor(Math.random() * Messages.workQuotes.length)];
      }
      lastSpokenWorkQuote = quote;
      showSpeechBubble(quote, WORK_QUOTE_DURATION_MS, false);
      lastWorkQuoteEndTime = now + WORK_QUOTE_DURATION_MS; // Bắt đầu tính 10s sau khi câu thoại 5s biến mất
    }
  }
}

// 14e. CÂU THOẠI KHI TẮM ONSEN (MỖI 10S HIỆN 5S RỒI TẮT)
let lastBathQuoteEndTime = Date.now();
let lastSpokenBathQuote = '';
const BATH_QUOTE_PAUSE_MS = 8000;    // Nghỉ 10s giữa các lần hiện
const BATH_QUOTE_DURATION_MS = 5000;  // Mỗi lần hiện 5s rồi tự tắt

function updateBathRandomQuotes() {
  // Chỉ hiện khi Capybara đang tắm trong bồn Onsen
  if (capy.state !== CapyState.BATHING || !tub.visible || waterReminderActive) {
    lastBathQuoteEndTime = Date.now();
    return;
  }

  // Nếu đang có câu thoại nào đang hiển thị thì không chèn thêm
  if (speechBubble.active) return;

  const now = Date.now();
  if (now - lastBathQuoteEndTime >= BATH_QUOTE_PAUSE_MS) {
    if (Messages.bathQuotes && Messages.bathQuotes.length > 0) {
      let quote = Messages.bathQuotes[Math.floor(Math.random() * Messages.bathQuotes.length)];
      if (Messages.bathQuotes.length > 1 && quote === lastSpokenBathQuote) {
        quote = Messages.bathQuotes[Math.floor(Math.random() * Messages.bathQuotes.length)];
      }
      lastSpokenBathQuote = quote;
      showSpeechBubble(quote, BATH_QUOTE_DURATION_MS, false);
      lastBathQuoteEndTime = now + BATH_QUOTE_DURATION_MS; // Bắt đầu tính 10s sau khi câu thoại 5s biến mất
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
    capy.y < groundY - 20 ||
    orange.state === 'FALLING'
  );

  if (isHighAction || needsFullClear) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    needsFullClear = isHighAction;
  } else {
    const stripH = 195;
    ctx.clearRect(0, groundY - stripH, canvas.width, stripH + 10);
  }

  updateWorkAndHydrationTimers();
  updateCapy();
  updateRoamRandomQuotes();
  updateWorkRandomQuotes();
  updateBathRandomQuotes();
  updateOrange();
  updateZzz();
  updateSteam();
  updateImpactParticles();

  // 1. Vẽ bồn tắm (kèm bình nước bên trái nếu có nhắc nước)
  drawTubAndBath(ctx);

  // 2. Vẽ bàn làm việc & ghế xoay (kèm đồng hồ cát và bình nước trên bàn nếu có nhắc)
  drawDesk(ctx);

  // 3. Vẽ Capybara bên ngoài (đi / đứng / đẩy / rơi / ngã)
  drawCapybaraOutside(ctx);

  // KHI NHẮC UỐNG NƯỚC Ở MODE ĐI DẠO: HIỆN BÌNH TRƯỚC MẶT CAPYBARA KHÔNG CHO ĐI TIẾP
  if (waterReminderActive && capy.state !== CapyState.WORKING && capy.state !== CapyState.BATHING && capy.state !== CapyState.HIDING_RUN && capy.state !== CapyState.HIDDEN && !tub.visible && !desk.visible && bottleImg.complete && bottleImg.naturalWidth > 0) {
    const bw = 14;
    const bh = 30.5;
    // Hiện ngay trước mặt Capybara tính theo hướng quay mặt
    const bx = (capy.facing === 1) ? (capy.x + 28) : (capy.x - 28 - bw);
    const by = groundY - 3;
    const bounce = Math.sin(Date.now() * 0.006) * 1.5;

    // Bóng đổ dưới sàn
    ctx.fillStyle = 'rgba(10, 10, 20, 0.35)';
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, groundY, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chai nước
    ctx.drawImage(bottleImg, bx, by - bh + bounce, bw, bh);

    // Giọt nước phát sáng
    const dripY = by - bh - 5 + Math.sin(Date.now() * 0.008) * 2;
    drawSweatDrop(ctx, bx + bw / 2, dripY, 1.8);
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
    requestAnimationFrame(loop);
  }
}

if (spriteSheet.complete) checkStart(); else spriteSheet.onload = checkStart;
if (orangeImg.complete) checkStart(); else orangeImg.onload = checkStart;
if (sleepImg.complete) checkStart(); else sleepImg.onload = checkStart;
if (tubImg.complete) checkStart(); else tubImg.onload = checkStart;
if (tubBathImg.complete) checkStart(); else tubBathImg.onload = checkStart;
if (fallenImg.complete) checkStart(); else fallenImg.onload = checkStart;
if (deskImg.complete) checkStart(); else deskImg.onload = checkStart;
if (workImg.complete) checkStart(); else workImg.onload = checkStart;
if (bottleImg.complete) checkStart(); else bottleImg.onload = checkStart;
