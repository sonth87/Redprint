# 05 — Chuẩn hoá hệ thống docs

## Mô hình 2 tầng docs

| | `/docs` | `.claude/docs` |
|---|---------|----------------|
| **Đối tượng** | Người dùng & người mới vào dự án | AI agent & maintainer cần đặc tả |
| **Ngôn ngữ** | Tiếng Việt (dễ nắm bắt) | English (convention của repo, xem CLAUDE.md) |
| **Nội dung** | Dự án làm gì, chức năng gì, dùng thế nào — kèm flow diagram | Đặc tả chi tiết: type contract, convention, rule, guide, edge case |
| **Mức chi tiết** | Khái niệm + luồng, không code-level | Code-level, file path, interface |
| **Cập nhật khi** | Tính năng thay đổi ở mức user nhìn thấy | Bất kỳ thay đổi hành vi/API/quy ước nào |

Quan hệ: `.claude/docs/*` **được phép trỏ link** sang `/docs/user-guide/*` cho phần tổng quan
(tránh viết lại), và ngược lại user-guide trỏ sang `.claude/docs` cho ai muốn đào sâu.
`docs/roadmap/` là tầng thứ ba: kế hoạch — không phải đặc tả cũng không phải hướng dẫn.

## Hạng mục

| # | File | Nội dung | Trạng thái |
|---|------|----------|-----------|
| 01 | [01-user-docs.md](./01-user-docs.md) | Bộ user-guide tiếng Việt trong `/docs/user-guide/` | **Hoàn thành** — 11 bài, mở rộng từ 7 bài đợt đầu |
| 02 | [02-ai-docs-refresh.md](./02-ai-docs-refresh.md) | Sửa drift trong `.claude/docs` (AI_ASSISTANT.md…) + POPUPS.md mới | **Hoàn thành** — 2026-07-20 |
| 03 | [03-doc-governance.md](./03-doc-governance.md) | Quy tắc đồng bộ docs-code lâu dài | **Hoàn thành** — 2026-07-20 |

Toàn bộ nhóm 05 hoàn thành 2026-07-20. Xem [architecture-md-proposals.md](./architecture-md-proposals.md)
cho các thay đổi còn chờ maintainer tự áp vào `ARCHITECTURE.md`/`RULES.md` (2 file AI agent không được sửa trực tiếp).

## Danh sách drift docs↔code đã xác nhận (đầu vào cho 02 — đã xử lý)

1. ~~`AI_ASSISTANT.md` — mục "Provider Adapters" + "Adding a New Provider" mô tả adapter client-side đã bị xoá
   (provider giờ ở backend `llm-client.ts`); default Claude model ghi `claude-sonnet-4-6`, code là `claude-sonnet-4-5`;
   "System Prompt từ `config.systemPrompt`" — backend sở hữu system prompt; whitelist ghi 10 lệnh, page-generator
   dùng 12; "AI context includes existing popups" — sai cho tới khi [00/03](../00-bugfixes/03-popup-context-dropped.md) hoàn thành; mô tả "Apply button"
   trong khi AIAssistant auto-apply.~~ — **viết lại toàn bộ** trong [02](./02-ai-docs-refresh.md).
2. ~~`ARCHITECTURE.md` (chỉ đề xuất — **AI agent không tự sửa file này**, theo quy định trong
   `docs/roadmap/legacy/AI_GENERATION_V2_ARCHITECTURE_PROPOSAL.md`): note cuối mục AI Generation Subsystem
   nói "chat streaming là simulation, repair deferred (P2)" mâu thuẫn changelog v2.0 của chính nó (P2 đã làm).~~
   — đề xuất xoá đã ghi vào [architecture-md-proposals.md](./architecture-md-proposals.md), chờ maintainer áp.
3. `legacy/AI_SYSTEM_PROJECT_OVERVIEW_AND_UPGRADE_PLAN.md` mục 16 mô tả pipeline v1 như hiện tại — đã lỗi thời
   (đã chuyển vào legacy kèm README cảnh báo; pipeline v1 cũng đã bị xoá khỏi code ở [00/06](../00-bugfixes/06-cleanup-legacy-pipeline.md)).
4. ~~Chưa có docs nào cho **popup system V4–V6** (tính năng lớn nhất chưa được đặc tả).~~ — [POPUPS.md](../../../.claude/docs/POPUPS.md) mới, tạo trong [02](./02-ai-docs-refresh.md).
5. ~~README gốc: bảng env AI thiếu `AI_MAX_SECTION_ATTEMPTS`/`AI_SECTION_CONCURRENCY` (có trong AI_ASSISTANT.md).~~ — bổ sung `AI_API_KEY`/`AI_RATE_LIMIT_*` trong [02](./02-ai-docs-refresh.md).
