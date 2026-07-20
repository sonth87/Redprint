# 05/03 — Quy tắc đồng bộ docs ↔ code (governance)

> Phân loại: Quy trình
> Ưu tiên: P2
> Ước lượng: 0.5 ngày (thiết lập) + duy trì
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Drift docs↔code vừa phát hiện (AI_ASSISTANT.md mô tả adapter đã xoá, ARCHITECTURE.md tự mâu thuẫn với
changelog của chính nó) là hệ quả của việc **không có quy tắc cập nhật ràng buộc**. Đặt quy tắc để lần sau
không tái diễn.

## 2. Quy tắc đề xuất (đưa vào CLAUDE.md / RULES.md sau khi maintainer duyệt)

### 2.1 Ma trận "sửa gì → cập nhật docs nào"
| Thay đổi code | Docs phải cập nhật cùng PR |
|---------------|---------------------------|
| API/route/env của `apps/api` | `.claude/docs/AI_ASSISTANT.md` + bảng env README |
| Command mới / whitelist AI | `command-reference.ts` + `allowedCommands.ts` + AI_ASSISTANT.md (điểm chạm 3-nơi, xem [00/05](../00-bugfixes/05-command-whitelist-mismatch.md)) |
| Schema document (node/popup/interaction) | `.claude/docs/DATA_MODEL.md` (+POPUPS.md) + migration + CHANGELOG |
| Component mới / propSchema đổi | `/docs/user-guide/03-components-va-preset.md` + aiHints trong chính component |
| Tính năng user nhìn thấy | `/docs/user-guide/*` trang tương ứng |
| Hoàn thành 1 roadmap item | Cập nhật `Trạng thái:` trong file roadmap + ghi PR link cuối file |

### 2.2 Nguyên tắc viết
- Đặc tả mô tả **hiện tại**; kế hoạch nằm ở `docs/roadmap/`; hai thứ không trộn.
  Trong đặc tả, tính năng sắp có ghi `> Planned: <link roadmap>` — một dòng, không hơn.
- Ưu tiên **trỏ tới code** (file path) thay vì copy code vào docs.
- `.claude/docs` tiếng Anh; `/docs` tiếng Việt; `.claude/ARCHITECTURE.md` chỉ maintainer sửa
  (AI agent tạo file đề xuất).

### 2.3 Cưỡng chế nhẹ (không bureaucracy)
- PR template thêm 1 checkbox: "Docs updated / not needed (lý do)".
- CI check đơn giản (script grep, chạy trong `pnpm lint` hoặc CI riêng):
  1. Mọi lệnh trong `command-reference.ts` có mặt trong `allowedCommands.ts` (test từ [00/05](../00-bugfixes/05-command-whitelist-mismatch.md)).
  2. Link nội bộ trong `docs/**/*.md` + `.claude/docs/**/*.md` không gãy (markdown-link-check offline mode).
  3. Mỗi file trong `docs/roadmap/*/` (trừ README/legacy) có đủ header `Trạng thái:` — nhắc cập nhật tiến độ.
- Mỗi quý (hoặc mỗi 10 PR lớn): 1 lượt "docs audit" — so 3 file hay drift nhất (AI_ASSISTANT, DATA_MODEL, RUNTIME)
  với code, như lượt audit 2026-07-20 đã làm.

## 3. Kết quả mong muốn

- [ ] Quy tắc được chép vào `.claude/RULES.md` (hoặc CLAUDE.md) sau khi duyệt.
- [ ] CI link-check + whitelist-check chạy trong pipeline.
- [ ] 3 tháng sau audit lại: số drift mới phát sinh = 0 hoặc có lý do rõ.

## 4. Corner cases & lưu ý

- **Docs check làm chậm CI** → cả 2 check là grep/script tĩnh, <5s; không gọi network trong link-check.
- **PR hotfix khẩn** → checkbox "not needed (lý do)" là van xả hợp lệ; audit định kỳ bắt phần rơi rớt.
- **Ai sở hữu quyết định** → thứ tự ưu tiên khi mâu thuẫn: `ARCHITECTURE.md` override `RULES.md` (đã quy định
  trong CLAUDE.md) — governance này không đổi trật tự đó, chỉ thêm quy trình cập nhật.
