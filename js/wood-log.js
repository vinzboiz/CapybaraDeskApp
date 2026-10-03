/**
 * Capybara Desktop Pet - Wood Log Obstacle (Khúc gỗ chướng ngại vật)
 * Ném khúc gỗ ngẫu nhiên (1p - 3p) từ bên phải vào màn hình
 * Capy gặp khúc gỗ: Đứng 2s nói "Oắt đờ heo" -> Lùi lấy đà -> Nhảy qua (50% Thắng / 50% Thua)
 * Thắng: Đứng 2s nói "Easy game", khúc gỗ mờ dần biến mất
 * Thua: Bị dội ngược lại phía sau (trạng thái bình thường không chóng mặt), rớt cam!
 * Hiệu ứng bụi nảy: Hơi nâu đất
 */

var woodLogImg = new Image();
woodLogImg.src = 'assets/items/wood_log.png';

var woodLog = {
  active: false,
  state: 'NONE', // 'FLYING', 'ON_GROUND', 'FADING', 'ROLLING_OUT'
  x: -999,
  y: -999,
  vx: 0,
  vy: 0,
  targetX: 0,
  rotation: 0,
  rotSpeed: 0,
  width: 36,
  height: 36,
  bounceCount: 0,
  groundTimer: 0,
  hasFailed: false,
  opacity: 1,
  nextSpawnTimer: null
};

// MẢNG PHẠM VI HẠT BỤI ĐẤT MÀU NÂU
var dirtParticles = [];

function spawnDirtDustParticles(x, y) {
  const colors = ['#8B5A2B', '#A0522D', '#CD853F', '#D2691E', '#693812', '#B8860B'];
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.6 + 1.2;
    dirtParticles.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.4,
      life: 26,
      maxLife: 26,
      size: Math.random() * 4.5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function updateDirtParticles() {
  for (let i = dirtParticles.length - 1; i >= 0; i--) {
    const p = dirtParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.16;
    p.size = Math.max(0.5, p.size * 0.96);
    p.life--;
    if (p.life <= 0) dirtParticles.splice(i, 1);
  }
}

function drawDirtParticles(c) {
  for (const p of dirtParticles) {
    const alpha = p.life / p.maxLife;
    c.save();
    c.fillStyle = p.color;
    c.globalAlpha = alpha;
    c.beginPath();
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

var isWoodModeEnabled = false;

// 1. LẬP LỊCH NÉM KHÚC GỖ TIẾP THEO (1 PHÚT ĐẾN 3 PHÚT)
function scheduleNextWoodLog(customDelayMs) {
  if (woodLog.nextSpawnTimer) {
    clearTimeout(woodLog.nextSpawnTimer);
    woodLog.nextSpawnTimer = null;
  }

  if (!isWoodModeEnabled) return; // Nếu tắt mode khúc gỗ thì không thả nữa

  // Mặc định từ 1 phút (60s) đến 3 phút (180s)
  const delay = (customDelayMs !== undefined)
    ? customDelayMs
    : (60 + Math.random() * 120) * 1000;

  woodLog.nextSpawnTimer = setTimeout(() => {
    spawnWoodLog();
  }, delay);
}

// 2. KÍCH HOẠT NÉM KHÚC GỖ TỪ PHÍA BÊN PHẢI MÀN HÌNH
function spawnWoodLog(customTargetX) {
  if (!isWoodModeEnabled) return; // Nếu tắt mode gỗ thì ngưng ném
  if (woodLog.active) return; // Nếu đang có khúc gỗ thì không ném thêm

  let targetX = customTargetX;
  if (targetX === undefined) {
    const minX = 150;
    const maxX = Math.max(minX + 80, canvas.width - 160);
    targetX = minX + Math.random() * (maxX - minX);

    if (typeof tub !== 'undefined' && tub.visible && Math.abs(targetX - tub.x) < 85) {
      targetX = (targetX > tub.x) ? targetX + 90 : targetX - 90;
    }
    if (typeof desk !== 'undefined' && desk.visible && Math.abs(targetX - desk.x) < 85) {
      targetX = (targetX > desk.x) ? targetX + 90 : targetX - 90;
    }
    targetX = Math.max(150, Math.min(canvas.width - 130, targetX));
  }

  woodLog.active = true;
  woodLog.state = 'FLYING';
  woodLog.width = 36;
  woodLog.height = 36;
  woodLog.opacity = 1;
  woodLog.hasFailed = false;
  woodLog.targetX = targetX;
  woodLog.bounceCount = 0;
  woodLog.groundTimer = 0;

  woodLog.x = canvas.width + 30;
  woodLog.y = groundY - 140 - Math.random() * 40;

  const flightDuration = 52;
  const g = 0.36;
  const floorY = groundY - woodLog.height;

  woodLog.vx = (targetX - woodLog.x) / flightDuration;
  woodLog.vy = (floorY - woodLog.y - 0.5 * g * flightDuration * flightDuration) / flightDuration;
  woodLog.rotSpeed = -0.16 - Math.random() * 0.08;
  woodLog.rotation = 0;
}

// 3. CẬP NHẬT TRẠNG THÁI VÀ VẬT LÝ CỦA KHÚC GỖ
function updateWoodLog() {
  updateDirtParticles();
  if (!woodLog.active) return;

  const floorY = groundY - woodLog.height;

  // A. GIAI ĐOẠN BAY TỪ PHẢI SANG TIẾP ĐẤT
  if (woodLog.state === 'FLYING') {
    woodLog.x += woodLog.vx;
    woodLog.y += woodLog.vy;
    woodLog.vy += 0.36;
    woodLog.rotation += woodLog.rotSpeed;

    // XỬ LÝ VA CHẠM DỘI TƯỜNG MÉP TRÁI MÀN HÌNH (GÓC TRÁI)
    // Nảy mạnh xa khỏi mép trái (luôn xa hơn chiều ngang Capybara ~ 140px)
    if (woodLog.x <= 15) {
      woodLog.x = 15;
      woodLog.vx = Math.max(3.8, Math.abs(woodLog.vx) * 1.15); // Dội mạnh sang phải
      woodLog.rotSpeed = Math.max(0.18, Math.abs(woodLog.rotSpeed)); // Đổi chiều xoay sang phải
      spawnDirtDustParticles(woodLog.x, woodLog.y + woodLog.height / 2);
    }

    if (woodLog.y >= floorY) {
      woodLog.y = floorY;
      woodLog.bounceCount++;

      if (woodLog.bounceCount <= 2) {
        woodLog.vy = -woodLog.vy * 0.38;
        woodLog.vx *= 0.65;
        woodLog.rotSpeed *= 0.65;
        spawnDirtDustParticles(woodLog.x + woodLog.width / 2, floorY + woodLog.height - 4);
      } else {
        woodLog.vy = 0;
        // Chuyển sang lăn/trượt nhẹ tự nhiên do ma sát trước khi dừng hẳn
        woodLog.state = 'SLIDING_ROLL';
        woodLog.rollFriction = 0.88; // Ma sát lăn chậm dần
      }
    }
  }

  // A1. GIAI ĐOẠN LĂN/TRƯỢT NHẸ MA SÁT CHẬM DẦN TRƯỚC KHI DỪNG HẲN
  else if (woodLog.state === 'SLIDING_ROLL') {
    woodLog.x += woodLog.vx;
    woodLog.rotation += woodLog.rotSpeed;
    woodLog.vx *= woodLog.rollFriction;
    woodLog.rotSpeed *= woodLog.rollFriction;

    // Giữ khúc gỗ luôn cách mép trái màn hình > 140px (rộng hơn chiều ngang Capybara + đà nhảy)
    if (woodLog.x < 140) {
      woodLog.x = 140;
      woodLog.vx = 0;
      woodLog.rotSpeed = 0;
    }

    // Khi tốc độ trượt lăn gần như bằng 0
    if (Math.abs(woodLog.vx) < 0.08) {
      woodLog.vx = 0;
      woodLog.rotSpeed = 0;
      woodLog.state = 'ON_GROUND';
      woodLog.groundTimer = 0;
    }
  }

  // B. GIAI ĐOẠN NẰM TRÊN MẶT ĐẤT CHỜ CAPY TƯƠNG TÁC
  else if (woodLog.state === 'ON_GROUND') {
    woodLog.groundTimer++;

    // Kiểm tra xem Capybara có đang đi dạo gần đến không
    checkCapyWoodLogTrigger();

    // Nếu quá 90s mà Capy chưa qua: lăn khỏi màn hình
    if (woodLog.groundTimer > 90 * 45) {
      woodLog.state = 'ROLLING_OUT';
      woodLog.vx = -1.9;
      woodLog.rotSpeed = -0.13;
    }
  }

  // C. GIAI ĐOẠN BIẾN MẤT DẦN (FADING) SAU KHI CAPY NHẢY THÀNH CÔNG
  else if (woodLog.state === 'FADING') {
    woodLog.opacity -= 0.022;
    if (woodLog.opacity <= 0) {
      woodLog.opacity = 0;
      woodLog.active = false;
      woodLog.state = 'NONE';
      scheduleNextWoodLog(); // Hẹn giờ 1p - 3p ném khúc gỗ tiếp theo
    }
  }

  // D. GIAI ĐOẠN LĂN RA KHỎI MÀN HÌNH
  else if (woodLog.state === 'ROLLING_OUT') {
    woodLog.x += woodLog.vx;
    woodLog.rotation += woodLog.rotSpeed;

    if (woodLog.x < -woodLog.width - 25) {
      woodLog.active = false;
      woodLog.state = 'NONE';
      scheduleNextWoodLog();
    }
  }
}

// 4. KIỂM TRA CAPYBARA ĐẾN GẦN VÀ BẮT ĐẦU CHUỖI PHẢN ỨNG
function checkCapyWoodLogTrigger() {
  if (typeof capy === 'undefined' || !capy) return;
  if (capy.state !== CapyState.WALK_RIGHT && capy.state !== CapyState.WALK_LEFT) return;

  const logCenterX = woodLog.x + woodLog.width / 2;
  const dist = (capy.facing === 1) ? (logCenterX - capy.x) : (capy.x - logCenterX);

  // Khi Capy đến gần khúc gỗ (24px - 46px)
  if (dist >= 24 && dist <= 46) {
    // 1. Dừng lại trước khúc gỗ 2s (Lần đầu: "Oắt đờ heo 😳", Nhảy lại sau khi fail: "Again bro 😤")
    capy.state = CapyState.WOOD_LOG_INTERACT;
    capy.woodLogPhase = 'STOP';
    capy.woodLogTimer = 90; // 2 giây (90 frames ở 45 FPS)
    
    const quote = woodLog.hasFailed
      ? (Messages.woodLogAgain || 'Again bro 😤')
      : (Messages.woodLogWTF || 'Oắt đờ heo 😳');

    if (typeof showSpeechBubble === 'function') {
      showSpeechBubble(quote, 2200, false);
    }
  }
}

// 5. CẬP NHẬT TIẾN TRÌNH TƯƠNG TÁC CỦA CAPY VỚI KHÚC GỖ
function updateCapyWoodLogInteract() {
  if (capy.state !== CapyState.WOOD_LOG_INTERACT) return;

  const logCenterX = woodLog.x + woodLog.width / 2;

  // BƯỚC 1: ĐỨNG TRƯỚC KHÚC GỖ 2S NÓI "OẮT ĐỜ HEO" HOẶC "AGAIN BRO"
  if (capy.woodLogPhase === 'STOP') {
    capy.woodLogTimer--;
    if (capy.woodLogTimer <= 0) {
      // Chuyển sang BƯỚC 2: Lùi ra sau lấy đà
      capy.woodLogPhase = 'BACKUP';
      capy.woodLogBackupDist = 0;
      capy.woodLogIsSuccess = Math.random() < 0.5;
      // Lùi xa hơn nếu nhảy thành công (lùi 50px) để có đường chạy đà dài
      capy.woodLogTargetBackup = capy.woodLogIsSuccess ? 50 : 35;
    }
  }

  // BƯỚC 2: LÙI RA SAU LẤY ĐÀ
  else if (capy.woodLogPhase === 'BACKUP') {
    const backupSpeed = 1.2;
    capy.x -= capy.facing * backupSpeed;
    capy.walkPhase += 0.08;
    capy.woodLogBackupDist += backupSpeed;

    if (capy.woodLogBackupDist >= capy.woodLogTargetBackup) {
      // Chuyển sang BƯỚC 3: Chạy đà áp sát khúc gỗ
      capy.woodLogPhase = 'RUN';
      // Nếu nhảy thành công: điểm bật nhảy cách xa gỗ (65px)
      // Nếu nhảy thất bại: điểm bật nhảy gần gỗ (32px)
      const takeoffOffset = capy.woodLogIsSuccess ? 65 : 32;
      capy.woodLogRunTargetX = (capy.facing === 1) ? (logCenterX - takeoffOffset) : (logCenterX + takeoffOffset);
    }
  }

  // BƯỚC 3: CHẠY ĐÀ VÀ THỰC HIỆN CÚ NHẢY (50% THẮNG / 50% THUA)
  else if (capy.woodLogPhase === 'RUN') {
    const runSpeed = 2.8;
    capy.x += capy.facing * runSpeed;
    capy.walkPhase += 0.22;

    const reached = (capy.facing === 1) ? (capy.x >= capy.woodLogRunTargetX) : (capy.x <= capy.woodLogRunTargetX);
    if (reached) {
      capy.woodLogPhase = 'JUMP';
      capy.jumpProgress = 0;
      capy.jumpStartX = capy.x;

      if (capy.woodLogIsSuccess) {
        // Nhảy thành công: Điểm bật nhảy xa (65px trước gỗ) sang (65px sau gỗ), độ cao nhảy chuẩn 50px
        capy.jumpTargetX = (capy.facing === 1) ? (logCenterX + 65) : (logCenterX - 65);
        capy.jumpDuration = 38;
        capy.jumpHeight = 50; // Độ cao cú nhảy 50px theo yêu cầu
      } else {
        // Nhảy thất bại: Bật nhảy từ gần, nhảy thấp (2/3 khúc gỗ = 24px) va vào khúc gỗ
        capy.jumpTargetX = (capy.facing === 1) ? (logCenterX + 46) : (logCenterX - 46);
        capy.jumpDuration = 26;
        capy.jumpHeight = Math.round(woodLog.height * (2 / 3)); // 24px
      }

      capy.jumpAngle = 0;
      spawnDirtDustParticles(capy.x, groundY - 6);
    }
  }

  // BƯỚC 4: ĐANG BAY TRÊN KHÔNG
  else if (capy.woodLogPhase === 'JUMP') {
    capy.jumpProgress += 1 / capy.jumpDuration;
    const p = Math.min(1, capy.jumpProgress);

    // KỊCH BẢN THẤT BẠI: Mặt Capy va trúng CẠNH MẶT TRƯỚC của khúc gỗ chứ không phải giữa khúc gỗ
    const logFrontEdgeX = (capy.facing === 1) ? woodLog.x : (woodLog.x + woodLog.width);
    const capyFaceX = capy.x + capy.facing * 16;
    const isHitFrontEdge = (capy.facing === 1) ? (capyFaceX >= logFrontEdgeX) : (capyFaceX <= logFrontEdgeX);

    if (!capy.woodLogIsSuccess && isHitFrontEdge) {
      woodLog.hasFailed = true; // Đánh dấu đã nhảy fail để lần nhảy sau kêu "Again bro"
      spawnDirtDustParticles(logFrontEdgeX, groundY - 20);
      if (typeof spawnImpactStars === 'function') {
        spawnImpactStars(logFrontEdgeX, groundY - 20);
      }
      // Dội ngược Capy lùi về đằng sau ở trạng thái bình thường (không bị DIZZY/chóng mặt)
      capy.woodLogPhase = 'BOUNCE_BACK';
      capy.woodLogBounceVx = -capy.facing * 3.4;
      capy.woodLogBounceVy = -3.8;
      capy.jumpAngle = 0;

      // Làm rớt quả cam xuống đất
      if (typeof dropOrange === 'function' && orange.state === 'ON_HEAD') {
        dropOrange(-capy.facing, -3.5);
      }
      if (typeof showSpeechBubble === 'function') {
        showSpeechBubble('Ối giời ơi! 😵', 2200, false);
      }
      return;
    }

    // KỊCH BẢN THÀNH CÔNG: Bay mượt qua khúc gỗ
    capy.x = capy.jumpStartX + (capy.jumpTargetX - capy.jumpStartX) * p;
    capy.y = groundY - capy.jumpHeight * 4 * p * (1 - p);
    capy.jumpAngle = (1 - 2 * p) * 0.16;

    if (p >= 1) {
      capy.y = groundY;
      capy.jumpAngle = 0;
      spawnDirtDustParticles(capy.x, groundY - 6);

      // Chuyển sang BƯỚC 5: Đứng lại 2s nói "Easy game"
      capy.woodLogPhase = 'SUCCESS_WAIT';
      capy.woodLogTimer = 90; // 2 giây
      if (typeof showSpeechBubble === 'function') {
        showSpeechBubble(Messages.woodLogEasy || 'Easy game 😎', 2200, false);
      }
      woodLog.state = 'FADING'; // Khúc gỗ biến mất dần dần!
    }
  }

  // BƯỚC 4B: DỘI NGƯỢC LẠI KHI THẤT BẠI (TRẠNG THÁI BÌNH THƯỜNG - NẢY LÙI LẠI TIẾP ĐẤT BẰNG CHÂN)
  else if (capy.woodLogPhase === 'BOUNCE_BACK') {
    capy.x += capy.woodLogBounceVx;
    capy.y += capy.woodLogBounceVy;
    capy.woodLogBounceVy += 0.38; // Trọng lực nảy bình thường

    // Khi đã dội lùi lại và chạm sàn
    if (capy.y >= groundY) {
      capy.y = groundY;
      capy.jumpAngle = 0;
      spawnDirtDustParticles(capy.x, groundY - 4);
      // Trở lại trạng thái bình thường (IDLE rồi tiếp tục đi dạo)
      capy.state = (capy.facing === 1) ? CapyState.IDLE_RIGHT : CapyState.IDLE_LEFT;
      capy.idleTimer = Math.floor(Math.random() * 20 + 20); // Đứng lại 1 chút rồi đi tiếp
    }
  }

  // BƯỚC 5: NHẢY THÀNH CÔNG -> ĐỨNG LẠI 2S NÓI "EASY GAME" RỒI ĐI TIẾP
  else if (capy.woodLogPhase === 'SUCCESS_WAIT') {
    capy.woodLogTimer--;
    if (capy.woodLogTimer <= 0) {
      capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
    }
  }
}

// 6. VẼ KHÚC GỖ VÀ BÓNG ĐỔ TRÊN SÀN
function drawWoodLog(c) {
  if (!woodLog.active || !woodLogImg.complete || woodLogImg.naturalWidth === 0) return;

  c.save();
  c.imageSmoothingEnabled = false;

  // Hỗ trợ độ mờ biến mất dần (fade out)
  if (woodLog.state === 'FADING') {
    c.globalAlpha = Math.max(0, woodLog.opacity);
  } else {
    c.globalAlpha = 1.0;
  }

  const floorY = groundY - woodLog.height;
  const distToGround = Math.max(0, floorY - woodLog.y);
  const shadowAlpha = Math.max(0.06, 0.32 - distToGround * 0.002);
  const shadowScale = Math.max(0.3, 1 - distToGround * 0.0035);

  c.fillStyle = `rgba(20, 20, 30, ${shadowAlpha})`;
  c.beginPath();
  c.ellipse(
    woodLog.x + woodLog.width / 2,
    groundY - 1,
    (woodLog.width * 0.45) * shadowScale,
    3.5 * shadowScale,
    0, 0, Math.PI * 2
  );
  c.fill();

  c.translate(woodLog.x + woodLog.width / 2, woodLog.y + woodLog.height / 2);
  c.rotate(woodLog.rotation);
  c.drawImage(woodLogImg, -woodLog.width / 2, -woodLog.height / 2, woodLog.width, woodLog.height);

  c.restore();
  drawDirtParticles(c);
}

// 7. TƯƠNG TÁC CHUỘT VỚI KHÚC GỖ (KÉO THẢ & CLICK HẤT KHÚC GỖ)
var isDraggingWoodLog = false;
var lastWoodLogDragVx = 0;

function isOverWoodLog(mx, my) {
  if (!woodLog.active || (woodLog.state !== 'ON_GROUND' && woodLog.state !== 'SLIDING_ROLL' && woodLog.state !== 'FLYING')) return false;
  return (
    mx >= woodLog.x - 8 &&
    mx <= woodLog.x + woodLog.width + 8 &&
    my >= woodLog.y - 8 &&
    my <= woodLog.y + woodLog.height + 8
  );
}

function handleWoodLogMouseDown(mx, my) {
  if (!isOverWoodLog(mx, my)) return false;
  isDraggingWoodLog = true;
  woodLog.state = 'FLYING';
  woodLog.vx = 0;
  woodLog.vy = 0;
  lastWoodLogDragVx = 0;
  return true;
}

function handleWoodLogMouseMove(mx, my, deltaX, deltaY) {
  if (!isDraggingWoodLog || !woodLog.active) return false;
  
  const targetX = mx - woodLog.width / 2;
  const targetY = my - woodLog.height / 2;

  woodLog.x = Math.max(10, Math.min(canvas.width - woodLog.width - 10, targetX));
  woodLog.y = Math.max(20, Math.min(groundY - woodLog.height, targetY));
  
  if (typeof deltaX === 'number' && deltaX !== 0) {
    lastWoodLogDragVx = deltaX * 0.45;
  }
  
  woodLog.vx = 0;
  woodLog.vy = 0;
  woodLog.targetX = woodLog.x;
  return true;
}

function handleWoodLogMouseUp() {
  if (isDraggingWoodLog) {
    isDraggingWoodLog = false;
    const floorY = groundY - woodLog.height;

    if (woodLog.y < floorY - 5) {
      // Nếu thả từ trên cao: rơi tự do xuống sàn, nảy nhẹ và lăn nghiêng nhẹ
      woodLog.state = 'FLYING';
      woodLog.vy = 0.8; // Trọng lực ban đầu
      woodLog.vx = (lastWoodLogDragVx !== 0) ? lastWoodLogDragVx : (Math.random() < 0.5 ? 0.8 : -0.8);
      woodLog.rotSpeed = Math.sign(woodLog.vx || 1) * 0.12;
      woodLog.bounceCount = 1;
    } else {
      // Nếu thả sát đất: chuyển ngay sang trạng thái lăn nhẹ trượt sang 1 bên
      woodLog.y = floorY;
      woodLog.state = 'SLIDING_ROLL';
      woodLog.vx = (lastWoodLogDragVx !== 0) ? lastWoodLogDragVx : (Math.random() < 0.5 ? 1.1 : -1.1);
      woodLog.rotSpeed = Math.sign(woodLog.vx) * 0.1;
      woodLog.rollFriction = 0.88;
    }
    return true;
  }
  return false;
}

function handleWoodLogClick(mx, my) {
  if (!isOverWoodLog(mx, my)) return false;
  woodLog.vy = -3.4;
  woodLog.rotSpeed = (Math.random() - 0.5) * 0.32;
  woodLog.state = 'FLYING';
  woodLog.bounceCount = 1;
  spawnDirtDustParticles(woodLog.x + woodLog.width / 2, woodLog.y);
  return true;
}

function isWoodLogFlying() {
  return woodLog.active && woodLog.state === 'FLYING';
}

window.spawnWoodLog = spawnWoodLog;

// Hẹn giờ ném khúc gỗ không tự chạy khi mode tắt
// scheduleNextWoodLog(15000);
