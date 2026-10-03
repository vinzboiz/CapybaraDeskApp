/**
 * Capybara Desktop Pet - Gate System (Cổng dịch chuyển không gian giữa các màn hình)
 * 
 * Tính năng chính:
 * 1. Khi kích hoạt (Nút Dashboard, phím G, Control Panel):
 *    - Cổng trồi từ từ từ dưới lòng đất lên kèm hiệu ứng rung và bụi đất.
 *    - Capy TỰ ĐỘNG chạy đến cổng (người dùng không cần và không thể nhấn vào cổng).
 *    - Nếu Capy đang bay/rơi trên không: chờ hạ cánh an toàn tiếp đất rồi mới di chuyển đến cổng.
 *    - Nếu quả cam bị rơi dưới sàn: Capy nhận biết và quay lại nhặt cam lên đầu trước, cổng đứng chờ, xong mới đi qua cổng để tránh mất cam!
 * 2. Khi bước vào cổng bên này:
 *    - Capy fade out bước vào lòng cổng.
 *    - Cổng bên này KHÔNG mất ngay mà đứng lại 1s, sau đó chui từ từ xuống đất kèm rung và bụi đất.
 * 3. Tỉ lệ 3 kịch bản chuyển màn hình:
 *    - 45%: Rơi từ trên trời xuống ở màn hình bên kia (bung dù tiếp đất êm ái).
 *    - 45%: Cổng đón trồi lên ở màn hình bên kia -> 1s sau Capy bước ra -> cổng chui xuống đất kèm rung và bụi.
 *    - 10%: Cổng chập nổ tung (BOOM! 💥), Capy bị thổi bay lùi lại chóng mặt và phải bấm lại.
 * 4. Nếu ở màn hình mới cổng đến chưa mất mà bấm tiếp: Tạo ngay cổng đi mới ngẫu nhiên, không bị kẹt.
 * 5. Hiệu ứng cổng dịch chuyển: Giãn dọc theo thân cổng, màu sáng rực rỡ neon cyan/purple.
 */

var gateImg = new Image();
gateImg.src = 'assets/items/gate.png';

const GATE_W = 76;
const GATE_H = 70;
const GATE_GROUND_OFFSET = 10; // Chân cột cắm xuống sàn taskbar

var gateState = {
  active: false,
  x: 0,
  y: 0,
  width: GATE_W,
  height: GATE_H,
  opacity: 1.0,
  portalPhase: 0,

  // Hiệu ứng trồi lên / chui xuống đất
  animMode: 'IDLE', // 'RISING', 'OPEN', 'DEPARTURE_WAIT', 'SINKING', 'IDLE'
  verticalOffset: GATE_H + 4, // 74 (dưới đất) -> 0 (trên sàn)
  shakeOffsetX: 0,

  isEntering: false,
  isEmerging: false,
  emergeTimer: 0,
  departureWaitTimer: 0,

  isExploding: false,
  explodeTimer: 0,
  capyAlpha: 1.0,
  targetScenario: null, // 'FALL_FROM_SKY', 'EMERGE_FROM_GATE', 'EXPLODE'

  // Trạng thái tìm nhặt cam trước khi qua cổng
  fetchingLostOrange: false,
  pendingTransitionAfterSink: false
};

// Hạt ma thuật xoáy trong cổng & hạt nổ & hạt bụi đất
var portalParticles = [];
var explosionParticles = [];
var gateDustParticles = [];

/**
 * Sinh hạt tinh thể ma thuật trong lòng cổng
 */
function spawnPortalParticles(cx, cy) {
  if (Math.random() > 0.4) return;
  const colors = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#ffffff', '#67e8f9'];
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * 11 + 2;
  portalParticles.push({
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * (dist * 1.7), // Giãn theo trục dọc
    vx: (Math.random() - 0.5) * 0.7,
    vy: -Math.random() * 1.1 - 0.3,
    size: Math.random() * 2.2 + 1.0,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 1.0,
    life: 25,
    maxLife: 25
  });
}

function updatePortalParticles() {
  for (let i = portalParticles.length - 1; i >= 0; i--) {
    const p = portalParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) {
      portalParticles.splice(i, 1);
    }
  }
}

/**
 * Sinh hạt bụi đất khi cổng trồi lên hoặc chui xuống
 */
function spawnGateDust(x, y) {
  const colors = ['#78716c', '#a8a29e', '#d6d3d1', '#57534e', '#44403c', '#86efac'];
  for (let i = 0; i < 2; i++) {
    gateDustParticles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y - Math.random() * 4,
      vx: (Math.random() - 0.5) * 1.8,
      vy: -Math.random() * 1.6 - 0.5,
      size: Math.random() * 2.8 + 1.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.85,
      life: 20,
      maxLife: 20
    });
  }
}

function updateGateDustParticles() {
  for (let i = gateDustParticles.length - 1; i >= 0; i--) {
    const p = gateDustParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.94;
    p.life--;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) {
      gateDustParticles.splice(i, 1);
    }
  }
}

/**
 * Sinh hạt nổ tung toé khi cổng chập điện nổ (10%)
 */
function spawnGateExplosion(cx, cy) {
  const colors = ['#ef4444', '#f97316', '#fbbf24', '#71717a', '#3f3f46', '#ffffff'];
  for (let i = 0; i < 38; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5.4 + 2.0;
    explosionParticles.push({
      x: cx + (Math.random() - 0.5) * 16,
      y: cy + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.8,
      size: Math.random() * 4.6 + 2.0,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1.0,
      life: 35,
      maxLife: 35,
      isSmoke: Math.random() > 0.5
    });
  }
}

function updateExplosionParticles() {
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.22;
    p.vx *= 0.96;
    p.life--;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) {
      explosionParticles.splice(i, 1);
    }
  }
}

/**
 * Kiểm tra xem quả cam có đang bị rơi / nằm dưới sàn không
 */
function checkLostOrange() {
  if (typeof orange === 'undefined') return null;

  // Nếu cam đang trên đường bay về đầu: không phải là cam bị mất dưới đất
  if (orange.state === 'RETURNING') return null;
  if (typeof groundOranges !== 'undefined' && groundOranges.some(o => o.state === 'RETURNING')) return null;

  // Nếu quả cam chính đang rơi hoặc đang dưới đất
  if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
    return { targetX: orange.x + orange.width / 2, orangeObj: orange };
  }

  // Nếu có quả cam phụ trong groundOranges
  if (typeof groundOranges !== 'undefined' && groundOranges.length > 0) {
    for (const o of groundOranges) {
      if (o.state === 'RETURNING') return null;
      if (o.state === 'ON_GROUND' || o.state === 'FALLING') {
        return { targetX: o.x + o.width / 2, orangeObj: o };
      }
    }
  }

  // Nếu quả cam chính bị mất hẳn (state === 'NONE') và không có cam trên đầu
  if (orange.state !== 'ON_HEAD' || (typeof capyOrangeCount !== 'undefined' && capyOrangeCount <= 0)) {
    // Tự phục hồi cam ngay lập tức lên đầu Capy để không bị kẹt
    orange.state = 'ON_HEAD';
    if (typeof capyOrangeCount !== 'undefined') capyOrangeCount = 1;
    return null;
  }

  return null;
}

/**
 * 1. KÍCH HOẠT MỞ CỔNG HOẶC TẠO CỔNG MỚI
 */
function triggerGate() {
  if (typeof capy === 'undefined' || !capy) return;
  if (capy.state === CapyState.LEAVING_RUNAWAY) return;

  const safeMinX = 90;
  const safeMaxX = Math.max(safeMinX + 100, canvas.width - 180);
  const randX = Math.floor(safeMinX + Math.random() * (safeMaxX - safeMinX));

  // TẠO CỔNG MỚI TRỒI TỪ LÒNG ĐẤT LÊN
  gateState.active = true;
  gateState.width = GATE_W;
  gateState.height = GATE_H;
  gateState.x = randX;
  gateState.y = groundY - GATE_H + GATE_GROUND_OFFSET;
  gateState.opacity = 1.0;

  // Khởi động hiệu ứng trồi từ dưới đất lên
  gateState.animMode = 'RISING';
  gateState.verticalOffset = GATE_H + 4; // Bắt đầu từ dưới sàn
  gateState.shakeOffsetX = 0;

  gateState.isEntering = false;
  gateState.isEmerging = false;
  gateState.isExploding = false;
  gateState.departureWaitTimer = 0;
  gateState.capyAlpha = 1.0;
  gateState.targetScenario = null;
  gateState.fetchingLostOrange = false;

  // Quyết định kịch bản 45% / 45% / 10%
  const rand = Math.random() * 100;
  if (rand < 45) {
    gateState.targetScenario = 'FALL_FROM_SKY'; // 45%
  } else if (rand < 90) {
    gateState.targetScenario = 'EMERGE_FROM_GATE'; // 45%
  } else {
    gateState.targetScenario = 'EXPLODE'; // 10%
  }

  // Nếu Capy đang ngủ hoặc đang ngơ ngác ? vì mất cam: Đánh thức dậy ngay
  if (capy.state === CapyState.LOST_ORANGE || capy.state === CapyState.SLEEPING) {
    capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
    capy.lostOrangeTimer = 0;
    capy.lostNoticeTimer = 0;
    if (typeof zzzParticles !== 'undefined') zzzParticles.length = 0;
  }
  // Nếu Capy đang ở trạng thái DRAGGED nhưng chuột không còn giữ: phục hồi ngay về đi bộ
  if (capy.state === CapyState.DRAGGED && (typeof isDraggingCapy === 'undefined' || !isDraggingCapy)) {
    capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
    if (capy.y < groundY) capy.y = groundY;
  }

  if (typeof spawnWakeStars === 'function') {
    spawnWakeStars(gateState.x + gateState.width / 2, groundY - 35);
  }
  if (typeof showSpeechBubble === 'function') {
    showSpeechBubble('Uầy! Cổng Không Gian trồi lên nè! ⛩️✨', 3500, false);
  }
}

/**
 * 2. XỬ LÝ KHI CỔNG NỔ (10%)
 */
function handleGateExplode() {
  gateState.isExploding = true;
  gateState.explodeTimer = 0;
  const gateCenterX = gateState.x + gateState.width / 2;

  spawnGateExplosion(gateCenterX, groundY - 30);
  if (typeof spawnImpactStars === 'function') {
    spawnImpactStars(gateCenterX, groundY - 35);
  }

  // Cổng vỡ vụn biến mất
  gateState.active = false;
  gateState.isEntering = false;
  gateState.animMode = 'IDLE';

  // Capybara bị thổi bay lùi lại và ngã chóng mặt
  const blowDir = (capy.x >= gateCenterX) ? 1 : -1;
  capy.facing = -blowDir;
  capy.vy = -3.6;
  capy.x += blowDir * 28;
  capy.state = CapyState.DIZZY;
  capy.dizzyTimer = 140; // 3 giây chóng mặt
  capy.angryUntil = Date.now() + 4500;

  if (typeof showSpeechBubble === 'function') {
    showSpeechBubble('Béo quá đích không lọt rồi mở cổng khác đi bro', 4500, true);
  }
}

/**
 * 3. THỰC HIỆN CHUYỂN MÀN HÌNH SAU KHI CỔNG BÊN NÀY ĐÃ CHUI XUỐNG ĐẤT
 */
function executeScreenTransition() {
  const scenario = gateState.targetScenario;

  // Gửi lệnh chuyển màn hình qua IPC trong Electron
  try {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('switch-to-other-screen');
  } catch (e) {
    console.warn('IPC switch-to-other-screen failed (Browser mode):', e);
  }

  // Đợi cửa sổ chuyển màn hình (~250ms) rồi thực hiện kịch bản đón ở màn hình mới
  setTimeout(() => {
    if (scenario === 'FALL_FROM_SKY') {
      // KỊCH BẢN 1 (45%): Rơi từ trên trời xuống ở màn hình kia
      const spawnX = Math.floor(100 + Math.random() * (canvas.width - 200));
      capy.x = spawnX;
      capy.y = -60;
      capy.fallStartY = -60;
      capy.vy = 1.8;
      capy.fallingFromHigh = true;
      capy.state = CapyState.FALLING;
      gateState.capyAlpha = 1.0;

      if (typeof showSpeechBubble === 'function') {
        showSpeechBubble('Cổng đeo gì lom dom vãi', 3500, false);
      }
    } else if (scenario === 'EMERGE_FROM_GATE') {
      // KỊCH BẢN 2 (45%): Cổng xuất hiện trồi từ dưới đất lên ở màn hình bên kia -> 1s sau Capy bước ra
      const destGateX = Math.floor(100 + Math.random() * (canvas.width - 220));
      gateState.active = true;
      gateState.x = destGateX;
      gateState.y = groundY - GATE_H + GATE_GROUND_OFFSET;
      gateState.opacity = 1.0;

      // Cổng đón trồi từ từ dưới lòng đất lên
      gateState.animMode = 'RISING';
      gateState.verticalOffset = GATE_H + 4;
      gateState.shakeOffsetX = 0;

      gateState.isEmerging = true;
      gateState.emergeTimer = 0;
      gateState.capyAlpha = 0.0; // Capy ẩn mình trong cổng trước

      capy.x = destGateX + GATE_W / 2;
      capy.y = groundY;
      capy.state = CapyState.GATE_EMERGE;
      capy.facing = 1;

      if (typeof spawnWakeStars === 'function') {
        spawnWakeStars(destGateX + GATE_W / 2, groundY - 35);
      }
    }
  }, 250);
}

/**
 * 4. CẬP NHẬT LOGIC CỔNG & HÀNH VI CAPY TỰ ĐỘNG CHẠY ĐẾN
 */
function updateGateSystem() {
  updatePortalParticles();
  updateExplosionParticles();
  updateGateDustParticles();

  // A. XỬ LÝ HIỆU ỨNG TRỒI LÊN (RISING) TỪ LÒNG ĐẤT
  if (gateState.active && gateState.animMode === 'RISING') {
    gateState.verticalOffset -= 2.6; // Trồi lên từ từ
    gateState.shakeOffsetX = (Math.random() - 0.5) * 2.2; // Rung nhẹ

    // Sinh bụi đất ở 2 chân cột
    spawnGateDust(gateState.x + 14, groundY);
    spawnGateDust(gateState.x + gateState.width - 14, groundY);

    if (gateState.verticalOffset <= 0) {
      gateState.verticalOffset = 0;
      gateState.shakeOffsetX = 0;
      gateState.animMode = 'OPEN';
    }
  }

  // B. XỬ LÝ CHỜ 1S SAU KHI CAPY QUA CỔNG (DEPARTURE_WAIT)
  if (gateState.active && gateState.animMode === 'DEPARTURE_WAIT') {
    gateState.departureWaitTimer--;
    if (gateState.departureWaitTimer <= 0) {
      gateState.animMode = 'SINKING';
    }
  }

  // C. XỬ LÝ HIỆU ỨNG CHUI XUỐNG ĐẤT (SINKING) KÈM RUNG VÀ BỤI
  if (gateState.active && gateState.animMode === 'SINKING') {
    gateState.verticalOffset += 2.4; // Chui dần xuống đất
    gateState.shakeOffsetX = (Math.random() - 0.5) * 2.2; // Rung rầm rầm

    // Sinh bụi đất ở chân cổng khi chìm xuống
    spawnGateDust(gateState.x + 14, groundY);
    spawnGateDust(gateState.x + gateState.width - 14, groundY);

    if (gateState.verticalOffset >= GATE_H + 4) {
      gateState.verticalOffset = GATE_H + 4;
      gateState.active = false;
      gateState.animMode = 'IDLE';
      gateState.shakeOffsetX = 0;

      // Cổng bên xuất phát đã ở lại 1s và chui xuống đất xong: tiến hành chuyển màn hình!
      if (gateState.pendingTransitionAfterSink) {
        gateState.pendingTransitionAfterSink = false;
        executeScreenTransition();
      }
    }
  }

  // Hiệu ứng portal xoay
  gateState.portalPhase += 0.08;

  // Sinh hạt lấp lánh khi cổng đang mở
  if (gateState.active && gateState.verticalOffset < GATE_H * 0.6) {
    const portalCenterX = gateState.x + gateState.width / 2 + gateState.shakeOffsetX;
    const portalCenterY = (groundY - GATE_H + GATE_GROUND_OFFSET + gateState.verticalOffset) + 40;
    spawnPortalParticles(portalCenterX, portalCenterY);
  }

  // =========================================================================
  // D. CAPYBARA TỰ ĐỘNG CHẠY ĐẾN CỔNG (HOẶC NHẶT CAM NẾU RỚT TRƯỚC KHI ĐẾN CỔNG)
  // =========================================================================
  if (
    gateState.active &&
    (gateState.animMode === 'OPEN' || gateState.animMode === 'RISING') &&
    !gateState.isEmerging &&
    capy.state !== CapyState.LEAVING_RUNAWAY
  ) {
    // 1. Nếu Capy đang bị kéo hoặc rơi trên không: CHỜ TIẾP ĐẤT AN TOÀN XONG
    const isCurrentlyDragged = (typeof isDraggingCapy !== 'undefined' && isDraggingCapy);
    if (!isCurrentlyDragged && capy.state === CapyState.DRAGGED) {
      if (capy.y >= groundY - 10) {
        capy.y = groundY;
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      }
    }

    const isCapyAirborne = isCurrentlyDragged || capy.state === CapyState.FALLING || capy.state === CapyState.JUMPING || capy.y < groundY - 4;

    if (isCapyAirborne) {
      // Khi đang bị kéo hoặc đang rơi: hủy trạng thái isEntering để Capy tiếp đất xong mới đi cổng
      gateState.isEntering = false;
      return;
    }

    // Đảm bảo Capy đã tiếp đất bằng phẳng
    if (capy.y < groundY) capy.y = groundY;
    if (capy.state === CapyState.DRAGGED) {
      capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
    }

    // 2. Nếu cam đang bay về đầu: Capy ĐỨNG YÊN CHỜ CAM ĐÁP XUỐNG ĐẦU (Không bước đi làm cam rượt đuổi)
    const isAnyOrangeReturning = (typeof orange !== 'undefined' && orange.state === 'RETURNING') ||
      (typeof groundOranges !== 'undefined' && groundOranges.some(o => o.state === 'RETURNING'));

    if (isAnyOrangeReturning) {
      capy.state = (capy.facing === 1) ? CapyState.IDLE_RIGHT : CapyState.IDLE_LEFT;
      capy.walkPhase += 0.04;
      capy.lostOrangeTimer = 0;
      capy.lostNoticeTimer = 0;
      return;
    }

    // 3. Kiểm tra xem quả cam có bị rơi dưới đất / mất cam không
    const lostOrangeInfo = checkLostOrange();

    if (lostOrangeInfo) {
      // CÓ QUẢ CAM BỊ RỚT: Đánh thức Capy dậy ngay nếu đang ngơ ngác (?) hoặc ngủ hoặc đứng yên
      if (capy.state === CapyState.LOST_ORANGE || capy.state === CapyState.SLEEPING || capy.state === CapyState.IDLE_RIGHT || capy.state === CapyState.IDLE_LEFT) {
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      }
      capy.idleTimer = 0;
      capy.lostOrangeTimer = 0;
      capy.lostNoticeTimer = 0;
      if (typeof zzzParticles !== 'undefined') zzzParticles.length = 0;

      const diffX = lostOrangeInfo.targetX - capy.x;
      if (Math.abs(diffX) > 16) {
        const moveDir = diffX > 0 ? 1 : -1;
        capy.facing = moveDir;
        capy.x += moveDir * 2.8; // Chạy nhanh lại chỗ cam
        capy.walkPhase += 0.22;
        capy.state = (moveDir === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      } else {
        // Đã tới chỗ quả cam: nhặt cam lên và đứng yên đợi cam bay lên đầu
        if (lostOrangeInfo.orangeObj) {
          lostOrangeInfo.orangeObj.state = 'RETURNING';
        } else if (typeof orange !== 'undefined') {
          orange.state = 'ON_HEAD';
          capyOrangeCount = 1;
        }
        capy.state = (capy.facing === 1) ? CapyState.IDLE_RIGHT : CapyState.IDLE_LEFT;
      }
      return;
    }

    // 4. CAM ĐÃ AN TOÀN TRÊN ĐẦU: Capy tự động chạy thẳng vào cổng!
    if (capy.state !== CapyState.GATE_ENTER) {
      capy.state = CapyState.GATE_ENTER;
      gateState.isEntering = true;
    }
  }

  // =========================================================================
  // E. KHI CAPY ĐANG CHẠY ĐẾN VÀ BƯỚC VÀO CỔNG
  // =========================================================================
  if (capy.state === CapyState.GATE_ENTER && gateState.isEntering) {
    // Nếu người dùng nhấc kéo Capy đi trong lúc Capy đang chạy vào cổng:
    if ((typeof isDraggingCapy !== 'undefined' && isDraggingCapy) || capy.state === CapyState.DRAGGED) {
      gateState.isEntering = false;
      return;
    }
    const gateCenterX = gateState.x + gateState.width / 2;
    const diffX = gateCenterX - capy.x;

    if (Math.abs(diffX) > 2.5) {
      const moveDir = diffX > 0 ? 1 : -1;
      capy.facing = moveDir;
      capy.x += moveDir * 2.8; // Chạy nhanh vào cổng
      capy.walkPhase += 0.24;
    } else {
      // Đã tới ngay tâm cổng
      capy.x = gateCenterX;

      // Nếu rơi vào kịch bản 10% nổ cổng
      if (gateState.targetScenario === 'EXPLODE') {
        handleGateExplode();
        return;
      }

      // Capy mờ dần vào trong cổng ma thuật
      gateState.capyAlpha = Math.max(0, gateState.capyAlpha - 0.08);
      capy.walkPhase += 0.16;

      if (gateState.capyAlpha <= 0.05) {
        gateState.capyAlpha = 0;
        // Capy đã biến mất vào cổng hoàn toàn!
        // Cổng ở lại 1 giây rồi chui từ từ xuống đất, sau khi chui xong mới chuyển sang màn hình kia
        gateState.isEntering = false;
        gateState.animMode = 'DEPARTURE_WAIT';
        gateState.departureWaitTimer = 45; // 1 giây ở 45 FPS
        gateState.pendingTransitionAfterSink = true;
      }
    }
    return;
  }

  // =========================================================================
  // F. KHI CỔNG HIỆN Ở MÀN HÌNH KIA & CAPY BƯỚC RA SAU 1S (Kịch bản 45%)
  // =========================================================================
  if (capy.state === CapyState.GATE_EMERGE && gateState.isEmerging) {
    gateState.emergeTimer++;

    // 1 giây = 45 frames (ở 45 FPS)
    if (gateState.emergeTimer < 45) {
      // Đang chờ 1s trong lòng cổng, phát sáng xoáy ma thuật
      gateState.capyAlpha = 0;
      return;
    }

    // Sau 1s: Capy hiện hình dần và bước ra khỏi cổng!
    gateState.capyAlpha = Math.min(1.0, gateState.capyAlpha + 0.06);
    capy.facing = 1;
    capy.x += 1.4;
    capy.walkPhase += 0.18;

    if (gateState.emergeTimer === 46) {
      if (typeof spawnWakeStars === 'function') {
        spawnWakeStars(capy.x, groundY - 30);
      }
      if (typeof showSpeechBubble === 'function') {
        showSpeechBubble('Qua được rồi nè! Thần kỳ ghê ✨🥰', 3500, false);
      }
    }

    // Đã bước ra khỏi cổng hoàn toàn
    if (capy.x >= gateState.x + gateState.width + 16) {
      gateState.isEmerging = false;
      gateState.capyAlpha = 1.0;
      capy.state = CapyState.WALK_RIGHT;

      // Cổng bắt đầu chui từ từ xuống đất kèm rung và bụi đất!
      gateState.animMode = 'SINKING';
    }
  }
}

/**
 * 5. VẼ CỔNG ĐÁ, HIỆU ỨNG MA THUẬT & HẠT BỤI ĐẤT
 */
function drawGateSystem(c) {
  // 1. Vẽ các hạt bụi đất khi cổng trồi lên / chui xuống
  if (gateDustParticles.length > 0) {
    c.save();
    for (const p of gateDustParticles) {
      c.fillStyle = p.color;
      c.globalAlpha = p.alpha;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // 2. Vẽ các hạt nổ nếu có
  if (explosionParticles.length > 0) {
    c.save();
    for (const p of explosionParticles) {
      c.fillStyle = p.color;
      c.globalAlpha = p.alpha;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  if (!gateState.active || gateState.verticalOffset >= GATE_H + 3) return;

  const baseDrawY = groundY - GATE_H + GATE_GROUND_OFFSET;
  const drawX = gateState.x + gateState.shakeOffsetX;
  const drawY = baseDrawY + gateState.verticalOffset;
  const gateW = gateState.width;
  const gateH = gateState.height;
  const portalCenterX = drawX + gateW / 2;
  const portalCenterY = drawY + 41; // Căn chính xác giữa khoảng trống 2 cột đá

  c.save();
  c.imageSmoothingEnabled = false;

  // A. Bóng đổ dưới chân cổng (chỉ hiện khi cổng đã trồi lên gần mặt đất)
  const riseProgress = Math.max(0, 1 - (gateState.verticalOffset / (GATE_H + 4)));
  if (riseProgress > 0.15) {
    c.fillStyle = `rgba(15, 23, 42, ${0.36 * riseProgress})`;
    c.beginPath();
    c.ellipse(portalCenterX, groundY + 2, gateW * 0.44 * riseProgress, 4.5 * riseProgress, 0, 0, Math.PI * 2);
    c.fill();
  }

  // =========================================================================
  // CLIP MẶT ĐẤT: Chỉ hiển thị phần cổng trồi lên trên mặt sàn taskbar
  // =========================================================================
  c.save();
  c.beginPath();
  c.rect(0, 0, canvas.width, groundY + GATE_GROUND_OFFSET + 2);
  c.clip();

  // B. VẼ HIỆU ỨNG TỎA SÁNG MA THUẬT RỰC RỠ (GIÃN THEO TRỤC DỌC)
  // Chỉ vẽ vortex khi cổng đã trồi lên ít nhất 40%
  if (gateState.verticalOffset < GATE_H * 0.65) {
    const vortexProgress = Math.max(0, 1 - (gateState.verticalOffset / 35));
    const vortexRadiusX = 13.5;
    const vortexRadiusY = 25.0; // GIÃN THEO TRỤC DỌC THEO YÊU CẦU

    const pulse = Math.sin(gateState.portalPhase * 2.0) * 0.08;

    // Gradient sáng rực rỡ neon: Lõi trắng tinh -> Cyan lấp lánh -> Tím neon rực rỡ
    const grad = c.createRadialGradient(portalCenterX, portalCenterY, 2, portalCenterX, portalCenterY, vortexRadiusY + 3);
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * vortexProgress})`);
    grad.addColorStop(0.28, `rgba(56, 189, 248, ${(0.90 + pulse) * vortexProgress})`);
    grad.addColorStop(0.68, `rgba(168, 85, 247, ${(0.80 + pulse) * vortexProgress})`);
    grad.addColorStop(0.92, `rgba(147, 51, 234, ${0.35 * vortexProgress})`);
    grad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');

    c.fillStyle = grad;
    c.beginPath();
    c.ellipse(portalCenterX, portalCenterY, vortexRadiusX + 3, vortexRadiusY + 3, 0, 0, Math.PI * 2);
    c.fill();

    // Vẽ các hạt tinh thể ma thuật bay lơ lửng trong cổng
    for (const p of portalParticles) {
      c.fillStyle = p.color;
      c.globalAlpha = p.alpha * vortexProgress;
      c.beginPath();
      c.arc(p.x + gateState.shakeOffsetX, p.y + gateState.verticalOffset, p.size, 0, Math.PI * 2);
      c.fill();
    }
  }

  // C. Vẽ Cổng Đá (gate.png) đè lên phía trước để 2 trụ đá che 2 bên lòng xoáy
  c.globalAlpha = 1.0;
  if (gateImg.complete && gateImg.naturalWidth > 0) {
    c.drawImage(gateImg, drawX, drawY, gateW, gateH);
  }

  c.restore(); // Hết clip mặt đất
  c.restore(); // Hết drawGateSystem
}

/**
 * 6. SỰ KIỆN CHUỘT: Người dùng KHÔNG nhấn được vào cổng (Capy tự động chạy đến)
 */
function handleGateMouseDown(mx, my) {
  return false; // Chuột xuyên qua cổng, Capy tự động đến
}

function handleGateMouseMove(mx, my) {
  return false;
}

// Export ra window
window.triggerGate = triggerGate;
window.updateGateSystem = updateGateSystem;
window.drawGateSystem = drawGateSystem;
window.handleGateMouseDown = handleGateMouseDown;
window.handleGateMouseMove = handleGateMouseMove;
window.gateState = gateState;
