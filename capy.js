// Capybara 2D Desktop Pet Engine - Pixel Art Edition
// Tính năng: Onsen Bathing, Quả Cam Rơi & Bay Lại, Ngủ Khò Khè Zzz, Kéo Thả Riêng Biệt Cố Định Xô
const { ipcRenderer } = require('electron');

const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');

// 1. TẢI CÁC TÀI NGUYÊN HÌNH ẢNH PIXEL ART
const spriteSheet = new Image();
spriteSheet.src = 'assets/capy_spritesheet.png?v=' + Date.now();

const orangeImg = new Image();
orangeImg.src = 'assets/orange.png?v=' + Date.now();

const sleepImg = new Image();
sleepImg.src = 'assets/capy_sleep.png?v=' + Date.now();

const tubImg = new Image();
tubImg.src = 'assets/tub.png?v=' + Date.now();

const tubBathImg = new Image();
tubBathImg.src = 'assets/tub_bath.png?v=' + Date.now();

// 2. KÍCH THƯỚC CHUẨN CỦA SPRITESHEET & RENDER
const FRAME_W = 420;
const FRAME_H = 380;

// Kích thước hiển thị pixel art của Capybara khi đi đứng
const RENDER_W = 56;
const RENDER_H = 50;

// Kích thước hiển thị dáng nằm ngủ
const SLEEP_W = 60;
const SLEEP_H = 47;

// Cấu hình Chậu Tắm Gỗ Onsen (Cố định vị trí, kéo thả riêng biệt)
// Chuẩn hóa kích thước 700x730 thành 66x69 px, đáy tiếp sàn Taskbar tại y = 157
// Chú Capybara ngâm mình được phóng to +25% rõ nét, trong khi bồn tắm giữ nguyên kích cỡ
const tub = {
  width: 66,
  height: 69,
  x: canvas.width - 66 - 14, // Mặc định ở phía bên phải (khoảng x = 300)
  y: 157 - 69 // y = 88, đáy tiếp đất tại y = 157
};

// 3. MÁY TRẠNG THÁI CAPYBARA
const CapyState = {
  WALK_RIGHT: 'WALK_RIGHT',
  IDLE_RIGHT: 'IDLE_RIGHT',
  WALK_LEFT: 'WALK_LEFT',
  IDLE_LEFT: 'IDLE_LEFT',
  DRAGGED: 'DRAGGED',
  LOST_ORANGE: 'LOST_ORANGE', // Vừa mất cam -> ngơ ngác 3s với dấu ?
  SLEEPING: 'SLEEPING',       // Sau 3s không có cam -> ngủ phì phò, nổi z z z
  BATHING: 'BATHING'          // Ngâm mình trong bồn Onsen với khăn gấp và hơi nước
};

const capy = {
  x: 70,
  y: 157, // Đặt sát mép thanh Taskbar
  speed: 0.42,
  facing: 1, // 1: Phải, -1: Trái
  state: CapyState.WALK_RIGHT,
  walkPhase: 0,
  idleTimer: 0,
  breathPhase: 0,
  lostOrangeTimer: 0,

  patrolMinX: 35,
  patrolMaxX: tub.x - 28
};

// 4. VẬT LÝ QUẢ CAM
const orange = {
  x: 70,
  y: 95,
  vx: 0,
  vy: 0,
  width: 18,
  height: 19,
  state: 'ON_HEAD', // 'ON_HEAD', 'FALLING', 'ON_GROUND', 'RETURNING'
  bounceCount: 0,
  rotation: 0,
  rotSpeed: 0
};

// 5. HỆ THỐNG HẠT CHỮ Z Z Z KHI NGỦ
const zzzParticles = [];
let zzzSpawnTimer = 0;

function updateZzz() {
  if (capy.state === CapyState.SLEEPING) {
    zzzSpawnTimer++;
    if (zzzSpawnTimer >= 36) {
      zzzSpawnTimer = 0;
      zzzParticles.push({
        x: 25,
        y: -30,
        text: Math.random() > 0.4 ? 'z' : 'Z',
        size: Math.random() > 0.5 ? 10 : 12,
        opacity: 0.95,
        speedY: 0.35 + Math.random() * 0.15,
        drift: (Math.random() - 0.5) * 0.25
      });
    }
  }

  for (let i = zzzParticles.length - 1; i >= 0; i--) {
    const p = zzzParticles[i];
    p.y -= p.speedY;
    p.x += Math.sin(p.y * 0.12) * 0.35 + p.drift;
    p.opacity -= 0.011;
    if (p.opacity <= 0) {
      zzzParticles.splice(i, 1);
    }
  }
}

function drawZzz(c) {
  for (const p of zzzParticles) {
    c.save();
    c.fillStyle = `rgba(185, 230, 255, ${p.opacity})`;
    c.font = `bold ${p.size}px "Courier New", monospace`;
    c.textAlign = 'center';
    c.shadowColor = 'rgba(10, 25, 45, 0.6)';
    c.shadowBlur = 3;
    c.fillText(p.text, p.x, p.y);
    c.restore();
  }
}

// 6. HỆ THỐNG HƠI NƯỚC / KHÓI BỐC LÊN KHI TẮM ONSEN
const steamParticles = [];
let steamSpawnTimer = 0;

function updateSteam() {
  if (capy.state === CapyState.BATHING) {
    steamSpawnTimer++;
    if (steamSpawnTimer >= 14) {
      steamSpawnTimer = 0;
      // Sinh 1-2 hạt hơi nước bốc lên từ mặt nước của bồn tắm
      const waterSurfaceY = tub.y + 24;
      const count = Math.random() > 0.6 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        steamParticles.push({
          x: tub.x + 14 + Math.random() * (tub.width - 28),
          y: waterSurfaceY + (Math.random() - 0.5) * 4,
          radius: 2.5 + Math.random() * 2,
          opacity: 0.65,
          speedY: 0.32 + Math.random() * 0.22,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.04 + Math.random() * 0.03
        });
      }
    }
  }

  for (let i = steamParticles.length - 1; i >= 0; i--) {
    const s = steamParticles[i];
    s.y -= s.speedY;
    s.wobblePhase += s.wobbleSpeed;
    s.x += Math.sin(s.wobblePhase) * 0.35;
    s.radius += 0.045; // Hơi nước nở dần khi bay lên cao
    s.opacity -= 0.007; // Mờ dần vào không khí
    if (s.opacity <= 0 || s.y < 5) {
      steamParticles.splice(i, 1);
    }
  }
}

function drawSteam(c) {
  for (const s of steamParticles) {
    c.save();
    c.beginPath();
    c.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    // Gradient hơi nước mềm mại
    const grad = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity * 0.9})`);
    grad.addColorStop(0.7, `rgba(235, 245, 255, ${s.opacity * 0.5})`);
    grad.addColorStop(1, `rgba(220, 240, 255, 0)`);
    c.fillStyle = grad;
    c.fill();
    c.restore();
  }
}

// 7. KÉO THẢ RIÊNG BIỆT (CAPYBARA VS CHẬU TẮM)
let isDraggingCapy = false;
let isDraggingTub = false;
let isDraggingWindow = false;
let lastMouseX = 0;
let lastMouseY = 0;
let prevDeltaX = 0;

// Hàm làm rớt quả cam khi lắc mạnh hoặc nhảy vào chậu
function dropOrange(dir = 1, impulseY = -3.8) {
  if (orange.state !== 'ON_HEAD') return;

  orange.state = 'FALLING';
  orange.vx = dir * 2.4;
  orange.vy = impulseY;
  orange.rotSpeed = dir * 0.18;
  orange.bounceCount = 0;

  if (capy.state !== CapyState.BATHING) {
    capy.state = CapyState.LOST_ORANGE;
    capy.lostOrangeTimer = 0;
    capy.walkPhase = 0;
    zzzParticles.length = 0;
  }
}

// Bắt đầu ấn chuột
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    prevDeltaX = 0;

    // 1. CLICK QUẢ CAM DƯỚI ĐẤT -> BAY VỀ ĐẦU, CAPY BƯỚC RA TIẾP TỤC ĐI
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      const pad = 12;
      if (
        mx >= orange.x - pad &&
        mx <= orange.x + orange.width + pad &&
        my >= orange.y - pad &&
        my <= orange.y + orange.height + pad
      ) {
        orange.state = 'RETURNING';

        // Nếu Capy đang tắm trong chậu, Capy nhảy ra ngoài sẵn sàng bước đi
        if (capy.state === CapyState.BATHING) {
          capy.x = tub.x - 30;
          capy.y = 157;
          capy.facing = -1;
          capy.state = CapyState.WALK_LEFT;
          capy.walkPhase = 0;
        } else if (capy.state === CapyState.SLEEPING || capy.state === CapyState.LOST_ORANGE) {
          capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
          zzzParticles.length = 0;
        }
        return;
      }
    }

    // 2. KHI ĐANG TẮM ONSEN TRONG CHẬU
    if (capy.state === CapyState.BATHING) {
      const isOverBath = (mx >= tub.x && mx <= tub.x + tub.width && my >= tub.y && my <= tub.y + tub.height);
      if (isOverBath) {
        // Nếu click vào phần đầu Capy / khăn gấp ở trên (my < tub.y + 24) -> Nhấc Capy ra khỏi chậu
        if (my < tub.y + 24) {
          isDraggingCapy = true;
          capy.state = CapyState.DRAGGED;
          capy.x = mx;
          capy.y = my;
          return;
        } else {
          // Click vào phần thân chậu gỗ -> Kéo thả riêng chiếc xô!
          isDraggingTub = true;
          return;
        }
      }
    }

    // 3. KHI CAPY Ở NGOÀI CHẬU: KIỂM TRA CLICK CAPY HOẶC CLICK CHẬU
    const capyHalfW = RENDER_W / 2 + 8;
    const isClickCapy = (
      mx >= capy.x - capyHalfW &&
      mx <= capy.x + capyHalfW &&
      my >= capy.y - RENDER_H - 12 &&
      my <= capy.y + 10
    );

    const isClickTub = (
      mx >= tub.x &&
      mx <= tub.x + tub.width &&
      my >= tub.y &&
      my <= tub.y + tub.height
    );

    if (isClickCapy) {
      // Kéo thả RIÊNG Capybara (Chiếc xô giữ nguyên 100% vị trí cố định!)
      isDraggingCapy = true;
      if (capy.state !== CapyState.LOST_ORANGE && capy.state !== CapyState.SLEEPING) {
        capy.state = CapyState.DRAGGED;
      }
      return;
    }

    if (isClickTub) {
      // Kéo thả RIÊNG Chiếc Xô (Capybara giữ nguyên hành động!)
      isDraggingTub = true;
      return;
    }

    // 4. Click khoảng trống hoặc giữ Shift -> Di chuyển toàn bộ cửa sổ Desktop
    if (e.shiftKey) {
      isDraggingWindow = true;
    }
  }
});

// Di chuyển chuột
window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const deltaX = e.screenX - lastMouseX;
  const deltaY = e.screenY - lastMouseY;
  lastMouseX = e.screenX;
  lastMouseY = e.screenY;

  // A. ĐANG KÉO THẢ RIÊNG CAPYBARA
  if (isDraggingCapy) {
    capy.x = Math.max(25, Math.min(canvas.width - 25, mx));
    capy.y = Math.max(RENDER_H + 4, Math.min(157, my));

    const moveDist = Math.hypot(deltaX, deltaY);
    const isViolentMove = moveDist > 16;
    const isViolentShake = (deltaX > 9 && prevDeltaX < -9) || (deltaX < -9 && prevDeltaX > 9);
    prevDeltaX = deltaX;

    // Rung lắc quá mạnh làm rơi cam
    if ((isViolentMove || isViolentShake) && orange.state === 'ON_HEAD') {
      dropOrange(Math.sign(deltaX) || 1, -3.5);
    }
    return;
  }

  // B. ĐANG KÉO THẢ RIÊNG CHIẾC XÔ / CHẬU TẮM
  if (isDraggingTub) {
    tub.x = Math.max(10, Math.min(canvas.width - tub.width - 10, tub.x + deltaX));
    // Giữ đáy xô luôn tiếp xúc đúng mặt phẳng taskbar
    tub.y = 157 - tub.height;

    // Cập nhật phạm vi tuần tra của Capy để không va vào xô
    capy.patrolMaxX = Math.max(45, tub.x - 28);
    return;
  }

  // C. ĐANG DI CHUYỂN CẢ CỬA SỔ
  if (isDraggingWindow) {
    ipcRenderer.send('window-drag', { deltaX, deltaY });
    return;
  }

  // Đổi con trỏ chuột
  if (orange.state === 'ON_GROUND') {
    const pad = 10;
    if (
      mx >= orange.x - pad &&
      mx <= orange.x + orange.width + pad &&
      my >= orange.y - pad &&
      my <= orange.y + orange.height + pad
    ) {
      canvas.style.cursor = 'pointer';
      return;
    }
  }

  const isNearTub = (mx >= tub.x && mx <= tub.x + tub.width && my >= tub.y && my <= tub.y + tub.height);
  const capyHalfW = RENDER_W / 2 + 8;
  const isNearCapy = (mx >= capy.x - capyHalfW && mx <= capy.x + capyHalfW && my >= capy.y - RENDER_H && my <= capy.y + 10);

  if (isNearTub || isNearCapy) {
    canvas.style.cursor = 'grab';
  } else {
    canvas.style.cursor = 'default';
  }
});

// Thả chuột
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    // 1. Thả Capybara
    if (isDraggingCapy) {
      isDraggingCapy = false;

      // KIỂM TRA: KÉO CAPYBARA VÀO CHẬU (XÔ)?
      const isOverTub = (
        capy.x >= tub.x - 16 &&
        capy.x <= tub.x + tub.width + 16 &&
        capy.y >= tub.y - 25 &&
        capy.y <= tub.y + tub.height + 25
      );

      if (isOverTub) {
        // CAPYBARA VÀO CHẬU ĐỂ TẮM!
        capy.state = CapyState.BATHING;
        capy.facing = -1; // Ngồi thư giãn hướng mặt về bên trái
        capy.x = tub.x + tub.width / 2;
        capy.y = 157;

        // Làm rơi quả cam xuống đất phía trước chậu nếu cam vẫn còn trên đầu
        if (orange.state === 'ON_HEAD') {
          dropOrange(-1, -3.2);
          orange.x = tub.x - 12;
          orange.y = tub.y + 15;
        }
      } else {
        // Thả Capy trên sàn taskbar bình thường
        capy.y = 157;
        if (orange.state === 'ON_GROUND') {
          capy.state = CapyState.LOST_ORANGE;
          capy.lostOrangeTimer = 0;
        } else {
          capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
        }
      }
    }

    // 2. Thả Chậu Tắm
    if (isDraggingTub) {
      isDraggingTub = false;
      tub.y = 157 - tub.height;
    }

    // 3. Thả Cửa Sổ
    if (isDraggingWindow) {
      isDraggingWindow = false;
    }
  }
});

// Menu chuột phải
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ipcRenderer.send('show-context-menu');
});

// 8. CẬP NHẬT VẬT LÝ QUẢ CAM
function updateOrange() {
  const groundY = 157 - orange.height;

  if (orange.state === 'FALLING') {
    orange.x += orange.vx;
    orange.y += orange.vy;
    orange.vy += 0.38;
    orange.vx *= 0.98;
    orange.rotation += orange.rotSpeed;

    // Chạm sàn Taskbar
    if (orange.y >= groundY) {
      orange.y = groundY;
      orange.vy = -orange.vy * 0.42;
      orange.rotSpeed *= 0.6;
      orange.bounceCount++;

      if (Math.abs(orange.vy) < 0.6 || orange.bounceCount >= 3) {
        orange.state = 'ON_GROUND';
        orange.y = groundY;
        orange.vx = 0;
        orange.vy = 0;
        orange.rotSpeed = 0;
        orange.rotation = 0;
      }
    }

    // Giới hạn trong canvas
    if (orange.x < 8) {
      orange.x = 8;
      orange.vx = -orange.vx * 0.5;
    }
    if (orange.x > canvas.width - orange.width - 8) {
      orange.x = canvas.width - orange.width - 8;
      orange.vx = -orange.vx * 0.5;
    }
  } else if (orange.state === 'RETURNING') {
    // Quả cam bay về đậu trên đầu Capybara
    const isWalking = (capy.state === CapyState.WALK_RIGHT || capy.state === CapyState.WALK_LEFT);
    const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
    const targetX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3) - orange.width / 2;
    const targetY = capy.y - RENDER_H + bodyYOffset - 7;

    orange.x += (targetX - orange.x) * 0.22;
    orange.y += (targetY - orange.y) * 0.22;
    orange.rotation *= 0.75;

    if (Math.hypot(targetX - orange.x, targetY - orange.y) < 3.5) {
      orange.state = 'ON_HEAD';
      orange.rotation = 0;
      capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      capy.lostOrangeTimer = 0;
      zzzParticles.length = 0;
    }
  }
}

// 9. VẼ QUẢ CAM PIXEL ART
function drawOrange(c) {
  if (!orangeImg.complete || orangeImg.naturalWidth === 0) return;

  const isWalking = (capy.state === CapyState.WALK_RIGHT || capy.state === CapyState.WALK_LEFT);
  const bodyYOffset = isWalking ? Math.sin(capy.walkPhase * 2) * 1.5 : Math.sin(capy.breathPhase) * 1.2;
  const orangeBounce = isWalking ? Math.cos(capy.walkPhase * 2) * 1 : 0;

  c.save();
  c.imageSmoothingEnabled = false;

  if (orange.state === 'ON_HEAD') {
    const headX = (capy.facing === 1 ? capy.x + 3 : capy.x - 3);
    const headY = capy.y - RENDER_H + bodyYOffset + orangeBounce - 7;

    orange.x = headX - orange.width / 2;
    orange.y = headY;

    const tilt = isWalking ? Math.sin(capy.walkPhase) * 0.08 : 0;
    c.translate(headX, headY + orange.height / 2);
    c.rotate(tilt);
    c.drawImage(orangeImg, -orange.width / 2, -orange.height / 2, orange.width, orange.height);
  } else {
    // Bóng đổ dưới sàn Taskbar
    const groundY = 157;
    const distToGround = Math.max(0, groundY - (orange.y + orange.height));
    const shadowAlpha = Math.max(0.08, 0.25 - distToGround * 0.003);
    const shadowScale = Math.max(0.4, 1 - distToGround * 0.015);

    c.fillStyle = `rgba(20, 20, 30, ${shadowAlpha})`;
    c.beginPath();
    c.ellipse(orange.x + orange.width / 2, groundY, 7 * shadowScale, 2.5 * shadowScale, 0, 0, Math.PI * 2);
    c.fill();

    c.translate(orange.x + orange.width / 2, orange.y + orange.height / 2);
    c.rotate(orange.rotation);
    c.drawImage(orangeImg, -orange.width / 2, -orange.height / 2, orange.width, orange.height);

    // Vòng phát sáng tương tác khi đang nằm trên sàn mời nhấn chuột
    if (orange.state === 'ON_GROUND') {
      const pulse = Math.sin(Date.now() * 0.006) * 0.5 + 0.5;
      c.strokeStyle = `rgba(255, 195, 30, ${0.45 * pulse})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 0, orange.width / 2 + 3 + pulse * 2, 0, Math.PI * 2);
      c.stroke();
    }
  }

  c.restore();
}

// 10. VẼ CHẬU TẮM ONSEN & CAPYBARA TẮM
function drawTubAndBath(c) {
  c.save();
  c.imageSmoothingEnabled = false;

  // Bóng đổ dưới đáy chậu tắm gỗ
  c.fillStyle = 'rgba(20, 20, 30, 0.28)';
  c.beginPath();
  c.ellipse(tub.x + tub.width / 2, 157, tub.width * 0.44, 4.5, 0, 0, Math.PI * 2);
  c.fill();

  if (capy.state === CapyState.BATHING) {
    // VẼ CHẬU KÈM CAPYBARA ĐANG TẮM ONSEN (KHĂN GẤP TRÊN ĐẦU + NHẮM MẮT THƯ GIÃN)
    if (tubBathImg.complete && tubBathImg.naturalWidth > 0) {
      c.drawImage(tubBathImg, tub.x, tub.y, tub.width, tub.height);

      // Má hồng ửng đỏ dễ thương vì nước ấm Onsen
      const cheekPulse = 0.4 + Math.sin(Date.now() * 0.004) * 0.12;
      c.fillStyle = `rgba(255, 115, 115, ${cheekPulse})`;
      c.beginPath();
      c.ellipse(tub.x + tub.width * 0.45, tub.y + tub.height * 0.28, 4.2, 2.6, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    // VẼ CHẬU GỖ TRỐNG
    if (tubImg.complete && tubImg.naturalWidth > 0) {
      c.drawImage(tubImg, tub.x, tub.y, tub.width, tub.height);
    }
  }

  c.restore();
}

// 11. VẼ CAPYBARA (KHI Ở NGOÀI CHẬU: ĐỨNG, ĐI, BỊ KÉO, HOẶC NGỦ)
function drawCapybaraOutside(c) {
  if (capy.state === CapyState.BATHING) return; // Đã vẽ hoàn hảo trong drawTubAndBath

  const isWalking = (capy.state === CapyState.WALK_RIGHT || capy.state === CapyState.WALK_LEFT);
  const isDragged = (capy.state === CapyState.DRAGGED);
  const isSleeping = (capy.state === CapyState.SLEEPING);

  let bodyYOffset = 0;
  if (isWalking) {
    bodyYOffset = Math.sin(capy.walkPhase * 2) * 1.5;
  } else if (isSleeping) {
    bodyYOffset = 0; // Nằm yên không nhúc nhích
  } else if (!isDragged) {
    bodyYOffset = Math.sin(capy.breathPhase) * 1.2;
  }

  c.save();
  c.translate(capy.x, capy.y);
  c.scale(capy.facing, 1);
  c.imageSmoothingEnabled = false;

  // Bóng đổ dưới chân
  c.fillStyle = 'rgba(20, 20, 30, 0.25)';
  c.beginPath();
  const shadowScale = isDragged ? 0.65 : (isSleeping ? 1.15 : 1);
  c.ellipse(0, 0, 24 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  c.fill();

  // A. DÁNG NGỦ (SLEEPING)
  if (isSleeping && sleepImg.complete && sleepImg.naturalWidth > 0) {
    const drawX = -SLEEP_W / 2;
    const drawY = -SLEEP_H + 2 + bodyYOffset;

    c.drawImage(
      sleepImg,
      0, 0, sleepImg.naturalWidth, sleepImg.naturalHeight,
      drawX, drawY, SLEEP_W, SLEEP_H
    );

    drawZzz(c);
    c.restore();
    return;
  }

  // B. DÁNG ĐI / ĐỨNG / BỊ KÉO / CHỜ CAM
  let frameIndex = 0;
  if (isWalking) {
    const walkCycle = [1, 0, 2, 3];
    const step = Math.floor(capy.walkPhase * 1.8) % walkCycle.length;
    frameIndex = walkCycle[step];
  } else if (isDragged) {
    frameIndex = 2;
  } else if (capy.state === CapyState.LOST_ORANGE) {
    frameIndex = 0; // Đứng yên ngơ ngác
  }

  if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
    const drawX = -RENDER_W / 2;
    const drawY = -RENDER_H + 2 + bodyYOffset;

    c.drawImage(
      spriteSheet,
      frameIndex * FRAME_W, 0, FRAME_W, FRAME_H,
      drawX, drawY, RENDER_W, RENDER_H
    );

    // Dấu hỏi chấm ngơ ngác khi vừa làm mất quả cam trong 3s
    if (capy.state === CapyState.LOST_ORANGE) {
      const iconBounce = Math.sin(Date.now() * 0.005) * 2;
      c.save();
      c.translate(0, -RENDER_H - 5 + iconBounce);
      c.fillStyle = '#FFA500';
      c.font = 'bold 13px sans-serif';
      c.textAlign = 'center';
      c.fillText('?', 0, 0);
      c.restore();
    }
  }

  c.restore();
}

// 12. CẬP NHẬT LOGIC VÀ MÁY TRẠNG THÁI
function updateCapy() {
  capy.breathPhase += 0.04;

  switch (capy.state) {
    case CapyState.WALK_RIGHT:
      capy.facing = 1;
      capy.x += capy.speed;
      capy.walkPhase += 0.07;

      // Đụng giới hạn bên phải (sát cạnh chiếc xô) -> Dừng lại nghỉ ngơi
      if (capy.x >= capy.patrolMaxX) {
        capy.x = capy.patrolMaxX;
        capy.state = CapyState.IDLE_RIGHT;
        capy.idleTimer = Math.floor(Math.random() * 120 + 90);
      }
      break;

    case CapyState.IDLE_RIGHT:
      capy.idleTimer--;
      if (capy.idleTimer <= 0) {
        capy.state = CapyState.WALK_LEFT;
      }
      break;

    case CapyState.WALK_LEFT:
      capy.facing = -1;
      capy.x -= capy.speed;
      capy.walkPhase += 0.07;

      // Đụng giới hạn bên trái -> Dừng lại nghỉ ngơi
      if (capy.x <= capy.patrolMinX) {
        capy.x = capy.patrolMinX;
        capy.state = CapyState.IDLE_LEFT;
        capy.idleTimer = Math.floor(Math.random() * 120 + 90);
      }
      break;

    case CapyState.IDLE_LEFT:
      capy.idleTimer--;
      if (capy.idleTimer <= 0) {
        capy.state = CapyState.WALK_RIGHT;
      }
      break;

    case CapyState.LOST_ORANGE:
      capy.lostOrangeTimer++;
      // Chờ khoảng 3 giây (180 frames ở 60fps) -> Chuyển sang ngủ
      if (capy.lostOrangeTimer >= 180) {
        capy.state = CapyState.SLEEPING;
      }
      break;

    case CapyState.SLEEPING:
      // Ngủ ngon lành
      break;

    case CapyState.BATHING:
      // Đang tắm Onsen thư giãn trong chậu
      break;

    case CapyState.DRAGGED:
      capy.walkPhase += 0.05;
      break;
  }
}

// 13. VÒNG LẶP CHÍNH CỦA GAME (ANIMATION LOOP)
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateCapy();
  updateOrange();
  updateZzz();
  updateSteam();

  // 1. Vẽ chậu tắm (và Capybara ngâm mình nếu đang BATHING)
  drawTubAndBath(ctx);

  // 2. Vẽ Capybara bên ngoài (nếu không ở trong chậu)
  drawCapybaraOutside(ctx);

  // 3. Hiệu ứng hơi nước Onsen bốc lên trên mặt chậu
  drawSteam(ctx);

  // 4. Vẽ Quả Cam
  drawOrange(ctx);

  requestAnimationFrame(loop);
}

// 14. KHỞI CHẠY SAU KHI TẢI XONG ĐỦ 5 ẢNH
let loadedCount = 0;
function checkStart() {
  loadedCount++;
  if (loadedCount >= 5) {
    requestAnimationFrame(loop);
  }
}

if (spriteSheet.complete) checkStart(); else spriteSheet.onload = checkStart;
if (orangeImg.complete) checkStart(); else orangeImg.onload = checkStart;
if (sleepImg.complete) checkStart(); else sleepImg.onload = checkStart;
if (tubImg.complete) checkStart(); else tubImg.onload = checkStart;
if (tubBathImg.complete) checkStart(); else tubBathImg.onload = checkStart;
