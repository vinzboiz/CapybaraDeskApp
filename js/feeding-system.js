/**
 * Capybara Desktop Pet - Feeding System (Hệ thống giờ ăn, Thả đồ ăn & Đình công)
 * - Khi đói:
 *   + Hiện text "Hungryyyyyyyyyyy !!" và dấu giận 💢 trên mặt
 *   + Nút giỏ hàng 🧺 xuất hiện trên thanh công cụ
 *   + Người dùng bấm 🧺: thả ngẫu nhiên 1 quả từ trên nóc màn hình rơi xuống bằng dù, tiếp đất lăn nhẹ
 *   + Tối đa được bấm 5 lần trong đợt đói (mỗi lần 1 quả khác nhau)
 *   + Bấm quá 5 lần: Capy nói "No rồi ăn nữa bố ói đấy 🤢"
 *   + Capy tìm quả gần nhất chạy nhanh đến mép quả và ăn từng quả trong 4s (cắn 4 góc tròn + bắn vụn)
 *   + Ăn hết các quả: Capy no nê cảm ơn, tim bay lên, cất nút giỏ hàng và đi dạo bình thường
 * - Nếu không cho ăn:
 *   + Đứng im 10s -> đi tiếp
 *   + Sau 15s nếu không ai thả quả: Capy tự tìm cam ăn và ngủ đình công
 */

// 1. DANH MỤC 5 LOẠI QUẢ
var FRUITS_CATALOG = [
  {
    id: 'watermelon',
    name: 'Dưa hấu',
    src: 'assets/fruits/watermelon.png',
    width: 26,
    height: 26,
    colors: ['#E53935', '#FF5252', '#4CAF50', '#2E7D32', '#FFCDD2']
  },
  {
    id: 'banana',
    name: 'Chuối',
    src: 'assets/fruits/banana.png',
    width: 26,
    height: 26,
    colors: ['#FDD835', '#FFEE58', '#FFF59D', '#FBC02D', '#8D6E63']
  },
  {
    id: 'corn',
    name: 'Bắp ngô',
    src: 'assets/fruits/corn.png',
    width: 25,
    height: 27,
    colors: ['#FFC107', '#FFD54F', '#FFE082', '#689F38', '#8BC34A']
  },
  {
    id: 'grass',
    name: 'Bó cỏ',
    src: 'assets/fruits/grass.png',
    width: 26,
    height: 27,
    colors: ['#2E7D32', '#4CAF50', '#81C784', '#6D4C41', '#A5D6A7']
  },
  {
    id: 'apple',
    name: 'Táo đỏ',
    src: 'assets/fruits/apple.png',
    width: 24,
    height: 26,
    colors: ['#D32F2F', '#F44336', '#EF5350', '#4CAF50', '#FFF9C4']
  }
];

// Preload 5 loại quả
FRUITS_CATALOG.forEach(f => {
  f.img = new Image();
  f.img.src = f.src;
});

var foodParaImg = new Image();
foodParaImg.src = 'assets/items/parachute.png';

// 2. MẢNG MÓN ĂN ĐANG RƠI / NẰM TRÊN SÀN
var droppedFoods = [];

// 3. TRẠNG THÁI HỆ THỐNG
var feedingSystem = {
  energy: 100.0, // Thang năng lượng từ 0% đến 100%
  isHungry: false,
  isLeavingRunaway: false, // Trạng thái đói 0% bỏ nhà ra đi
  isStriking: false,
  strikePhase: 'NONE',
  eatTimer: 0,
  bites: [],
  lastFedTime: Date.now(),
  feedPressCount: 0, // Số lần bấm giỏ hàng trong đợt đói (tối đa 5)
  availableFruitIndices: [0, 1, 2, 3, 4], // Các quả chưa thả
  isEatingFood: false,
  currentEatingFood: null,
  orangeWasEaten: false, // Đánh dấu đã ăn mất quả cam
  isEatingOrange: false, // Đang nhai quả cam chống đói
  eatOrangeTimer: 0,
  hasEatenOrangeEmergency: false, // Đã ăn cam chống đói trong đợt này chưa
  eatingThrownOrange: null, // Quả cam ném đang được nhai
  eatThrownOrangeTimer: 0, // Bộ đếm nhai quả cam ném
  targetFood: null // Món ăn đang nhắm tới để tránh đổi mục tiêu liên tục
};

// 4. MẢNG HẠT VỤN THỨC ĂN
var foodCrumbs = [];

function spawnFoodCrumbs(x, y, palette, count = 8) {
  const colors = palette || ['#FF6D00', '#FF9100', '#FFA726', '#FFB74D', '#FFE082'];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.2 + 0.8;
    foodCrumbs.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: -Math.abs(Math.sin(angle) * speed) - 1.2,
      size: Math.random() * 2.8 + 1.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 28,
      maxLife: 28
    });
  }
}

function updateFoodCrumbs() {
  for (let i = foodCrumbs.length - 1; i >= 0; i--) {
    const p = foodCrumbs[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;

    if (p.y >= groundY - 1) {
      p.y = groundY - 1;
      p.vx *= 0.7;
      p.vy = -p.vy * 0.35;
    }

    p.life--;
    if (p.life <= 0) {
      foodCrumbs.splice(i, 1);
    }
  }
}

function drawFoodCrumbs(c) {
  if (foodCrumbs.length === 0) return;
  c.save();
  for (const p of foodCrumbs) {
    const alpha = Math.max(0, p.life / p.maxLife);
    c.fillStyle = p.color;
    c.globalAlpha = alpha;
    c.fillRect(p.x, p.y, p.size, p.size);
  }
  c.restore();
}

// 5. CANVAS ĐỆM KHOÉT VẾT CẮN (OFFSCREEN BITE CANVAS)
var biteCanvas = null;
var biteCtx = null;
function getBiteCanvas() {
  if (!biteCanvas) {
    biteCanvas = document.createElement('canvas');
    biteCanvas.width = 44;
    biteCanvas.height = 44;
    biteCtx = biteCanvas.getContext('2d');
  }
  return { canvas: biteCanvas, ctx: biteCtx };
}

// 6. CẬP NHẬT HIỂN THỊ NÚT GIỎ HÀNG 🧺 TRÊN DASHBOARD (Luôn luôn hiển thị)
function updateFeedButtonUI(show) {
  // Nút luôn luôn hiển thị trên dashboard theo yêu cầu người dùng
}

// 7. THẢ MỘT QUẢ BẰNG DÙ TỪ TRÊN NÓC MÀN HÌNH XUỐNG
function spawnDroppedFood(fruitData) {
  const targetX = Math.floor(90 + Math.random() * (canvas.width - 180));
  const newFood = {
    id: fruitData.id,
    name: fruitData.name,
    img: fruitData.img,
    colors: fruitData.colors,
    width: fruitData.width,
    height: fruitData.height,
    baseX: targetX,
    x: targetX,
    y: -50,
    vy: 5.0, // Tốc độ rơi nhanh dứt khoát hơn nhiều
    swayPhase: Math.random() * Math.PI * 2,
    state: 'FALLING_WITH_PARACHUTE',
    rollVx: 0,
    isBeingEaten: false,
    bites: []
  };
  droppedFoods.push(newFood);

  // Khi vừa thấy đồ ăn tới thì Capy lập tức hiện text ngay "Đồ ăn tới rồi !!"
  if (typeof showSpeechBubble === 'function' && !feedingSystem.isEatingFood) {
    showSpeechBubble('Đồ ăn tới rồi !!', 3200, false);
  }
}

function handleFeedButtonClick() {
  // Nếu năng lượng đã đầy 100%
  if (feedingSystem.energy >= 100) {
    if (typeof showSpeechBubble === 'function') {
      showSpeechBubble('No căng tròn 100% rồi! 😋💖', 3000, false);
    }
    return;
  }

  // Tối đa 5 món cùng xuất hiện trên sàn
  if (droppedFoods.length >= 5) {
    if (typeof showSpeechBubble === 'function') {
      showSpeechBubble('Nhiều đồ ăn quá rồi, ăn từ từ đã! 🧺', 2500, false);
    }
    return;
  }

  // Chọn 1 quả ngẫu nhiên trong danh sách trái cây
  if (!feedingSystem.availableFruitIndices || feedingSystem.availableFruitIndices.length === 0) {
    feedingSystem.availableFruitIndices = [0, 1, 2, 3, 4];
  }
  const randIndex = Math.floor(Math.random() * feedingSystem.availableFruitIndices.length);
  const fruitIndex = feedingSystem.availableFruitIndices.splice(randIndex, 1)[0];
  const chosenFruit = FRUITS_CATALOG[fruitIndex] || FRUITS_CATALOG[0];

  spawnDroppedFood(chosenFruit);
}

// 9. KÍCH HOẠT TRẠNG THÁI ĐÓI BỤNG
function triggerCapyHungry() {
  if (feedingSystem.isHungry) return;

  feedingSystem.isHungry = true;
  feedingSystem.isStriking = false;
  feedingSystem.hasFinishedStand = false;
  feedingSystem.strikePhase = 'NONE';
  feedingSystem.eatTimer = 0;
  feedingSystem.bites = [];
  feedingSystem.hungryStartTime = Date.now();
  feedingSystem.feedPressCount = 0;
  feedingSystem.availableFruitIndices = [0, 1, 2, 3, 4];
  feedingSystem.isEatingFood = false;
  feedingSystem.currentEatingFood = null;
  feedingSystem.targetFood = null;
  droppedFoods.length = 0;

  // Hiển thị nút giỏ hàng 🧺 trên dashboard
  updateFeedButtonUI(true);

  // Giữ nguyên quả cam trên đầu khi mới kêu đói (<= 30%)

  // Nếu đang tắm hoặc làm việc: bước ra đứng cạnh
  if (capy.state === CapyState.BATHING) {
    capy.y = groundY;
    capy.x = (tub.x !== undefined && tub.x > 0) ? (tub.x + tub.width + 16) : (capy.x + 30);
    capy.facing = -1;
  } else if (capy.state === CapyState.WORKING) {
    capy.y = groundY;
    capy.x = (desk.x !== undefined && desk.x > 0) ? (desk.x - 26) : (capy.x - 30);
    capy.facing = 1;
  }

  capy.state = CapyState.HUNGRY_STANDING;
  capy.walkPhase = 0;

  if (typeof showSpeechBubble === 'function') {
    showSpeechBubble('Hungryyyyyyyyyyy !!', 0, true);
  }
}

// 9.5 KÍCH HOẠT CAPY BỎ NHÀ ĐI KHI NĂNG LƯỢNG VỀ 0%
function triggerCapyRunaway() {
  if (feedingSystem.isLeavingRunaway) return;
  feedingSystem.isLeavingRunaway = true;
  feedingSystem.isHungry = false;
  feedingSystem.isStriking = false;
  feedingSystem.isEatingFood = false;
  feedingSystem.isEatingOrange = false;
  feedingSystem.eatingThrownOrange = null;
  feedingSystem.currentEatingFood = null;
  feedingSystem.targetFood = null;
  droppedFoods.length = 0;

  // Ẩn nút giỏ hàng
  updateFeedButtonUI(false);

  // Nếu còn cam trên đầu thì rớt xuống
  if (typeof dropOrange === 'function' && orange.state === 'ON_HEAD') {
    dropOrange(capy.facing || -1);
  }

  // Đánh thức dậy ngay lập tức nếu đang ngủ
  if (typeof spawnWakeStars === 'function') {
    spawnWakeStars(capy.x, groundY - 30);
  }

  // Ra khỏi bồn tắm / bàn làm việc / giấc ngủ
  capy.y = groundY;
  capy.state = CapyState.LEAVING_RUNAWAY;
  capy.facing = -1; // Quay mặt về bên trái
  capy.walkPhase = 0;

  if (typeof showSpeechBubble === 'function') {
    const quote = (typeof Messages !== 'undefined' && Messages.runawayQuote) ? Messages.runawayQuote : 'Đói lả rồi, tớ bỏ nhà đi đây! Tạm biệt...';
    showSpeechBubble(quote, 0, true);
  }
}

// 9.6 CẬP NHẬT GIAO DIỆN THANH NĂNG LƯỢNG TRÊN DASHBOARD
function updateEnergyUI() {
  const dashBar = document.getElementById('dash-energy-bar');
  const dashContainer = document.getElementById('dash-energy');
  const pct = Math.max(0, Math.min(100, Math.round(feedingSystem.energy)));
  if (dashBar) {
    dashBar.style.width = pct + '%';
    if (pct <= 15) {
      dashBar.classList.add('critical');
      dashBar.classList.remove('warning');
    } else if (pct <= 30) {
      dashBar.classList.add('warning');
      dashBar.classList.remove('critical');
    } else {
      dashBar.classList.remove('warning');
      dashBar.classList.remove('critical');
    }
  }
  if (dashContainer) {
    dashContainer.title = `Năng lượng Capybara: ${pct}%`;
  }
}

// 10. BẮT ĐẦU TIẾN TRÌNH ĐÌNH CÔNG (DỰ PHÒNG)
function startStrikeProcess() {
  if (feedingSystem.isStriking) return;
  feedingSystem.isStriking = true;

  if (typeof showSpeechBubble === 'function') {
    showSpeechBubble('Quá đáng lắm luôn! Ăn cam rồi đình công!', 2500, true);
  }

  if (capy.state === CapyState.SLEEPING || capy.state === CapyState.LOST_ORANGE) {
    capy.state = CapyState.WALK_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
  }

  if (orange.state === 'ON_HEAD') {
    feedingSystem.strikePhase = 'JUMP_SHAKE';
    capy.vy = -3.4;
    if (typeof dropOrange === 'function') {
      const dir = capy.facing || 1;
      dropOrange(dir);
      orange.vx = dir * 1.8;
      orange.vy = -1.4;
      orange.bounceCount = 1;
    }
    return;
  }

  if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
    feedingSystem.strikePhase = 'WALK_TO_ORANGE';
    return;
  }

  feedingSystem.strikePhase = 'STRIKE_SLEEP';
  capy.state = CapyState.HUNGRY_STRIKE_SLEEP;
  capy.y = groundY;
}

// 10.5. NÉM 1 QUẢ CAM TỪ PHÍA BÊN PHẢI MÀN HÌNH VÀO SÀN ĐỂ NGƯỜI DÙNG NHẶT
function throwOrangeFromRight() {
  // KIỂM TRA: Nếu không bật mode xếp cam, kiểm tra xem đã có bất kỳ quả cam nào chưa (trên đầu hoặc dưới sàn)
  const hasAnyOrange = (
    orange.state === 'ON_HEAD' ||
    orange.state === 'ON_GROUND' ||
    orange.state === 'FALLING' ||
    orange.state === 'RETURNING' ||
    (typeof groundOranges !== 'undefined' && groundOranges.length > 0)
  );

  // Nếu mode xếp cam đang tắt mà đã có cam rồi -> Tuyệt đối không ném thêm!
  if (!isOrangeModeEnabled && hasAnyOrange) {
    return;
  }

  const targetX = Math.max(90, Math.min(canvas.width - 120, capy.x + (capy.facing === 1 ? -60 : 60)));
  const startX = canvas.width + 30;
  const startY = groundY - 140 - Math.random() * 30;
  const flightDuration = 48;
  const floorY = groundY - 19;
  const g = 0.38;

  const vx = (targetX - startX) / flightDuration;
  const vy = (floorY - startY - 0.5 * g * flightDuration * flightDuration) / flightDuration;

  if (typeof groundOranges !== 'undefined') {
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
      rotSpeed: -0.16
    });
  }

  if (typeof needsFullClear !== 'undefined') {
    needsFullClear = true;
  }
}

// 11. KẾT THÚC ĐÓI BỤNG / CHO ĂN NO
function endCapyHungry(isFed = false) {
  feedingSystem.isHungry = false;
  feedingSystem.isStriking = false;
  feedingSystem.hasFinishedStand = false;
  feedingSystem.strikePhase = 'NONE';
  feedingSystem.eatTimer = 0;
  feedingSystem.bites = [];
  feedingSystem.lastFedTime = Date.now();
  feedingSystem.isEatingFood = false;
  feedingSystem.currentEatingFood = null;
  droppedFoods.length = 0;
  orange.isBeingEaten = false;

  // Ẩn nút giỏ hàng
  updateFeedButtonUI(false);

  if (isFed) {
    if (typeof showSpeechBubble === 'function') {
      showSpeechBubble('Ăn no đã cái nư! ✨💖', 3500, false);
    }
    if (typeof spawnWakeStars === 'function') {
      spawnWakeStars(capy.x, groundY - 30);
    }

    // CHỈ ném cam mới NẾU quả cam thật sự đã bị ăn mất (orangeWasEaten) VÀ hiện tại không còn quả cam nào trên đầu hoặc dưới sàn
    const hasAnyOrange = (
      orange.state === 'ON_HEAD' ||
      orange.state === 'ON_GROUND' ||
      orange.state === 'FALLING' ||
      orange.state === 'RETURNING' ||
      (typeof groundOranges !== 'undefined' && groundOranges.length > 0)
    );

    if (feedingSystem.orangeWasEaten && !hasAnyOrange) {
      feedingSystem.orangeWasEaten = false;
      feedingSystem.hasEatenOrangeEmergency = false;
      setTimeout(() => {
        throwOrangeFromRight();
      }, 700);
    } else {
      feedingSystem.orangeWasEaten = false;
      feedingSystem.hasEatenOrangeEmergency = false;
    }
  } else {
    if (typeof clearSpeechBubble === 'function') {
      clearSpeechBubble();
    }
  }

  capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
  capy.y = groundY;
}

// 12. CẬP NHẬT RƠI THỨC ĂN BẰNG DÙ & LĂN NHẸ KHI TIẾP ĐẤT
function updateDroppedFoodsPhysics() {
  for (let i = droppedFoods.length - 1; i >= 0; i--) {
    const f = droppedFoods[i];

    if (f.state === 'FALLING_WITH_PARACHUTE') {
      f.y += f.vy;
      f.swayPhase += 0.05;
      f.x = (f.baseX !== undefined ? f.baseX : f.x) + Math.sin(f.swayPhase) * 2.0; // Bớt lắc lư đi, chỉ hơi lắc nhẹ xíu (±2px)

      const floorY = groundY - f.height;
      if (f.y >= floorY) {
        f.y = floorY;
        f.state = 'ON_GROUND';
        // Hơi lăn nhẹ sang 1 bên
        f.rollVx = (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.7);
        spawnFoodCrumbs(f.x + f.width / 2, groundY, f.colors, 6);
        if (typeof needsFullClear !== 'undefined') needsFullClear = true;
      }
    } else if (f.state === 'ON_GROUND') {
      if (f.rollVx !== 0) {
        f.x += f.rollVx;
        f.rollVx *= 0.88; // Ma sát lăn
        if (Math.abs(f.rollVx) < 0.05) {
          f.rollVx = 0;
        }
      }
    }
  }
}

// 13. TÌM QUẢ GẦN NHẤT TRÊN SÀN
function getNearestFoodOnGround() {
  const readyFoods = droppedFoods.filter(f => f.state === 'ON_GROUND' && !f.isBeingEaten);
  if (readyFoods.length === 0) return null;

  let nearest = readyFoods[0];
  let minDist = Math.abs(capy.x - nearest.x);
  for (let i = 1; i < readyFoods.length; i++) {
    const d = Math.abs(capy.x - readyFoods[i].x);
    if (d < minDist) {
      minDist = d;
      nearest = readyFoods[i];
    }
  }
  return nearest;
}

// 14. CẬP NHẬT TOÀN BỘ LOGIC THANH NĂNG LƯỢNG, ĐÓI BỤNG, THẢ MỒI VÀ BỎ ĐI
function updateFeedingSystem() {
  updateFoodCrumbs();
  updateDroppedFoodsPhysics();
  updateEnergyUI();

  // Nếu đang trong trạng thái bỏ nhà đi -> không trừ năng lượng nữa
  if (feedingSystem.isLeavingRunaway) {
    return;
  }

  const energyDurationSec = (settings && settings.energyDurationSec) ? settings.energyDurationSec : 7200;

  // Tính lượng năng lượng tiêu hao cho mỗi frame (mặc định ~45 FPS)
  // baseDrainPerFrame: tốc độ chuẩn để cạn 100% trong energyDurationSec khi đi bộ bình thường (1.55px/frame)
  const baseDrainPerFrame = (100 / Math.max(1, energyDurationSec)) / 45;

  // 1. TÍNH TOÁN TỐC ĐỘ DI CHUYỂN THỰC TẾ CỦA CAPYBARA
  // Di chuyển càng nhanh thì càng tốn nhiều năng lượng hơn!
  let currentSpeed = 0;

  if (capy.state === CapyState.WALK_LEFT || capy.state === CapyState.WALK_RIGHT) {
    const orangeWeightFactor = Math.pow(0.70, Math.max(0, (typeof capyOrangeCount !== 'undefined' ? capyOrangeCount : 1) - 1));
    currentSpeed = (capy.speed || 1.55) * orangeWeightFactor;
  } else if (capy.state === CapyState.HIDING_RUN) {
    currentSpeed = 3.5; // Chạy nhanh trốn góc màn hình
  }

  // Kiểm tra trạng thái lấy đồ & cất đồ (bàn, bồn tắm, ly nước) -> Hoàn toàn KHÔNG tốn năng lượng (0% tiêu hao)
  const isHandlingProps = (
    capy.state === CapyState.FETCHING_DESK ||
    capy.state === CapyState.FETCHING_TUB ||
    capy.state === CapyState.FETCHING_WATER_GLASS ||
    capy.state === CapyState.PUSHING_DESK ||
    capy.state === CapyState.PUSHING_TUB ||
    capy.state === CapyState.PUSHING_WATER_GLASS ||
    capy.state === CapyState.APPROACHING_DESK ||
    capy.state === CapyState.APPROACHING_TUB ||
    capy.state === CapyState.RETRACTING_DESK ||
    capy.state === CapyState.RETRACTING_TUB ||
    capy.state === CapyState.RETRACTING_WATER_GLASS ||
    capy.state === CapyState.RETURNING_TO_TUB ||
    capy.state === CapyState.RETURNING_TO_DESK ||
    (typeof retractWaitTimer !== 'undefined' && retractWaitTimer > 0)
  );

  // Kiểm tra trạng thái nghỉ ngơi: Ngủ hoặc Tắm bồn Onsen hoặc Đang chờ uống nước
  const isSleeping = (
    capy.state === CapyState.SLEEPING ||
    capy.state === CapyState.HUNGRY_STRIKE_SLEEP
  );
  const isBathing = (capy.state === CapyState.BATHING);
  const isWaitingWater = (capy.state === CapyState.WAITING_WATER_DRINK);

  // Hệ số tiêu hao năng lượng (activityFactor):
  // - Khi lấy đồ & cất đồ: HOÀN TOÀN KHÔNG TIÊU HAO (0.00x)
  // - Khi ngủ hoặc tắm bồn Onsen: TIÊU TỐN NĂNG LƯỢNG CHẬM HƠN 1 NỬA (chỉ 0.10x, giảm 50% so với đứng yên 0.20x)
  // - Khi đứng yên / làm việc: tiêu hao rất chậm (0.20x mức chuẩn)
  // - Khi di chuyển: tiêu hao tăng theo hàm luỹ tiến (tốc độ càng nhanh thì tiêu hao càng tăng vượt bậc):
  //   + Chậm (1.35) -> 0.82x
  //   + Chuẩn (1.55) -> 1.00x
  //   + Nhanh (1.95) -> 1.40x
  //   + Siêu tốc (2.45) -> 1.94x
  //   + Chạy hết tốc lực (3.50) -> 3.25x
  let activityFactor = 0.20;
  if (isHandlingProps) {
    activityFactor = 0.0; // Lấy đồ và cất đồ không tốn năng lượng
  } else if (isSleeping || isBathing || isWaitingWater) {
    activityFactor = 0.10; // Ngủ, tắm bồn, hoặc chờ uống nước: đều tiêu hao rất chậm (chỉ 0.10x)
  } else if (currentSpeed > 0) {
    activityFactor = Math.pow(currentSpeed / 1.55, 1.45);
  }

  // Nếu chỉ còn <= 30% thì sẽ đói và giảm nhanh hơn (1.8x)
  let hungerFactor = 1.0;
  if (feedingSystem.energy <= 30) {
    hungerFactor = 1.8;
  }

  // Kiểm tra xem có cam ném xuất hiện trên sàn khi bật mode xếp cam & đói <= 20% không
  const hasThrownOrangesToEat = (
    isOrangeModeEnabled &&
    feedingSystem.energy <= 20 &&
    typeof groundOranges !== 'undefined' &&
    groundOranges.some(o => o.state === 'ON_GROUND' || o.state === 'FALLING')
  );

  // Trừ năng lượng:
  // QUAN TRỌNG: TẠM DỪNG trừ năng lượng khi đang có đồ ăn trên sàn / đang nhai đồ ăn / ăn cam ném / hoặc khi đang lấy đồ & cất đồ
  const isFeedingSession = (
    droppedFoods.length > 0 ||
    feedingSystem.isEatingFood ||
    feedingSystem.isEatingOrange ||
    feedingSystem.eatingThrownOrange !== null ||
    hasThrownOrangesToEat ||
    isHandlingProps
  );
  if (!isFeedingSession && activityFactor > 0) {
    feedingSystem.energy = Math.max(0, feedingSystem.energy - (baseDrainPerFrame * activityFactor * hungerFactor));
  }

  // Khi năng lượng hồi phục > 30% hoặc đầy: reset cờ ăn cam khẩn cấp để có thể ăn lại trong đợt đói sau
  if (feedingSystem.energy > 30) {
    feedingSystem.hasEatenOrangeEmergency = false;
  }

  // ========================================================
  // 1. KIỂM TRA NĂNG LƯỢNG VỀ 0% -> THỨC DẬY NGAY LẬP TỨC (NẾU ĐANG NGỦ), BỎ NHÀ ĐI VÀ TẮT APP
  // ========================================================
  if (feedingSystem.energy <= 0 && !feedingSystem.isEatingOrange && !feedingSystem.isEatingFood && feedingSystem.eatingThrownOrange === null) {
    triggerCapyRunaway();
    return;
  }

  // ========================================================
  // 2. KHI NĂNG LƯỢNG DƯỚI 20%: NHẢY LÊN NHẸ LÀM RỚT QUẢ CAM VÀ ĂN TẠM LUÔN (KHÔNG BỊ TRỪ NĂNG LƯỢNG)
  // ========================================================
  const canEatOwnOrange = (
    !feedingSystem.hasEatenOrangeEmergency &&
    typeof orange !== 'undefined' &&
    orange.state !== 'NONE' &&
    !feedingSystem.isEatingFood &&
    droppedFoods.length === 0
  );

  // A. Nếu đang trong tiến trình nhai quả cam của mình
  if (feedingSystem.isEatingOrange) {
    feedingSystem.eatOrangeTimer++;
    capy.breathPhase += 0.18; // Nhai gật gù

    const fruitCenter = 22;
    const towardCapy = (capy.x < orange.x) ? -1 : 1;
    const orangePalette = ['#FFA500', '#FF8C00', '#FF7F00', '#FFD700', '#FFE082'];

    if (!orange.bites) orange.bites = [];

    if (feedingSystem.eatOrangeTimer === 45) {
      orange.bites.push({ x: fruitCenter + towardCapy * 7, y: fruitCenter - 5, radius: 9 });
      spawnFoodCrumbs(orange.x + orange.width / 2, orange.y + orange.height / 2, orangePalette, 8);
    }
    if (feedingSystem.eatOrangeTimer === 90) {
      orange.bites.push({ x: fruitCenter + towardCapy * 6, y: fruitCenter + 6, radius: 9.5 });
      spawnFoodCrumbs(orange.x + orange.width / 2, orange.y + orange.height / 2, orangePalette, 9);
    }
    if (feedingSystem.eatOrangeTimer === 135) {
      orange.bites.push({ x: fruitCenter - towardCapy * 5, y: fruitCenter - 3, radius: 10 });
      spawnFoodCrumbs(orange.x + orange.width / 2, orange.y + orange.height / 2, orangePalette, 10);
    }
    if (feedingSystem.eatOrangeTimer >= 180) {
      // Ăn xong quả cam của mình!
      spawnFoodCrumbs(orange.x + orange.width / 2, orange.y + orange.height / 2, orangePalette, 14);

      feedingSystem.energy = Math.min(100, Math.round((feedingSystem.energy + 10.0) * 10) / 10);
      updateEnergyUI();
      if (typeof sendStateToPanel === 'function') sendStateToPanel();

      feedingSystem.isEatingOrange = false;
      feedingSystem.hasEatenOrangeEmergency = true;
      feedingSystem.orangeWasEaten = true;
      orange.state = 'NONE';
      orange.isBeingEaten = false;

      if (typeof showSpeechBubble === 'function') {
        showSpeechBubble(`+10% ⚡ (Tự ăn quả cam chống đói! Năng lượng: ${Math.round(feedingSystem.energy)}%) 🍊`, 3000, false);
      }
      capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
      return;
    }
    return;
  }

  // B. Kích hoạt nhảy lên nhẹ làm rớt cam và ăn khi năng lượng < 20% và chưa ăn cam
  if (feedingSystem.energy < 20 && canEatOwnOrange) {
    // Nếu cam còn trên đầu -> Capy nhảy lên nhẹ làm quả cam rớt xuống sàn
    if (orange.state === 'ON_HEAD') {
      if (typeof dropOrange === 'function') {
        dropOrange(capy.facing || 1);
        orange.vx = (capy.facing || 1) * 2.2;
        orange.vy = -2.0;
      }
      capy.state = CapyState.FALLING;
      capy.vy = -3.2; // Nhảy lên nhẹ
      capy.fallingFromHigh = false;
      if (typeof spawnWakeStars === 'function') spawnWakeStars(capy.x, groundY - 30);
      if (typeof showSpeechBubble === 'function') {
        showSpeechBubble('Đói quá rồi... ăn tạm quả cam vậy! 🍊', 2500, false);
      }
      return;
    }

    if (orange.state === 'ON_GROUND') {
      const orangeCenterX = orange.x + orange.width / 2;
      const diffX = orangeCenterX - capy.x;
      const distToCenter = Math.abs(diffX);
      const standOffset = 22;

      if (distToCenter <= standOffset + 6) {
        // Đến sát cạnh quả cam -> Bắt đầu nhai!
        capy.facing = (diffX >= 0) ? 1 : -1;
        feedingSystem.isEatingOrange = true;
        orange.isBeingEaten = true;
        orange.bites = [];
        feedingSystem.eatOrangeTimer = 0;
        capy.state = CapyState.HUNGRY_STANDING;
        capy.walkPhase = 0;
        if (typeof showSpeechBubble === 'function') {
          showSpeechBubble('Đói quá rồi... ăn tạm quả cam vậy! 🍊', 2500, false);
        }
      } else {
        const moveDir = diffX > 0 ? 1 : -1;
        const targetStandX = orangeCenterX - moveDir * standOffset;
        const toTarget = targetStandX - capy.x;

        if (Math.abs(toTarget) <= 3) {
          capy.x = targetStandX;
          capy.facing = (diffX >= 0) ? 1 : -1;
          feedingSystem.isEatingOrange = true;
          orange.isBeingEaten = true;
          orange.bites = [];
          feedingSystem.eatOrangeTimer = 0;
          capy.state = CapyState.HUNGRY_STANDING;
          capy.walkPhase = 0;
          if (typeof showSpeechBubble === 'function') {
            showSpeechBubble('Đói quá rồi... ăn tạm quả cam vậy! 🍊', 2500, false);
          }
        } else {
          const stepDir = toTarget > 0 ? 1 : -1;
          capy.facing = stepDir;
          capy.x += stepDir * 2.4;
          capy.walkPhase += 0.22;
          capy.state = (stepDir === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
        }
      }
      return;
    } else if (orange.state === 'FALLING') {
      const diff = (orange.x + orange.width / 2) - capy.x;
      if (Math.abs(diff) > 12) {
        capy.facing = diff > 0 ? 1 : -1;
      }
      if (capy.state !== CapyState.FALLING) {
        capy.state = CapyState.HUNGRY_STANDING;
        capy.walkPhase = 0;
      }
      return;
    }
  }

  // ========================================================
  // 3. KHI NĂNG LƯỢNG DƯỚI 10% & KHÔNG CÒN ĐỒ ĂN / ĐÃ ĂN CAM: ĐI NGỦ BẢO TOÀN NĂNG LƯỢNG
  // ========================================================
  const hasFoodAvailable = (
    droppedFoods.length > 0 ||
    hasThrownOrangesToEat ||
    feedingSystem.isEatingFood ||
    feedingSystem.isEatingOrange ||
    feedingSystem.eatingThrownOrange !== null
  );

  if (feedingSystem.energy < 10 && !hasFoodAvailable && !feedingSystem.isLeavingRunaway) {
    if (capy.state !== CapyState.SLEEPING) {
      capy.state = CapyState.SLEEPING;
      capy.y = groundY;
      if (typeof showSpeechBubble === 'function') {
        showSpeechBubble('Đói lả người rồi, đi ngủ đây... 😴 Hãy cho tớ ăn!', 4000, false);
      }
    }
    // Khi đang ngủ vì đói: đứng im, năng lượng tiếp tục giảm dần về 0% để kích hoạt bỏ nhà đi
    return;
  }

  // Nếu đang ngủ mà CÓ ĐỒ ĂN XUẤT HIỆN: THỨC DẬY NGAY LẬP TỨC ĐỂ ĂN!
  if (capy.state === CapyState.SLEEPING && hasFoodAvailable && !feedingSystem.isLeavingRunaway) {
    capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
    capy.y = groundY;
    if (typeof spawnWakeStars === 'function') spawnWakeStars(capy.x, groundY - 30);
    if (typeof showSpeechBubble === 'function') {
      showSpeechBubble('A! Có đồ ăn rồi!! 😋', 2500, false);
    }
  }

  // ========================================================
  // 4. KHI ĐÓI DƯỚI 20% & BẬT MODE XẾP CAM: COI QUẢ CAM NÉM LÀ ĐỒ ĂN (+10% NĂNG LƯỢNG)
  // ========================================================
  if (isOrangeModeEnabled && feedingSystem.energy <= 20 && typeof groundOranges !== 'undefined') {
    // A. Nếu đang trong tiến trình nhai quả cam ném
    if (feedingSystem.eatingThrownOrange) {
      const curOrange = feedingSystem.eatingThrownOrange;
      feedingSystem.eatThrownOrangeTimer++;
      capy.breathPhase += 0.18; // Nhai gật gù

      const fruitCenter = 22;
      const towardCapy = (capy.x < curOrange.x) ? -1 : 1;
      const orangePalette = ['#FFA500', '#FF8C00', '#FF7F00', '#FFD700', '#FFE082'];

      if (feedingSystem.eatThrownOrangeTimer === 45) {
        if (!curOrange.bites) curOrange.bites = [];
        curOrange.bites.push({ x: fruitCenter + towardCapy * 7, y: fruitCenter - 5, radius: 9 });
        spawnFoodCrumbs(curOrange.x + curOrange.width / 2, curOrange.y + curOrange.height / 2, orangePalette, 8);
      }
      if (feedingSystem.eatThrownOrangeTimer === 90) {
        curOrange.bites.push({ x: fruitCenter + towardCapy * 6, y: fruitCenter + 6, radius: 9.5 });
        spawnFoodCrumbs(curOrange.x + curOrange.width / 2, curOrange.y + curOrange.height / 2, orangePalette, 9);
      }
      if (feedingSystem.eatThrownOrangeTimer === 135) {
        curOrange.bites.push({ x: fruitCenter - towardCapy * 5, y: fruitCenter - 3, radius: 10 });
        spawnFoodCrumbs(curOrange.x + curOrange.width / 2, curOrange.y + curOrange.height / 2, orangePalette, 10);
      }
      if (feedingSystem.eatThrownOrangeTimer >= 180) {
        // Ăn xong quả cam ném!
        spawnFoodCrumbs(curOrange.x + curOrange.width / 2, curOrange.y + curOrange.height / 2, orangePalette, 14);

        const oIdx = groundOranges.indexOf(curOrange);
        if (oIdx !== -1) {
          groundOranges.splice(oIdx, 1);
        }
        curOrange.isBeingEaten = false;
        feedingSystem.eatingThrownOrange = null;

        // Tăng +10% năng lượng mỗi quả cam!
        feedingSystem.energy = Math.min(100, Math.round((feedingSystem.energy + 10.0) * 10) / 10);
        updateEnergyUI();
        if (typeof sendStateToPanel === 'function') sendStateToPanel();

        if (typeof showSpeechBubble === 'function') {
          showSpeechBubble(`+10% ⚡ (Ăn cam ném! Năng lượng: ${Math.round(feedingSystem.energy)}%)`, 2500, false);
        }

        if (feedingSystem.energy >= 100 || (groundOranges.length === 0 && droppedFoods.length === 0 && feedingSystem.energy > 30)) {
          endCapyHungry(true);
        }
        return;
      }
      return;
    }

    // B. Nếu chưa ăn quả nào và có quả cam ném trên sàn (và không đang ăn thức ăn giỏ hàng)
    if (!feedingSystem.isEatingFood && droppedFoods.length === 0) {
      const readyOrange = groundOranges.find(o => o.state === 'ON_GROUND' && !o.isBeingEaten);
      if (readyOrange) {
        const orangeCenterX = readyOrange.x + readyOrange.width / 2;
        const diffX = orangeCenterX - capy.x;
        const distToCenter = Math.abs(diffX);
        const standOffset = 22;

        if (distToCenter <= standOffset + 6) {
          // Đến sát cạnh quả cam ném -> Bắt đầu nhai!
          capy.facing = (diffX >= 0) ? 1 : -1;
          feedingSystem.eatingThrownOrange = readyOrange;
          readyOrange.isBeingEaten = true;
          readyOrange.bites = [];
          feedingSystem.eatThrownOrangeTimer = 0;
          capy.state = CapyState.HUNGRY_STANDING;
          capy.walkPhase = 0;
          if (typeof showSpeechBubble === 'function') {
            showSpeechBubble('A! Có cam ném tới rồi! Ăn thôi! 🍊', 2500, false);
          }
        } else {
          const moveDir = diffX > 0 ? 1 : -1;
          const targetStandX = orangeCenterX - moveDir * standOffset;
          const toTarget = targetStandX - capy.x;

          if (Math.abs(toTarget) <= 3) {
            capy.x = targetStandX;
            capy.facing = (diffX >= 0) ? 1 : -1;
            feedingSystem.eatingThrownOrange = readyOrange;
            readyOrange.isBeingEaten = true;
            readyOrange.bites = [];
            feedingSystem.eatThrownOrangeTimer = 0;
            capy.state = CapyState.HUNGRY_STANDING;
            capy.walkPhase = 0;
            if (typeof showSpeechBubble === 'function') {
              showSpeechBubble('A! Có cam ném tới rồi! Ăn thôi! 🍊', 2500, false);
            }
          } else {
            const stepDir = toTarget > 0 ? 1 : -1;
            capy.facing = stepDir;
            capy.x += stepDir * 2.4;
            capy.walkPhase += 0.22;
            capy.state = (stepDir === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
          }
        }
        return;
      }

      // Nếu quả cam đang rơi: hướng mặt về phía quả chờ tiếp đất (deadzone 12px)
      const fallingOrange = groundOranges.find(o => o.state === 'FALLING');
      if (fallingOrange) {
        const diff = (fallingOrange.x + fallingOrange.width / 2) - capy.x;
        if (Math.abs(diff) > 12) {
          capy.facing = diff > 0 ? 1 : -1;
        }
        capy.state = CapyState.HUNGRY_STANDING;
        capy.walkPhase = 0;
        return;
      }
    }
  }

  // ========================================================
  // 5. KIỂM TRA MỐC <= 30% -> KÍCH HOẠT KÊU ĐÓI (chỉ kích hoạt nếu chưa có thức ăn rơi trên sàn)
  // ========================================================
  if (feedingSystem.energy <= 30 && !feedingSystem.isHungry && droppedFoods.length === 0) {
    const canGetHungry = (
      capy.state !== CapyState.HIDING_RUN &&
      capy.state !== CapyState.HIDDEN &&
      capy.state !== CapyState.DRAGGED &&
      capy.state !== CapyState.FALLING &&
      capy.state !== CapyState.JUMPING &&
      capy.state !== CapyState.WOOD_LOG_INTERACT
    );
    if (canGetHungry) {
      triggerCapyHungry();
    }
  }

  // 3. XỬ LÝ KHI ĐANG ĐÓI HOẶC CÓ THỨC ĂN RƠI TRÊN MÀN HÌNH
  if (feedingSystem.isHungry || droppedFoods.length > 0) {
    const hasAnyDroppedFoods = (droppedFoods.length > 0);
    if (hasAnyDroppedFoods) {
      // Đang có thức ăn -> đánh thức nếu đang ngủ đình công
      if (feedingSystem.isStriking) {
        feedingSystem.isStriking = false;
        feedingSystem.strikePhase = 'NONE';
      }

      // A. Nếu đang nhai 1 món
      if (feedingSystem.isEatingFood && feedingSystem.currentEatingFood) {
        const curFood = feedingSystem.currentEatingFood;
        feedingSystem.eatTimer++;
        capy.breathPhase += 0.18; // Nhai gật gù

        const fruitCenter = 22;
        const towardCapy = (capy.x < curFood.x) ? -1 : 1;

        // 4 NHỊP CẮN: 1s (45 frames), 2s (90 frames), 3s (135 frames), 4s (180 frames)
        if (feedingSystem.eatTimer === 45) {
          curFood.bites.push({ x: fruitCenter + towardCapy * 8, y: fruitCenter - 6, radius: 9.5 });
          spawnFoodCrumbs(curFood.x + curFood.width / 2, curFood.y + curFood.height / 2, curFood.colors, 8);
        }
        if (feedingSystem.eatTimer === 90) {
          curFood.bites.push({ x: fruitCenter + towardCapy * 7, y: fruitCenter + 7, radius: 10 });
          spawnFoodCrumbs(curFood.x + curFood.width / 2, curFood.y + curFood.height / 2, curFood.colors, 9);
        }
        if (feedingSystem.eatTimer === 135) {
          curFood.bites.push({ x: fruitCenter - towardCapy * 6, y: fruitCenter - 4, radius: 10.5 });
          spawnFoodCrumbs(curFood.x + curFood.width / 2, curFood.y + curFood.height / 2, curFood.colors, 10);
        }
        if (feedingSystem.eatTimer >= 180) {
          // Ăn xong quả này -> Bù chính xác 20% năng lượng! (Ăn 5 món là đủ 100%)
          spawnFoodCrumbs(curFood.x + curFood.width / 2, curFood.y + curFood.height / 2, curFood.colors, 14);
          feedingSystem.energy = Math.min(100, Math.round((feedingSystem.energy + 20) * 10) / 10);
          updateEnergyUI();
          if (typeof sendStateToPanel === 'function') {
            sendStateToPanel();
          }

          const fIndex = droppedFoods.indexOf(curFood);
          if (fIndex !== -1) {
            droppedFoods.splice(fIndex, 1);
          }

          feedingSystem.isEatingFood = false;
          feedingSystem.currentEatingFood = null;

          const currentEnergy = Math.round(feedingSystem.energy);

          // Nếu còn món khác đang trên sàn: tiếp tục chạy ăn món kế tiếp
          if (droppedFoods.length > 0) {
            if (typeof showSpeechBubble === 'function') {
              showSpeechBubble(`+20% ⚡ (Năng lượng: ${currentEnergy}%)`, 1800, false);
            }
            return;
          }

          // Đã ăn hết thức ăn trên sàn:
          if (feedingSystem.energy >= 100) {
            endCapyHungry(true);
            return;
          } else if (feedingSystem.energy > 30) {
            // Năng lượng đã vượt qua mốc đói (>30%) -> Trở lại trạng thái bình thường!
            endCapyHungry(true);
            return;
          } else {
            // Năng lượng vẫn còn <= 30%:
            if (typeof showSpeechBubble === 'function') {
              showSpeechBubble(`+20% ⚡ (${currentEnergy}%). Vẫn đói quá...`, 2500, true);
            }
            return;
          }
        }
        return;
      }

      // B. Nếu chưa ăn: Tìm món ăn gần nhất trên sàn để chạy đến
      // Khóa mục tiêu để không bị nhảy qua nhảy lại giữa nhiều món đồ ăn
      if (!feedingSystem.targetFood || !droppedFoods.includes(feedingSystem.targetFood) || feedingSystem.targetFood.state !== 'ON_GROUND' || feedingSystem.targetFood.isBeingEaten) {
        feedingSystem.targetFood = getNearestFoodOnGround();
      }

      const targetFood = feedingSystem.targetFood;
      if (targetFood) {
        const foodCenterX = targetFood.x + targetFood.width / 2;
        const diffX = foodCenterX - capy.x;
        const distToCenter = Math.abs(diffX);
        const standOffset = 22;

        if (distToCenter <= standOffset + 6) {
          // Đến sát cạnh quả -> bắt đầu ăn!
          capy.facing = (diffX >= 0) ? 1 : -1;
          feedingSystem.isEatingFood = true;
          feedingSystem.currentEatingFood = targetFood;
          feedingSystem.targetFood = null;
          targetFood.isBeingEaten = true;
          targetFood.bites = [];
          feedingSystem.eatTimer = 0;
          capy.state = CapyState.HUNGRY_STANDING;
          capy.walkPhase = 0;
        } else {
          const moveDir = diffX > 0 ? 1 : -1;
          const targetStandX = foodCenterX - moveDir * standOffset;
          const toTarget = targetStandX - capy.x;

          if (Math.abs(toTarget) <= 3) {
            capy.x = targetStandX;
            capy.facing = (diffX >= 0) ? 1 : -1;
            feedingSystem.isEatingFood = true;
            feedingSystem.currentEatingFood = targetFood;
            feedingSystem.targetFood = null;
            targetFood.isBeingEaten = true;
            targetFood.bites = [];
            feedingSystem.eatTimer = 0;
            capy.state = CapyState.HUNGRY_STANDING;
            capy.walkPhase = 0;
          } else {
            const stepDir = toTarget > 0 ? 1 : -1;
            capy.facing = stepDir;
            capy.x += stepDir * 2.4;
            capy.walkPhase += 0.22;
            capy.state = (stepDir === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
          }
        }
      } else {
        // Quả đang rơi bằng dù từ trên cao: Capy hướng mặt về phía quả và chờ tiếp đất (có deadzone 12px chống rung giật)
        const fallingFood = droppedFoods.find(f => f.state === 'FALLING_WITH_PARACHUTE');
        if (fallingFood) {
          const diff = (fallingFood.x + fallingFood.width / 2) - capy.x;
          if (Math.abs(diff) > 12) {
            capy.facing = diff > 0 ? 1 : -1;
          }
          capy.state = CapyState.HUNGRY_STANDING;
          capy.walkPhase = 0;
        }
      }
      return;
    }

    // GIAI ĐOẠN ĐỨNG IM 10S ĐÒI ĂN (HOẶC ĐI LẠCH BẠCH KHI ĐÃ ĐỨNG XONG)
    if (!feedingSystem.hasFinishedStand) {
      if (capy.state !== CapyState.HUNGRY_STANDING && capy.state !== CapyState.DRAGGED && capy.state !== CapyState.FALLING) {
        capy.state = CapyState.HUNGRY_STANDING;
      }

      if (typeof speechBubble !== 'undefined' && (!speechBubble.active || speechBubble.text !== 'Hungryyyyyyyyyyy !!')) {
        if (typeof showSpeechBubble === 'function') {
          showSpeechBubble('Hungryyyyyyyyyyy !!', 0, true);
        }
      }

      const elapsedHungrySec = Math.floor((Date.now() - feedingSystem.hungryStartTime) / 1000);
      if (elapsedHungrySec >= 10) {
        feedingSystem.hasFinishedStand = true;
        if (typeof clearSpeechBubble === 'function') {
          clearSpeechBubble();
        }
        capy.state = (capy.facing === 1) ? CapyState.WALK_RIGHT : CapyState.WALK_LEFT;
        capy.y = groundY;
      }
    }
  }
}

// 15. VẼ QUẢ RƠI BẰNG DÙ & QUẢ ĐANG BỊ CẮN
function drawFeedingSystem(c) {
  drawFoodCrumbs(c);

  // 1. Vẽ các món ăn đang rơi bằng dù hoặc trên sàn
  for (const f of droppedFoods) {
    c.save();
    c.imageSmoothingEnabled = false;

    // A. Vẽ dù khi đang rơi từ trên cao
    if (f.state === 'FALLING_WITH_PARACHUTE') {
      if (foodParaImg.complete && foodParaImg.naturalWidth > 0) {
        const paraW = 34;
        const paraH = 34;
        const paraX = f.x + f.width / 2 - paraW / 2;
        const paraY = f.y - paraH + 8;
        c.drawImage(foodParaImg, paraX, paraY, paraW, paraH);
      }
    }

    // B. Bóng đổ dưới sàn
    if (f.state === 'ON_GROUND') {
      const biteCount = (f.bites ? f.bites.length : 0);
      const shadowScale = Math.max(0.15, 1 - biteCount * 0.22);
      c.fillStyle = `rgba(20, 20, 30, ${0.26 * shadowScale})`;
      c.beginPath();
      c.ellipse(f.x + f.width / 2, groundY, 8 * shadowScale, 2.8 * shadowScale, 0, 0, Math.PI * 2);
      c.fill();
    }

    // C. Vẽ quả (nếu đang bị cắn -> khoét khuyết tròn)
    if (f.isBeingEaten && f.bites && f.bites.length > 0) {
      const { canvas: bCanvas, ctx: bCtx } = getBiteCanvas();
      bCtx.clearRect(0, 0, 44, 44);

      const fx = 22 - f.width / 2;
      const fy = 22 - f.height / 2;

      bCtx.globalCompositeOperation = 'source-over';
      if (f.img && f.img.complete && f.img.naturalWidth > 0) {
        bCtx.drawImage(f.img, fx, fy, f.width, f.height);
      }

      bCtx.globalCompositeOperation = 'destination-out';
      for (const bite of f.bites) {
        bCtx.beginPath();
        bCtx.arc(bite.x, bite.y, bite.radius, 0, Math.PI * 2);
        bCtx.fill();
      }
      bCtx.globalCompositeOperation = 'source-over';

      c.drawImage(bCanvas, f.x - fx, f.y - fy);
    } else {
      // Vẽ quả nguyên vẹn
      if (f.img && f.img.complete && f.img.naturalWidth > 0) {
        c.drawImage(f.img, f.x, f.y, f.width, f.height);
      }
    }

    c.restore();
  }

  // 2. Vẽ quả cam khi bị ăn trong tiến trình ăn cam chống đói
  if (orange.isBeingEaten) {
    if (orangeImg.complete && orangeImg.naturalWidth > 0) {
      const { canvas: bCanvas, ctx: bCtx } = getBiteCanvas();
      bCtx.clearRect(0, 0, 44, 44);

      const fx = 22 - orange.width / 2;
      const fy = 22 - orange.height / 2;
      bCtx.globalCompositeOperation = 'source-over';
      bCtx.drawImage(orangeImg, fx, fy, orange.width, orange.height);

      bCtx.globalCompositeOperation = 'destination-out';
      for (const bite of feedingSystem.bites) {
        bCtx.beginPath();
        bCtx.arc(bite.x, bite.y, bite.radius, 0, Math.PI * 2);
        bCtx.fill();
      }
      bCtx.globalCompositeOperation = 'source-over';

      const shadowScale = Math.max(0.2, 1 - (feedingSystem.bites.length * 0.22));
      c.save();
      c.fillStyle = `rgba(20, 20, 30, ${0.25 * shadowScale})`;
      c.beginPath();
      c.ellipse(orange.x + orange.width / 2, groundY, 7 * shadowScale, 2.5 * shadowScale, 0, 0, Math.PI * 2);
      c.fill();

      c.drawImage(bCanvas, orange.x - fx, orange.y - fy);
      c.restore();
    }
  }
}

function attachFeedBtnListener() {
  const btnFeed = document.getElementById('btn-feed');
  if (btnFeed && !btnFeed._feedAttached) {
    btnFeed._feedAttached = true;
    btnFeed.addEventListener('click', (e) => {
      e.stopPropagation();
      handleFeedButtonClick();
    });
  }
}
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', attachFeedBtnListener);
} else {
  attachFeedBtnListener();
}

window.feedingSystem = feedingSystem;
window.triggerCapyHungry = triggerCapyHungry;
window.triggerCapyRunaway = triggerCapyRunaway;
window.updateEnergyUI = updateEnergyUI;
window.startStrikeProcess = startStrikeProcess;
window.endCapyHungry = endCapyHungry;
window.updateFeedingSystem = updateFeedingSystem;
window.drawFeedingSystem = drawFeedingSystem;
window.handleFeedButtonClick = handleFeedButtonClick;
window.throwOrangeFromRight = throwOrangeFromRight;
