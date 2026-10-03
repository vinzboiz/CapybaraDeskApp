/**
 * Capybara Desktop Pet - Speech Bubble UI
 * Quản lý trạng thái và vẽ bong bóng thoại của Capybara
 */

var speechBubble = {
  text: '',
  active: false,
  expiresAt: 0,
  persistent: false,
  isWarning: false
};

function showSpeechBubble(text, durationMs = 3000, isWarning = false) {
  if (
    typeof capy !== 'undefined' &&
    capy &&
    (capy.state === CapyState.LEAVING_RUNAWAY ||
      (typeof feedingSystem !== 'undefined' && feedingSystem.isLeavingRunaway))
  ) {
    const runawayMsg =
      typeof Messages !== 'undefined' && Messages.runawayQuote
        ? Messages.runawayQuote
        : 'Đói lả rồi, tớ bỏ nhà đi đây! Tạm biệt...';
    if (text !== runawayMsg) {
      return;
    }
  }
  speechBubble.text = text;
  speechBubble.active = true;
  speechBubble.persistent = (durationMs === 0);
  speechBubble.expiresAt = (durationMs > 0) ? (Date.now() + durationMs) : 0;
  speechBubble.isWarning = isWarning;
}

function clearSpeechBubble() {
  if (
    typeof capy !== 'undefined' &&
    capy &&
    (capy.state === CapyState.LEAVING_RUNAWAY ||
      (typeof feedingSystem !== 'undefined' && feedingSystem.isLeavingRunaway))
  ) {
    return;
  }
  speechBubble.active = false;
  speechBubble.text = '';
  speechBubble.persistent = false;
}

/**
 * Vẽ khung thoại: Chữ đen nền trắng, dồn sang trái, tam giác góc dưới bên phải trỏ xuống đầu Capy
 */
function drawSpeechBubbleUI(c) {
  if (typeof capy === 'undefined' || !capy) return;

  const isHiding = (capy.state === CapyState.HIDDEN || capy.state === CapyState.HIDING_RUN);
  // Khi đang trốn: tuyệt đối không hiện nhắc uống nước, chỉ hiện lời thoại của trốn (nếu có)
  const canShowWaterReminder = (typeof waterReminderActive !== 'undefined' && waterReminderActive) && !isHiding;

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
    if (capy.state === CapyState.WORKING && typeof desk !== 'undefined' && desk.visible) {
      anchorX = desk.x + 36;
      anchorY = groundY - WORK_H;
    } else if (capy.state === CapyState.BATHING && typeof tub !== 'undefined' && tub.visible) {
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
    text = (typeof Messages !== 'undefined' && Messages.waterReminder) ? Messages.waterReminder : 'uống ngay đi bro 🥤';
    if (capy.state === CapyState.WORKING && typeof desk !== 'undefined' && desk.visible) {
      anchorX = desk.x + 36;
      anchorY = groundY - WORK_H;
    } else if (capy.state === CapyState.BATHING && typeof tub !== 'undefined' && tub.visible) {
      anchorX = tub.x + tub.width / 2;
      anchorY = tub.y;
    } else {
      anchorX = capy.x;
      anchorY = capy.y - RENDER_H;
    }
  }

  if (!text) return;

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

  // Nền trắng, viền đen sắc nét
  const borderColor = '#0f172a';
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

  // Chữ đen sắc nét trên nền trắng
  c.fillStyle = '#0f172a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, boxX + boxW / 2, boxY + boxH / 2);

  c.restore();
}
