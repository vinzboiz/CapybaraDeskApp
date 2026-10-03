/**
 * Capybara Desktop Pet - Effects & Particle System
 * Quản lý các hiệu ứng hạt: chữ ngủ Zzz, sao va chạm / thức dậy, hơi nước Onsen
 */

// 1. HIỆU ỨNG CHỮ NGỦ Zzz
var zzzParticles = [];
var zzzSpawnTimer = 0;

function updateZzz() {
  if (
    typeof capy !== 'undefined' &&
    capy &&
    (capy.state === CapyState.SLEEPING || capy.state === CapyState.HUNGRY_STRIKE_SLEEP)
  ) {
    zzzSpawnTimer++;
    if (zzzSpawnTimer >= 36) {
      zzzSpawnTimer = 0;
      zzzParticles.push({
        x: 25,
        y: -30,
        text: Math.random() > 0.4 ? 'z' : 'Z',
        opacity: 0.9,
        vy: -0.45,
        vx: 0.28
      });
    }
  }
  for (let i = zzzParticles.length - 1; i >= 0; i--) {
    const p = zzzParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.opacity -= 0.007;
    if (p.opacity <= 0) zzzParticles.splice(i, 1);
  }
}

function drawZzz(c) {
  c.save();
  c.font = 'bold 12px "Courier New", monospace';
  for (const p of zzzParticles) {
    c.fillStyle = `rgba(100, 180, 255, ${p.opacity})`;
    c.fillText(p.text, p.x, p.y);
  }
  c.restore();
}

// 2. HIỆU ỨNG SAO VA CHẠM (IMPACT) & BỪNG TỈNH (WAKE STARS)
var impactStars = [];

function spawnImpactStars(x, y) {
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 / 7) * i + Math.random() * 0.2;
    const speed = Math.random() * 2.5 + 1.8;
    impactStars.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 26, maxLife: 26,
      size: Math.random() * 3 + 3,
      color: Math.random() > 0.5 ? '#FFD700' : '#FFA500'
    });
  }
}

function spawnWakeStars(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    impactStars.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      life: 20, maxLife: 20,
      size: Math.random() * 3 + 2.5,
      color: '#64B5F6'
    });
  }
}

function updateImpactParticles() {
  for (let i = impactStars.length - 1; i >= 0; i--) {
    const p = impactStars[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) impactStars.splice(i, 1);
  }
}

function drawImpactParticles(c) {
  for (const p of impactStars) {
    const alpha = p.life / p.maxLife;
    c.save();
    c.fillStyle = p.color;
    c.globalAlpha = alpha;
    c.beginPath();
    c.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// 3. HIỆU ỨNG HƠI NƯỚC ONSEN (STEAM PARTICLES)
var steamParticles = [];
var steamTimer = 0;

function updateSteam() {
  if (
    typeof capy !== 'undefined' &&
    capy &&
    capy.state === CapyState.BATHING &&
    typeof tub !== 'undefined' &&
    tub.visible
  ) {
    steamTimer++;
    if (steamTimer >= 22) {
      steamTimer = 0;
      steamParticles.push({
        x: tub.x + 18 + Math.random() * (tub.width - 36),
        y: tub.y + 12,
        opacity: 0.7,
        radius: 3 + Math.random() * 3,
        vy: -0.35 - Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 0.3
      });
    }
  }
  for (let i = steamParticles.length - 1; i >= 0; i--) {
    const p = steamParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.radius += 0.08;
    p.opacity -= 0.009;
    if (p.opacity <= 0) steamParticles.splice(i, 1);
  }
}

function drawSteam(c) {
  c.save();
  for (const p of steamParticles) {
    c.fillStyle = `rgba(240, 248, 255, ${p.opacity})`;
    c.beginPath();
    c.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
