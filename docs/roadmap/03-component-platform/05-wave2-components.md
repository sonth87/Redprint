# 03/05 — Wave 2 components: Video, Icon, Tabs, Accordion, Countdown, LogoStrip, Map

> Phân loại: Bổ sung mới
> Ưu tiên: P5
> Ước lượng: 1–2 ngày / component (độc lập, làm dần theo nhu cầu)
> Phụ thuộc: [03/01](./01-ai-hints.md) (mỗi component mới sinh ra phải có aiHints ngay — đó là lý do làm nền trước)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Phủ nốt các khối phổ biến của landing page hiện đại mà bộ 21 component hiện tại chưa có, theo thứ tự
giá trị/chi phí. Mỗi component sinh ra đã "AI-ready" (aiHints + contentSlots + preset mẫu) — dùng chính
các component này để chứng minh quy trình platform mới (thêm component không sửa server).

## 2. Danh sách & thiết kế tóm tắt (thứ tự ưu tiên)

| # | Component | Vai trò landing | Props cốt lõi | Ghi chú thiết kế |
|---|-----------|-----------------|---------------|------------------|
| 1 | `Video` | hero/demo/testimonial video | `sourceType: youtube\|vimeo\|file`, `url`, `poster`, `autoplay(muted)`, `controls`, `aspectRatio` | youtube/vimeo = iframe privacy-enhanced (`youtube-nocookie`), lazy-load bằng poster + click-to-play (perf). File = `<video>`. |
| 2 | `Icon` | feature list, trust badges | `icon` (đã có prop type `icon` trong PropSchema!), `size`, `color`, `strokeWidth` | Dùng lucide (đã là dependency editor) — bundle: import động theo tên, tree-shake bằng registry con. |
| 3 | `Accordion` | FAQ nhiều mục, specs | `items: {title, body(richtext)}[]`, `allowMultiple`, `defaultOpenIndex` | **Props-driven** (items trong props, không children) → generic adapter dựng được, khác CollapsibleText (1 mục). |
| 4 | `Tabs` | features theo nhóm, pricing theo kỳ hạn | `tabs: {label, body(richtext)}[]` v1; slot-children v2 | v1 props-driven như Accordion — đủ cho AI generate; slot-based (mỗi tab 1 drop zone) là nâng cấp editor riêng nếu cần. |
| 5 | `LogoStrip` | social proof "được tin dùng bởi" | `logos: {src, alt, href?}[]`, `grayscale`, `scrolling` (tái dùng marquee logic) | Section `trust` sẽ ưu tiên component này khi có. |
| 6 | `Countdown` | urgency cho CTA/khuyến mãi | `targetDate` (ISO), `expiredText`, `units: d/h/m/s`, `style` | Client-only tick; SSR render số tĩnh từ server time; hết giờ → expiredText hoặc ẩn (prop). |
| 7 | `MapEmbed` | contact/footer địa điểm | `provider: google\|osm`, `query hoặc lat/lng`, `zoom`, `height` | Iframe embed không cần API key (google maps embed / OSM); lazy-load. |

## 3. Cách làm (quy trình chuẩn cho MỖI component — cũng là template cho mọi component tương lai)

1. `defineComponent` trong `builder-components`: propSchema (khai `required` đúng!), defaultProps **tự đẹp**
   (tiêu chuẩn từ [03/02](./02-generic-adapter.md)), capabilities, `aiHints` đầy đủ (purpose/bestFor/sectionAffinity/contentSlots/fallbackTo).
2. `editorRenderer` + `runtimeRenderer` (SSR-safe; mọi iframe/media lazy-load).
3. Preset: ≥2 preset/component vào PaletteCatalog mặc định (nguồn cho preset-first compiler).
4. i18n label cho property panel (en/vi).
5. Test render + prop validation; A11y pass cơ bản (focus, aria cho Tabs/Accordion theo WAI-ARIA pattern).
6. **Không sửa apps/api** — đây là tiêu chí nghiệm thu của platform: component xuất hiện trong AI generate
   chỉ nhờ aiHints (nếu phải sửa server → platform 03/01–03/03 chưa đạt, quay lại sửa nền).
7. Cập nhật docs: bảng component trong `/docs/user-guide/03-components-va-preset.md` + `.claude/docs/DATA_MODEL.md`.

## 4. Hướng thiết kế chung

- **Props-driven trước, slot-based sau**: AI và generic adapter làm việc với props tốt hơn nhiều so với
  children tự do; Tabs/Accordion v1 chấp nhận giới hạn body là richtext.
- **Perf là ràng buộc cứng**: mọi thứ nhúng ngoài (video, map) lazy + facade; không thêm dependency runtime nặng.
- **Privacy**: youtube-nocookie, không load Google Fonts/Maps script khi chưa tương tác (GDPR-friendly mặc định).

## 5. Kết quả mong muốn

- [ ] 7 component dùng được từ palette, có preset, có mặt trong AI generate khi phù hợp ngành.
- [ ] Prompt "trang bán khoá học có video giới thiệu và đếm ngược ưu đãi" → trang có Video + Countdown đặt đúng chỗ.
- [ ] Lighthouse trang runtime chứa Video+Map lazy vẫn ≥90 performance (playground đo tay).

## 6. Tình huống có thể xảy ra & corner cases

- **Video URL sai/private** → poster + thông báo lỗi nhẹ trong khung, không vỡ layout.
- **Autoplay policy trình duyệt** → chỉ autoplay khi muted (ép cặp prop trong schema: autoplay=true buộc muted=true).
- **Countdown lệch múi giờ** → `targetDate` lưu ISO + UTC, hiển thị theo giờ máy khách; docs ghi rõ.
- **Countdown đã hết hạn khi load** → render expiredText ngay, không flash số âm.
- **Icon tên không tồn tại** (AI bịa tên icon) → fallback icon mặc định + warn; validation gate check icon
  thuộc danh sách export (đưa danh sách vào contract options nếu ngắn, hoặc validate runtime).
- **Tabs/Accordion items rỗng** → placeholder editor "Thêm mục"; runtime render null.
- **MapEmbed bị chặn bởi CSP của site nhúng** → docs INTEGRATION ghi yêu cầu frame-src.
- **LogoStrip logo tỉ lệ lộn xộn** → object-fit contain + height cố định, grayscale mặc định để đồng bộ.

## 7. Rủi ro & rollback

Thấp per-component (cộng thêm, độc lập). Rủi ro thật là **chất lượng nền platform** — nếu component đầu tiên
(Video) cần sửa server để vào AI thì dừng wave 2, sửa 03/01–03/03 trước.
