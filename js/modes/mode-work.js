/**
 * Capybara Desktop Pet - Mode Work & Computer Chill
 * Quản lý phiên làm việc tập trung, ngồi máy tính chill, vẽ bàn ghế & câu thoại
 */

// 1. ĐỒNG HỒ CÁT LOADING TRÊN ĐẦU CAPYBARA KHI LÀM VIỆC TẬP TRUNG
function drawHourglass(c, cx, cy) {
  c.save();
  c.translate(cx, cy);

  const now = Date.now();
  const period = 2000;
  const t = now % period;

  const hw = 5;
  const hh = 7;

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

// 2. VẼ BÀN LÀM VIỆC, GHẾ XOAY, ĐỒNG HỒ CÁT & CHAI NƯỚC TRÊN BÀN
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
        drawSweatDrop(c, desk.x + 40, groundY - WORK_H + 16, 2.2);
        drawHourglass(c, desk.x + 36, groundY - WORK_H - 12);
      }
    }
  } else {
    // Khi chưa ngồi vào: vẽ hình bàn ghế và laptop trống
    if (deskImg.complete && deskImg.naturalWidth > 0) {
      c.drawImage(deskImg, desk.x, groundY - DESK_H, DESK_W, DESK_H);
    }
  }

  c.restore();
}

// 3. KHI NHẤN "LÀM VIỆC"
function triggerWork() {
  if (typeof feedingSystem !== 'undefined' && feedingSystem.isStriking) {
    showSpeechBubble('Đang đình công vì đói, không làm gì hết! 🪧', 3000, true);
    return;
  }

  if (
    capy.state === CapyState.WORKING ||
    capy.state === CapyState.PUSHING_DESK ||
    capy.state === CapyState.FETCHING_DESK
  ) return;

  // Nếu đang ngồi trong bồn tắm: cất bồn tắm ngay rồi sang ngồi máy tính
  if (capy.state === CapyState.BATHING || (tub.visible && tub.x < canvas.width)) {
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      orange.state = 'ON_HEAD';
    }
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    retractWaitTimer = 1;
    retractTarget = 'tub';
    nextActionAfterRetract = 'work';
    updateDashboardUI('work');
    return;
  }

  updateDashboardUI('work');
  tub.visible = false;
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

    if (orange.state === 'ON_HEAD') {
      dropOrange(-1, -3.2);
      orange.x = desk.x + 20;
      orange.y = groundY - WORK_H + 10;
    }

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

  capy.facing = 1;
  capy.y = groundY;
  capy.vy = 0;
  capy.state = CapyState.FETCHING_DESK;
  const fetchMsg = (settings.computerMode === 'chill') ? (Messages.fetchDeskChill || 'Chơi game thôi 🎮') : Messages.fetchDesk;
  showSpeechBubble(fetchMsg, 3500, false);
}

// 4. CÂU THOẠI VU VƠ KHI NGỒI LÀM VIỆC (MỖI 10S HIỆN 5S RỒI TẮT)
var lastWorkQuoteEndTime = Date.now();
var lastSpokenWorkQuote = '';
var WORK_QUOTE_PAUSE_MS = 8000;
var WORK_QUOTE_DURATION_MS = 5000;

function updateWorkRandomQuotes() {
  if (capy.state !== CapyState.WORKING || !desk.visible || waterReminderActive) {
    lastWorkQuoteEndTime = Date.now();
    return;
  }

  if (speechBubble.active) return;

  const now = Date.now();
  if (now - lastWorkQuoteEndTime >= WORK_QUOTE_PAUSE_MS) {
    const quotesList = (settings.computerMode === 'chill') ? Messages.roamQuotes : Messages.workQuotes;
    if (quotesList && quotesList.length > 0) {
      let quote = quotesList[Math.floor(Math.random() * quotesList.length)];
      if (quotesList.length > 1 && quote === lastSpokenWorkQuote) {
        quote = quotesList[Math.floor(Math.random() * quotesList.length)];
      }
      lastSpokenWorkQuote = quote;
      showSpeechBubble(quote, WORK_QUOTE_DURATION_MS, false);
      lastWorkQuoteEndTime = now + WORK_QUOTE_DURATION_MS;
    }
  }
}
