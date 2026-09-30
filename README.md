# 🍊 Capybara Desktop Pet (Pixel Art Edition)

Một ứng dụng thú cưng ảo (Desktop Pet) 2D phong cách Pixel Art cực kỳ dễ thương dành cho Windows Desktop, chạy bằng **Electron**. Chú Capybara sẽ đồng hành cùng bạn ngay trên bề mặt thanh Taskbar!

---

## ✨ Tính Năng Nổi Bật

- 🚶 **Đi dạo tuần tra trên Taskbar**: Capybara đi lại thong dong ngay trên thanh tác vụ của màn hình.
- 🍊 **Quả Cam Cân Bằng Trên Đầu**:
  - Quả cam nhún nhảy nhẹ nhàng trên đỉnh đầu theo từng bước chân.
  - Khi rung lắc chuột hoặc kéo Capy quá mạnh, quả cam sẽ rơi xuống đất, nảy và phát sáng.
  - Nếu mất quả cam khoảng 3 giây, chú Capy sẽ đứng ngơ ngác `?` rồi nằm ngủ phì phò với bọt bóng chữ `Z z z` nổi lên ở mũi.
  - **Nhấn chuột vào quả cam**: Quả cam bay ngược trở lại đầu và Capybara thức dậy đi tiếp!
- ♨️ **Tắm Onsen Thư Giãn**:
  - Kéo Capybara thả vào chiếc chậu gỗ (xô), quả cam sẽ rơi xuống và Capy nhảy vào chậu ngâm mình nước nóng.
  - Trên đầu có chiếc khăn gấp trắng, mắt nhắm nghiền thư giãn, đôi má ửng hồng.
  - Các làn khói / hơi nước Onsen bồng bềnh bốc lên liên tục.
  - Nhấn chuột vào quả cam trên sàn, Capy sẽ lập tức bước ra khỏi chậu tắm và đi tiếp.
- 🎯 **Kéo Thả Riêng Biệt**:
  - Kéo Capybara: Chỉ di chuyển riêng Capybara, chậu tắm giữ cố định vị trí.
  - Kéo Chậu Tắm: Có thể click trực tiếp vào chậu để dời chậu sang vị trí khác.
  - Giữ `Shift` khi kéo để di chuyển toàn bộ cửa sổ trên màn hình.
- 🖼️ **Cửa sổ trong suốt (Transparent & Frameless)**: Không viền, không nền, luôn nổi trên màn hình (`always-on-top`).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Yêu Cầu
- [Node.js](https://nodejs.org/) (phiên bản 16 trở lên)

### Khởi Chạy Nhanh
1. Clone repository về máy:
   ```bash
   git clone https://github.com/vinzboiz/CapybaraDeskApp.git
   cd CapybaraDeskApp
   ```
2. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng:
   ```bash
   npm start
   ```
   *(Hoặc nhấp đúp chuột vào file `start.bat` trên Windows)*

---

## 🎨 Cấu Trúc Dự Án
```
CapybaraDeskApp/
├── assets/
│   ├── capy_spritesheet.png  # Spritesheet bước đi của Capy
│   ├── capy_sleep.png        # Dáng nằm ngủ phì phò
│   ├── orange.png            # Quả cam pixel art
│   ├── tub.png               # Chiếc chậu gỗ Onsen trống
│   └── tub_bath.png          # Capy ngâm mình trong chậu tắm
├── capy.js                   # Logic animation, vật lý và tương tác
├── main.js                   # Electron main process (cửa sổ trong suốt)
├── index.html                # Canvas render
├── package.json
└── start.bat                 # Trình khởi chạy 1-click cho Windows
```
