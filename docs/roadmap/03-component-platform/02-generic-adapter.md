# 03/02 — Generic adapter: compile component bất kỳ từ contentSlots

> Phân loại: Cải tiến nền tảng
> Ưu tiên: P4
> Ước lượng: 2–3 ngày
> Phụ thuộc: [03/01](./01-ai-hints.md) (contentSlots), [02/01](../02-ai-generation/01-preset-first-compiler.md) (preset là chiến lược ưu tiên)
> Trạng thái: Hoàn thành (v1 — props-only, chưa dọn adapter tay cũ) — 2026-07-21. Module mới
> `apps/api/src/services/generic-adapter.ts`: `compileGenericComponent` (map content→props qua
> `contentSlots`, validate qua `validatePropsAgainstContract` có sẵn — trả `null` thay vì node đoán mò
> khi contract vẫn fail sau repair) + `mapContentToProps` (export dùng chung, xử lý `heading/body/
> ctaLabel/href/mediaSrc/mediaAlt` + `items` cả 2 shape `array-of-objects`/`indexed-props` với `itemKeys`
> + cap `maxItems`) + `genericAdapterEnabled` (`AI_GENERIC_ADAPTER`, default on).
> `ComponentContract` (component-contract-resolver.ts) thêm field `contentSlots?` (từ `aiHints.contentSlots`
> — nối liền với 03/01). Compiler: `tryComponentIntents` + `compileIntentComponent` (đệ quy theo
> `fallbackTo` chain) thử **preset → generic adapter → fallbackTo** theo thứ tự cho mỗi `componentIntent`
> chưa được nhánh section đặc thù xử lý (gallery/services/faq/cta đã return sớm — generic chạy cho
> features/trust/process/stats/pricing/testimonials/custom). Cap 3 intent/section theo priority
> required>preferred>optional. Log `intentAdapterLog` (`{componentType, strategy}`) → route log
> `section_ready.intentAdapterUsed`.
>
> **Test:** fixture `Testimonial` giả (roadmap mục 5, props quote/author/avatarUrl + contentSlots) —
> `generic-adapter.test.ts` (10 unit: map content, skip field không có slot, 2 shape items, contract fail
> → null, default bù required prop, flag off) + 3 test tích hợp compiler (`Testimonial` compile đúng qua
> generic từ `componentIntents`, flag `AI_GENERIC_ADAPTER=false` tắt hẳn nhánh, `BrokenWidget` fail →
> fallbackTo Text). **apps/api 167 test pass** (154→167). Typecheck sạch, docs:check pass. Docs:
> AI_ASSISTANT (mục "Generic Adapter" + env row) + README + roadmap.
>
> **Chưa làm (v1 giới hạn theo đúng mục 6):** dọn adapter tay TextMask/TextMarquee/Shape/Divider sang
> generic (mục 4 — cần snapshot output trước khi xoá, để lại vì rủi ro/lợi ích thấp ở v1, hành vi cũ vẫn
> đúng); container component cần children (Tabs/Accordion) — `contentSlots` chỉ mô tả props, không mô
> tả cây con, để [03/05](./05-wave2-components.md) thiết kế props-driven riêng.

## 1. Mục đích

Compiler dựng được node cho **component chưa từng thấy** — điều kiện còn lại để "thêm component = chỉ viết
defineComponent". Hiện `componentIntents` của LLM chỉ có tác dụng nếu compiler có adapter tay cho type đó.

## 2. Hiện trạng & lý do

`section-plan-compiler.ts` có ~12 hàm adapter cứng (`navMenuCommand`, `galleryProCommand`, `textMaskCommand`…).
`adapterCandidatesFor()` lấy intent types nhưng nhánh compile chỉ rẽ theo **tập type biết trước**
(`firstAvailable(ctx, [...])` với danh sách literal). Component mới dù được LLM chọn trong `componentIntents`
cũng bị bỏ qua im lặng → rơi về card/text mặc định.

## 3. Cách làm

1. **Hàm lõi** `apps/api/src/services/generic-adapter.ts`:
   ```ts
   function compileGenericComponent(input: {
     id: string; parentId: string;
     contract: ComponentContract;            // đã có resolver
     hints: ComponentAIHints | undefined;    // từ 03/01
     content: {                              // trích từ SectionPlan theo intent.contentSource
       heading?: string; body?: string; ctaLabel?: string;
       items?: SectionPlanItem[]; media?: NormalizedMediaItem[];
     };
     tokens: DesignTokens;
   }): AICommandSuggestion | null
   ```
   Thuật toán:
   1. `props = { ...contract.defaultProps }`.
   2. Map content → props theo `hints.contentSlots` (heading→slots.heading, items→slots.items theo shape
      `array-of-objects` hoặc `indexed-props` với `itemKeys`, media→mediaSrc/mediaAlt, cap `maxItems`).
   3. Không có slot cho một loại content → bỏ loại đó (không đoán).
   4. Fill required props còn thiếu bằng `repairPrimitive` (prop-schema-validator đã có).
   5. `validatePropsAgainstContract` — fail → return null (caller rơi xuống fallback chain).
   6. Style: chỉ set `width: 100%` + border-radius token khi propSchema có key style tương ứng —
      generic adapter **không** chế style phức tạp (đó là việc của preset).
2. **Thứ tự chiến lược trong compiler** khi xử lý một `componentIntent`:
   `preset khớp (02/01)` → `adapter tay (nếu có — giữ cho 5-6 component phức tạp: NavigationMenu, GalleryPro,
   GallerySlider, GalleryGrid, CollapsibleText)` → `compileGenericComponent` → `fallbackTo chain (hints)` → bỏ intent.
3. **Nơi cắm**: `compileGenericSection` — sau `addIntro/addActions`, duyệt `plan.componentIntents` chưa được
   nhánh đặc thù xử lý, mỗi intent 1 lần thử theo thứ tự trên; log `adapterUsed: "preset"|"handwritten"|"generic"|"fallback"`.
4. **Adapter tay dọn bớt**: TextMask/TextMarquee/Shape/Divider chuyển hẳn sang generic (contentSlots đủ) —
   đo output tương đương bằng snapshot trước khi xoá hàm cũ.
5. Test: component giả `Testimonial` (props: quote/author/avatarUrl, có contentSlots) → intent testimonials
   ra ADD_NODE đúng props từ plan.testimonials; component thiếu slot items nhận 5 items → chỉ nhận phần map được;
   contract validate fail → null + fallback chain chạy.

## 4. Hướng thiết kế

- Generic adapter **tối giản có chủ đích**: map nội dung, không sáng tạo layout/style. Đẹp đến từ preset
  ([02/01](../02-ai-generation/01-preset-first-compiler.md)) và style mặc định của chính component (defaultProps của nó phải tự đẹp — đây trở thành
  tiêu chuẩn chất lượng khi viết component mới, ghi vào convention).
- Trả `null` thay vì command "gần đúng" — thà fallback rõ ràng còn hơn node vỡ.

## 5. Kết quả mong muốn

- [ ] Kịch bản end-to-end với component mới (fixture): defineComponent + aiHints → LLM intent → generic adapter
      → node hiển thị đúng nội dung trong playground.
- [ ] `adapterUsed` log cho thấy generic path chạy thật trong sản xuất (tỉ lệ > 0 khi có component ngoài 17 built-in).
- [ ] Số hàm adapter tay giảm từ ~12 xuống ≤6, snapshot output không đổi với built-in còn lại.

## 6. Tình huống có thể xảy ra & corner cases

- **Component container cần children** (intent trỏ Tabs) → generic adapter v1 chỉ tạo node props-only;
  container phức tạp cần children do adapter tay hoặc preset đảm nhiệm — `contentSlots` không mô tả children.
  Ghi giới hạn này vào docs aiHints; Tabs/Accordion ([03/05](./05-wave2-components.md)) sẽ thiết kế props-driven (items trong props)
  để generic dựng được.
- **indexed-props vượt maxItems** → cắt + log; **itemKeys thiếu key** → bỏ field thiếu.
- **Hai intent cùng type trong 1 section** → cho phép, id suffix `-2`.
- **LLM spam intents** (8 intent/section) → cap 3 intents/section khi compile (ưu tiên priority: required > preferred > optional).
- **Version skew**: request không có hints ([03/01](./01-ai-hints.md) chưa deploy client) → generic adapter skip (không có slots) → hành vi cũ.

## 7. Rủi ro & rollback

Trung bình. Flag `AI_GENERIC_ADAPTER` (default bật) — tắt là về đúng hành vi hiện tại vì generic chỉ là nhánh
bổ sung sau adapter tay.
