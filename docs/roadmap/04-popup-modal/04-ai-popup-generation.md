# 04/04 — AI tạo popup qua template: `CREATE_POPUP_FROM_TEMPLATE`

> Phân loại: Bổ sung mới (AI)
> Ưu tiên: P6
> Ước lượng: 2–3 ngày
> Phụ thuộc: [00/03](../00-bugfixes/03-popup-context-dropped.md) (AI thấy popup), [01/05](../01-interactions-events/05-ai-event-wiring.md) (wire showModal), [03/04](../03-component-platform/04-form-primitives.md) (template lead-capture có form thật)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

User nói với AI "thêm popup khuyến mãi 20% hiện khi sắp thoát trang" → có popup hoàn chỉnh, đúng schema V6,
wire sẵn trigger — mà **LLM không bao giờ chạm vào PopupDefinition thô**. Đồng thời generate-page tự thêm
popup lead-capture khi goal là thu lead.

## 2. Hiện trạng & lý do

- `CREATE_POPUP`/`UPDATE_POPUP` bị loại chủ đích khỏi AI whitelist (docs AI_ASSISTANT.md xác nhận —
  quyết định đúng: PopupDefinition V6 quá phức tạp để LLM sinh tự do, sai một field behavior là hỏng UX).
- Nhưng không có đường thay thế → AI hoàn toàn không tạo được popup, dù hạ tầng template đã có đủ 2 phía:
  `PopupTemplateRegistry` + `defaultPopupTemplates.ts` (client), `popup-templates.json` + `popup-library.json` +
  `popup.routes.ts` (server), và flow `handleCreatePopupFromTemplate` trong BuilderEditor.

## 3. Cách làm

### 3.1 Lệnh mới (builder-core hoặc builder-editor command layer)
```ts
{ type: "CREATE_POPUP_FROM_TEMPLATE",
  payload: {
    templateId: string;                     // từ danh sách template gửi kèm context
    name?: string;
    contentPatch?: Array<{                  // patch NỘI DUNG, không patch behavior
      slot: string;                         // template khai slots: "heading" | "body" | "cta" | "image" | "field:*"
      text?: string; src?: string; alt?: string; href?: string;
    }>;
    triggerPatch?: PopupAutoTrigger;        // enum có sẵn — an toàn
    kindPatch?: { kind?: PopupKind; placement?: PopupPlacement }; // optional, giới hạn 2 field
  } }
```
- Implement bằng cách **tái dùng** `handleCreatePopupFromTemplate` flow: instantiate template
  (CREATE_POPUP + dựng cây node từ `PopupNodeTemplate`) rồi áp contentPatch theo slot map.
- **Template khai slots**: mở rộng `PopupNodeTemplate` thêm `slot?: string` trên node template
  (additive, không phá template cũ — template không slot thì không patch được nội dung, vẫn tạo được).
- Gắn slot cho các template mặc định hiện có + template "Lead capture" mới ([03/04](../03-component-platform/04-form-primitives.md)).

### 3.2 Đưa vào AI
1. Context ([00/03](../00-bugfixes/03-popup-context-dropped.md)) bổ sung `availablePopupTemplates: Array<{id, name, description, kind, slots}>`
   (từ registry client — nguồn duy nhất; server templates đã được BuilderEditor load vào registry).
2. `COMMAND_REFERENCE` thêm mô tả lệnh + rules: "popup của user tạo bằng template; chọn template sát mục đích;
   chỉ patch nội dung qua slots; trigger dùng enum".
3. Whitelist client + validation: `templateId` ∈ registry; slot ∈ template slots; text qua sanitize richtext
   sẵn có; trigger qua Zod enum. Sai → drop + repair hint (`unknown_template`, `unknown_slot`).
4. `UPDATE_INTERACTIONS` (showModal) do model tự sinh kèm khi user muốn mở bằng nút — đã có từ [01/05](../01-interactions-events/05-ai-event-wiring.md).
   Vấn đề "chưa biết popupId trước khi tạo": payload cho phép `nodeRef`? — **Giải pháp đơn giản**: client khi
   thực thi CREATE_POPUP_FROM_TEMPLATE gán popupId mới vào **idMap của normalizeAICommands** dưới temp id
   model tự đặt (`payload.tempPopupId: "temp-popup-1"`), các lệnh sau trong cùng batch tham chiếu
   `showModal.targetId: "temp-popup-1"` được resolve — cùng cơ chế temp-id node đã có.

### 3.3 Generate-page tự thêm popup (deterministic, không cần LLM)
- Trong pipeline, sau `plan_ready`: nếu `brief.primaryGoal === "collect_leads"` và Form component available
  và flag `AI_AUTO_LEAD_POPUP=true` (default **false** — opt-in, tôn trọng user không thích popup):
  phát thêm event SSE `popup_suggested` kèm command CREATE_POPUP_FROM_TEMPLATE(lead-capture, trigger exitIntent)
  — UI hiển thị như một gợi ý toggle trong PageGeneratorModal thay vì tự áp.

### 3.4 Test
- Instantiate template + patch: snapshot document.popups + cây node; slot sai bị drop có report.
- Chat e2e mock: "tạo popup giảm giá mở khi bấm nút Ưu đãi" → 2 lệnh (popup + interactions), chạy được runtime.
- Undo: cả cụm nằm trong 1 batch ([02/07](../02-ai-generation/07-transactional-apply.md)) → 1 Ctrl+Z gỡ sạch popup + interaction.

## 4. Hướng thiết kế

- **Template là hàng rào an toàn**: mọi behavior/animation/focus-trap đến từ template do người thiết kế —
  LLM chỉ điền chữ/ảnh/trigger. Đây là phiên bản popup của triết lý "compiler owns props".
- Không thêm `UPDATE_POPUP` vào whitelist đợt này — chỉnh sửa popup sâu vẫn là việc của UI panel.
  (Chat sửa **nội dung node** trong popup đã tự nhiên hoạt động qua ADD_NODE/UPDATE_PROPS khi surface đúng — [00/03](../00-bugfixes/03-popup-context-dropped.md).)

## 5. Kết quả mong muốn

- [ ] Chat tạo popup từ mô tả tự nhiên: đúng template, đúng nội dung, đúng trigger, undo 1 phát.
- [ ] Không tồn tại đường nào để LLM ghi field behavior/rules/campaign của popup.
- [ ] Generate-page với goal collect_leads + flag bật → gợi ý popup lead-capture hoạt động end-to-end.
- [ ] Template không slot vẫn tạo được (patch bị bỏ, warn).

## 6. Tình huống có thể xảy ra & corner cases

- **Model chọn template lạc đề** (announcement cho lead-gen) → chấp nhận, user đổi; description template
  viết rõ để giảm; theo dõi qua log templateId.
- **Nội dung patch dài tràn khung modal sm** → template slots khai `maxLength` (optional) → cắt + ellipsis khi patch.
- **2 popup cùng tên** → cho phép (id khác nhau), UI list phân biệt bằng kind badge.
- **Model tạo popup vòng lặp** ("mở popup khi pageLoad" trong popup...) → trigger là của popup, không đệ quy được — an toàn cấu trúc.
- **Client cũ chưa có lệnh mới** nhận command từ server hoặc replay → whitelist cũ lọc im lặng — chấp nhận
  (deploy client trước server prompt là thứ tự release bắt buộc, ghi vào PR checklist).
- **Campaign đang có conflictPolicy replace** → popup mới tạo default không thuộc campaign → không bị arbitration nuốt.

## 7. Rủi ro & rollback

Trung bình. Bề mặt mới = 1 lệnh + slot patching; mọi thứ khác tái dùng. Flag 2 tầng:
whitelist client (tắt = model không tạo được) + `AI_AUTO_LEAD_POPUP` (mặc định tắt).
