/**
 * Capybara Desktop Pet - Dashboard UI
 * Quản lý thanh công cụ mini (nút đi dạo, tắm, làm việc, cổng, thu nhỏ/mở rộng, kéo thả vị trí)
 */

var btnRoam = document.getElementById('btn-roam');
var btnBath = document.getElementById('btn-bath');
var btnWork = document.getElementById('btn-work');
var btnGate = document.getElementById('btn-gate');
var btnToggleDash = document.getElementById('btn-toggle-dash');
var dashEl = document.getElementById('dashboard');

// Trạng thái kéo thả thanh Dashboard
var isDraggingDash = false;
var dashDragCandidate = false;
var hasMovedDash = false;
var preventBtnClick = false;
var dashDragStartX = 0;
var dashDragStartY = 0;
var dashElemStartX = 0;
var dashElemStartY = 0;

const DASH_POS_KEY = 'capy_dash_position_v1';

// Cập nhật trạng thái active trên giao diện các nút
function updateDashboardUI(activeType) {
  if (btnRoam) btnRoam.classList.remove('active');
  if (btnBath) btnBath.classList.remove('active', 'bath');
  if (btnWork) btnWork.classList.remove('active', 'work');

  if (activeType === 'roam' && btnRoam) {
    btnRoam.classList.add('active');
  } else if (activeType === 'bath' && btnBath) {
    btnBath.classList.add('active', 'bath');
  } else if (activeType === 'work' && btnWork) {
    btnWork.classList.add('active', 'work');
  }

  // Đồng bộ state update cho Control Panel window (nếu đang mở)
  if (typeof sendStateToPanel === 'function') {
    sendStateToPanel();
  }
}

// 1. SỰ KIỆN CLICK CÁC NÚT ĐIỀU KHIỂN
if (btnWork) {
  btnWork.addEventListener('click', (e) => {
    e.stopPropagation();
    if (preventBtnClick) return;
    if (
      typeof waterReminderActive !== 'undefined' &&
      waterReminderActive &&
      typeof waterReminderState !== 'undefined' &&
      waterReminderState.glass &&
      waterReminderState.glass.visible &&
      waterReminderState.glass.isFull
    ) {
      const msg = typeof Messages !== 'undefined' && Messages.waterReminder ? Messages.waterReminder : 'uống ngay đi bro 🥤';
      if (typeof showSpeechBubble === 'function') showSpeechBubble(msg, 2500, true);
      return;
    }
    if (typeof triggerWork === 'function') triggerWork();
  });
}

if (btnBath) {
  btnBath.addEventListener('click', (e) => {
    e.stopPropagation();
    if (preventBtnClick) return;
    if (
      typeof waterReminderActive !== 'undefined' &&
      waterReminderActive &&
      typeof waterReminderState !== 'undefined' &&
      waterReminderState.glass &&
      waterReminderState.glass.visible &&
      waterReminderState.glass.isFull
    ) {
      const msg = typeof Messages !== 'undefined' && Messages.waterReminder ? Messages.waterReminder : 'uống ngay đi bro 🥤';
      if (typeof showSpeechBubble === 'function') showSpeechBubble(msg, 2500, true);
      return;
    }
    if (typeof triggerBath === 'function') triggerBath();
  });
}

if (btnRoam) {
  btnRoam.addEventListener('click', (e) => {
    e.stopPropagation();
    if (preventBtnClick) return;
    if (
      typeof waterReminderActive !== 'undefined' &&
      waterReminderActive &&
      typeof waterReminderState !== 'undefined' &&
      waterReminderState.glass &&
      waterReminderState.glass.visible &&
      waterReminderState.glass.isFull
    ) {
      const msg = typeof Messages !== 'undefined' && Messages.waterReminder ? Messages.waterReminder : 'uống ngay đi bro 🥤';
      if (typeof showSpeechBubble === 'function') showSpeechBubble(msg, 2500, true);
      return;
    }
    if (typeof triggerRoam === 'function') triggerRoam();
  });
}

if (btnGate) {
  btnGate.addEventListener('click', (e) => {
    e.stopPropagation();
    if (preventBtnClick) return;
    if (typeof triggerGate === 'function') {
      triggerGate();
    }
  });
}

// 2. PHÍM TẮT TOÀN CỤC: 'W' (Nhắc nước), 'G' (Cổng không gian)
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
  if (e.key === 'w' || e.key === 'W') {
    if (typeof startWaterReminder === 'function') {
      startWaterReminder();
    }
  }
  if (e.key === 'g' || e.key === 'G') {
    if (typeof triggerGate === 'function') {
      triggerGate();
    }
  }
});

// 3. THU NHỎ / MỞ RỘNG THANH DASHBOARD
var isDashCollapsed = false;
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

// 4. KHÔI PHỤC VỊ TRÍ DASHBOARD ĐÃ LƯU
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

// 5. KÉO THẢ VỊ TRÍ DASHBOARD TRÊN MÀN HÌNH
if (dashEl) {
  dashEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dashDragCandidate = true;
    hasMovedDash = false;
    dashDragStartX = e.clientX;
    dashDragStartY = e.clientY;
    const rect = dashEl.getBoundingClientRect();
    dashElemStartX = rect.left;
    dashElemStartY = rect.top;
    if (typeof setMouseIgnore === 'function') setMouseIgnore(false);
  });

  dashEl.addEventListener('mouseenter', () => {
    if (typeof setMouseIgnore === 'function') setMouseIgnore(false);
  });

  dashEl.addEventListener('mouseleave', (e) => {
    if (dashDragCandidate || isDraggingDash) return;
    if (typeof isOverInteractive === 'function' && typeof setMouseIgnore === 'function') {
      const mx = e.clientX, my = e.clientY;
      setMouseIgnore(!isOverInteractive(mx, my));
    }
  });
}

// Xử lý kéo thả Dashboard trên toàn cửa sổ
window.addEventListener('mousemove', (e) => {
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
      if (typeof setMouseIgnore === 'function') setMouseIgnore(false);
    }
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0 && (dashDragCandidate || isDraggingDash)) {
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
});
