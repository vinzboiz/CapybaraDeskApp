// ===== CAPY CONTROL PANEL — Renderer Logic =====
// Giao tiếp với main process qua capyAPI (preload bridge)

const api = window.capyAPI;

// ===== DOM References =====
const qaOrange = document.getElementById('qa-orange');
const qaWood = document.getElementById('qa-wood');
const qaHide = document.getElementById('qa-hide');
const qaHungry = document.getElementById('qa-hungry');
const qaWater = document.getElementById('qa-water');
const qaGate = document.getElementById('qa-gate');
const btnSave = document.getElementById('btn-save');
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');

// Settings
const setWorkDuration = document.getElementById('set-work-duration');
const setComputerMode = document.getElementById('set-computer-mode');
const setWorkFocus = document.getElementById('set-work-focus');
const setWaterInterval = document.getElementById('set-water-interval');
const setWalkSpeed = document.getElementById('set-walk-speed');
const setEnergyDuration = document.getElementById('set-energy-duration');
const panelEnergyVal = document.getElementById('panel-energy-val');
const panelEnergyBar = document.getElementById('panel-energy-bar');



// ===== STATE =====
let orangeOn = false;
let woodOn = false;

// ===== QUICK ACTIONS =====
function updateQAButton(btn, isActive) {
  if (isActive) {
    btn.classList.add('active');
    btn.querySelector('.qa-status').textContent = 'ON';
    btn.querySelector('.qa-status').classList.add('on');
  } else {
    btn.classList.remove('active');
    btn.querySelector('.qa-status').textContent = 'OFF';
    btn.querySelector('.qa-status').classList.remove('on');
  }
}

qaOrange.addEventListener('click', () => {
  orangeOn = !orangeOn;
  updateQAButton(qaOrange, orangeOn);
  api.send('panel-toggle-orange', orangeOn);
});

qaWood.addEventListener('click', () => {
  woodOn = !woodOn;
  updateQAButton(qaWood, woodOn);
  api.send('panel-toggle-wood', woodOn);
});

qaHide.addEventListener('click', () => {
  api.send('panel-trigger-hide');
});

if (qaHungry) {
  qaHungry.addEventListener('click', () => {
    api.send('panel-test-hungry');
  });
}

if (qaWater) {
  qaWater.addEventListener('click', () => {
    api.send('panel-trigger-water');
  });
}

if (qaGate) {
  qaGate.addEventListener('click', () => {
    api.send('panel-trigger-gate');
  });
}

// ===== SAVE SETTINGS =====
btnSave.addEventListener('click', () => {
  const settings = {
    workDuration: parseInt(setWorkDuration.value),
    computerMode: setComputerMode.value,
    workFocusLock: setWorkFocus.checked,
    waterInterval: parseInt(setWaterInterval.value),
    walkSpeed: parseFloat(setWalkSpeed.value),
    energyDuration: parseInt(setEnergyDuration ? setEnergyDuration.value : 7200) || 7200
  };
  api.send('panel-save-settings', settings);

  // Visual feedback
  btnSave.textContent = '✅ Đã lưu!';
  btnSave.classList.add('saved');
  setTimeout(() => {
    btnSave.textContent = '💾 Lưu & Áp dụng';
    btnSave.classList.remove('saved');
  }, 1500);
});

// ===== WINDOW CONTROLS =====
btnMinimize.addEventListener('click', () => {
  api.send('panel-minimize');
});

btnClose.addEventListener('click', () => {
  api.send('panel-close');
});

// ===== THEME SELECTOR =====
document.querySelectorAll('.theme-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    const theme = swatch.dataset.theme;
    document.body.setAttribute('data-theme', theme);
  });
});

let initialSettingsLoaded = false;

// ===== RECEIVE STATE UPDATES FROM PET WINDOW =====
api.on('state-update', (state) => {
  // Sync toggle states
  if (typeof state.orangeMode !== 'undefined') {
    orangeOn = state.orangeMode;
    updateQAButton(qaOrange, orangeOn);
  }
  if (typeof state.woodMode !== 'undefined') {
    woodOn = state.woodMode;
    updateQAButton(qaWood, woodOn);
  }

  // Sync live energy bar
  if (typeof state.energy !== 'undefined') {
    const e = Math.round(state.energy);
    if (panelEnergyVal) panelEnergyVal.textContent = `${e}%`;
    if (panelEnergyBar) {
      panelEnergyBar.style.width = `${e}%`;
      panelEnergyBar.classList.remove('warning', 'critical');
      if (e <= 30) {
        panelEnergyBar.classList.add('critical');
      } else if (e <= 50) {
        panelEnergyBar.classList.add('warning');
      }
    }
    if (qaHungry) {
      const statusEl = qaHungry.querySelector('.qa-status');
      if (statusEl) {
        statusEl.textContent = (e > 30) ? '30%' : '0%';
      }
    }
  }

  // Sync settings values: CHỈ nạp 1 lần duy nhất khi mở panel
  // Tuyệt đối không ghi đè mỗi 1s làm gián đoạn/nhảy option khi người dùng đang bấm chọn!
  if (state.settings && !initialSettingsLoaded) {
    initialSettingsLoaded = true;
    if (state.settings.workDuration && setWorkDuration) setWorkDuration.value = String(state.settings.workDuration);
    if (state.settings.computerMode && setComputerMode) setComputerMode.value = String(state.settings.computerMode);
    if (state.settings.workFocusLock !== undefined && setWorkFocus) setWorkFocus.checked = !!state.settings.workFocusLock;
    if (state.settings.waterInterval && setWaterInterval) setWaterInterval.value = String(state.settings.waterInterval);
    if (state.settings.walkSpeed && setWalkSpeed) setWalkSpeed.value = String(state.settings.walkSpeed);
    if (state.settings.energyDuration && setEnergyDuration) setEnergyDuration.value = String(state.settings.energyDuration);
  }
});

// Request initial state & định kỳ cập nhật thanh năng lượng mỗi 1s khi panel mở
api.send('panel-request-state');
setInterval(() => {
  api.send('panel-request-state');
}, 1000);
