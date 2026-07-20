# 01 — Interactions & Events

## Bối cảnh (từ audit code)

Hệ event **đã có khung đầy đủ** — không phải xây từ đầu:

- Contract: `InteractionTrigger` (15 trigger) + `InteractionAction` (11 action) + `Condition` —
  `packages/builder-core/src/document/interactions.ts`
- UI: EventsTab + InteractionRow (`packages/builder-editor/src/panels/right/tabs/EventsTab.tsx`) qua lệnh `UPDATE_INTERACTIONS`
- Runtime: `InteractionBinder.bindAll()` map trigger → React handler (`packages/builder-renderer/src/pipeline/InteractionBinder.ts`)

**Nhưng phần thực thi bị hổng nặng** — trạng thái thực tế từng action/trigger:

| Action | UI có? | Runtime chạy? | Ghi chú |
|--------|--------|---------------|---------|
| navigate | ✅ | ✅ | `_self` → `location.assign`, `_blank` → `window.open(...,"noopener,noreferrer")` (sửa trong 01/01) |
| setState | ✅ | ✅ | `SET_VARIABLE` |
| showModal / hideModal | ✅ | ✅ | mở/đóng popup |
| toggleVisibility | ✅ | ✅ | **[01/01 xong]** runtime-only `hiddenNodeIds` Set trong RuntimeRenderer |
| scrollTo | ✅ | ✅ | **[01/01 xong]** `getElementById` → fallback `[data-node-id]`, SSR-guarded |
| addClass / removeClass | ✅ | ✅ | **[01/01 xong]** runtime-only `nodeClassOverrides` Map, skip+warn nếu root không phải DOM tag |
| triggerApi | ✅ | ✅ | **[01/01 xong]** fetch fire-and-forget, `credentials:"omit"`, SSRF guard qua `isSafeFetchEndpoint` (`packages/shared`) |
| emit | ✅ | ✅ | **[01/01 xong]** → `RendererConfig.onCustomEvent` |
| custom | ✅ | ✅ | **[01/01 xong]** → `RendererConfig.customActionHandlers[handler]` |

| Trigger | Trong type? | UI có? | Runtime chạy? |
|---------|------------|--------|----------------|
| click, dblclick, hover, mouseenter, mouseleave, focus, blur, submit, change, keydown, keyup, scroll | ✅ | ✅ (trừ keydown/keyup không có trong UI) | ✅ |
| mount, unmount | ✅ | ✅ | ❌ (scope [01/02](./02-lifecycle-triggers.md)) |
| intersect | ✅ | ❌ | ❌ (scope [01/02](./02-lifecycle-triggers.md)) |
| mousedown, mouseup, mouseover, mousemove, longpress, exitIntent, delay | ❌ | ❌ | ❌ |

UI hiện chỉ cho **1 action / interaction** (`actions[0]`), không có editor cho `conditions`, targetId phải gõ tay.
AI được phép trả `UPDATE_INTERACTIONS` nhưng COMMAND_REFERENCE chỉ ghi `"interactions": []` (không có schema).

## Hạng mục

| # | File | Nội dung | Phase |
|---|------|----------|-------|
| 01 | [01-runtime-dead-actions.md](./01-runtime-dead-actions.md) | Implement 7 action chết ở runtime | P1 |
| 02 | [02-lifecycle-triggers.md](./02-lifecycle-triggers.md) | mount / unmount / intersect | P1 |
| 03 | [03-new-triggers.md](./03-new-triggers.md) | mousedown/mouseup/mouseover/mousemove, longpress, exitIntent, delay, viewportEnter/Leave | P6 |
| 04 | [04-events-ui-upgrade.md](./04-events-ui-upgrade.md) | Multi-action, condition builder, node/popup picker, hover-pair | P6 |
| 05 | [05-ai-event-wiring.md](./05-ai-event-wiring.md) | Dạy LLM schema interactions + compiler tự wire event khi generate | P6 |

**Nguyên tắc xuyên suốt:** làm 01+02 trước (trả nợ những gì UI đã hứa với user), rồi mới mở rộng 03–05.
Không thêm trigger/action mới vào UI khi runtime chưa thực thi được — tránh lặp lại tình trạng "option chết".
