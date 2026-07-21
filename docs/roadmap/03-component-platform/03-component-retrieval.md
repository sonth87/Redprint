# 03/03 — Component retrieval: chọn top-k khi catalog lớn

> Phân loại: Cải tiến (token & chất lượng lựa chọn)
> Ưu tiên: P4
> Ước lượng: 1–2 ngày
> Phụ thuộc: [03/01](./01-ai-hints.md) (sectionAffinity/bestFor là tín hiệu xếp hạng)
> Trạng thái: Hoàn thành (v1 — deterministic keyword scoring, chưa embedding) — 2026-07-21. Module mới
> `apps/api/src/services/component-retrieval.ts`: `selectComponentsForSection`/`selectComponentsForPrompt`
> đúng công thức mục 3.2 (`3×sectionAffinity + 2×keywordOverlap + 1×categoryPrior + 1×coreLayout`,
> core layout luôn kèm bất kể score). Ngưỡng `AI_RETRIEVAL_THRESHOLD` (default 30) — dưới ngưỡng trả
> nguyên catalog **cùng reference/thứ tự**, không phải chỉ "giống nhau" mà là bypass thật, đảm bảo output
> byte-identical với hành vi trước 03/03 cho 17 built-in hiện tại. Top-15 cho manifest section, top-6 cho
> contract chi tiết (`SECTION_CONTRACT_TOP_K_DEFAULT`, áp lên trên danh sách `candidateComponentsForSection`
> — no-op với danh sách hardcode hiện có vì tất cả đã ≤6). Chat path: `selectComponentsForPrompt` (k=20,
> score theo keyword toàn `userPrompt`) + force-include component được gọi đích danh trong prompt (mục 6
> corner case "dùng HoneycombGallery"). **Phát hiện kiến trúc quan trọng khi wire chat**: `componentsManifest`
> phía chat **đã được client tiền tính sẵn** (Phase 1B, `serializeComponentsCompact`) cho *toàn bộ* catalog
> — không retrieval-aware. `buildChatSystemPrompt` chỉ dùng chuỗi client gửi khi retrieval KHÔNG kích hoạt;
> khi kích hoạt, build lại manifest từ danh sách đã lọc phía server (bỏ qua chuỗi client stale). Log
> quyết định `COMPONENT_RETRIEVAL` (`candidateCount`/`totalCount`/`nearMisses` — top 3 điểm sát ngưỡng bị
> loại, để tinh chỉnh trọng số) khi retrieval thực sự chạy.
>
> **Test:** `component-retrieval.test.ts` (8 — bypass dưới ngưỡng giữ nguyên reference, override ngưỡng qua
> env, PricingTable giả lọt top-6 trong catalog 60 component đúng như mục 6 yêu cầu, keyword overlap,
> force-include theo tên trong chat prompt) + 2 test `ai.routes.test.ts` (chat dùng nguyên manifest client
> dưới ngưỡng, bỏ qua manifest stale khi trên ngưỡng). **apps/api 177 test pass** (167→177). Toàn bộ 167
> test cũ pass nguyên vẹn không sửa — xác nhận bypass path không đổi hành vi. Docs: AI_ASSISTANT (mục
> "Component Retrieval" + env row) + README + roadmap.
>
> **Chưa làm (đúng mục 4 — backlog có chủ đích):** embedding-based ranking v2 khi catalog >100 và keyword
> overlap tỏ ra yếu — chỉ ghi thiết kế trong roadmap gốc, không implement đợt này.

## 1. Mục đích

Khi registry có 50–200+ component, prompt không thể (và không nên) chứa manifest của tất cả.
Cần cơ chế chọn **top-k component liên quan** cho từng prompt/section — giữ token phẳng khi catalog phình,
đồng thời tăng chất lượng (model chọn giữa 15 ứng viên tốt dễ hơn 200 hỗn tạp).

## 2. Hiện trạng & lý do

- Chat path: `componentsManifest` (compact) chứa **toàn bộ** component — tuyến tính theo catalog size.
- Generate-page: manifest đầy đủ trong section prompt (`formatComponentManifestForPrompt(componentManifest)`
  không lọc) + contract chi tiết theo `candidateComponentsForSection` (có lọc nhưng bằng map cứng).
- 17 component thì ổn; 100 component ≈ +3–4K tokens mỗi call × N section × retry — vừa đắt vừa nhiễu.

## 3. Cách làm

1. **Ngưỡng kích hoạt**: `catalog ≤ 30` → gửi tất cả như hiện tại (đơn giản thắng). `> 30` → retrieval.
2. **Xếp hạng v1 — thuần deterministic, không embedding**:
   ```
   score(component, sectionType, brief) =
     3 × (sectionType ∈ hints.sectionAffinity)
   + 2 × keywordOverlap(hints.bestFor + purpose, brief.requiredContentAreas + section.contentRequirements)
   + 1 × categoryPrior(category, sectionType)     // media→gallery, navigation→header/footer...
   + 1 × isCoreLayout(component)                   // Section/Container/Grid/Row/Column/Text/Button/Image luôn vào
   ```
   Top-k: 15 cho section prompt (manifest rút gọn) + contract chi tiết cho top-6.
   Chat path: score theo prompt user (thay sectionType bằng keyword match toàn prompt), k=20.
3. **Luôn kèm nhóm bắt buộc**: layout primitives + Text/Button/Image bất kể score — model phải luôn dựng được khung.
4. **Embedding v2 (backlog, chưa làm)**: khi keyword overlap tỏ ra kém với catalog >100 — cache embedding
   per component (tính khi registry đổi), cosine với embedding của brief. Chỉ ghi thiết kế, không implement đợt này.
5. **Quan sát**: log `retrievalUsed`, `candidateCount`, danh sách bị loại có score sát ngưỡng (top 3 rớt) —
   để tinh chỉnh trọng số.
6. Test: catalog giả 60 component (permute từ built-in + fake) → prompt pricing: PricingTable fake nằm top-6;
   catalog 17 → bypass, output prompt byte-identical với hiện tại.

## 4. Hướng thiết kế

- Retrieval nằm **server-side** tại điểm build prompt (manifest/contract) — client vẫn gửi full catalog
  (một lần, JSON body không phải vấn đề token LLM).
- Không dùng vector DB — state ít, tính tại chỗ đủ nhanh (60 component × vài keyword = micro-giây).

## 5. Kết quả mong muốn

- [ ] Token section prompt không tăng khi catalog tăng 17 → 60 (đo bằng [02/08](../02-ai-generation/08-cost-observability.md)).
- [ ] Component đúng ngành (PricingTable, BookingForm) luôn lọt candidate của section tương ứng trong test.
- [ ] Không regression với catalog nhỏ (bypass path).

## 6. Tình huống có thể xảy ra & corner cases

- **Component tốt bị rớt top-k** → model không thấy = không dùng; giảm thiểu: k đủ rộng (15), core luôn kèm,
  log top-rớt để tinh chỉnh. Đây là trade-off chấp nhận của mọi retrieval.
- **Hints tiếng Việt, brief tiếng Anh** (keyword mismatch) → quy ước: `aiHints` viết tiếng Anh (convention docs);
  brief đã là tiếng Anh có cấu trúc từ planner.
- **Hai component gần trùng chức năng** (GalleryPro vs GalleryGrid) → cả hai vào candidate, LLM chọn — đúng vai trò của nó.
- **Chat hỏi đích danh component bị loại** ("dùng HoneycombGallery") → chat path bổ sung: type xuất hiện
  nguyên văn trong prompt user → force-include vào candidate (exact-name match pass).

## 7. Rủi ro & rollback

Thấp: bypass dưới ngưỡng 30 nghĩa là production hiện tại (17 component) không đổi hành vi byte nào.
Flag `AI_RETRIEVAL_THRESHOLD` chỉnh ngưỡng, đặt 9999 để tắt.
