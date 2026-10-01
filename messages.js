/**
 * Capybara Desktop Pet - Message Configuration
 * File riêng biệt quản lý toàn bộ câu thoại, tin nhắn của Capybara
 * Bạn có thể dễ dàng tùy chỉnh hoặc thêm bớt các câu thoại tại đây!
 */

var Messages = {
  // 1. KHI CHẠY ĐI LẤY ĐỒ
  fetchTub: 'Đi tắm thôi 🛁',
  fetchDesk: 'Làm việc thôi 💪',

  // 2. KHI TẮM ONSEN
  bathRelax: 'Quá đã 🥴 ~~ ',
  bathTooHot: 'Nóng vãi chưởng ra thôi 🥵',

  // 3. KHI LÀM VIỆC & NGỒI MÁY TÍNH
  workChill: 'Ngồi máy tính lướt web chill tí nào ☕💻',
  workStart: (durText) => `Bắt đầu phiên làm việc ${durText}! Tập trung nào 💻✨`,
  workRemainingWarning: (timeStr) => `Đang trong thời gian làm việc mà 😒 Còn ${timeStr} nữa đó!`,
  workRemainingEncourage: (timeStr) => `Đang trong thời gian làm việc mà! Còn ${timeStr} nữa, cố lên nhé 😤`,
  workDragWarning: 'Đang làm việc chăm chỉ, đừng kéo tớ đi mà! 😠',
  workGiveUp: 'Đếch làm nữa Nghỉ thôi !! 🤪',
  workEscape: 'Trốn việc tí hí hí 😁',
  workNoSession: 'Hiện Capy đang tự do, không trong phiên làm việc nào! 🌱', 

  // 4. NHẮC NHỞ UỐNG NƯỚC
  waterReminder: 'Cái cổ thành cái sa mạc rồi uống nước đi!🥤',
  waterDrank: 'Gút chóp bro ✨🥰',

  // 5. TƯƠNG TÁC QUẢ CAM & DẠO CHƠI
  foundOrange: 'Thấy quả cam rồi! Đi dạo chơi thôi 🍊✨',
  almostForgot: 'Tí quên hehe 🤭',

  // 6. THÔNG BÁO CÀI ĐẶT
  settingsSavedChill: 'Đã lưu! Chế độ: Chill thư giãn ☕💻',
  settingsSavedWork: (durText, intervalText) => `Đã lưu! Phiên làm việc: ${durText} | Nhắc nước: ${intervalText} 💧`,
  settingsSavedSuccess: 'Đã lưu cài đặt Capy thành công ✨🐾',

  // 7. CÂU THOẠI NGU NGƠ RANDOM KHI ĐI DẠO (MỖI 10S HIỆN 5S)
  roamQuotes: [
    'Anh em ta cứ thế thôi hẹ hẹ hẹ',
    'Nghe bài Trình chưa?',
    'Flop quá thì ghi tên anh vào',
    'Đại đại đi',
    'Cơm nước gì chưa người đẹp',
    'Xin lỗi bà nha cái miệng tui hơi giãn',
    'Đủ wow rồi',
    'Vua chúa ngày xưa cũng chỉ đến thế là cùng',
    'Tuyệt đối điện ảnh',
    'Dừng xe điiiii',
    'Gwenchana',
    'M muốn lấy Chợ Lớn?',
    'Rồi đoàn mình di chuyển lên núi ở dùm em',
    'Trốn nợ thoải mái'
  ],

  // 8. CÂU THOẠI VU VƠ KHI NGỒI LÀM VIỆC (MỖI 10S HIỆN 5S)
  workQuotes: [
    'Đang trong quá trình tích lũy tài sản',
    'Động lực thoái hóa',
    'Mong Tôn Hoa Sen thấy',
    'Khổ nhất thế giới',
    'Hơn cả khu tự trị',
    'Ét Ô Ét',
    'Hey Siri, tua về chủ nhật',
  ],

  // 9. CÂU THOẠI KHI TẮM ONSEN (MỖI 10S HIỆN 5S)
  bathQuotes: [
    'Thua Càn Long mỗi cái ngai vàng',
    'Hết nước chấm',
    'Đừng thấy hoa nở mà ngỡ xuân về',
    'Em thở chung bầu không khí như vậy có ảnh hưởng gì đến mình ko ạ',
    'Quá đã 🥴 ~~',
    'Phim sét còn lịch sự hơn'
  ],

  // 10. CÂU THOẠI KHI BỊ KÉO LÊN CAO (< 30%) TIẾP ĐẤT
  dropLowQuotes: [
    'Chưa có đủ wow',
    'Ê nha',
    'Giỡn vậy có nên không trời',
    'Anh nhắc em',
    'Lần này là nhắc nhở nhỏ nhẹ',
    'Chưa bao giờ m hỏi t có muốn hay không'
  ],

  // 11. CÂU THOẠI KHI NGÃ CHÓNG MẶT ĐỨNG DẬY (ĐỨNG YÊN 3S)
  wakeDizzyQuotes: [
    'Aishh, chếc tiệc, cậu đang làm cái quái gì vậy hả?',
    'Báo quá trời báo',
    'Tầng 19 đang xây á :))',
    'Đéo má ông lom dom vc.'
  ],

  // 12. CÂU THOẠI KHI RỚT TÁO, SAU KHI ? SẼ ĐI NGỦ
  sleepAfterLostOrange: 'Đèo mẹ, ngủ thôi',

  // 13. CÂU THOẠI KHI CHẠY TRỐN VÀO GÓC
  hideQuote: 'Chắc ko ai thấy mình'
};

// Hỗ trợ cả môi trường Node.js (Electron require) và Browser (<script>)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Messages;
}
if (typeof window !== 'undefined') {
  window.Messages = Messages;
}
