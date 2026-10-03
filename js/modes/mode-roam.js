/**
 * Capybara Desktop Pet - Mode Roam (Đi dạo)
 * Quản lý kích hoạt đi dạo và câu thoại vu vơ khi dạo chơi
 */

// 1. KHI NHẤN "ĐI DẠO"
function triggerRoam() {
  if (typeof feedingSystem !== 'undefined' && feedingSystem.isStriking) {
    showSpeechBubble('Đang đình công vì đói, không làm gì hết! 🪧', 3000, true);
    return;
  }

  if (isWorkSessionLocked()) {
    const timeStr = getWorkRemainingTimeString();
    showSpeechBubble(Messages.workRemainingWarning(timeStr), 3200, true);
    return;
  }

  clearSpeechBubble();
  updateDashboardUI('roam');

  if (capy.state === CapyState.WORKING || (desk.visible && desk.x < canvas.width)) {
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      orange.state = 'ON_HEAD';
    }
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    retractWaitTimer = 1;
    retractTarget = 'desk';
    nextActionAfterRetract = null;
  } else if (capy.state === CapyState.BATHING || (tub.visible && tub.x < canvas.width)) {
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      orange.state = 'ON_HEAD';
    }
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    showSpeechBubble(Messages.bathTooHot, 3200, false);
    retractWaitTimer = 1;
    retractTarget = 'tub';
    nextActionAfterRetract = null;
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

// 2. CÁC CÂU THOẠI NGU NGƠ RANDOM KHI ĐI DẠO (MỖI 10S HIỆN 5S RỒI TẮT)
var lastRoamQuoteEndTime = Date.now();
var lastSpokenRoamQuote = '';
var ROAM_QUOTE_PAUSE_MS = 8000;
var ROAM_QUOTE_DURATION_MS = 5000;

function updateRoamRandomQuotes() {
  const isRoaming = (
    capy.state === CapyState.WALK_RIGHT ||
    capy.state === CapyState.WALK_LEFT ||
    capy.state === CapyState.IDLE_RIGHT ||
    capy.state === CapyState.IDLE_LEFT
  );

  if (!isRoaming || waterReminderActive || capy.state === CapyState.LOST_ORANGE || capy.state === CapyState.SLEEPING) {
    lastRoamQuoteEndTime = Date.now();
    return;
  }

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
      lastRoamQuoteEndTime = now + ROAM_QUOTE_DURATION_MS;
    }
  }
}
