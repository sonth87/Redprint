# 01/05 — AI hiểu và tự wire events/interactions

> Phân loại: Bổ sung mới (AI)
> Ưu tiên: P6
> Ước lượng: 2 ngày
> Phụ thuộc: [00/03](../00-bugfixes/03-popup-context-dropped.md) (popup context), [01/01](./01-runtime-dead-actions.md) (action chạy thật)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Hai việc: (a) chat AI xử lý được yêu cầu ngôn ngữ tự nhiên về event
("bấm nút này thì cuộn xuống bảng giá", "hover vào card thì nổi bóng"), (b) trang generate full-page
ra đời **đã có sẵn** các interaction cơ bản (menu anchor, CTA scroll, popup lead-form) thay vì trang tĩnh.

## 2. Hiện trạng & lý do

- `COMMAND_REFERENCE` (`apps/api/src/services/command-reference.ts:47-48`) chỉ ghi:
  `UPDATE_INTERACTIONS ... "interactions": []` — **không có schema** trigger/action/condition nào.
  LLM muốn wire event phải đoán shape → gần như chắc chắn sai hoặc bị bỏ qua.
- Validation gate (`validateCompiledCommandsWithReport`) chỉ validate `ADD_NODE` — `UPDATE_INTERACTIONS`
  với payload rác đi thẳng qua và làm hỏng interactions hiện có của node (lệnh replace cả mảng).
- Compiler generate-page **không bao giờ** sinh interaction (grep `UPDATE_INTERACTIONS|interactions` trong
  `section-plan-compiler.ts` → 0).

## 3. Cách làm

### 3.1 Dạy LLM schema (chat path)
Thêm vào `COMMAND_REFERENCE` block gọn (~15 dòng, được Claude cache nên chi phí một lần):
```
### UPDATE_INTERACTIONS — Replace the interaction list of a node
{ "type": "UPDATE_INTERACTIONS", "payload": { "nodeId": "uuid", "interactions": [
  { "id": "uuid", "trigger": "click|hover|mouseenter|mouseleave|mousedown|mouseup|focus|blur|submit|change|mount|intersect|delay",
    "actions": [
      { "type": "navigate", "url": "https://...", "target": "_self|_blank" },
      { "type": "scrollTo", "targetId": "<anchorId or nodeId>", "behavior": "smooth" },
      { "type": "showModal", "targetId": "<popupId from Popups block>" },
      { "type": "hideModal", "targetId": "<popupId>" },
      { "type": "toggleVisibility", "targetId": "<nodeId>" },
      { "type": "setState", "key": "string", "value": any }
    ],
    "conditions": [{ "variable": "key", "operator": "eq|neq|truthy|falsy|...", "value": any }] } ] } }
RULES: interactions REPLACES the node's whole list — include existing interactions you want to keep
(they are in the node's `interactions` field in Page Structure). Use popup ids from the Popups block only.
```
Kèm việc này: đưa `interactions` của node vào `AIPageNode` serialize (hiện `buildAIContext` không gửi
`node.interactions` — thêm field, chỉ khi node có interactions để tiết kiệm token).

### 3.2 Validate `UPDATE_INTERACTIONS` ở gate
Thêm vào `validateCompiledCommandsWithReport`:
- `nodeId` tồn tại (initialParentIds/knownIds).
- Mỗi interaction: trigger ∈ enum, mỗi action.type ∈ enum; `showModal/hideModal.targetId` ∈ availablePopups
  (truyền thêm `popupIds: Set<string>` vào gate — optional param); `navigate.url` qua `safeLinkUrl`.
- Reason codes mới: `invalid_interaction`, `unknown_popup_target` — thêm vào `REPAIR_HINTS` để repair loop sửa được.

### 3.3 Compiler tự wire khi generate-page
Trong `section-plan-compiler.ts` (sau khi [00/02](../00-bugfixes/02-nav-anchor-mismatch.md) chuẩn hoá anchor):
- **Hero/CTA primary button** → nếu plan có section `cta` hoặc `pricing`: action `scrollTo` anchor tương ứng;
  nếu `primaryGoal === "collect_leads"` và có popup lead-form ([04/04](../04-popup-modal/04-ai-popup-generation.md)) → `showModal`.
- **Header "Book now" button** → scrollTo `cta`.
- Interaction sinh dạng `ADD_NODE` payload mở rộng? Không — `ADD_NODE` không nhận interactions; sinh **kèm** lệnh
  `UPDATE_INTERACTIONS` ngay sau ADD_NODE của button (dùng cùng nodeId `ai-*` ổn định — normalizeAICommands
  giữ nguyên id `ai-*` nên mapping an toàn).
- Config tắt/bật: `AI_WIRE_INTERACTIONS=true` mặc định bật; fallback path cũng wire (deterministic, không phụ LLM).

### 3.4 Test
- Gate: UPDATE_INTERACTIONS với popup id bịa → dropped + repair hint đúng.
- Compiler: generate SaaS plan → tồn tại UPDATE_INTERACTIONS cho hero CTA trỏ anchor có thật.
- E2E tay: generate xong bấm CTA cuộn được ngay trong preview.

## 4. Hướng thiết kế

- Giữ nguyên semantics "replace cả mảng" của `UPDATE_INTERACTIONS` (đơn giản, undo gọn) nhưng **dạy model
  rõ ràng** phải giữ interaction cũ. Không thêm lệnh merge mới trừ khi thực tế cho thấy model làm mất dữ liệu
  thường xuyên (theo dõi qua log `droppedCommands` + user feedback).
- Compiler wire deterministic (không nhờ LLM) — đúng triết lý pipeline: intent từ plan, hành vi từ code.

## 5. Kết quả mong muốn

- [ ] Chat: "làm nút này mở popup Khuyến mãi" → 1 lệnh UPDATE_INTERACTIONS hợp lệ, giữ nguyên interaction cũ của node.
- [ ] Trang generate mới: menu + CTA hoạt động ngay không cần user wire tay.
- [ ] 0 payload interactions rác lọt qua gate (test negative).

## 6. Tình huống có thể xảy ra & corner cases

- **Model quên giữ interaction cũ** → node mất event cũ; mitigation: system prompt RULES + đưa interactions
  hiện có vào context; theo dõi. Corner này là lý do cân nhắc lệnh `ADD_INTERACTION` merge trong tương lai.
- **Model wire trigger chưa chạy runtime** (nếu 01/01 chưa deploy) → cấm bằng enum trong reference (chỉ liệt kê
  trigger/action đã chạy thật).
- **Popup id đúng nhưng popup disabled** → cho phép (user bật sau); ghi chú trong message trả về.
- **fullPageMode xoá node nhưng UPDATE_INTERACTIONS trỏ node cũ** → gate check nodeId theo known ids sau REMOVE —
  cần xử lý thứ tự: gate hiện không mô phỏng REMOVE_NODE; thêm xử lý remove khỏi knownIds khi gặp REMOVE_NODE
  trong vòng validate (sửa nhỏ trong gate, thêm test).
- **Hai UPDATE_INTERACTIONS cùng node trong 1 batch** → lệnh sau thắng (replace); chấp nhận, ghi chú reference
  "emit at most one UPDATE_INTERACTIONS per node".

## 7. Rủi ro & rollback

Trung bình: mở rộng gate phải cẩn thận không chặn nhầm payload hợp lệ cũ (interactions do EventsTab tạo luôn hợp lệ
theo enum — kiểm tra bằng test snapshot từ UI). Compiler wiring sau flag `AI_WIRE_INTERACTIONS` → tắt được tức thì.
