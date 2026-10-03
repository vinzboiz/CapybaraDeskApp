/**
 * Capybara Desktop Pet - Mode Hide (Đi trốn ở góc màn hình)
 * Quản lý kích hoạt chạy trốn và hở 10% phần đít ở mép phải màn hình
 */

// KHI NHẤN "TRỐN"
function triggerHide() {
  if (isWorkSessionLocked()) {
    const timeStr = getWorkRemainingTimeString();
    showSpeechBubble(Messages.workRemainingWarning(timeStr), 3200, true);
    return;
  }

  // Nếu đang ngồi bàn làm việc: cất bàn ngay rồi chạy đi trốn
  if (capy.state === CapyState.WORKING || (desk.visible && desk.x < canvas.width)) {
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      orange.state = 'ON_HEAD';
    }
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    retractWaitTimer = 1;
    retractTarget = 'desk';
    nextActionAfterRetract = 'hide';
    updateDashboardUI('hide');
    return;
  }

  // Nếu đang ngồi bồn tắm: cất xô ngay rồi chạy đi trốn
  if (capy.state === CapyState.BATHING || (tub.visible && tub.x < canvas.width)) {
    if (orange.state === 'ON_GROUND' || orange.state === 'FALLING') {
      orange.state = 'ON_HEAD';
    }
    capy.state = CapyState.IDLE_RIGHT;
    capy.facing = 1;
    capy.y = groundY;
    retractWaitTimer = 1;
    retractTarget = 'tub';
    nextActionAfterRetract = 'hide';
    updateDashboardUI('hide');
    return;
  }

  // Tắt mọi text và nhắc nhở đang có, hoãn chu kỳ nước
  clearSpeechBubble();
  waterReminderActive = false;
  lastWaterReminderTime = Date.now();

  updateDashboardUI('hide');

  desk.visible = false;
  tub.visible = false;
  retractTarget = null;
  retractWaitTimer = 0;

  capy.state = CapyState.HIDING_RUN;
  capy.facing = 1;
  capy.vy = 0;
  capy.y = groundY;
  capy.walkPhase = 0;
}
