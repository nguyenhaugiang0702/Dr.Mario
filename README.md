# Dr. Mario (Next.js 15)

Game Dr. Mario cổ điển xếp thuốc diệt virus phong cách NES, tối ưu responsive cho di động và máy tính.

- **Chạy dev**: `npm run dev`
- **Build tĩnh**: `npm run build` -> thư mục `out/` (sẵn sàng đưa lên Vercel, Netlify, GitHub Pages hoặc chạy với `npx serve out`)
- **Điều khiển trên di động**:
  - **Bên trái (Cụm 4 nút tay cầm - D-Pad)**:
    - ▲: Lên / Xoay thuốc theo chiều kim đồng hồ
    - ◀: Di chuyển viên thuốc sang trái
    - ▶: Di chuyển viên thuốc sang phải
    - ▼: Hạ nhanh viên thuốc (giữ để rơi nhanh liên tục)
  - **Bên phải (2 nút hành động)**:
    - **Nút B**: Xoay ngược chiều kim đồng hồ
    - **Nút A**: Xoay thuận chiều kim đồng hồ
  - **Nút Pause & Menu**: Tạm dừng / Tiếp tục và quay về màn hình Menu chọn màn
- **Điều khiển trên máy tính (Bàn phím)**:
  - Phím mũi tên: `←` / `→` di chuyển, `↓` hạ nhanh, `↑` xoay
  - Phím chữ: `X` xoay phải, `Z` xoay trái, `P` hoặc `Space` tạm dừng
