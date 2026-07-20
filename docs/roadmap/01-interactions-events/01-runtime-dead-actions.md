# 01/01 — Implement 7 action đang "chết" ở runtime

> Phân loại: Bug fix / Hoàn thiện tính năng
> Ưu tiên: P1 (cao nhất sau bugfixes)
> Ước lượng: 2–2.5 ngày
> Phụ thuộc: Không
> Trạng thái: Hoàn thành — `InteractionBinder.ts` viết lại: `executeAction` có đủ case cho `scrollTo`/`triggerApi` (DOM-only, xử lý tại chỗ) và `toggleVisibility`/`addClass`/`removeClass`/`emit`/`custom` (dispatch, xử lý ở RuntimeRenderer vì cần React state). Thêm `runInteraction()` dùng chung (nền cho [01/02](./02-lifecycle-triggers.md)). Sửa bug ghi đè handler cùng propName (`bindAll` giờ gom theo Map, chạy tuần tự tất cả). `navigate` đổi `_self` → `location.assign`, `_blank` → `window.open(...,"noopener,noreferrer")`. `RuntimeRenderer.tsx`: thêm state `hiddenNodeIds`/`nodeClassOverrides` + setter, mở rộng context, `RuntimeNode` áp dụng (early-exit ẩn, merge className có guard Fragment/non-DOM). `RendererConfig` thêm `onCustomEvent`/`customActionHandlers`. SSRF guard cho `triggerApi` (`isSafeFetchEndpoint`) đặt tại `packages/shared/src/urlGuard.ts` (mới, dùng chung với `isPrivateHost`). Test: `InteractionBinder.test.ts` (16 case, mock global qua `vi.stubGlobal` — không cần jsdom) + `urlGuard.test.ts` (8 case). Chưa làm: demo page trong `apps/playground` (mục 5, việc thủ công ngoài scope code).

## 1. Mục đích

Mọi action mà EventsTab cho user chọn phải **thực sự chạy** ở production runtime (`RuntimeRenderer`).
Đây là nợ chức năng lớn nhất của hệ event: UI bán 11 action, runtime chạy 4.

## 2. Hiện trạng & lý do

Hai điểm đứt:

1. `InteractionBinder.executeAction` (`packages/builder-renderer/src/pipeline/InteractionBinder.ts:107-140`)
   **không có case** cho `scrollTo`, `addClass`, `removeClass`, `triggerApi` → rơi vào `default: break`.
2. Các action có dispatch (`toggleVisibility` → `TOGGLE_VISIBILITY`, `emit` → `EMIT_EVENT`, `custom` → `CUSTOM_ACTION`)
   nhưng hàm dispatch trong `RuntimeRenderer.tsx:140-151` chỉ xử lý `SET_VARIABLE` / `SHOW_MODAL` / `HIDE_MODAL`
   → dispatch xong không ai nhận.

## 3. Cách làm (theo từng action)

### 3.1 `scrollTo`
Trong `executeAction`:
```ts
case "scrollTo": {
  if (typeof document === "undefined") break;               // SSR guard
  const el = document.getElementById(action.targetId)
    ?? document.querySelector(`[data-node-id="${action.targetId}"]`);
  el?.scrollIntoView({ behavior: action.behavior ?? "smooth", block: "start" });
  break;
}
```
Lưu ý: runtime chỉ gắn `data-node-id` khi `config.attachNodeIds` bật — fallback thứ 2 chỉ chạy khi có.
Docs phải ghi rõ: targetId nên là `anchorId` (Section/Anchor render `id` thật).

### 3.2 `toggleVisibility`
- Thêm state runtime `hiddenNodeIds: Set<string>` ở `RuntimeRenderer` (cạnh `variables`), expose qua context.
- Dispatch handler thêm case `TOGGLE_VISIBILITY` → toggle id trong set.
- `RuntimeNode`: sau check `resolveVisibility(...)` thêm `if (ctx.hiddenNodeIds.has(nodeId)) return null;`.
- **Runtime-only**, không mutate document (giống popup stack) — reload là reset, đúng kỳ vọng.

### 3.3 `addClass` / `removeClass`
- Tương tự: state `nodeClassOverrides: Map<nodeId, Set<string>>` trong renderer context.
- `RuntimeNode` merge vào `extraProps.className` (nối với className sẵn có của rendered element khi cloneElement).
- Corner: component `runtimeRenderer` trả element không nhận className (Fragment) → skip im lặng + `console.warn` một lần.

### 3.4 `triggerApi`
- Implement fetch trong `executeAction`:
  ```ts
  case "triggerApi": {
    void fetch(action.endpoint, {
      method: action.method || "POST",
      headers: { "Content-Type": "application/json", ...action.headers },
      body: action.body !== undefined ? JSON.stringify(action.body) : undefined,
    }).catch((err) => console.warn("[interactions] triggerApi failed:", err));
    break;
  }
  ```
- **Bảo mật bắt buộc**: chỉ cho `https:` (và `http://localhost` khi dev); chặn URL private/loopback bằng cách
  đưa `safeLinkUrl`-tương-đương vào `builder-renderer` (copy logic từ `apps/api/src/services/url-guard.ts`
  sang `packages/shared` để dùng chung — url-guard hiện là code server). Không tự động gửi cookie: `credentials: "omit"`.
- Fire-and-forget, không block UI; không retry.

### 3.5 `emit`
- Nối vào `RendererConfig`: thêm callback `onCustomEvent?: (event: string, payload?: unknown) => void`.
- Dispatch case `EMIT_EVENT` → gọi `config.onCustomEvent`. Nếu host app không truyền → no-op + warn (dev only).
- Đây là cầu nối chuẩn để host app (CMS/website) bắt event từ page content.

### 3.6 `custom`
- Tương tự: `RendererConfig.customActionHandlers?: Record<string, (params?: unknown) => void>`;
  case `CUSTOM_ACTION` → `handlers[action.handler]?.(action.params)`.

### 3.7 `navigate` (sửa nhỏ)
- Hiện `window.open(url, "_self")` — với `_self` nên dùng `window.location.assign(url)` để không bị popup-blocker
  bắt nhầm và giữ history đúng. `_blank` giữ `window.open` + `noopener,noreferrer`.

### 3.8 Editor preview
- `CanvasPreview` (editor) nếu render qua RuntimeRenderer thì tự có; nếu không, ghi rõ trong docs:
  interactions chỉ chạy ở preview mode/runtime, không chạy khi đang edit (click = select).

## 4. Hướng thiết kế

- Mọi side-effect DOM nằm trong `builder-renderer` (SSR-safe với guard `typeof window/document`),
  **không** đưa vào `builder-core` (ràng buộc framework-agnostic).
- Action bất khả thi thì fail **im lặng có log**, không throw — một interaction hỏng không được làm gãy cả trang.
- `InteractionBinder.executeAction` nhận thêm tham số context tuỳ chọn (hiddenNodes, classOverrides, config callbacks)
  — giữ chữ ký static hiện tại bằng cách chuyển các case cần state sang dispatch (như showModal đã làm) để binder
  không phụ thuộc React.

## 5. Kết quả mong muốn

- [ ] Bảng trạng thái trong [README](./README.md) chuyển toàn bộ cột "Runtime chạy?" sang ✅.
- [ ] Demo page trong `apps/playground`: 1 nút mỗi action, chạy tay đủ 11 action.
- [ ] Unit test cho `executeAction` (jsdom): scrollTo gọi `scrollIntoView`; triggerApi chặn `http://169.254.x.x`;
      toggleVisibility toggle 2 lần trả về hiển thị.
- [ ] SSR render (không DOM) không crash với node có interactions bất kỳ.

## 6. Tình huống có thể xảy ra & corner cases

- **targetId không tồn tại** (node bị xoá sau khi wire) → no-op + warn. UI picker ([01/04](./04-events-ui-upgrade.md)) sẽ giảm tình huống này.
- **toggleVisibility chính node đang bắn event** → node biến mất ngay sau click; hợp lệ (dùng làm nút "đóng banner").
  Nhưng nếu trigger là `hover` → node ẩn → mouseleave không bao giờ bắn → không bao giờ hiện lại. Ghi rõ vào docs
  UI: khuyến cáo không dùng hover + toggleVisibility trên chính nó.
- **triggerApi bị CORS chặn** → lỗi console, không crash; docs hướng dẫn endpoint phải bật CORS.
- **triggerApi endpoint là `javascript:`/`data:`** → guard scheme chặn.
- **addClass với class Tailwind chưa có trong bundle** → class áp vào nhưng không có style; hành vi đúng, ghi chú docs.
- **Nhiều interaction cùng trigger trên 1 node** → `bindAll` hiện **ghi đè** handler cùng propName (for-loop gán) —
  sửa luôn trong hạng mục này: gom mảng interaction theo propName, handler chạy tuần tự tất cả.
  Đây là bug tiềm ẩn thứ 8 phát hiện khi làm.
- **stopPropagation/preventDefault** đã hỗ trợ — thêm test cho submit + preventDefault (chặn reload form).

## 7. Rủi ro & rollback

- `triggerApi` là bề mặt rủi ro bảo mật chính → bắt buộc scheme + private-IP guard ngay từ commit đầu.
- Thay đổi `bindAll` (gom handler) có thể đổi thứ tự thực thi với document cũ có nhiều interaction cùng trigger —
  trước đây chỉ interaction **cuối** chạy; sau fix tất cả chạy. Đổi hành vi này là chủ đích (đúng kỳ vọng user),
  ghi vào CHANGELOG.
