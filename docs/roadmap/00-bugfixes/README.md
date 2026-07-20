# 00 — Bugfixes (P0)

Các lỗi đã **xác nhận trực tiếp trong code** (không phải suy đoán). Tất cả đều nhỏ về effort nhưng ảnh hưởng trực tiếp
chất lượng đầu ra của AI generate hoặc gây hiểu nhầm khi maintain. Nên gộp thành 1–2 PR, làm trước mọi hạng mục khác.

| # | File | Tóm tắt | Ảnh hưởng | Effort |
|---|------|---------|-----------|--------|
| 01 | [01-pet-image-leak.md](./01-pet-image-leak.md) | Ảnh pet dùng cho mọi ngành ở card services/testimonials | Chất lượng trang generate | 0.5 ngày |
| 02 | [02-nav-anchor-mismatch.md](./02-nav-anchor-mismatch.md) | Menu anchor `#services` không khớp id Section sinh ra → scroll không chạy | Trang generate hỏng chức năng nav | 0.5 ngày |
| 03 | [03-popup-context-dropped.md](./03-popup-context-dropped.md) | `availablePopups`/`activeSurface` bị drop trước khi tới backend → AI "mù" popup | AI không wire được popup, docs mô tả sai | 0.5 ngày |
| 04 | [04-chat-history.md](./04-chat-history.md) | Chat assistant chỉ gửi 1 message, không có hội thoại | Trải nghiệm chat | 0.5–1 ngày |
| 05 | [05-command-whitelist-mismatch.md](./05-command-whitelist-mismatch.md) | 3 danh sách lệnh cho phép lệch nhau (AIAssistant / usePageGenerator / COMMAND_REFERENCE) | Lệnh hợp lệ bị lọc im lặng | 0.25 ngày |
| 06 | [06-cleanup-legacy-pipeline.md](./06-cleanup-legacy-pipeline.md) | Pipeline v1 (outline/section-generator/page-patterns) là dead code | Nhiễu khi đọc code, docs mô tả nhầm | 0.5 ngày |

Hai vấn đề liên quan nhưng được xử lý ở nhóm khác (vì là cải tiến cấu trúc, không phải quick fix):

- Nội dung fallback hardcode "PawJoy" + `isVietnamese` đoán bằng regex → [02-ai-generation/02-industry-content-packs.md](../02-ai-generation/02-industry-content-packs.md) và [02-ai-generation/03-locale-support.md](../02-ai-generation/03-locale-support.md)
- Kiến thức component duplicate ở server (`LEAF_COMPONENT_TYPES`, `REQUIRED_PROPS`, enum) → [03-component-platform/01-ai-hints.md](../03-component-platform/01-ai-hints.md)
