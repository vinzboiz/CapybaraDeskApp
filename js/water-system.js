/**
 * Capybara Desktop Pet - Water Reminder System (Nhắc uống nước)
 * - Capy chạy đi đẩy ly nước (chiều cao bằng Capybara ~ 50px) ra mời bạn uống.
 * - Hiện thoại: "uống ngay đi bro 🥤".
 * - Người dùng chỉ cần nhấn trực tiếp vào ly nước để uống (không cần nút bấm riêng).
 * - Khi nhấn vào ly nước: chuyển sang ảnh ly nước trống không, Capy khen "Gút chóp bro ✨🥰",
 *   sau đó đẩy ly rỗng cất đi ra ngoài màn hình bên phải.
 * - Cất xong: Capy tự động quay trở lại hoạt động trước đó (nhảy vào bồn tắm tiếp, ngồi vào bàn làm việc tiếp,
 *   ngủ tiếp nếu năng lượng > 10%, hoặc đi dạo tiếp).
 * - Nếu đang nhảy gỗ: nhảy xong mới nhắc nước.
 * - Nếu đang xếp cam: đổ hết cam xuống đất rồi chạy đi lấy ly nước luôn.
 */

var waterGlassImg = new Image();
waterGlassImg.src = 'assets/items/water_glass.png';

var emptyGlassImg = new Image();
emptyGlassImg.src = 'assets/items/empty_glass.png';

var waterReminderState = {
  glass: {
    visible: false,
    isFull: true,
    x: -999,
    y: 0,
    width: 30,
    height: 50, // Chiều cao bằng Capybara (RENDER_H = 50px)
    targetX: 0
  },
  previousActivity: null, // 'bath', 'work_focus', 'work_chill', 'sleep', 'roam'
  savedWorkProgress: 0,
  pendingTrigger: false,
  isDrinkingPaused: false,
  isHovered: false
};

// Hiệu ứng giọt nước bắn tung tóe khi uống nước
var waterSplashParticles = [];

function spawnWaterSplash(x, y) {
  const colors = ['#38bdf8', '#0284c7', '#7dd3fc', '#bae6fd', '#ffffff'];
  for (let i = 0; i < 18; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
    const speed = Math.random() * 3.8 + 1.6;
    waterSplashParticles.push({
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3.0 + 1.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1.0,
      life: 26,
      maxLife: 26
    });
  }
}

function updateWaterSplashParticles() {
  for (let i = waterSplashParticles.length - 1; i >= 0; i--) {
    const p = waterSplashParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.22;
    p.life--;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) {
      waterSplashParticles.splice(i, 1);
    }
  }
}

function drawWaterSplashParticles(c) {
  if (waterSplashParticles.length === 0) return;
  c.save();
  for (const p of waterSplashParticles) {
    c.fillStyle = p.color;
    c.globalAlpha = p.alpha;
    c.beginPath();
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/**
 * 1. BẮT ĐẦU CHU KỲ NHẮC UỐNG NƯỚC
 */
function startWaterReminder() {
  if (typeof capy === 'undefined' || !capy) return false;
  if (capy.state === CapyState.LEAVING_RUNAWAY) return false;

  // 1. Nếu đang ngủ: kiểm tra năng lượng
  // Quy định: năng lượng > 10% thì mới thức dậy đi lấy nước, <= 10% thì quá đói kiệt sức không dậy
  const isSleepingState = (capy.state === CapyState.SLEEPING || capy.state === CapyState.HUNGRY_STRIKE_SLEEP);
  if (isSleepingState) {
    const currentEnergy = (typeof feedingSystem !== 'undefined') ? feedingSystem.energy : 100;
    if (currentEnergy <= 10) {
      return false; // Quá đói kiệt sức, tiếp tục ngủ đình công
    }
  }

  // 2. Nếu đang chơi game nhảy gỗ: đợi nhảy xong mới nhắc nước
  if (typeof woodLog !== 'undefined' && woodLog.active && (capy.state === CapyState.WOOD_LOG_INTERACT || capy.woodLogPhase)) {
    waterReminderState.pendingTrigger = true;
    return false;
  }

  // 3. Nếu đang xếp cam: đổ hết cam xuống đất rồi chạy đi lấy luôn
  if (typeof isOrangeModeEnabled !== 'undefined' && isOrangeModeEnabled) {
    if (typeof orange !== 'undefined' && (orange.state === 'ON_HEAD' || (typeof capyOrangeCount !== 'undefined' && capyOrangeCount > 0))) {
      if (typeof dropOrange === 'function') {
        dropOrange(capy.facing || 1);
      }
      if (typeof capyOrangeCount !== 'undefined') {
        capyOrangeCount = 0;
      }
    }
  }

  // 4. Lưu lại hoạt động trước đó để sau khi uống xong thì làm tiếp
  waterReminderState.savedWorkProgress = 0;
  if (capy.state === CapyState.BATHING) {
    waterReminderState.previousActivity = 'bath';
    // Bước xuống bồn tạm: giữ nguyên bồn tắm, Capy đứng xuống sàn
    capy.y = groundY;
    capy.x = (typeof tub !== 'undefined' && tub.visible) ? (tub.x + tub.width + 12) : (capy.x + 20);
    capy.facing = 1;
  } else if (capy.state === CapyState.WORKING) {
    const isChill = (typeof settings !== 'undefined' && settings.computerMode === 'chill');
    waterReminderState.previousActivity = isChill ? 'work_chill' : 'work_focus';
    if (!isChill && typeof workSessionActive !== 'undefined' && workSessionActive) {
      waterReminderState.savedWorkProgress = Date.now() - (workSessionStartTime || 0);
    }
    // Bước xuống bàn tạm: giữ nguyên bàn làm việc, Capy đứng xuống sàn
    capy.y = groundY;
    capy.x = (typeof desk !== 'undefined' && desk.visible) ? (desk.x + DESK_W + 12) : (capy.x + 20);
    capy.facing = 1;
  } else if (isSleepingState) {
    waterReminderState.previousActivity = 'sleep';
    if (typeof spawnWakeStars === 'function') spawnWakeStars(capy.x, groundY - 30);
  } else {
    waterReminderState.previousActivity = 'roam';
  }

  // 5. Khởi tạo ly nước (chiều cao bằng Capybara: 50px)
  const glass = waterReminderState.glass;
  glass.visible = true;
  glass.isFull = true;
  glass.width = 30;
  glass.height = 50; // Cao bằng Capybara (50px)
  glass.x = canvas.width + 20; // Nằm ở ngoài mép phải màn hình
  glass.y = groundY - glass.height;
  glass.drinkWaitTimer = 0;

  // Tính vị trí đích đẩy ly nước vào gần bên cạnh
  let targetX = Math.max(120, canvas.width - 240);
  if (typeof tub !== 'undefined' && tub.visible) {
    targetX = Math.min(canvas.width - 140, tub.x + tub.width + 30);
  } else if (typeof desk !== 'undefined' && desk.visible) {
    targetX = Math.min(canvas.width - 140, desk.x + DESK_W + 30);
  }
  glass.targetX = targetX;

  waterReminderActive = true;
  waterReminderState.pendingTrigger = false;
  waterReminderState.isDrinkingPaused = false;

  // Capy nói và chạy đi đón ly nước ở góc phải
  capy.state = CapyState.FETCHING_WATER_GLASS;
  capy.facing = 1;
  if (typeof showSpeechBubble === 'function') {
    showSpeechBubble('Đợi tí đi lấy nước! 🥛', 2000, false);
  }

  return true;
}

/**
 * 2. CẬP NHẬT LOGIC VẬT LÝ & TRẠNG THÁI CỦA LY NƯỚC VÀ CAPY
 */
function updateWaterReminderSystem() {
  updateWaterSplashParticles();

  // Kiểm tra nếu có lệnh nhắc nước đang chờ nhảy gỗ xong
  if (waterReminderState.pendingTrigger) {
    if (typeof woodLog === 'undefined' || !woodLog.active || (capy.state !== CapyState.WOOD_LOG_INTERACT && !capy.woodLogPhase)) {
      waterReminderState.pendingTrigger = false;
      startWaterReminder();
      return;
    }
  }

  const glass = waterReminderState.glass;
  if (!glass.visible) return;

  switch (capy.state) {
    // A. CHẠY NHANH SANG PHẢI ĐÓN LY NƯỚC
    case CapyState.FETCHING_WATER_GLASS: {
      const fetchSpeed = Math.max(3.8, capy.speed * 4.8);
      capy.facing = 1;
      capy.x += fetchSpeed;
      capy.walkPhase += 0.28;

      const targetBehindGlass = glass.x + glass.width + 24;
      if (capy.x >= targetBehindGlass) {
        capy.x = targetBehindGlass;
        capy.facing = -1;
        capy.state = CapyState.PUSHING_WATER_GLASS;
      }
      break;
    }

    // B. ĐẨY LY NƯỚC TỪ PHẢI SANG TRÁI VÀO VỊ TRÍ
    case CapyState.PUSHING_WATER_GLASS: {
      const pushSpeed = 2.2;
      glass.x -= pushSpeed;
      capy.facing = -1;
      capy.x = glass.x + glass.width + 24;
      capy.walkPhase += 0.16;

      // Đã đẩy tới vị trí đích
      if (glass.x <= glass.targetX) {
        glass.x = glass.targetX;
        capy.x = glass.x + glass.width + 24;
        capy.facing = -1;
        capy.state = CapyState.WAITING_WATER_DRINK;
        // Hiện câu thoại: "uống ngay đi bro"
        const msg = (typeof Messages !== 'undefined' && Messages.waterReminder) ? Messages.waterReminder : 'uống ngay đi bro 🥤';
        if (typeof showSpeechBubble === 'function') {
          showSpeechBubble(msg, 0, false); // Hiện liên tục cho tới khi nhấn vào ly nước
        }
      }
      break;
    }

    // C. ĐỨNG CHỜ NGƯỜI DÙNG NHẤN VÀO LY NƯỚC ĐỂ UỐNG
    case CapyState.WAITING_WATER_DRINK: {
      capy.facing = -1;
      capy.x = glass.x + glass.width + 24;
      // Capy thở nhẹ nhàng
      capy.breathPhase = (capy.breathPhase || 0) + 0.05;
      break;
    }

    // D. ĐẨY LY NƯỚC TRỐNG RỖNG RA NGOÀI MÀN HÌNH ĐỂ CẤT ĐI
    case CapyState.RETRACTING_WATER_GLASS: {
      const pushSpeed = 2.2;
      glass.x += pushSpeed;
      capy.facing = 1;
      capy.x = glass.x - 24;
      capy.walkPhase += 0.16;

      // Khi ly nước đã ra khỏi mép phải màn hình
      if (glass.x >= canvas.width + 15) {
        glass.visible = false;
        waterReminderActive = false;
        resumePreviousActivity();
      }
      break;
    }

    // E. QUAY TRỞ LẠI BỒN TẮM TIẾP
    case CapyState.RETURNING_TO_TUB: {
      if (typeof tub === 'undefined' || !tub.visible) {
        capy.state = CapyState.WALK_LEFT;
        capy.facing = -1;
        break;
      }
      const returnSpeed = Math.max(2.2, capy.speed * 2.8);
      const targetTubX = tub.x + tub.width / 2;
      capy.facing = -1;
      capy.x -= returnSpeed;
      capy.walkPhase += 0.22;

      if (capy.x <= targetTubX) {
        capy.x = targetTubX;
        capy.state = CapyState.BATHING;
        bathStartTime = Date.now();
        if (typeof spawnWakeStars === 'function') spawnWakeStars(targetTubX, groundY - 30);
      }
      break;
    }

    // F. QUAY TRỞ LẠI BÀN LÀM VIỆC TIẾP
    case CapyState.RETURNING_TO_DESK: {
      if (typeof desk === 'undefined' || !desk.visible) {
        capy.state = CapyState.WALK_LEFT;
        capy.facing = -1;
        break;
      }
      const returnSpeed = Math.max(2.2, capy.speed * 2.8);
      const targetDeskX = desk.x;
      capy.facing = -1;
      capy.x -= returnSpeed;
      capy.walkPhase += 0.22;

      if (capy.x <= targetDeskX) {
        capy.x = targetDeskX;
        capy.state = CapyState.WORKING;
        if (waterReminderState.previousActivity === 'work_focus') {
          workSessionActive = true;
          workSessionStartTime = Date.now() - (waterReminderState.savedWorkProgress || 0);
        }
        if (typeof spawnWakeStars === 'function') spawnWakeStars(desk.x + DESK_W / 2, groundY - 40);
      }
      break;
    }
  }
}

/**
 * 3. HÀM XỬ LÝ KHI NGƯỜI DÙNG NHẤN VÀO LY NƯỚC ĐỂ UỐNG
 */
function userDrinkWater() {
  const glass = waterReminderState.glass;
  if (!glass.visible || !glass.isFull || waterReminderState.isDrinkingPaused) return;

  waterReminderState.isDrinkingPaused = true;
  glass.isFull = false; // Chuyển sang ly trống không!
  glass.width = 32; // Kích thước ly rỗng cao 50px

  // Hiệu ứng nước bắn tung tóe & ngôi sao chúc mừng
  spawnWaterSplash(glass.x + glass.width / 2, groundY - 25);
  if (typeof spawnWakeStars === 'function') {
    spawnWakeStars(glass.x + glass.width / 2, groundY - 35);
  }

  // Cập nhật thống kê và thời gian nhắc
  if (typeof capyStats !== 'undefined') {
    capyStats.waterCount = (capyStats.waterCount || 0) + 1;
  }
  lastWaterReminderTime = Date.now();

  // Capy nói lời cảm ơn / khen ngợi
  const msg = (typeof Messages !== 'undefined' && Messages.waterDrank) ? Messages.waterDrank : 'Gút chóp bro ✨🥰';
  if (typeof showSpeechBubble === 'function') {
    showSpeechBubble(msg, 3200, false);
  }

  // Dừng lại 800ms để người dùng nhìn thấy ly trống không và câu khen
  // Sau đó Capy vòng sang bên trái ly nước để đẩy cất đi
  setTimeout(() => {
    if (capy.state === CapyState.WAITING_WATER_DRINK) {
      capy.facing = 1;
      capy.x = glass.x - 24;
      capy.state = CapyState.RETRACTING_WATER_GLASS;
      waterReminderState.isDrinkingPaused = false;
    }
  }, 800);
}

/**
 * 4. TIẾP TỤC HOẠT ĐỘNG TRƯỚC ĐÓ CỦA CAPY
 */
function resumePreviousActivity() {
  const prev = waterReminderState.previousActivity;
  waterReminderState.previousActivity = null;

  if (prev === 'bath' && typeof tub !== 'undefined' && tub.visible) {
    capy.state = CapyState.RETURNING_TO_TUB;
  } else if ((prev === 'work_focus' || prev === 'work_chill') && typeof desk !== 'undefined' && desk.visible) {
    capy.state = CapyState.RETURNING_TO_DESK;
  } else if (prev === 'sleep') {
    capy.state = CapyState.SLEEPING;
    capy.facing = -1;
  } else {
    capy.state = CapyState.WALK_LEFT;
    capy.facing = -1;
  }
}

/**
 * 5. VẼ LY NƯỚC (CAO BẰNG CAPYBARA) & BỌT KHÍ
 */
function drawWaterReminderSystem(c) {
  const glass = waterReminderState.glass;
  if (!glass.visible) return;

  const currentW = glass.isFull ? 30 : 32;
  const currentH = 50; // Cao bằng Capybara
  const drawX = glass.x;
  const drawY = groundY - currentH;

  c.save();
  c.imageSmoothingEnabled = false;

  // 1. Bóng đổ dưới sàn của ly nước
  c.fillStyle = 'rgba(15, 23, 42, 0.28)';
  c.beginPath();
  c.ellipse(drawX + currentW / 2, groundY, currentW * 0.44, 3.5, 0, 0, Math.PI * 2);
  c.fill();

  // 2. Vẽ hình ảnh ly nước (Đầy nước hoặc Rỗng)
  const img = glass.isFull ? waterGlassImg : emptyGlassImg;
  if (img.complete && img.naturalWidth > 0) {
    c.drawImage(img, drawX, drawY, currentW, currentH);
  }

  // 4. Hiệu ứng bọt khí lăn tăn phát sáng bên trong ly nước đầy
  if (glass.isFull) {
    for (let i = 0; i < 3; i++) {
      const t = (Date.now() * 0.0018 + i * 2.0) % (Math.PI * 2);
      const bx = drawX + 8 + (Math.sin(t * 2 + i) * 6 + 6);
      const by = groundY - 8 - ((t / (Math.PI * 2)) * 36);
      const bAlpha = Math.sin((t / (Math.PI * 2)) * Math.PI) * 0.65;
      c.fillStyle = 'rgba(255, 255, 255, ' + bAlpha + ')';
      c.beginPath();
      c.arc(bx, by, 1.4, 0, Math.PI * 2);
      c.fill();
    }
  }

  // 5. Vẽ các hạt nước bắn tung tóe (nếu có)
  drawWaterSplashParticles(c);

  c.restore();
}

/**
 * 6. XỬ LÝ SỰ KIỆN CLICK CHUỘT TRỰC TIẾP VÀO LY NƯỚC
 */
function handleWaterReminderMouseDown(mx, my) {
  const glass = waterReminderState.glass;
  if (!glass.visible || !glass.isFull || capy.state !== CapyState.WAITING_WATER_DRINK) return false;

  // Click trực tiếp vào ly nước (kích thước cao bằng Capybara)
  if (mx >= glass.x - 10 && mx <= glass.x + glass.width + 10 && my >= groundY - glass.height - 12 && my <= groundY + 8) {
    userDrinkWater();
    return true;
  }

  // Click vào Capybara đang đứng chờ cạnh ly nước
  const capyHalfW = RENDER_W / 2 + 10;
  if (mx >= capy.x - capyHalfW && mx <= capy.x + capyHalfW && my >= capy.y - RENDER_H - 12 && my <= capy.y + 10) {
    userDrinkWater();
    return true;
  }

  return false;
}

/**
 * 7. XỬ LÝ SỰ KIỆN DI CHUỘT (HOVER LY NƯỚC)
 */
function handleWaterReminderMouseMove(mx, my) {
  const glass = waterReminderState.glass;
  if (!glass.visible || !glass.isFull || capy.state !== CapyState.WAITING_WATER_DRINK) {
    waterReminderState.isHovered = false;
    return false;
  }

  const isOverGlass = (mx >= glass.x - 10 && mx <= glass.x + glass.width + 10 && my >= groundY - glass.height - 12 && my <= groundY + 8);
  waterReminderState.isHovered = isOverGlass;

  if (isOverGlass && typeof canvas !== 'undefined' && canvas) {
    canvas.style.cursor = 'pointer';
    return true;
  }

  return false;
}

// Export các hàm ra phạm vi toàn cục
window.startWaterReminder = startWaterReminder;
window.updateWaterReminderSystem = updateWaterReminderSystem;
window.drawWaterReminderSystem = drawWaterReminderSystem;
window.handleWaterReminderMouseDown = handleWaterReminderMouseDown;
window.handleWaterReminderMouseMove = handleWaterReminderMouseMove;
window.userDrinkWater = userDrinkWater;
window.waterReminderState = waterReminderState;
