# 3. Property Panel — bảng thuộc tính

Khi bạn chọn một phần tử, panel bên phải hiển thị **5 tab** để chỉnh mọi khía cạnh của nó. Khi không chọn
gì, panel này là **Page Settings** (cài đặt trang).

```
┌─────────────────────────────┐
│ [Design][Events][Effects]   │  ← 5 tab
│ [Data][Advanced]            │
├─────────────────────────────┤
│  Nội dung tab đang chọn     │
│  (các mục gập/mở được)      │
└─────────────────────────────┘
```

## Tab Design — nội dung & giao diện

Tab chính, gồm nhiều mục gập/mở:

| Mục | Chỉnh gì |
|-----|----------|
| **Properties** | Thuộc tính riêng của component (text, label, src, số cột Grid…) — sinh tự động từ component |
| **Filter** | Bộ lọc ảnh (chỉ với Image) — [bài 5](./05-styling-va-hieu-ung.md) |
| **Background** | Màu nền, ảnh nền, kích thước/vị trí/lặp ảnh nền, gradient |
| **Size** | Width, height, min/max, tỉ lệ |
| **Spacing** | Margin & padding — có **visualizer** trực quan, kéo để chỉnh |
| **Typography** | Font family, cỡ chữ, độ đậm, line-height, letter-spacing, căn lề, màu chữ |
| **Border** | Viền, bo góc (radius từng góc) |
| **Shadow / Text Shadow** | Đổ bóng khối và bóng chữ — [bài 5](./05-styling-va-hieu-ung.md) |
| **Layout** | Display (flex/grid), hướng, gap, căn chỉnh (justify/align), wrap |
| **Visual** | Opacity, overflow, cursor, blend mode, z-index |
| **Transform** | Xoay, scale, translate, skew |

Nhiều ô có **tooltip giải thích** (biểu tượng ⓘ) và hỗ trợ nhập giá trị bằng cách **kéo ngang trên ô số**.

## Tab Events — sự kiện & tương tác

Gắn hành vi cho phần tử: click mở popup, cuộn tới section, gọi API… Chi tiết đầy đủ ở
[bài 8](./08-su-kien-interactions.md).

## Tab Effects — hiệu ứng

| Mục | Chỉnh gì |
|-----|----------|
| **Display Animation** | Hiệu ứng xuất hiện khi cuộn tới (fade, slide, zoom, bounce…), thời lượng, delay, easing, chạy một lần hay lặp — có nút xem thử |
| **Hover Effect** | Biến đổi khi rê chuột: transform (phóng/dịch), opacity, shadow |

Thư viện animation rất phong phú (nhóm Attention, Fade, Bounce, Zoom, Slide, Rotate, Flip, Special, Exit) —
xem [bài 5](./05-styling-va-hieu-ung.md).

## Tab Data — dữ liệu

| Mục | Chỉnh gì |
|-----|----------|
| **Repeater** | Bật lặp phần tử theo một khoá dữ liệu (dựng danh sách/lưới từ dữ liệu) |
| **Conditional Visibility** | Ẩn/hiện phần tử theo điều kiện (biến trạng thái) |

> Data binding nâng cao (nối nguồn dữ liệu ngoài) đang ở mức nền tảng — tham khảo `.claude/docs`.

## Tab Advanced — nâng cao

| Mục | Chỉnh gì |
|-----|----------|
| **Identity** | Tên node, Node ID (chỉ đọc) |
| **CSS Class & Attributes** | Class CSS tùy chỉnh, thuộc tính HTML tùy chỉnh (JSON, ví dụ `data-testid`) |
| **SEO & Accessibility** | ARIA role, aria-label và các thuộc tính trợ năng |
| **Tooltip** | Tooltip hiển thị khi rê chuột |
| **Metadata** | Ghi chú/metadata của node |

## Page Settings (khi không chọn phần tử)

| Mục | Chỉnh gì |
|-----|----------|
| **Document** | Tên trang, mô tả, schema version |
| **Canvas** | Chiều rộng canvas, màu nền trang |
| **Theme / Variables** | Màu chủ đề, biến trạng thái dùng cho interactions |
| **AI** | Backend URL, design tokens (màu/font thương hiệu cho AI tuân theo) |

## Mẹo

- Mục nào cũng gập lại được để gọn — chỉ mở phần đang cần.
- Chỉnh ở breakpoint nào thì chỉ ảnh hưởng breakpoint đó (trừ style gốc desktop).
- Đa số ô số hỗ trợ nhập trực tiếp **hoặc** kéo ngang để scrub.

> Đặc tả kỹ thuật hệ thuộc tính: [.claude/docs/PROPERTY_SYSTEM.md](../../.claude/docs/PROPERTY_SYSTEM.md)
