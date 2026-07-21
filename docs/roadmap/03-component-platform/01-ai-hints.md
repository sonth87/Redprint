# 03/01 — `aiHints` trong ComponentDefinition: component tự mô tả cho AI

> Phân loại: Cải tiến nền tảng
> Ưu tiên: P4 (hạng mục quan trọng nhất của nhóm)
> Ước lượng: 2–3 ngày
> Phụ thuộc: Không
> Trạng thái: Hoàn thành — 2026-07-21. Làm đúng 3 PR như mục 7 đề xuất:
>
> **PR1 (type + hints + serialize):** `ComponentAIHints`/`ComponentContentSlots` mới trong
> `packages/builder-core/src/registry/types.ts` (+ export barrel, + `defineComponent`/`ComponentConfig`).
> Điền `aiHints` cho **cả 20** `ComponentDefinition` thật trong `builder-components` (không chỉ 17 —
> thêm cả `Section`, `Anchor` (`excludeFromAI:true` — anchor do compiler quản lý, không phải quyết định
> nội dung AI), `PopupContent` (`excludeFromAI:true`)). `extendComponent` merge `aiHints` theo field
> (không dùng flat spread như phần còn lại). `buildAIContext.ts`: `aiComponents` lọc `excludeFromAI` trước
> mọi serialize (availableComponents/componentsManifest/nestingRules); `serializeAIHints` cap
> bestFor≤5/examples≤3. Server: gộp 2 chỗ định nghĩa `availableComponents` trùng lặp (`GeneratePageRequest`
> + `ChatRequest`) thành 1 type `AIAvailableComponent` dùng chung + `AIComponentHints` mirror type.
>
> **PR2 (server dùng aiHints, đổi thứ tự ưu tiên):** `mergeCapability`:
> `aiHints > CURATED_COMPONENT_CAPABILITIES > propSchema-inferred`; `contractSource` thêm giá trị
> `"aiHints"`. `candidateComponentsForSection`: union hardcode cũ + mọi component có
> `aiHints.sectionAffinity` khớp section type (self-nominate). `examplesFor` ưu tiên
> `aiHints.examples` trước bảng curated nhỏ.
>
> **PR3 (compiler bỏ bảng cứng — rủi ro cao nhất, cần audit trước):** Audit phát hiện ~10 component
> thiếu `required: true` dù có prop bắt buộc thật (Text.text, Button.label, TextMask/TextMarquee/
> CollapsibleText.text, NavigationMenu.items, Shape.shape, GalleryPro.items, GallerySlider.slideCount,
> GalleryGrid.imageCount) — sửa cả 10. Phát hiện phụ: 3 variant trong `PropSchema` (`select`, `slider`,
> `json`) thiếu field `required`/`hidden` trong type union → thêm. GalleryPro.items không có control
> UI trong property panel (chỉ sửa qua "Manage Media" modal) → thêm field `hidden?: boolean` mới cho
> variant `json` + skip trong `DesignTab.tsx`'s render loop (tránh hiện dòng "Unsupported control (json)").
> `LEAF_COMPONENT_TYPES` → đọc `contractsByType.get(parentType)?.canContainChildren` (từ `capabilities`
> thật, không phải aiHints — đúng nguyên tắc "hints không override sự thật kỹ thuật"). `REQUIRED_PROPS`
> → `contract.requiredProps` (propSchema `required:true` thật). Xoá `hasValidEnumProps` hoàn toàn — phát
> hiện nó check cả prop **không tồn tại** (`NavigationMenu.layout` — prop thật là `orientation`), tức là
> dead code; `validatePropsAgainstContract` (đã có) validate enum `select` đúng từ propSchema thật.
>
> **Test:** fixture PricingTable giả (roadmap mục 8) — `ai-hints-e2e.test.ts` (6 test: xuất hiện đúng
> manifest với aiHints riêng, tự đề cử đúng section pricing, không đề cử sai section, contract
> requiredProps đúng từ propSchema, validation gate chặn thiếu required, chặn thêm con vào leaf) +
> test bổ sung cho manifest/candidate/buildAIContext. **apps/api 154 test pass** (148→154),
> **builder-editor 44 pass** (+4), **builder-components 2 pass**, **builder-core 257 pass** (1 fail
> popup-undo pre-existing không liên quan). Phát hiện quan trọng khi viết test: fixture
> `availableComponents` cũ trong nhiều test file không set `capabilities` — vô hại với code cũ (dùng
> bảng cứng theo tên type) nhưng vỡ ngầm với `canContainChildren`-từ-capabilities mới; đã sửa fixture
> cho khớp thực tế client luôn gửi `capabilities`.
>
> Docs: `.claude/docs/AI_ASSISTANT.md` viết lại mục "Rich Component Awareness" + "On-Demand Component
> Contracts" phản ánh kiến trúc mới.

## 1. Mục đích

Chuyển "kiến thức AI về component" từ 3 chỗ hardcode server về **chính định nghĩa component** —
để component thứ 18, 50, 100 (kể cả component do bên thứ ba đăng ký qua `extendComponent`) tự động
được AI hiểu và dùng đúng, không cần sửa `apps/api`.

## 2. Hiện trạng & lý do

- Server giữ bản sao kiến thức của 17 component built-in:
  - `CURATED_COMPONENT_CAPABILITIES` (purpose/bestFor/requiredProps/keyProps/variants/fallbackTo) — 160 dòng.
  - `LEAF_COMPONENT_TYPES`, `REQUIRED_PROPS`, `hasValidEnumProps` trong compiler — lặp lại những gì
    `propSchema`/`capabilities` phía client đã khai (`required: true`, `options`, `canContainChildren`).
  - `candidateComponentsForSection` — map section → component cứng.
- Component lạ đã có đường propSchema-driven (`propSchemaCapability`) — nhưng `purpose`/`bestFor` bị suy đoán
  từ category (chất lượng thấp: "Foo media component."), và **không bao giờ** được đề cử vào section
  (candidate list cứng không chứa nó) → component mới gần như vô hình với generate-page.

## 3. Cách làm

1. **Mở rộng `ComponentDefinition`** (`packages/builder-core/src/registry/types.ts`):
   ```ts
   export interface ComponentAIHints {
     /** 1 câu mô tả đúng vai trò — thay inferPurpose */
     purpose: string;
     /** use case cụ thể, 2-5 mục */
     bestFor: string[];
     /** section type nào nên cân nhắc component này */
     sectionAffinity?: Array<"header"|"hero"|"services"|"features"|"trust"|"process"|"stats"|"gallery"|"testimonials"|"pricing"|"faq"|"cta"|"footer"|"form"|"custom">;
     /** map content intent → prop: cho generic adapter (03/02) */
     contentSlots?: {
       heading?: string;        // tên prop nhận heading (vd "text")
       body?: string;
       items?: { prop: string; shape: "array-of-objects" | "indexed-props"; itemKeys?: Record<string,string>; maxItems?: number };
       mediaSrc?: string; mediaAlt?: string;
       ctaLabel?: string; href?: string;
     };
     /** chuỗi hạ cấp khi component không khả dụng */
     fallbackTo?: string[];
     /** ví dụ dùng tốt — đưa vào contract prompt */
     examples?: string[];
     /** không cho AI dùng (component nội bộ như PopupContent) */
     excludeFromAI?: boolean;
   }
   // ComponentDefinition:
   aiHints?: ComponentAIHints;
   ```
2. **Điền aiHints cho 17 built-in** (`packages/builder-components/src/components/*.tsx`) — nội dung
   port từ `CURATED_COMPONENT_CAPABILITIES` hiện có (đã viết tốt, chỉ chuyển nhà) + bổ sung `contentSlots`
   mới cho từng component. `PopupContent`: `excludeFromAI: true`.
3. **Serialize lên context**: `buildAIContext.availableComponents[]` thêm `aiHints`; type `GeneratePageRequest`/
   `ChatRequest` server thêm field tương ứng.
4. **Manifest merge đổi thứ tự ưu tiên** (`component-capability-manifest.ts`):
   `aiHints (từ client) > CURATED (server, giữ làm fallback 1-2 release) > propSchema-inferred`.
   Log `contractSource: "aiHints"` để theo dõi tỉ lệ chuyển đổi; khi 100% built-in có hints → xoá CURATED.
5. **candidateComponentsForSection** đổi thành: union(hardcode cũ, mọi component có `sectionAffinity`
   chứa section type) — component mới tự ứng cử. Cap số lượng theo [03/03](./03-component-retrieval.md).
6. **Compiler bỏ bảng cứng**:
   - `LEAF_COMPONENT_TYPES` → đọc `capabilities.canContainChildren` từ contract (đã gửi lên).
   - `REQUIRED_PROPS` → `contract.requiredProps` (propSchema `required: true`) — rà lại 17 propSchema
     đảm bảo khai `required` đúng (audit từng file component, sửa thiếu sót).
   - `hasValidEnumProps` → validate select options từ contract (prop-schema-validator đã làm việc này —
     xoá bản trùng trong compiler).
7. **`extendComponent`** (`builder-components/src/utils/extendComponent.ts`): merge `aiHints`
   (override shallow theo field) để các biến thể Gallery (Masonry/Collage/…) tự khai affinity riêng.
8. Test: định nghĩa component giả `PricingTable` với aiHints đầy đủ trong fixture → chạy manifest + candidate +
   contract prompt: xuất hiện đúng section pricing, requiredProps đúng theo propSchema; `excludeFromAI` không xuất hiện đâu cả.

## 4. Hướng thiết kế

- `aiHints` là **data thuần** (không hàm) — serialize được, không phá ranh giới framework-agnostic của core.
- Client là nguồn sự thật (registry sống ở client) — server luôn xử lý theo request, giữ stateless.
- `contentSlots.shape: "indexed-props"` phục vụ pattern GallerySlider (`slide0_src`…) — 2 shape đủ cho hiện tại.

## 5. Kết quả mong muốn

- [ ] Đăng ký component mới có aiHints trong playground → generate-page prompt phù hợp là component xuất hiện
      trong trang, không sửa dòng nào ở apps/api.
- [ ] `CURATED_COMPONENT_CAPABILITIES` đánh dấu deprecated, log 0 lượt dùng cho built-in.
- [ ] Compiler không còn `LEAF_COMPONENT_TYPES`/`REQUIRED_PROPS`/`hasValidEnumProps` bảng cứng.
- [ ] Token manifest không tăng >15% (hints thay curated, không cộng dồn).

## 6. Tình huống có thể xảy ra & corner cases

- **Component không có aiHints** (third-party lười) → đường propSchema-inferred như hiện tại, kém hơn nhưng chạy;
  console warn dev-mode khuyên bổ sung.
- **aiHints nói dối** (khai leaf nhưng thực tế container) → `canContainChildren` lấy từ `capabilities`
  (nguồn kỹ thuật), aiHints chỉ mô tả ngữ nghĩa — 2 nguồn tách bạch, không cho hints override capabilities.
- **Version skew client/server** (client cũ không gửi hints) → server fallback CURATED/propSchema — đó là lý do
  giữ CURATED 1-2 release.
- **Hints quá dài** (component khai 20 bestFor) → serializer cap (5 bestFor, 3 examples) khi build manifest.
- **Trùng type giữa 2 component đăng ký** → registry đã xử lý (last-wins/duplicate guard) — ngoài phạm vi.

## 7. Rủi ro & rollback

Trung bình: diện sửa rộng (core type + 17 file component + manifest + compiler) nhưng từng bước đều có
fallback về đường cũ. Chia 3 PR: (1) type + hints 17 component + serialize; (2) manifest/candidate dùng hints;
(3) compiler bỏ bảng cứng. Mỗi PR revert độc lập.
