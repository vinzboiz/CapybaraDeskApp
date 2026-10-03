// ==========================================
// CAPYBARA DESKTOP PET - QUẢ CAM & CHẾ ĐỘ XẾP CHỒNG CAM
// File tách riêng quản lý logic xếp chồng cam, thả cam và vật lý cam
// ==========================================

var capyOrangeCount = 1; // Số quả cam xếp trên đầu Capybara (mặc định 1)
var groundOranges = [];  // Danh sách quả cam rơi dưới đất hoặc đang ném
var nextOrangeThrowTimer = null;
var isOrangeModeEnabled = false;

var orange = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  width: 18,
  height: 19,
  state: 'ON_HEAD',
  bounceCount: 0,
  rotation: 0,
  rotSpeed: 0
};

// Đổ cam trên đầu xuống sàn (khi đạt 4 quả hoặc khi click/ngã)
function dropOrange(dir = 1, impulseY = 0) {
  if (orange.state !== 'ON_HEAD') return;

  const countToDrop = Math.max(1, capyOrangeCount);
  capyOrangeCount = 0; // Đổ sạch cam trên đầu
  groundOranges.length = 0; // Xóa cam cũ trên sàn

  // Quả cam chính rơi trượt thẳng xuống sàn (quả duy nhất giữ lại dưới sàn)
  orange.state = 'FALLING';
  orange.vx = dir * (1.6 + Math.random() * 0.5);
  orange.vy = 0.5; // Không nảy tưng lên, rơi thẳng nghiêng xuống đất
  orange.rotSpeed = dir * 0.15;
  orange.bounceCount = 99; // 0 lần nảy tưng khi chạm đất (chuyển ON_GROUND ngay)

  // Vị trí đỉnh đầu Capy
  const headX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3);
  const baseHeadY = capy.y - RENDER_H - 7;

  // 3 quả cam xếp trên cao rơi nghiêng xuống sàn và lập tức biến mất khi chạm đất (isTempSpilled = true)
  for (let i = 1; i < countToDrop; i++) {
    const vxMult = 1.0 + i * 0.35 + Math.random() * 0.2;

    groundOranges.push({
      x: headX - 9 + (dir * i * 4) + (Math.random() - 0.5) * 3,
      y: baseHeadY - (i * 16), // Vị trí xuất phát chính xác từ độ cao tháp
      vx: dir * (1.2 * vxMult),
      vy: 0.3 + i * 0.2, // Rơi trượt nghiêng xuống, không có lực nảy ngược lên
      width: 18,
      height: 19,
      state: 'FALLING',
      bounceCount: 99,
      isTempSpilled: true, // Đánh dấu là quả phụ rơi đổ -> chạm sàn mất ngay!
      groundTimer: 0,
      opacity: 1,
      rotation: Math.random() * Math.PI,
      rotSpeed: dir * (0.1 + i * 0.06)
    });
  }

  if (!capy.lostNoticeTimer) capy.lostNoticeTimer = 0;
}

// Lập lịch ném quả cam ngẫu nhiên (Mỗi 15 giây khi bật mode cam)
function scheduleNextOrangeThrow(customDelayMs) {
  if (nextOrangeThrowTimer) {
    clearTimeout(nextOrangeThrowTimer);
    nextOrangeThrowTimer = null;
  }
  if (!isOrangeModeEnabled) return;

  const delay = (customDelayMs !== undefined) ? customDelayMs : 15000;
  nextOrangeThrowTimer = setTimeout(() => {
    spawnThrownOrange();
  }, delay);
}

function getTotalOrangesCount() {
  const headCount = (orange.state === 'ON_HEAD' ? capyOrangeCount : (orange.state !== 'NONE' ? 1 : 0));
  const groundCount = groundOranges.length;
  return headCount + groundCount;
}

function spawnThrownOrange() {
  if (!isOrangeModeEnabled) return;

  // Nếu tổng số quả cam trên đầu và trên sàn đạt >= 4: không ném thêm
  if (getTotalOrangesCount() >= 4) {
    scheduleNextOrangeThrow(15000);
    return;
  }

  const targetX = 120 + Math.random() * (canvas.width - 240);
  const startX = canvas.width + 30;
  const startY = groundY - 120 - Math.random() * 40;
  const flightDuration = 48;
  const floorY = groundY - 19;
  const g = 0.38;

  const vx = (targetX - startX) / flightDuration;
  const vy = (floorY - startY - 0.5 * g * flightDuration * flightDuration) / flightDuration;

  groundOranges.push({
    x: startX,
    y: startY,
    vx: vx,
    vy: vy,
    width: 18,
    height: 19,
    state: 'FALLING',
    bounceCount: 0,
    groundTimer: 0,
    opacity: 1,
    rotation: 0,
    rotSpeed: -0.15 - Math.random() * 0.1
  });

  scheduleNextOrangeThrow(15000);
}

// Cập nhật vị trí & trạng thái quả cam
function updateOrange() {
  const floorY = groundY - orange.height;

  // Nếu mode xếp cam đang TẮT: Đảm bảo chỉ tồn tại tối đa đúng 1 quả cam trên sàn / trên đầu
  if (!isOrangeModeEnabled) {
    if (orange.state === 'ON_HEAD') {
      capyOrangeCount = 1;
      if (groundOranges.length > 0) {
        groundOranges.length = 0;
      }
    } else if (orange.state === 'ON_GROUND' || orange.state === 'FALLING' || orange.state === 'RETURNING') {
      if (groundOranges.length > 0) {
        groundOranges.length = 0;
      }
    } else {
      if (groundOranges.length > 1) {
        groundOranges.length = 1;
      }
    }
  }

  // Cập nhật vị trí cam chính trên đầu
  if (orange.state === 'ON_HEAD') {
    if (capy.state !== CapyState.WORKING) {
      const isWalking = (
        capy.state === CapyState.WALK_RIGHT ||
        capy.state === CapyState.WALK_LEFT ||
        capy.state === CapyState.JUMPING ||
        capy.state === CapyState.WOOD_LOG_INTERACT ||
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
      if (orange.bounceCount >= 99) {
        orange.state = 'ON_GROUND';
        orange.vx = 0;
        orange.vy = 0;
        orange.rotSpeed = 0;
        orange.rotation = 0;
      } else {
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
      capy.state === CapyState.JUMPING ||
      capy.state === CapyState.WOOD_LOG_INTERACT ||
      capy.state === CapyState.FETCHING_DESK ||
      capy.state === CapyState.FETCHING_TUB ||
      capy.state === CapyState.APPROACHING_DESK ||
      capy.state === CapyState.APPROACHING_TUB
    );
    const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
    const targetX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3) - orange.width / 2;
    const targetY = capy.y - RENDER_H + bodyYOffset - 7 - Math.max(0, capyOrangeCount - 1) * 16;

    orange.x += (targetX - orange.x) * 0.22;
    orange.y += (targetY - orange.y) * 0.22;
    orange.rotation *= 0.75;

    if (Math.hypot(targetX - orange.x, targetY - orange.y) < 3.5) {
      orange.state = 'ON_HEAD';
      orange.rotation = 0;
      capyOrangeCount++;

      // KHI XẾP ĐẾN QUẢ THỨ 4: CẢ CHỒNG CAM ĐỔ NGHIÊNG VỀ HƯỚNG VẬN ĐỘNG NGƯỢC LẠI CỦA CAPYBARA!
      if (capyOrangeCount >= 4) {
        const dropDir = - (capy.facing || 1); // Hướng đi ngược lại
        dropOrange(dropDir, -1.8);
      }

      if (capy.state === CapyState.LOST_ORANGE || capy.state === CapyState.SLEEPING) {
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      }
      capy.lostOrangeTimer = 0;
      zzzParticles.length = 0;
    }
  }

  // Cập nhật các quả cam ném rơi dưới đất
  for (let i = groundOranges.length - 1; i >= 0; i--) {
    const o = groundOranges[i];
    if (o.state === 'FALLING') {
      o.x += o.vx;
      o.y += o.vy;
      o.vy += 0.38;
      o.vx *= 0.98;
      o.rotation += o.rotSpeed;

      if (o.y >= floorY) {
        o.y = floorY;

        // Nếu là quả cam phụ rơi từ tháp (isTempSpilled = true): chạm sàn lập tức biến mất ngay!
        if (o.isTempSpilled) {
          groundOranges.splice(i, 1);
          continue;
        }

        if (o.bounceCount >= 99) {
          o.state = 'ON_GROUND';
          o.vx = 0;
          o.vy = 0;
          o.rotSpeed = 0;
        } else {
          o.vy = -o.vy * 0.42;
          o.rotSpeed *= 0.6;
          o.bounceCount++;

          if (Math.abs(o.vy) < 0.6 || o.bounceCount >= 3) {
            o.state = 'ON_GROUND';
            o.y = floorY;
            o.vx = 0;
            o.vy = 0;
            o.rotSpeed = 0;
            o.rotation = 0;
            o.groundTimer = 0;
          }
        }
      }

      if (o.x <= 8) {
        o.x = 8;
        o.vx = -o.vx * 0.5;
      } else if (o.x >= canvas.width - o.width - 8) {
        o.x = canvas.width - o.width - 8;
        o.vx = -o.vx * 0.5;
      }
    } else if (o.state === 'ON_GROUND') {
      if (!o.groundTimer) o.groundTimer = 0;
      o.groundTimer++;

      // Quá 30 giây (30 * 45 = 1350 frames) người dùng không nhặt: cam tự mờ dần biến mất
      if (o.groundTimer >= 1350) {
        if (typeof o.opacity === 'undefined') o.opacity = 1;
        o.opacity -= 0.035;
        if (o.opacity <= 0) {
          groundOranges.splice(i, 1);
          continue;
        }
      }
    } else if (o.state === 'RETURNING') {
      const isWalking = (
        capy.state === CapyState.WALK_RIGHT ||
        capy.state === CapyState.WALK_LEFT ||
        capy.state === CapyState.JUMPING ||
        capy.state === CapyState.WOOD_LOG_INTERACT
      );
      const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
      const stackHeight = (orange.state === 'ON_HEAD' ? capyOrangeCount : 0);
      const targetX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3) - o.width / 2;
      const targetY = capy.y - RENDER_H + bodyYOffset - 7 - stackHeight * 16;

      o.x += (targetX - o.x) * 0.22;
      o.y += (targetY - o.y) * 0.22;
      o.rotation *= 0.75;

      if (Math.hypot(targetX - o.x, targetY - o.y) < 4) {
        groundOranges.splice(i, 1);
        if (orange.state !== 'ON_HEAD') {
          orange.state = 'ON_HEAD';
          capyOrangeCount = 1;
        } else {
          capyOrangeCount++;
        }

        // KHI XẾP ĐẾN QUẢ THỨ 4: CẢ CHỒNG CAM ĐỔ NGHIÊNG VỀ HƯỚNG VẬN ĐỘNG NGƯỢC LẠI CỦA CAPYBARA!
        if (capyOrangeCount >= 4) {
          const dropDir = - (capy.facing || 1);
          dropOrange(dropDir, -1.8);
        }
      }
    }
  }
}

// Vẽ các quả cam xếp trên đầu và rải dưới đất
function drawOrange(c) {
  if (!orangeImg.complete || orangeImg.naturalWidth === 0) return;

  const isWalking = (
    capy.state === CapyState.WALK_RIGHT ||
    capy.state === CapyState.WALK_LEFT ||
    capy.state === CapyState.JUMPING ||
    capy.state === CapyState.WOOD_LOG_INTERACT ||
    capy.state === CapyState.FETCHING_DESK ||
    capy.state === CapyState.FETCHING_TUB ||
    capy.state === CapyState.APPROACHING_DESK ||
    capy.state === CapyState.APPROACHING_TUB ||
    capy.state === CapyState.GATE_ENTER ||
    capy.state === CapyState.GATE_EMERGE
  );
  const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
  const orangeBounce = isWalking ? Math.cos(capy.walkPhase * 2) * 1 : 0;

  c.save();
  c.imageSmoothingEnabled = false;

  // 1. VẼ TẤT CẢ CÁC QUẢ CAM XẾP CHỒNG TRÊN ĐẦU CAPYBARA
  if (orange.state === 'ON_HEAD' && capy.state !== CapyState.WORKING) {
    const headX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3);
    const baseHeadY = capy.y - RENDER_H + bodyYOffset + orangeBounce - 7;
    const tilt = isWalking ? Math.sin(capy.walkPhase) * 0.08 : 0;

    for (let i = 0; i < Math.max(1, capyOrangeCount); i++) {
      c.save();
      const itemY = baseHeadY - i * 16;
      c.translate(headX, itemY + orange.height / 2);
      c.rotate(tilt * (1 + i * 0.25)); // Cam xếp càng cao lắc nghiêng càng nhiều
      if (typeof gateState !== 'undefined' && typeof gateState.capyAlpha === 'number' && (capy.state === CapyState.GATE_ENTER || capy.state === CapyState.GATE_EMERGE)) {
        c.globalAlpha = gateState.capyAlpha;
      }
      c.drawImage(orangeImg, -orange.width / 2, -orange.height / 2, orange.width, orange.height);
      c.restore();
    }
  } else if (orange.state !== 'ON_HEAD' && orange.state !== 'NONE' && !orange.isBeingEaten) {
    // Quả chính rơi
    const distToGround = Math.max(0, groundY - (orange.y + orange.height));
    const shadowAlpha = Math.max(0.08, 0.25 - distToGround * 0.003);
    const shadowScale = Math.max(0.4, 1 - distToGround * 0.015);

    c.save();
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
    c.restore();
  }

  // 2. VẼ CÁC QUẢ CAM KHÁC DƯỚI ĐẤT / BAY TRÊN MÀN HÌNH
  for (const o of groundOranges) {
    c.save();
    if (typeof o.opacity === 'number') {
      c.globalAlpha = Math.max(0, Math.min(1, o.opacity));
    }
    const distToGround = Math.max(0, groundY - (o.y + o.height));
    const shadowAlpha = Math.max(0.08, 0.25 - distToGround * 0.003) * (o.opacity || 1);
    const shadowScale = Math.max(0.4, 1 - distToGround * 0.015);

    c.fillStyle = `rgba(20, 20, 30, ${shadowAlpha})`;
    c.beginPath();
    c.ellipse(o.x + o.width / 2, groundY, 7 * shadowScale, 2.5 * shadowScale, 0, 0, Math.PI * 2);
    c.fill();

    c.translate(o.x + o.width / 2, o.y + o.height / 2);
    c.rotate(o.rotation);

    if (o.isBeingEaten && o.bites && o.bites.length > 0 && typeof getBiteCanvas === 'function') {
      const { canvas: bCanvas, ctx: bCtx } = getBiteCanvas();
      bCtx.clearRect(0, 0, 44, 44);
      const fx = 22 - o.width / 2;
      const fy = 22 - o.height / 2;
      bCtx.globalCompositeOperation = 'source-over';
      bCtx.drawImage(orangeImg, fx, fy, o.width, o.height);
      bCtx.globalCompositeOperation = 'destination-out';
      for (const bite of o.bites) {
        bCtx.beginPath();
        bCtx.arc(bite.x, bite.y, bite.radius, 0, Math.PI * 2);
        bCtx.fill();
      }
      bCtx.globalCompositeOperation = 'source-over';
      c.drawImage(bCanvas, -22, -22);
    } else {
      c.drawImage(orangeImg, -o.width / 2, -o.height / 2, o.width, o.height);
    }

    if (o.state === 'ON_GROUND') {
      const pulse = Math.sin(Date.now() * 0.006) * 0.5 + 0.5;
      c.strokeStyle = `rgba(255, 195, 30, ${0.45 * pulse})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 0, o.width / 2 + 3 + pulse * 2, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  c.restore();
}

// Không tự động đếm nhịp hẹn giờ khi mode tắt
// scheduleNextOrangeThrow(15000);
