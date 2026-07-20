# 00/02 — Menu anchor không khớp id Section sinh ra (smooth-scroll gãy)

> Phân loại: Bug fix
> Ưu tiên: P0
> Ước lượng: 0.5 ngày
> Phụ thuộc: Không
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Trang do AI generate ra phải có navigation hoạt động: click "Dịch vụ" trên menu → cuộn mượt tới section Services.

## 2. Hiện trạng & lý do

Ba mảnh ghép hiện không khớp nhau:

1. **Compiler sinh nav items** với href dạng `#services`, `#pricing`, `#faq`
   (`defaultNavItems` — `apps/api/src/services/section-plan-compiler.ts:956-973`), rồi `navMenuCommand`
   chuyển thành target `{ type: "anchor", anchorId: "services" }` (dòng ~382-388).
2. **NavigationMenu runtime** scroll bằng `document.getElementById(anchorId)`
   (`packages/builder-components/src/components/navigation-menu/NavigationMenuRuntime.tsx:48`).
3. **Section** render `id` theo thứ tự ưu tiên `props.anchorId ?? props.htmlId ?? props.slug ?? nodeId`
   (`packages/builder-components/src/components/Section.tsx:117`) — nhưng skeleton command của compiler
   (`buildSkeletonCommands`, dòng ~801-826) chỉ set `props: { fullWidthBackground: false }`, **không set `anchorId`**.
   → id thực tế của section là nodeId dạng `ai-3f2a1b9c-2-services`, không phải `services`.

**Hậu quả:** `getElementById("services")` trả `null` → click menu không làm gì. Mọi trang generate full-page đều dính.

## 3. Cách làm

1. Trong `buildSkeletonCommands`, set anchor chuẩn hoá theo **section type** cho mỗi Section:
   ```ts
   props: { fullWidthBackground: false, anchorId: section.type }, // "services", "pricing", "faq"...
   ```
2. Chuẩn hoá một **map anchor duy nhất** dùng chung cho cả hai phía (tránh lệch lần nữa):
   ```ts
   // section-plan-compiler.ts
   export function sectionAnchor(type: PageSectionType): string { return type; }
   ```
   `defaultNavItems` và `navItemsFor` sinh href từ `sectionAnchor(...)` thay vì chuỗi tự do.
3. Xử lý **trùng anchor** khi có 2 section cùng type (hiếm nhưng plan cho phép `custom` nhiều lần):
   section thứ 2 trở đi nhận hậu tố `-2`, `-3` (`services-2`). Nav mặc định chỉ trỏ section đầu tiên.
4. Với nav items do **LLM trả về** (`plan.navItems`): giữ nguyên nếu href là `#<anchor>` nằm trong tập anchor
   của plan; nếu trỏ tới anchor không tồn tại → remap về anchor gần nhất theo section type, hoặc bỏ item
   (log `decision` để theo dõi).
5. Unit test: generate plan chuẩn (header + 8 section) → với mỗi nav anchor item, tồn tại đúng 1 Section command
   có `props.anchorId` khớp.

## 4. Hướng thiết kế

Anchor theo **section type** (không theo title) để không phụ thuộc ngôn ngữ nội dung ("Dịch vụ" vs "Services").
Section component đã hỗ trợ `anchorId` sẵn nên không cần đổi component — chỉ compiler thiếu dữ liệu.

## 5. Kết quả mong muốn

- [ ] Trang generate mới: click từng item menu → cuộn đúng section (kiểm tra tay trên playground).
- [ ] Test tự động: mọi `anchorId` trong NavigationMenu items đều có Section tương ứng trong cùng batch command.
- [ ] Footer menu (cũng dùng `navMenuCommand`) hoạt động tương tự.

## 6. Tình huống có thể xảy ra & corner cases

- **Hai section cùng type** → hậu tố `-2` như bước 3; test case riêng.
- **User đổi tên/xoá section sau khi generate** → anchor chết là hành vi bình thường của builder (user tự chịu);
  ngoài phạm vi fix này. Cải tiến UI picker anchor nằm ở [01-interactions-events/04-events-ui-upgrade.md](../01-interactions-events/04-events-ui-upgrade.md).
- **Trang có sẵn section trước khi generate thêm** (không phải fullPageMode) → có thể trùng anchor với section cũ.
  Khi apply, client không validate anchor trùng — chấp nhận: `getElementById` lấy phần tử đầu tiên trong DOM.
- **Popup content chứa NavigationMenu anchor** → `getElementById` vẫn tìm trong page phía sau; hành vi chấp nhận được
  (scroll xảy ra sau khi đóng popup); ghi chú vào docs popup.
- **SSR/hydration**: `Section` đọc props thuần → không có khác biệt server/client, an toàn.

## 7. Rủi ro & rollback

Rủi ro thấp. `anchorId` là prop mới được set thêm — document cũ không có vẫn render như trước (fallback nodeId).
Rollback = revert compiler hunk; không cần migration.
