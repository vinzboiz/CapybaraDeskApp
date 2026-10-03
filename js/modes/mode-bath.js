/**
 * Capybara Desktop Pet - Mode Bath (Đi tắm Onsen)
 * Quản lý bồn tắm Onsen, hơi nước, má đỏ ngâm bồn, và câu thoại khi tắm
 */



// 2. VẼ BỒN TẮM ONSEN & CHAI NƯỚC BÊN CẠNH BỒN TẮM
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

      drawSweatDrop(c, tub.x + 39, tub.y + 14, 2.2);
    }
  } else {
    if (tubImg.complete && tubImg.naturalWidth > 0) {
      c.drawImage(tubImg, tub.x, tub.y, tub.width, tub.height);
    }
  }

  c.restore();
}

// 3. KHI NHẤN "ĐI TẮM"
function triggerBath() {
  if (typeof feedingSystem !== 'undefined' && feedingSystem.isStriking) {
    showSpeechBubble('Đang đình công vì đói, không làm gì hết! 🪧', 3000, true);
    return;
  }

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

  // Nếu đang ngồi bàn làm việc: cất bàn ngay lập tức rồi ngâm bồn tắm
  if (capy.state === CapyState.WORKING || (desk.visible && desk.x < canvas.width)) {
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      orange.state = 'ON_HEAD';
    }
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    retractWaitTimer = 1;
    retractTarget = 'desk';
    nextActionAfterRetract = 'bath';
    updateDashboardUI('bath');
    return;
  }

  updateDashboardUI('bath');
  desk.visible = false;
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

  tub.visible = true;
  tub.x = canvas.width + 10;
  tub.y = groundY - tub.height;

  capy.facing = 1;
  capy.y = groundY;
  capy.vy = 0;
  capy.state = CapyState.FETCHING_TUB;
  showSpeechBubble(Messages.fetchTub, 3500, false);
}

// 4. CÂU THOẠI RANDOM KHI NGÂM BỒN ONSEN (MỖI 10S HIỆN 5S RỒI TẮT)
var lastBathQuoteEndTime = Date.now();
var lastSpokenBathQuote = '';
var BATH_QUOTE_PAUSE_MS = 8000;
var BATH_QUOTE_DURATION_MS = 5000;

function updateBathRandomQuotes() {
  if (capy.state !== CapyState.BATHING || !tub.visible || waterReminderActive) {
    lastBathQuoteEndTime = Date.now();
    return;
  }

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
      lastBathQuoteEndTime = now + BATH_QUOTE_DURATION_MS;
    }
  }
}
