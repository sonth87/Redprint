# 10. Phím tắt & Thao tác chuột

## Phím tắt

| Phím | Hành động |
|------|-----------|
| **V** | Công cụ Select (chọn phần tử) |
| **H** | Công cụ Pan (kéo canvas) |
| **D** | Chuyển sang breakpoint Desktop |
| **M** | Chuyển sang breakpoint Mobile |
| **⌘/Ctrl + Z** | Undo |
| **⌘/Ctrl + Shift + Z** (hoặc **Ctrl+Y**) | Redo |
| **⌘/Ctrl + C** | Copy phần tử đang chọn |
| **⌘/Ctrl + V** | Paste |
| **⌘/Ctrl + D** | Duplicate (nhân đôi) |
| **Delete / Backspace** | Xoá phần tử đang chọn (hoặc nhiều phần tử) |
| **Esc** | Bỏ chọn |
| **⇧ + 1** | Fit to screen (vừa màn hình) |
| **Mũi tên ← ↑ → ↓** | Nhích phần tử theo từng bước (nudge) — giữ để di chuyển liên tục, gộp thành 1 undo |

> Phím tắt không kích hoạt khi đang gõ trong ô nhập / vùng sửa chữ (trừ Esc).

## Thao tác chuột trên canvas

| Cử chỉ | Hành động |
|--------|-----------|
| Click | Chọn phần tử |
| **Shift/Ctrl + Click** | Thêm/bớt phần tử vào nhóm chọn |
| Kéo trên nền | **Rubber-band select** — khoanh vùng chọn nhiều phần tử |
| Kéo phần tử | Di chuyển (flow: chèn theo vị trí; absolute: đặt tự do) |
| Kéo handle góc/cạnh | Đổi kích thước (resize) |
| Kéo handle xoay | Xoay phần tử (rotate) |
| Double-click Text | Sửa chữ tại chỗ |
| **Kéo ngang trên ô số** | Scrub — tăng/giảm giá trị (padding, cỡ chữ, opacity…) |
| Kéo từ palette | Thêm component vào vị trí thả |

## Thao tác với nhiều phần tử

Khi chọn nhiều phần tử, **Multi-select toolbar** hiện lên cho phép nhân đôi / xoá cả nhóm cùng lúc.
Mẹo nhắc: *Ctrl+Click để thêm/bớt khỏi nhóm chọn*.

## Contextual toolbar

Thanh công cụ nổi theo phần tử đang chọn: nhân đôi, xoá, **khoá** (không cho chỉnh), **ẩn**, và sắp xếp
**z-index** (đưa lên trước / ra sau).

## Điều hướng canvas

| Cử chỉ | Hành động |
|--------|-----------|
| Pan | Công cụ H, hoặc giữ phím space + kéo (tùy cấu hình) |
| Zoom | Nút zoom trên toolbar, hoặc cuộn + phím bổ trợ |
| Minimap | Click/kéo trên bản đồ thu nhỏ để nhảy tới vùng cần chỉnh |
| Fit to screen | ⇧1 |

## Layer Tree & khoá/ẩn

Panel Layer Tree (dưới) cho chọn, đổi tên, ẩn/hiện, khoá và kéo sắp xếp cấp bậc — cách chắc chắn nhất để
thao tác phần tử bị chồng lấp trên canvas.

> Danh sách phím tắt đầy đủ và cách tùy biến (cho dev): xem
> [.claude/docs/EDITOR_UI.md](../../.claude/docs/EDITOR_UI.md).
