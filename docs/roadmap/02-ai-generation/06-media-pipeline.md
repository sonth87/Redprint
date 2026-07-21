# 02/06 — Media pipeline: ảnh đúng ngữ cảnh (search/generation)

> Phân loại: Bổ sung mới
> Ưu tiên: P4
> Ước lượng: 2–3 ngày
> Phụ thuộc: [02/02](./02-industry-content-packs.md) (pool theo pack là fallback cuối)
> Trạng thái: Hoàn thành (v1 — Unsplash search) — 2026-07-21. Module mới
> `apps/api/src/services/image-provider.ts`: `ImageProvider` interface + `UnsplashProvider`
> (`UNSPLASH_ACCESS_KEY`, `content_filter=high`, map url/alt/credit) + `NoneProvider` (default khi không
> key → pool y hệt cũ). Cache in-memory TTL 1h theo query, token-bucket rate limit (`IMAGE_RATE_LIMIT`,
> default 45/h < Unsplash free 50), timeout (`IMAGE_TIMEOUT_MS`, default 3s), `sanitizeImageQuery`
> (blocklist + cap 100). `fetchSectionImages(plan, section, brief)` — query = `mediaPrompt` (LLM được yêu
> cầu viết tiếng Anh) ?? `"{industry} {type}"`, count theo section type, orientation landscape cho
> hero/cta. Route gọi async sau `generateSectionPlan` trước compile; kết quả truyền vào
> `compileSectionWithMeta(..., providerImages)`. `mediaItemsFor`/`normalizeMediaItem` ưu tiên
> **LLM src hợp lệ → provider → pool**; credit Unsplash gắn vào caption. Mọi failure → [] → pool, không
> chặn section. Mọi URL provider qua `safeMediaUrl` (chống SSRF). Log `imageProvider`/`imageCount` trên
> `section_ready`. Section prompt: rule mediaPrompt tiếng Anh + subject cụ thể. Test:
> `image-provider.test.ts` (10: sanitize, none, mediaPrompt/industry query, throw→[], Unsplash map+cache
> không-fetch-lần-2, non-ok→[], timeout→[], drop URL private-host) + 3 test compiler (provider > pool,
> LLM src > provider, không provider → pool). apps/api **141 test pass**. Docs: AI_ASSISTANT (media section
> + 3 env row) + README + roadmap.
> **Chưa làm (ngoài phạm vi v1):** Pexels/image-generation provider; chat-path `search_image` tool;
> self-host/tải ảnh về media manager (chi phí storage + license).

## 1. Mục đích

Ảnh trong trang generate phản ánh đúng nội dung từng section ("spa cho mèo" ra ảnh mèo được tắm,
không phải ảnh văn phòng), bằng cách dùng `mediaPrompt`/`alt` mà LLM đã trả về nhưng hiện đang bị vứt đi.

## 2. Hiện trạng & lý do

- `SectionPlan.mediaPrompt` và `mediaItems[].alt` được schema thu nhận, compiler chỉ dùng alt làm thuộc tính,
  còn `src` thực tế = pool 6 URL Unsplash cứng (xoay vòng modulo) trừ khi LLM tự trả URL (hiếm và rủi ro chết link).
- `media.routes.ts` của apps/api hiện phục vụ upload/media manager của editor — chưa có endpoint tìm ảnh cho AI.

## 3. Cách làm

1. **Provider abstraction** — `apps/api/src/services/image-provider.ts`:
   ```ts
   interface ImageQuery { query: string; orientation?: "landscape"|"portrait"|"squarish"; count: number }
   interface ImageResult { url: string; thumbUrl?: string; alt: string; credit?: { name: string; link: string } }
   interface ImageProvider { search(q: ImageQuery): Promise<ImageResult[]> }
   ```
   Provider v1: **Unsplash API** (`UNSPLASH_ACCESS_KEY`) — hợp landing page, có credit rõ.
   Provider "none" (mặc định khi không có key) = pool content-pack như hiện tại. Pexels/generation (DALL·E/SDXL)
   là provider tương lai cùng interface.
2. **Điểm gọi**: trong `compileSection`, trước khi build media items — mỗi section **1 query** (không per-image):
   `query = mediaPrompt ?? "{inferredIndustry} {section.type}"`, `count = max cần thiết theo variant`.
   Kết quả map vào `mediaItemsFor` như nguồn ưu tiên giữa "LLM src" và "pool".
   Thứ tự ưu tiên cuối cùng: `LLM src hợp lệ (safeMediaUrl)` → `provider result` → `content-pack pool`.
3. **Hiệu năng & tin cậy**:
   - Chạy **song song** với LLM section call? Không — mediaPrompt đến từ kết quả LLM. Gọi ngay sau khi có
     SectionPlan, timeout 3s; timeout/lỗi → pool, không retry (ảnh không đáng làm chậm section).
   - **Cache** in-memory theo query (Map + TTL 1h) — nhiều section/job trùng ngành sẽ hit.
   - Rate limit provider: bucket đơn giản, vượt → pool.
4. **An toàn nội dung**: query đi qua strip từ khoá nhạy cảm (blocklist ngắn); Unsplash `content_filter=high`.
5. **Credit/license**: `ImageResult.credit` gắn vào `props.creditText` (GalleryPro item description) khi có —
   tôn trọng Unsplash guidelines; ghi docs cho user về license ảnh.
6. **SSE**: không đổi event; ảnh nằm trong section commands như cũ.
7. Test: provider mock — ưu tiên đúng thứ tự 3 nguồn; timeout → pool; cache hit không gọi provider lần 2.

## 4. Hướng thiết kế

- Ảnh là **best-effort enhancement** — mọi failure mode đều rơi về pool im lặng, không bao giờ chặn section.
- Không tải ảnh về server (hotlink URL provider) ở v1; self-host/upload vào media manager là bước sau
  (liên quan chi phí storage + luật license).
- Image generation (thay vì search) để sau: chi phí + latency cao, cần UI opt-in riêng.

## 5. Kết quả mong muốn

- [ ] Prompt "spa thú cưng" với UNSPLASH key: ảnh hero/services là ảnh pet-spa thật sự đa dạng (không lặp 6 URL cũ).
- [ ] Không có key: hành vi y hệt hiện tại (pool pack).
- [ ] p95 thời gian thêm vào mỗi section < 1.5s (cache + song song hoá theo section concurrency sẵn có).
- [ ] Không ảnh nào bypass `safeMediaUrl`.

## 6. Tình huống có thể xảy ra & corner cases

- **Query tiếng Việt** → Unsplash search tiếng Anh tốt hơn; dịch query: dùng chính `mediaPrompt` (LLM đã được yêu cầu
  viết mediaPrompt tiếng Anh — thêm rule này vào section prompt; nếu không phải en thì gửi nguyên trạng, kết quả kém hơn nhưng chấp nhận).
- **Kết quả ít hơn count** → phần thiếu lấy pool (mediaItemsFor đã pad sẵn).
- **Ảnh trả về 404 sau này** → ngoài kiểm soát (hotlink); user thay ảnh trong editor; mitigation dài hạn = self-host.
- **Provider trả ảnh không hợp ngữ cảnh** → user sửa tay; theo dõi bằng feedback, không giải bằng code v1.
- **Chat path** ("thêm ảnh vào section này") → ngoài phạm vi v1 (chat không có mediaPrompt pipeline);
  ghi vào backlog: tool `search_image` cho chat sau này.
- **Chi phí API**: Unsplash free tier 50 req/h — cache + 1 query/section giúp 1 job (~9 section) tốn ≤9 req;
  quá hạn mức → pool tự động (bucket).

## 7. Rủi ro & rollback

Thấp — provider "none" là default, tính năng chỉ bật khi có env key. Rollback = bỏ key.
