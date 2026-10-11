# 04 — Refactoring "God Components" (BuilderEditor & RuntimeRenderer)

> **Trạng thái:** Chưa bắt đầu  
> **Ưu tiên:** 🟡 P2 (Trọng tâm cấu trúc mã nguồn)  
> **Ước lượng:** 4–5 ngày  
> **Phạm vi tác động:** `packages/builder-editor/src/*`, `packages/builder-renderer/src/*`

---

## 1. Hiện Trạng & Phân Tích Độ Phức Tạp

### 1.1. `BuilderEditor.tsx`: 1.493 dòng trong 1 component duy nhất
- **Hiện trạng:** [`packages/builder-editor/src/BuilderEditor.tsx`](file:///Users/skyline/PROJECTS/my-builder/packages/builder-editor/src/BuilderEditor.tsx) là một monolithic component dung lượng 75KB.
- **Dấu hiệu quá tải:**
  - Nhập và thực thi **hơn 25 custom hooks** trong một hàm component: `useViewport`, `useResizeGesture`, `useRubberBand`, `useMoveGesture`, `useRotateGesture`, `useSelectionRect`, `useHoverRect`, `useDimensionCapture`, `useDragHandlers`, `useClickToAdd`, `usePointerDown`, `useZIndexHandlers`, `useKeyboardShortcuts`, `useSectionResize`, `useZoomFromCenter`, `usePaletteState`, `useLayersPanel`, `useMobileFrame`...
  - Khởi tạo đồng thời 10+ modal và panel nổi (Figma Import, AI Assistant, Page Generator, Media Manager, Delete Dialog, Floating Panel, Popup Panel...).
- **Hệ lụy:**
  - **Hiệu năng suy giảm:** Bất kỳ tương tác vi mô nào (như kéo chuột đổi tọa độ 1px, hover qua một element) đều khiến toàn bộ component cha re-evaluate.
  - **Dễ sinh lỗi chéo:** Khi sửa code cho khung mobile (như file `useMobileFrame.ts`), dev rất dễ vô tình gây ảnh hưởng đến canvas overlay hoặc logic inline text.
  - **Khó test:** Không thể viết unit test riêng lẻ cho thanh toolbar, vùng artboard, hay hệ thống overlay vì tất cả bị trói chặt trong component khổng lồ này.

### 1.2. `RuntimeRenderer.tsx`: 1.557 dòng gộp mọi nghiệp vụ Production
- **Hiện trạng:** [`packages/builder-renderer/src/RuntimeRenderer.tsx`](file:///Users/skyline/PROJECTS/my-builder/packages/builder-renderer/src/RuntimeRenderer.tsx) dung lượng 64KB, chứa:
  - Khai báo CSS `@keyframes` động.
  - Thuật toán tìm scroll container qua DOM traversal (`findScrollContainer`).
  - Toàn bộ định nghĩa `RuntimeContextValue` và `RuntimeContext`.
  - Bộ máy điều phối Popup Lifecycle (`opening`, `open`, `closing`, `closed`) và conflict arbitration (`arbitrate`, `resolveConflictPolicy`).
  - Logic tính toán style pipeline và class override runtime.
  - Event bridge và form submit bridge.
- **Hệ lụy:**
  - Runtime production là bộ mặt của website xuất bản, đòi hỏi độ tin cậy tuyệt đối và tốc độ cao. Việc nhồi nhét code popup marketing enterprise và interaction engine vào một file duy nhất khiến việc tối ưu bundle/tree-shaking cho trang tĩnh trở nên bất khả thi.

---

## 2. Hướng Giải Quyết Kỹ Thuật

Thực hiện phân rã theo nguyên lý Đơn Trách Nhiệm (Single Responsibility) và Dependency Injection:

### 2.1. Kiến Trúc Phân Rã `BuilderEditor`

```
BuilderEditor (Orchestrator < 200 lines)
 ├── EditorProviders (BuilderProvider, AIConfigProvider, BreakpointOverride)
 ├── EditorLayout
 │    ├── EditorHeaderToolbar (EditorToolbar, BreakpointSwitcher, ZoomControls)
 │    ├── EditorWorkspace (Flex row)
 │    │    ├── EditorLeftSidebar (ComponentPalette, AddElementsPanel, Layers)
 │    │    ├── CanvasViewportContainer
 │    │    │    ├── CanvasViewportRoot (Pan, Zoom, Grid, Center)
 │    │    │    ├── ArtboardContainer (DesktopFrame + MobileFrame via ArtboardManager)
 │    │    │    │    └── CanvasRenderTree (NodeRenderer, FlowDropPlaceholder)
 │    │    │    └── EditorOverlayLayer (Selection, SnapGuides, Distance, Spacing)
 │    │    └── EditorRightSidebar (PropertyPanel, PageSettings, PopupSettings)
 │    └── EditorFloatingHost (ContextualToolbar, MultiSelectToolbar, TextEditToolbar)
 └── EditorModalsHost (FigmaImport, PageGenerator, AIAssistant, MediaManager)
```

**Các Module Tách Ra Trong `packages/builder-editor/src/`:**
1. `canvas/CanvasViewportManager.tsx`: Đóng gói logic zoom, pan, ruler, grid overlay.
2. `canvas/ArtboardManager.tsx`: Đóng gói việc tính toán tọa độ khung desktop, khung mobile, alignment guides và label.
3. `overlay/EditorOverlayHost.tsx`: Gom nhóm toàn bộ các overlay guides (`SelectionOverlay`, `SnapGuides`, `HoverOutline`, `DistanceGuides`, `SpacingOverlay`).
4. `panels/EditorPanelsHost.tsx`: Quản lý hiển thị các panel trái/phải/dưới có thể thu gọn (docked/floating panels).
5. `modals/EditorModalsHost.tsx`: Quản lý các popup modal độc lập (Figma, AI, DeleteConfirm, MediaManager) qua cơ chế dynamic render khi cần.

### 2.2. Kiến Trúc Phân Rã `RuntimeRenderer`

```
packages/builder-renderer/src/
 ├── context/
 │    ├── RuntimeContext.tsx         (Interface, React Context & useRuntimeContext hook)
 │    └── RuntimeProvider.tsx        (Provider quản lý variables, overrides, handlers)
 ├── styles/
 │    ├── AnimationKeyframes.tsx     (Keyframes stylesheet component)
 │    └── RuntimeStyleEngine.ts      (Biên dịch StyleConfig thành inline style & classes)
 ├── interactions/
 │    ├── RuntimeInteractionBinder.ts(Gán event listeners: click, hover, toggleVisibility)
 │    └── FormSubmitBridge.ts        (Xử lý submitAction: emit, api, redirect)
 ├── popups/
 │    ├── RuntimePopupStack.tsx      (Quản lý stack popup đang active, z-index, ESC close)
 │    └── RuntimePopupHost.tsx       (Mount container cho các popup modal/banner)
 └── RuntimeRenderer.tsx             (Entry point mỏng < 150 lines: kết hợp Provider, Tree, Popups)
```

---

## 3. Kế Hoạch Triển Khai Từng Bước

### Bước 1: Chuẩn bị an toàn (Safety Harness)
- Đảm bảo toàn bộ test của `builder-core` và `builder-editor` đang PASS.
- Tạo snapshot test kiểm tra DOM render của `RuntimeRenderer` (kế hoạch 02) trước khi bắt đầu tách file để đảm bảo không sai lệch bất kỳ thuộc tính nào.

### Bước 2: Tách nhỏ `RuntimeRenderer.tsx`
1. Tạo thư mục `packages/builder-renderer/src/context/` và chuyển `RuntimeContext` ra riêng.
2. Tạo thư mục `packages/builder-renderer/src/styles/` chuyển `AnimationKeyframes` và `findScrollContainer`.
3. Tạo `packages/builder-renderer/src/popups/RuntimePopupHost.tsx` chuyển logic render popup, lifecycle state machine và conflict arbitration.
4. Tinh gọn lại file `RuntimeRenderer.tsx` gốc chỉ còn nhiệm vụ import các module con và ghép thành component hoàn chỉnh.
5. Chạy test xác thực: `pnpm --filter @ui-builder/builder-renderer test`.

### Bước 3: Tách nhỏ `BuilderEditor.tsx`
1. Trích xuất nhóm overlay vào `packages/builder-editor/src/overlay/EditorOverlayHost.tsx`.
2. Trích xuất nhóm modals vào `packages/builder-editor/src/modals/EditorModalsHost.tsx`.
3. Trích xuất nhóm canvas & artboards vào `packages/builder-editor/src/canvas/ArtboardManager.tsx`.
4. Rút gọn `BuilderEditor.tsx` xuống dưới 300 dòng, tổ chức theo bố cục JSX phân tầng rõ ràng.
5. Chạy test và khởi chạy app playground kiểm tra toàn bộ thao tác kéo thả, zoom, panel đóng mở.

---

## 4. Checklist Công Việc Chi Tiết

- [x] Viết regression snapshot test cho `RuntimeRenderer`
- [x] Tách `RuntimeContext.ts`
- [x] Tách `PopupRuntimeLayer.tsx` và popup lifecycle hooks (`usePopupLifecycle.ts`)
- [x] Tách `keyframes.tsx` (`AnimationKeyframes`, `PopupKeyframes`)
- [x] Rút gọn `RuntimeRenderer.tsx` xuống dưới 200 dòng (hiện tại: 168 dòng)
- [x] Tách `CanvasOverlays.tsx` & `ScreenSpaceOverlays.tsx` từ `BuilderEditor.tsx`
- [x] Tách `EditorModalsHost.tsx` (Figma, AI, Delete, Media dialogs)
- [x] Tách `ArtboardContainer.tsx` (Desktop + Mobile frame handling)
- [x] Tách `EditorPanelsHost.tsx`
- [x] Refactor và phân tầng cấu trúc `BuilderEditor.tsx`
- [x] Chạy full monorepo build và test: `pnpm build && pnpm test` (100% pass)

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Cả `BuilderEditor.tsx` và `RuntimeRenderer.tsx` đều có độ dài **dưới 300 dòng**.
2. Mỗi module con tách ra đều có trách nhiệm rõ ràng, dễ viết unit test độc lập.
3. 100% tính năng hiện tại của Editor (kéo thả, zoom, snap, overlay, panel, dialog, AI, popup) hoạt động bình thường, không có bất kỳ regression nào.
4. `pnpm run build` và `pnpm test` thành công toàn bộ.

---

## 6. Rủi Ro & Kế Hoạch Rollback

- **Rủi ro:** Khi tách hooks, việc truyền props/callback giữa các controller có thể gây re-render không mong muốn nếu thiếu `useCallback`/`useMemo`.
- **Phòng ngừa:** Giữ nguyên các custom hook đã tối ưu, chỉ thay đổi vị trí mount trong cây component; sử dụng React DevTools Profiler để đối chiếu số lần re-render trước và sau khi refactor.
- **Kế hoạch Rollback:** Thực hiện trên nhánh tính năng `refactor/god-components`, commit riêng từng bước (bước tách RuntimeRenderer riêng, bước tách BuilderEditor riêng).
