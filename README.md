# Context Engineering Rules cho AI Agents

Repository này cung cấp bộ quy tắc chuẩn mực (Rules & Conventions) dành cho AI Agents, được xây dựng dựa trên phương pháp Context Engineering. Mục tiêu là định hướng, kiểm soát hành vi và định hình kiến trúc code của các code assistants (Cursor, GitHub Copilot, Claude) khi tham gia Pair Programming trong dự án.

## Các điểm cốt lõi

1. **Kiểm soát hành vi chặt chẽ**: Giảm thiểu hiện tượng AI hallucination (ảo giác) và ngăn chặn việc sinh ra các pattern code lỗi thời, không tuân thủ chuẩn của team.
2. **Tiêu chuẩn hóa định dạng**: Ép buộc AI nhận diện và tuân thủ sát sao tech stack (Next.js, TypeScript, Tailwind, Zustand, TanStack Query), kiến trúc thư mục, naming convention và chuẩn xử lý lỗi của tổ chức.
3. **Phân ranh giới xác thực**: Phân vùng rõ "Agent-verifiable" (yêu cầu AI tự chạy `typecheck`, `lint`, `test`) và "Human-verifiable" (chỉ con người review màn hình hiển thị, logic nghiệp vụ).
4. **Tối ưu hóa Context Window**: Đặt ra luồng thứ tự ưu tiên khai thác file (ưu tiên load `ARCHITECTURE.md` -> `RULES.md` -> các file `*.type.ts`), tối ưu số lượng token cần cung cấp nhằm gia tăng độ chính xác suy luận.
5. **Phân tách ngữ cảnh**: Tách biệt rõ ràng giữa quy tắc kỹ thuật chung (`RULES.md`) và ngữ cảnh đặc thù của dự án (`ARCHITECTURE.md`). AI sẽ nắm bắt nghiệp vụ hiện tại qua Architecture trước khi tiến hành code.

## Hướng dẫn tích hợp dự án

Để nhúng hệ thống rules vào codebase, chỉ cần thực hiện 3 bước đơn giản:

### 1. Sao chép tài nguyên

Copy thư mục `docs/` và file `CLAUDE.md` từ repository này sang thư mục gốc dự án:

```text
/your-repository/
├── docs/
│   ├── RULES.md           # Bộ quy tắc kỹ thuật chung (Tuyệt đối không sửa)
│   └── ARCHITECTURE.md    # Nơi chứa thông tin mô tả đặc thù dự án
├── CLAUDE.md              # File khai báo instruction và skills cho AI
```

### 2. Định nghĩa ngữ cảnh dự án (Architecture)

Mở file `docs/ARCHITECTURE.md` và chỉnh sửa lại nội dung để phản ánh chính xác bức tranh của dự án hiện hành (luồng nghiệp vụ, database schema, specs).
Nếu dự án có tech stack tách biệt so với rules chung, hãy hướng dẫn đè (override) tại đây. AI được lập trình để ưu tiên scope `ARCHITECTURE` là cao nhất.

### 3. Tích hợp AI Skills

Tra cứu và bổ sung các bộ kỹ năng chuyên biệt (AI Skills) cần thiết cho dự án vào file hệ thống (như thiết lập trong `CLAUDE.md`). Việc này giúp AI Agent có thêm context chuyên sâu để xử lý đúng chuẩn cho các thư viện, framework mong muốn.

#### Cách thức AI Agent sử dụng skill

AI Agent sẽ tự động kích hoạt skill khi phát hiện các từ khóa liên quan hoặc khi người dùng yêu cầu thực hiện các tác vụ thuộc phạm vi của skill. Ví dụ:

- Khi người dùng yêu cầu "tạo giao diện với shadcn-design-system", AI sẽ sử dụng skill `shadcn-design-system` để cung cấp các thành phần UI phù hợp.
- Khi cần xử lý dữ liệu bất đồng bộ, skill `tanstack-query` sẽ được kích hoạt để hỗ trợ quản lý state server-side.

Điều này đảm bảo AI luôn sử dụng đúng công cụ và tuân thủ các quy tắc kỹ thuật của dự án.

## Hướng dẫn cài đặt AI Skills

- Đối với [shadcn-design-system](https://www.npmjs.com/package/@sth87/shadcn-design-system), có thể tham khảo thêm tài liệu chi tiết tại [skill shadcn-design-system](https://skills.sh/sonth87/design-system/shadcn-design-system).
- Có thêm tham khảo thêm các skills khác tại [Skills.sh](https://skills.sh/)

## Giới hạn Anti-patterns

File config đã khai báo chặn cứng (hard-bound) bắt AI tránh các hành vi sau:

- Khai báo kiểu `any` (bắt buộc implement `unknown` và type guard check).
- Khai báo phức hợp form bằng `useState` (bắt ép kiến trúc React Hook Form và schema Zod validator).
- Sử dụng raw `dangerouslySetInnerHTML` mà thiếu pipe thông qua `DOMPurify.sanitize()`.
- Tuyên bố hoàn thành (Mark Task Done) nhưng bỏ qua (skip) verify các CI steps: `typecheck`, `lint`, `test`.
