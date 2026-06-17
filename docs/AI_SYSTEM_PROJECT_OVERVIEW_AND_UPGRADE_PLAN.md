# UI Builder Library - Mo Ta Du An, Kien Truc AI Hien Tai Va Ke Hoach Nang Cap

> Tai lieu nay duoc viet de mot nguoi hoac mot AI chua tung doc code van co the hinh dung duoc du an hien tai dang co gi, van hanh nhu the nao, AI dang duoc kien truc ra sao, va nen nang cap theo huong nao de full-page generation on dinh, dung cau truc, dung style, dung content va co kha nang kiem soat khi so luong component tang len.

## 1. Tom Tat Dieu Hanh

Du an la mot **UI Builder Library** dang duoc phat trien theo mo hinh monorepo. Muc tieu la tao mot nen tang keo-tha de xay dung giao dien web, gom:

- Mot core engine framework-agnostic.
- Mot component registry va component definitions.
- Mot React adapter.
- Mot visual editor day du panel, canvas, toolbar, drag/drop, snap, property controls.
- Mot runtime renderer de render trang production.
- Mot preset/palette system de nguoi dung keo cac bien the component co san.
- Mot backend API phuc vu AI, palette va media.
- Mot AI layer co kha nang chat/edit, tao noi dung section, va tao full page bang natural language.

Ve AI, he thong hien da co duong huong dung: AI khong mutate state truc tiep ma tra ve builder commands, client normalize commands roi dispatch vao `CommandEngine`. Full-page generation da duoc tach thanh hai buoc: tao outline truoc, sau do generate tung section. Tuy nhien, lop kiem soat output AI con mong: nhieu validation dang dua vao prompt thay vi hop dong schema/validator/compiler bat buoc. Khi component tang ve so luong, loai, prop, nesting rule va design rule, cach nay se kho mo rong neu khong bo sung lop `AI Contract`, `Planner`, `Validator`, `Compiler` va `Repair`.

Tai lieu chia thanh hai phan lon:

1. **Hien trang du an va AI hien tai**: mo ta kien truc, packages, data model, component, editor, renderer, backend, AI flows.
2. **Ke hoach nang cap AI**: de xuat chien luoc AI 2 lop va cac lop deterministic de dam bao output on dinh, dung chuc nang, dung component contract, dung style va content.

## 2. Muc Tieu San Pham

Du an huong toi viec tro thanh mot **platform xay dung UI bang visual editor**, khong chi la mot tap hop component. Nguoi dung cuoi co the tao web page bang keo-tha, sua property, responsive layout va dung AI de tao/sua nhanh. Developer co the tich hop library vao ung dung rieng va mo rong bang component, preset, plugin, asset provider.

Nhom nguoi dung chinh:

- **End users**: nguoi khong can viet code, dung editor de tao landing page, page section, layout, content.
- **Developers**: tich hop builder vao product rieng.
- **Plugin/component authors**: them component, panel, preset, logic import/export, asset provider.
- **AI agents**: sinh/sua document thong qua commands va contracts.

Gia tri cot loi:

- Visual editing.
- Component-driven architecture.
- Schema-driven rendering.
- Command-driven state management.
- Undo/redo.
- Responsive design.
- Preset/palette.
- Runtime renderer tach khoi editor.
- AI-assisted generation.

## 3. Monorepo Va Tooling

Root workspace:

- Package manager: `pnpm`.
- Monorepo orchestration: `turbo`.
- Language: TypeScript.
- Frontend frameworks: React, Vite, Next.js trong tung app.
- UI primitives: shadcn/Radix-based `packages/ui`.
- Build packages: `tsup`.
- API backend: Express.
- Validation hien co: Zod o mot so noi.

Workspace khai bao:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Lenh root quan trong:

```bash
pnpm dev        # chay playground, website, api, cms qua turbo
pnpm play       # chay playground
pnpm api        # chay AI/API backend
pnpm web        # chay website
pnpm cms        # chay cms
pnpm build      # build all packages/apps
pnpm test       # run tests
pnpm lint       # lint
pnpm typecheck  # typecheck
pnpm format     # prettier
```

Yeu cau engine:

- Node.js `>=20`.
- pnpm `>=9`.

## 4. Cau Truc Thu Muc Cap Cao

```text
apps/
  api/          Express backend: AI, palette, media upload
  playground/   Vite app de test visual editor va runtime renderer
  cms/          Vite CMS/editor app
  website/      Next.js website/runtime demo

packages/
  builder-core/        Framework-agnostic engine
  builder-components/  Built-in ComponentDefinitions
  builder-react/       React adapter hooks/context
  builder-editor/      Visual editor, panels, canvas, AI UI
  builder-renderer/    Production runtime renderer
  builder-presets/     Preset/catalog authoring UI
  ui/                  shadcn/Radix-based editor UI system
  shared/              Shared constants, utils, image filters, gallery types
  config/              Shared TypeScript/build config
```

## 5. Package Boundaries

### 5.1 `packages/builder-core`

Vai tro:

- La engine trung tam.
- Khong phu thuoc React/DOM/browser API.
- Quan ly document model, command system, registry, event bus, validation, migration, history, plugin, preset registry.

Exports chinh:

- `createBuilder`.
- `BuilderAPI`, `BuilderConfig`, `BuilderPermissions`.
- `BuilderDocument`, `BuilderNode`, `StyleConfig`, `CanvasConfig`.
- `ComponentRegistry`, `GroupRegistry`.
- `ComponentDefinition`, `PropSchema`, `ComponentCapabilities`, `ContainerConfig`.
- `CommandEngine`, command constants va payload types.
- `HistoryStack`.
- `PluginEngine`.
- `DocumentValidator`, `validateDocument`, `validatePropSchema`.
- `PresetRegistry`.
- Responsive helpers: `resolveStyle`, `resolveProps`, `resolveVisibility`.

Nguyen tac:

- Moi state change phai di qua command.
- Core khong render DOM.
- Core nen co the unit test nhu pure state machine.
- Interface contracts nen on dinh, thay doi breaking can version bump/migration.

### 5.2 `packages/builder-components`

Vai tro:

- Cung cap component definitions mac dinh cho builder.
- Moi component la `ComponentDefinition` gom `type`, `name`, `category`, `capabilities`, `propSchema`, `defaultProps`, `defaultStyle`, `editorRenderer`, `runtimeRenderer`.
- Export `BASE_COMPONENTS`.
- Export `extendComponent()` de tao bien the component.

Component dang co:

- Layout/container: `Section`, `Container`, `Grid`, `Column`, `Row`, `Repeater`.
- Text/content: `Text`, `CollapsibleText`, `TextMarquee`, `TextMask`.
- Actions: `Button`.
- Media/gallery: `Image`, `GalleryPro`, `GalleryMasonry`, `GalleryCollage`, `GallerySliderPro`, `GallerySlideshow`, `GalleryThumbnails`, `GalleryHoneycomb`, `GalleryHoneycombDiamond`, `GalleryHoneycombTriangle`, `GalleryFreestyle`, `Gallery3DCarousel`, `GalleryStacked`.
- Decorative/navigation: `Divider`, `Shape`, `NavigationMenu`, `Anchor`.
- Legacy gallery components van co file/import nhung khong nam trong palette chinh: `GalleryGrid`, `GallerySlider`.

Ghi chu: README cu co noi "17 built-in components", nhung code hien tai da co nhieu gallery variants duoc extend tu `GalleryPro`. Khi viet AI manifest/validator nen dua theo registry thuc te, khong dua theo con so trong docs cu.

### 5.3 `packages/builder-react`

Vai tro:

- Lop adapter React cho core.
- Cung cap Provider/hooks de editor va renderer subscribe vao `BuilderAPI`.
- La cau noi giua state engine va React render lifecycle.

### 5.4 `packages/builder-editor`

Vai tro:

- Visual editor day du.
- Canvas, overlay, selection, resize, drag/drop, snap, layer tree, property panel.
- AI UI: Chat assistant, Page Generator modal, AI Section popover, AI config panel.
- Rich text editing bang Tiptap.
- Color controls, image filters, gallery settings, responsive controls.
- i18n tieng Anh/Viet va mot so locale khac.

Thu muc quan trong:

```text
packages/builder-editor/src/
  BuilderEditor.tsx
  ai/
  canvas/
  controls/
  dragdrop/
  overlay/
  panels/
  snap/
  toolbar/
  i18n/
```

### 5.5 `packages/builder-renderer`

Vai tro:

- Render production UI tu `BuilderDocument`.
- Khong chua editor UI.
- Resolve component definition, style responsive, props responsive, interactions.
- Duyet tree theo `parentId`, bat dau tu `document.rootNodeId`.

Logic quan trong:

- Children duoc lay bang cach filter node co `parentId === currentNodeId`.
- Neu AI tao node voi `parentId` khong ton tai, node do thanh orphan va khong render.
- Vi vay parent mapping/validation la bat buoc voi AI generation.

### 5.6 `packages/builder-presets`

Vai tro:

- Quan ly preset/catalog UI.
- Preset la mot bien the da co props/style/children san cua component.
- Dung de tao nhanh layout/item co style san.

Preset khac component:

- Component = dinh nghia schema/render/capabilities.
- Preset = instance mau cua component/tree voi props/style cu the.

### 5.7 `packages/ui`

Vai tro:

- Design system noi bo cho editor.
- Dung Radix/shadcn primitives: Button, Input, Select, Dialog, Tabs, Tooltip, Popover, Slider, Switch, Checkbox, Dropdown, ScrollArea...
- Dung `cn`, Tailwind merge, class variance authority.

Style direction:

- shadcn/Radix.
- Tailwind.
- Liquid glass/glassmorphism cho editor surfaces theo docs.

### 5.8 `packages/shared`

Vai tro:

- Shared constants/types/utils.
- Image filters.
- Gallery types/layout helpers.
- Spacing/shadow/frame constants.

## 6. Apps

### 6.1 `apps/api`

Backend Express phuc vu:

- `/api/ai/*`: AI chat va full-page generation.
- `/api/palette/*`: palette catalog.
- `/api/media/*`: upload/list/delete media.
- `/uploads/*`: serve uploaded static files.
- `/health`: health check provider/model/generation mode.

Mac dinh chay port:

```text
3002
```

CORS dev allow:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5173`
- `http://localhost:5174`

Env quan trong:

```bash
PORT=3002
LLM_PROVIDER=openai|gemini|claude
LLM_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...
LLM_MODEL=...
AI_GENERATION_MODE=sequential|parallel
AI_BATCH_SIZE=3
AI_DEBUG=true|false
```

Provider defaults trong code:

- OpenAI: `gpt-4o`.
- Gemini: `gemini-2.0-flash`.
- Claude: `claude-sonnet-4-5`.

Ghi chu: README co noi Claude default `claude-sonnet-4-6`, nhung code hien tai la `claude-sonnet-4-5`. Tai lieu nay uu tien code thuc te.

### 6.2 `apps/playground`

Vite app de phat trien/test:

- Full `BuilderEditor`.
- Preview bang `RuntimeRenderer`.
- JSON inspector.
- Fixture document.
- Custom sample components.
- Remote palette integration.

### 6.3 `apps/cms`

Vite app dung builder/editor trong mot ngu canh CMS.

### 6.4 `apps/website`

Next.js app dung runtime renderer/builder components de phuc vu demo/website.

## 7. Data Model

### 7.1 BuilderDocument

`BuilderDocument` la schema trung tam cua page:

```ts
interface BuilderDocument {
  id: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  nodes: Record<string, BuilderNode>;
  rootNodeId: string;
  breakpoints: BreakpointConfig[];
  variables: Record<string, VariableDefinition>;
  assets?: AssetManifest;
  plugins?: PluginReference[];
  canvasConfig?: CanvasConfig;
  metadata?: DocumentMetadata;
}
```

Tinh chat:

- `nodes` la map phang, khong phai tree nested.
- Quan he tree duoc xac dinh bang `parentId`.
- Root node co `parentId: null`.
- Moi node con co `parentId` tro den id cua parent.
- Thu tu siblings theo `order`.

### 7.2 BuilderNode

```ts
interface BuilderNode {
  id: string;
  type: string;
  parentId: string | null;
  order: number;
  props: Record<string, unknown>;
  style: StyleConfig;
  responsiveStyle: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  responsiveHidden?: Partial<Record<Breakpoint, boolean>>;
  interactions: InteractionConfig[];
  locked?: boolean;
  hidden?: boolean;
  name?: string;
  slot?: string;
  metadata: NodeMetadata;
}
```

AI can biet:

- `type` phai la component type da dang ky.
- `parentId` phai ton tai, tru root.
- `props` phai hop le theo component `propSchema`.
- `style` phai hop le theo `StyleConfig`.
- `responsiveStyle` va `responsiveProps` chi nen dung breakpoint hop le: `desktop`, `tablet`, `mobile`.

### 7.3 StyleConfig

Style object ho tro:

- Box model: margin, padding, width, height, min/max size.
- Typography: fontSize, fontWeight, fontFamily, lineHeight, letterSpacing, color, textAlign...
- Layout: display, flexDirection, alignItems, justifyContent, gap, gridTemplateColumns...
- Visual: backgroundColor, backgroundImage, border, borderRadius, boxShadow, opacity, overflow.
- Filters: filter, backdropFilter, mixBlendMode.
- Position: position, top, left, right, bottom, zIndex.
- Transform: transform, transformOrigin, transition.

AI style generation can duoc gioi han boi design tokens va style rules de tranh output random.

### 7.4 Breakpoints

Breakpoints mac dinh:

- `desktop`: minWidth 1024.
- `tablet`: 768-1023.
- `mobile`: 0-767.

Responsive co the ap dung qua:

- `responsiveStyle`: override style theo breakpoint.
- `responsiveProps`: override props theo breakpoint.
- `responsiveHidden`: hide/show theo breakpoint.

## 8. Component System

### 8.1 ComponentDefinition

Moi component phai co:

```ts
interface ComponentDefinition {
  type: string;
  name: string;
  category: string;
  group?: string;
  subGroup?: string;
  version: string;
  icon?: string;
  description?: string;
  tags?: string[];
  capabilities: ComponentCapabilities;
  propSchema: PropSchema[];
  defaultProps: Record<string, unknown>;
  defaultStyle?: Partial<StyleConfig>;
  containerConfig?: ContainerConfig;
  editorRenderer: ComponentRenderer;
  runtimeRenderer: ComponentRenderer;
  quickActions?: QuickAction[];
  lifecycle?: ComponentLifecycle;
  a11y?: ComponentA11yConfig;
  editorConfig?: ComponentEditorConfig;
  deprecated?: boolean;
  replacedBy?: string;
}
```

### 8.2 Capabilities

Capabilities cho biet component co the lam gi:

- `canContainChildren`: co children hay leaf.
- `acceptedChildTypes`: child types duoc chap nhan.
- `canResize`, `canResizeWidth`, `canResizeHeight`.
- `maintainAspectRatio`.
- `canRotate`.
- `canTriggerEvents`.
- `canBindData`.
- `canBeHidden`.
- `canBeLocked`.
- `isRootEligible`.
- `isDragDisabled`.
- `isDropDisabled`.
- `inlineEditable`.
- `aiTextGeneration`.
- `aiImageGeneration`.

AI can dung capabilities de:

- Biet component nao la container.
- Biet component nao la leaf.
- Biet component nao dung cho text/image AI tools.
- Biet component nao khong nen drop vao root.

### 8.3 PropSchema

Prop types hien co:

- `string`
- `number`
- `boolean`
- `select`
- `color`
- `image`
- `video`
- `richtext`
- `data-binding`
- `json`
- `spacing`
- `border`
- `shadow`
- `icon`
- `font`
- `slider`
- `row`
- `group`

`row` va `group` la structural schema cho property panel, co children.

Van de hien tai:

- Compact manifest hien bo qua nhieu prop type nhu `string`, `json`, `spacing`, `border`, `shadow`, `icon`, `font` de giam token.
- Dieu nay giup tiet kiem context nhung lam AI thieu thong tin khi can dung component phuc tap.
- Nang cap nen co co che "component contract on demand": planner chon component nao thi moi lay schema chi tiet cua component do.

### 8.4 ContainerConfig

Container component co the co:

- `layoutType`: `flow`, `flex`, `grid`, `absolute`, `slot-based`.
- `slots`.
- `maxChildren`, `minChildren`.
- `allowedChildTypes`.
- `disallowedChildTypes`.
- `restrictNesting`.
- `dropZoneConfig`.
- `emptyStateConfig`.

AI phai ton trong nesting rules nay.

## 9. Component Hien Co

Bang tom tat component chinh:

| Component | Vai tro | Container | Ghi chu AI |
| --- | --- | --- | --- |
| `Section` | Section cap cao cua page | Co | Nen la child truc tiep cua root trong full-page mode |
| `Container` | Wrapper layout | Co | Dung de gom content trong section |
| `Grid` | CSS grid layout | Co | Dung cho 2-col, 3-col, feature cards, pricing |
| `Column` | Column/flex vertical | Co | Dung ben trong Grid/Row/Section |
| `Row` | Row/flex horizontal | Co | Dung cho CTA row, nav row, button group |
| `Repeater` | List/repeated content | Co | Dung cho data/list style layouts |
| `Text` | Rich text | Khong | Dung cho headings, paragraph, labels |
| `Button` | CTA/action | Khong | Dung `label`, variant, size, icon, link/interaction neu co |
| `Image` | Image/media | Khong | Can `src`, `alt`, objectFit/focal/filter/frame props |
| `Divider` | Line/separator | Khong | Decorative separation |
| `TextMarquee` | Moving text strip | Khong | Decorative/brand marquee |
| `CollapsibleText` | Read more text | Khong | FAQ/body long text |
| `TextMask` | Text with gradient/image mask | Khong | Hero/decorative heading |
| `GalleryPro` | Unified gallery engine | Khong | Co nhieu layoutMode |
| `GalleryMasonry` | Gallery variant | Khong | extend tu GalleryPro |
| `GalleryCollage` | Gallery variant | Khong | extend tu GalleryPro |
| `GallerySliderPro` | Gallery variant | Khong | slider/carousel |
| `GallerySlideshow` | Gallery variant | Khong | slideshow/autoplay |
| `GalleryThumbnails` | Gallery variant | Khong | main + thumbnails |
| `GalleryHoneycomb` | Gallery variant | Khong | creative geometry |
| `GalleryHoneycombDiamond` | Gallery variant | Khong | diamond |
| `GalleryHoneycombTriangle` | Gallery variant | Khong | triangle |
| `GalleryFreestyle` | Gallery variant | Khong | scattered/freestyle |
| `Gallery3DCarousel` | Gallery variant | Khong | 3D carousel |
| `GalleryStacked` | Gallery variant | Khong | stacked cards |
| `Shape` | Decorative shape | Khong | background/decor |
| `NavigationMenu` | Menu/nav | Khong | header/nav |
| `Anchor` | Anchor target | Khong | scroll/nav anchors |

### 9.1 Text

Dung cho:

- Heading.
- Paragraph.
- Caption.
- Label.
- Quote.

AI nen:

- Dung rich text HTML neu prop la richtext.
- Chon tag/semantic neu component co prop tag.
- Dung typography tu design tokens.
- Khong tao placeholder nhu "Lorem ipsum", "Your headline here".

### 9.2 Button

Dung cho:

- CTA chinh/phu.
- Nav action.
- Form submit.

AI nen:

- Viet label ngan, hanh dong ro.
- Ton trong `variant`, `size`, `icon`, `iconPosition`, `disabled`, `hoverStyle` neu contract cho phep.
- Neu label dai hon 20 ky tu, co the tao `responsiveProps.mobile.label` ngan hon.

### 9.3 Image

Dung cho:

- Hero image.
- Product image.
- Avatar/testimonial.
- Gallery item.

AI nen:

- Luon co `alt`.
- Neu khong co asset thuc, dung placeholder URL co y nghia hoac de trong theo policy du an.
- Ton trong image filter/frame/focal props.
- Mobile responsive: width 100%, height auto hoac object fit hop ly.

### 9.4 Layout Components

AI nen di theo pattern:

```text
root
  Section
    Container/Grid/Row/Column
      Text/Button/Image/Gallery/...
```

Khong nen:

- Dat leaf truc tiep vao root.
- Tao child duoi parentId khong ton tai.
- Tao node container ma khong co temp id khi children can tham chieu.

## 10. Preset Va Palette

Backend co palette data trong:

```text
apps/api/src/data/palette/
  index.json
  text.json
  image.json
  layout.json
  button.json
  menu.json
  card.json
  gallery.json
  decorative.json
  designed_section.json
  palette.combined.json
```

Palette item mo ta:

- `id`
- `componentType`
- `name`
- `description`
- `thumbnail`
- `props`
- `style`
- `tags`

API:

- `GET /api/palette/catalog`
- `GET /api/palette/metadata`
- `GET /api/palette/groups/:id/items`
- `GET /api/palette/items/:id`

AI hien co:

- Co the nhan `availablePresetsCompact`.
- Co the nhan full `availablePresets` cho matching preset.
- Outline generator co the chon `presetId`.

Rui ro:

- Matching preset hien chi tim group chua item id, khong lay dung item cu the de lam contract chi tiet.
- Nen nang cap de planner chon preset item chinh xac, section agent nhan preset item props/style duoc validate.

## 11. Editor UI

Editor gom cac vung:

- Canvas/document layer.
- Overlay layer.
- Left panel: component/preset palette.
- Right panel: property panel.
- Bottom panel: layer tree/inspector.
- Toolbar/contextual toolbar.
- Section toolbar.
- AI config/modal/popover.

### 11.1 Canvas

Canvas la vung authoring:

- Render actual component tree bang editorRenderer.
- Ho tro zoom/pan/scroll.
- Grid overlay.
- Helper lines.
- Snap guides.
- Drop indicators.

### 11.2 Overlay

Overlay ve:

- Selection frame.
- Resize handles.
- Hover frame.
- Spacing overlay.
- Section toolbar.
- Drag target/drop indicator.
- Snap lines.

Overlay khong nam trong runtime.

### 11.3 Property Panel

Right panel sinh controls tu `propSchema`:

- String input/textarea.
- Number input.
- Boolean switch/checkbox.
- Select.
- Color picker.
- Image picker.
- Grid template editor.
- Shadow controls.
- Spacing/border controls.
- Events/interactions.
- Advanced attrs, tooltip.

AI can dung chung prop schema nhu panel de sinh props hop le.

### 11.4 AI UI Trong Editor

Co cac UI:

- `AIAssistant`: chat dialog.
- `PageGeneratorModal`: prompt tao full page.
- `AISectionPopover`: tao/regenerate noi dung section.
- `AIToolsPopover`: text/image tools tren component toolbar.
- `AIConfigPanel`: backend URL va design tokens.

## 12. Runtime Renderer

Runtime renderer nhan document + registry va render production UI:

1. Tim root node bang `rootNodeId`.
2. Resolve component definition theo `node.type`.
3. Resolve style: base style + responsive style theo breakpoint.
4. Resolve props: base props + responsive props theo breakpoint.
5. Bind interactions.
6. Tim children bang `parentId === node.id`, sort theo `order`.
7. Goi `runtimeRenderer`.

Quan trong voi AI:

- Renderer khong tu sua parentId sai.
- Node orphan khong render.
- Unknown component co the render fallback hoac loi tuy implementation.
- AI output phai duoc validate truoc khi dispatch.

## 13. Command System

Moi thay doi state di qua command.

Commands chinh:

- `ADD_NODE`
- `REMOVE_NODE`
- `REMOVE_NODES`
- `MOVE_NODE`
- `REORDER_NODE`
- `DUPLICATE_NODE`
- `DUPLICATE_NODES`
- `UPDATE_PROPS`
- `UPDATE_STYLE`
- `UPDATE_RESPONSIVE_STYLE`
- `UPDATE_RESPONSIVE_PROPS`
- `RESET_RESPONSIVE_STYLE`
- `TOGGLE_RESPONSIVE_HIDDEN`
- `UPDATE_INTERACTIONS`
- `RENAME_NODE`
- `LOCK_NODE`, `UNLOCK_NODE`
- `HIDE_NODE`, `SHOW_NODE`
- `GROUP_NODES`, `UNGROUP_NODES`
- `SET_VARIABLE`
- `UPDATE_CANVAS_CONFIG`
- `SET_CANVAS_MODE`
- `ENTER_TEXT_EDIT`, `EXIT_TEXT_EDIT`
- `SET_THEME_COLORS`

AI output hien la `AICommandSuggestion`:

```ts
interface AICommandSuggestion {
  type: string;
  payload: Record<string, unknown>;
  description: string;
}
```

Sau do client:

1. Parse response.
2. Normalize temp ids.
3. Filter allowlist.
4. Dispatch command.

Rui ro:

- Filter allowlist chi kiem command type, khong kiem payload.
- `ADD_NODE` hien co the tao unknown component neu `registry.getComponent()` tra undefined.
- Prop validation khong du sau.

## 14. Backend API

### 14.1 AI Routes

`POST /api/ai/generate-page`

- Nhan `GeneratePageRequest`.
- Validate prompt non-empty.
- SSE response.
- Step 1: generate outline.
- Step 2: generate tung section commands.
- Event stream:
  - `outline_ready`
  - `section_ready`
  - `section_error`
  - `complete`
  - `error`

`POST /api/ai/chat`

- Nhan `ChatRequest`.
- Build system prompt tu builder context.
- Goi LLM.
- Parse JSON.
- Neu fullPageMode thi prepend `REMOVE_NODE` cho children cua root.
- Tra `{ message, commands }`.

### 14.2 Palette Routes

- Doc palette JSON tu `apps/api/src/data/palette`.
- Tra catalog/group/item.

### 14.3 Media Routes

- Upload file qua multer.
- Luu vao `apps/api/uploads`.
- Metadata trong `metadata.json`.
- File size limit: 50MB.
- Cho phep image/video/font/file theo extension.
- List va delete assets.

## 15. AI Hien Tai - Entry Points

### 15.1 Chat Assistant

Muc dich:

- Sua existing page theo prompt.
- Update selected node.
- Add small elements.
- Full-page mode thong qua chat co the clear children root truoc khi apply AI commands.

Flow:

```text
User chat prompt
  -> buildAIContext()
  -> POST /api/ai/chat
  -> backend buildChatSystemPrompt()
  -> callLLM(jsonMode=true)
  -> parse commands
  -> client normalizeAICommands()
  -> applyAICommandsProgressive()
  -> dispatch CommandEngine
```

Context co the gom:

- Document summary.
- Selected node full props/style.
- Available components.
- Compact component manifest.
- Nesting rules.
- Page nodes summary.
- Presets compact.
- Design tokens.

### 15.2 AI Section Popover

Muc dich:

- Tao/regenerate content trong mot Section da ton tai.
- Thuong duoc kich hoat tu section toolbar.

Flow:

```text
Section node selected
  -> generateSectionContent()
  -> sendAIMessage() to /api/ai/chat
  -> normalizeAICommands(rawCommands, real sectionNodeId)
  -> remove existing direct children
  -> apply generated commands
  -> preview/accept/regenerate/cancel
```

Diem tot:

- Prompt co real section id.
- Normalize map `root`, `section`, `SECTION` sang section id.
- Chi cho ADD_NODE/RENAME_NODE o client.

Han che:

- Van phu thuoc nhieu vao prompt.
- Chua co validator payload theo schema.
- Undo/cancel dua vao command count, can can than voi command fail partial.

### 15.3 Page Generator

Muc dich:

- Tao full page tu prompt.
- Stream section len canvas dan dan.

Backend flow:

```text
User prompt
  -> generatePageOutline()
  -> outline: sections[]
  -> for each section:
       generateSectionCommands(sectionOutline)
  -> SSE section_ready
```

Client flow:

```text
PageGeneratorModal
  -> usePageGenerator.generate()
  -> optional clear existing root children
  -> POST /api/ai/generate-page
  -> receive outline_ready
  -> receive section_ready
  -> normalizeAICommands(commands, document.rootNodeId)
  -> applyAICommandsProgressive()
```

Hien co mode:

- Sequential default.
- Parallel batched neu `AI_GENERATION_MODE=parallel`.
- Batch size qua `AI_BATCH_SIZE`.

## 16. AI Prompt/Context Hien Tai

### 16.1 Outline Generator

Input:

- User prompt.
- Available components: type/category.
- Available presets compact/full.
- Design tokens for context.
- Pattern constraints tu `page-patterns`.

Output:

```json
{
  "sections": [
    {
      "index": 0,
      "sectionId": "section-0",
      "sectionType": "hero",
      "purpose": "...",
      "layoutHint": "centered",
      "presetId": "optional",
      "keyContent": ["headline", "subheadline", "cta-button"],
      "tone": "professional"
    }
  ]
}
```

Zod validation hien co:

- `sections` min 1 max 12.
- `keyContent` min 1 max 8.
- `sectionType`, `layoutHint`, `tone` la string, prompt noi allowed values nhung schema chua enum strict.

### 16.2 Section Generator

Input:

- Section outline.
- Request.
- Design context: design tokens, previous section style summary, original prompt.
- Matched preset group neu co.

Prompt yeu cau:

- Generate ADD_NODE commands.
- Dung content that, khong placeholder.
- Dung components available.
- Dung responsiveStyle.
- Dung design tokens neu co.
- Dung parent Section node id la `section-{index}`.

Output:

```json
{
  "message": "...",
  "commands": [
    {
      "type": "ADD_NODE",
      "payload": {
        "componentType": "Grid",
        "parentId": "section-0",
        "nodeId": "temp-grid",
        "props": {},
        "style": {},
        "responsiveStyle": {}
      }
    }
  ]
}
```

Validation hien co:

- Parse JSON.
- Kiem `commands` la array.
- Filter command co object va `type`.
- Khong validate payload.

### 16.3 Component Manifest Hien Tai

Client co `serializeComponentsCompact()`:

```text
+Section(layout): ...
-Button(interactive): label(rich) variant[primary*|secondary|...] size[...]
```

Ky hieu:

- `+`: component co children.
- `-`: leaf.
- Select options co `*` cho default.
- Number co min/max/unit.
- Richtext/color/image/video co shorthand.

`deriveNestingRules()` sinh:

- Container list.
- Leaf list.
- Container-specific allowed child types.
- Rule Section -> Container/Grid/Column -> leaf.

Van de:

- Full-page section generator hien khong dung `componentsManifest`, chi dung type/category.
- Nhieu prop phuc tap bi bo qua de giam token.

## 17. Diem Manh Hien Tai

1. **Dung kien truc command-driven**: AI khong mutate state truc tiep.
2. **Backend-owned provider logic**: API key khong can nam trong client cho backend flow.
3. **Co separation planner/executor ban dau**: outline generator va section generator.
4. **SSE full-page UX tot**: user thay section ve dan dan.
5. **Co design tokens**: AI co input de giu brand consistency.
6. **Co compact manifest/nesting rules**: nen tang tot de mo rong.
7. **Co page pattern engine**: giup section order hop ly hon.
8. **Co previous section style summary**: sequential generation co the giu style consistency.
9. **Co progressive apply**: containers truoc, leaves sau.
10. **Co preset/palette data**: co the dung lam source of truth cho design variants.
11. **Co registry/capabilities/propSchema**: day la nen tang quan trong nhat de quan ly component phuc tap.

## 18. Diem Yeu Va Rui Ro Hien Tai

### 18.1 Parent ID Bug/Rui Ro Trong Full-Page Generation

Section generator duoc prompt rang Section da ton tai voi parentId `section-0`, `section-1`... nhung client khi apply lai normalize voi `document.rootNodeId`, khong map `section-0` sang node that. Neu AI tra child co `parentId: "section-0"`, node do co nguy co thanh orphan va khong render.

Can sua bang mot trong hai cach:

- Backend/client tao Section nodes that truoc, map `section-0 -> real UUID`, roi section commands dung real parent id.
- Hoac section generator khong gia dinh Section da ton tai, ma moi section tu generate `ADD_NODE Section` duoi root.

Khuyen nghi: dung cach pre-create Section node/section shell de giu planner va section generator tach bach.

### 18.2 Output Validation Qua Nong

Hien moi validate:

- JSON parse duoc.
- Co commands array.
- Command co type string.

Chua validate:

- Command type co nam trong allowlist.
- Payload co dung shape.
- `componentType` co ton tai.
- `parentId` co ton tai.
- Parent co chap nhan child khong.
- Props dung schema khong.
- Style dung design token/policy khong.
- Responsive breakpoint dung khong.
- Node id temp co duplicate khong.
- Tree co cycle/orphan khong.

### 18.3 Core Cho Phep Unknown Component Trong ADD_NODE

`ADD_NODE` lay `def = registry.getComponent(payload.componentType)`, neu khong co def van tao node voi defaultProps/defaultStyle rong. Dieu nay co the lam document co node type khong render duoc.

Nen sua core hoac AI dispatcher:

- Strict mode: reject unknown component.
- Lenient mode: convert sang fallback component/preset an toan.

### 18.4 Full-Page Section Agent Thieu Component Contract

Backend section generator chi nhan `type/category`, khong nhan prop schema chi tiet. Vi vay AI co the:

- Dung sai prop key.
- Dung sai select option.
- Tao JSON prop sai shape.
- Dung style/props cua component khac.

### 18.5 Design Consistency Chua Du Manh

Previous section style summary co ich, nhung:

- Parallel batch khong thay style cua nhau.
- Summary trich tu commands AI, khong phai design spec formal.
- Neu section 1 style sai, section sau se copy sai.

Can co `DesignSystemPlan` khoa truoc:

- Palette.
- Typography scale.
- Spacing scale.
- Radius scale.
- Button styles.
- Section rhythm.
- Image style.
- Allowed colors.

### 18.6 Content Quality Chua Co Content Model

Prompt yeu cau content that/khong placeholder, nhung chua co:

- Brand facts.
- Product facts.
- Claim policy.
- Content slots.
- Tone guide formal.
- Anti-hallucination rules.

AI de tao stats fake. Nen phan biet:

- Demo/filler content duoc phep fictional.
- Production/business content phai dung facts user cung cap hoac dung neutral copy.

### 18.7 Khong Co Dry Run/Transaction Theo Section

`applyAICommandsProgressive` dispatch tung command va catch loi tung cai. Neu mot command fail giua chung:

- Section co the bi partial.
- Undo count co the khong khop.
- UI state co the tuong da apply xong.

Nen co dry-run validation va transaction apply:

- Validate all commands first.
- Apply section atomic.
- Neu fail, rollback section hoac skip section voi error.

## 19. Van De Quan Ly Input Khi Co Nhieu Component

Khi he thong co rat nhieu component, nhieu loai prop, nhieu layout rule rieng, khong nen dua toan bo context vao mot prompt. Can chia input thanh cac lop:

### 19.1 UserBrief

Tom tat yeu cau nguoi dung:

```ts
interface UserBrief {
  rawPrompt: string;
  language: "vi" | "en" | string;
  pageGoal: string;
  businessType?: string;
  audience?: string;
  desiredTone?: string;
  requiredSections?: string[];
  forbiddenSections?: string[];
  assetsAvailable?: string[];
  facts?: Record<string, unknown>;
  constraints?: string[];
}
```

### 19.2 Project/Canvas Context

```ts
interface CanvasContext {
  documentName: string;
  rootNodeId: string;
  activeBreakpoint: "desktop" | "tablet" | "mobile";
  nodeCount: number;
  currentTreeSummary?: unknown;
  selectedNode?: unknown;
  designTokens?: DesignTokens;
}
```

### 19.3 ComponentCatalogSummary

Chi de planner chon component/preset:

```ts
interface ComponentCatalogSummary {
  components: Array<{
    type: string;
    category: string;
    group?: string;
    subGroup?: string;
    capabilities: string[];
    tags?: string[];
    shortUseCases?: string[];
  }>;
}
```

### 19.4 ComponentContract

Chi lay chi tiet cho component da duoc planner chon:

```ts
interface ComponentContract {
  type: string;
  category: string;
  canContainChildren: boolean;
  acceptedChildTypes?: string[];
  propSchema: PropSchema[];
  defaultProps: Record<string, unknown>;
  defaultStyle?: Record<string, unknown>;
  examples: Array<{
    useCase: string;
    props: Record<string, unknown>;
    style?: Record<string, unknown>;
  }>;
  forbidden?: string[];
}
```

### 19.5 DesignSystemPlan

```ts
interface DesignSystemPlan {
  colors: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    primary: string;
    secondary?: string;
    accent?: string;
    border?: string;
  };
  typography: {
    headingFontFamily: string;
    bodyFontFamily: string;
    h1: TypographyToken;
    h2: TypographyToken;
    h3: TypographyToken;
    body: TypographyToken;
    caption: TypographyToken;
  };
  spacing: {
    sectionPaddingY: string;
    sectionPaddingX: string;
    gridGap: string;
    cardPadding: string;
  };
  radius: {
    button: string;
    card: string;
    image: string;
  };
  buttons: {
    primary: Record<string, unknown>;
    secondary: Record<string, unknown>;
  };
  imagery: {
    aspectRatios: string[];
    objectFit: string;
    treatment: string;
  };
}
```

### 19.6 PagePlan

```ts
interface PagePlan {
  pageType: "landing" | "portfolio" | "ecommerce" | "content" | "custom";
  sections: SectionPlan[];
  globalDesign: DesignSystemPlan;
  contentStrategy: ContentStrategy;
}
```

### 19.7 SectionPlan

```ts
interface SectionPlan {
  sectionId: string;
  type: string;
  purpose: string;
  order: number;
  layout: "centered" | "split" | "grid" | "stack" | "custom";
  requiredComponents: string[];
  candidatePresets?: string[];
  contentSlots: ContentSlot[];
  responsiveStrategy: string;
  styleRole: "hero" | "surface" | "alternate" | "dense" | "footer";
}
```

### 19.8 SectionTreeDraft

Day la output AI trung gian, khong phai builder command:

```ts
interface SectionTreeDraft {
  sectionId: string;
  root: DraftNode;
}

interface DraftNode {
  tempId: string;
  componentType: string;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  responsiveStyle?: Record<string, Record<string, unknown>>;
  responsiveProps?: Record<string, Record<string, unknown>>;
  children?: DraftNode[];
}
```

Sau do deterministic compiler moi bien `SectionTreeDraft` thanh `ADD_NODE` commands.

## 20. Chien Luoc AI 2 Lop De Xuat

Chien luoc nguoi dung de xuat la dung:

1. Mot AI agent quan ly/planner tao layout page truoc.
2. Sau do tao sub-agent xu ly tung section/component.
3. Orchestrator kiem soat song song/noi tiep.

Tuy nhien, can bo sung cac lop deterministic:

```text
User prompt
  -> Brief Extractor
  -> Planner/Orchestrator Agent
  -> Design System Planner
  -> Section Agents (parallel possible)
  -> Validator
  -> Repair Agent (optional, bounded)
  -> Compiler
  -> Dry Run
  -> Transaction Apply
```

### 20.1 Lop 1 - Planner/Orchestrator Agent

Nhiem vu:

- Hieu user prompt.
- Xac dinh page type.
- Chon page pattern.
- Tao section order.
- Tao design system plan.
- Chon component/preset candidate cho tung section.
- Xac dinh content slots va facts can dung.
- Quyet dinh section nao co the generate song song, section nao phai doi.

Output:

- `UserBrief`.
- `PagePlan`.
- `DesignSystemPlan`.
- `SectionPlan[]`.
- `ExecutionPlan`.

Planner khong nen generate raw builder commands.

### 20.2 Lop 2 - Section Agents

Moi section agent nhan:

- `UserBrief`.
- `DesignSystemPlan`.
- `SectionPlan` cua no.
- Contract chi tiet cua component duoc phep dung.
- Preset contract neu co.
- Neighbor context ngan gon: previous/next section purpose.

Output:

- `SectionTreeDraft`.
- Content slots da dien.
- Metadata: confidence, warnings, used components.

Section agent khong nen biet toan bo page tree neu khong can.

### 20.3 Component Specialist Agents

Khong phai luc nao cung can, nhung nen co cho component phuc tap:

- Gallery agent.
- Navigation agent.
- Pricing/table/card agent.
- Form agent neu sau nay co form components.
- Image/media agent.

Component specialist nhan component contract chi tiet va tra ve subtree/props hop le.

### 20.4 Validator Deterministic

Validator khong dung AI. Nhiem vu:

- Kiem all component types exist.
- Kiem tree parent-child rules.
- Kiem max/min children.
- Kiem slot rules.
- Kiem props theo `propSchema`.
- Kiem responsive breakpoints.
- Kiem style policy.
- Kiem design token usage.
- Kiem content placeholder/fake claim policy.
- Kiem temp id uniqueness.
- Kiem section co minimum viable content.

Output:

```ts
interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  normalizedDraft?: SectionTreeDraft;
}
```

### 20.5 Repair Agent

Chi goi khi validator fail va loi co the sua:

- Sai prop key.
- Sai select option.
- Thieu alt text.
- Thieu responsive style.
- Parent-child invalid.
- Content placeholder.

Repair agent nhan:

- Draft cu.
- Validation errors.
- Component contracts.

Gioi han:

- Max 1-2 repair attempts.
- Neu van fail thi fallback preset hoac skip section co error.

### 20.6 Compiler

Compiler deterministic bien `SectionTreeDraft` thanh builder commands:

- Gan UUID that.
- Map temp ids.
- Tao parent ids dung.
- Them `order`.
- Tach ADD_NODE/RENAME_NODE/UPDATE_* neu can.
- Co the wrap leaf vao Container neu policy yeu cau.

Compiler la noi quyet dinh command payload cuoi, khong phai AI.

### 20.7 Dry Run Va Transaction Apply

Truoc khi apply:

- Chay dry-run tren clone cua state.
- Neu command nao fail, khong mutate real state.
- Neu section pass, apply theo transaction.

Transaction:

- Apply section atomic.
- Undo/redo theo groupId.
- Neu fail giua chung, rollback.

## 21. Kien Truc AI Nang Cap De Xuat

### 21.1 Tong The

```text
Frontend
  PageGeneratorModal
  AISectionPopover
  AIAssistant
      |
      v
Backend AI API
  /api/ai/generate-page-v2
      |
      v
Brief Extractor
      |
      v
Planner Agent
  -> PagePlan
  -> DesignSystemPlan
  -> SectionPlan[]
      |
      v
Contract Resolver
  -> component contracts
  -> preset contracts
      |
      v
Section Agents
  -> SectionTreeDraft[]
      |
      v
Validator + Repair Loop
      |
      v
Compiler
  -> CommandPatch[]
      |
      v
SSE to client
      |
      v
Client Dry Run + Transaction Apply
```

### 21.2 API V2

Endpoint de xuat:

```http
POST /api/ai/generate-page-v2
Content-Type: application/json
Accept: text/event-stream
```

Request:

```ts
interface GeneratePageV2Request {
  prompt: string;
  mode: "append" | "replace" | "selected-section";
  documentContext: {
    rootNodeId: string;
    nodeCount: number;
    treeSummary?: unknown;
    selectedNodeId?: string;
  };
  designTokens?: DesignTokens;
  componentCatalog: ComponentCatalogSummary;
  presetCatalog?: PresetCatalogSummary;
  constraints?: {
    language?: string;
    maxSections?: number;
    allowedComponents?: string[];
    forbiddenComponents?: string[];
    requireResponsive?: boolean;
    contentTruthMode?: "demo" | "strict";
  };
}
```

SSE events:

```text
brief_ready
plan_ready
section_started
section_draft_ready
section_validation_error
section_repair_started
section_ready
section_skipped
complete
error
```

`section_ready` nen tra:

```ts
interface SectionReadyEvent {
  sectionId: string;
  realSectionNodeId?: string;
  commands: AICommandSuggestion[];
  validation: {
    warnings: ValidationIssue[];
  };
  summary: {
    usedComponents: string[];
    contentSlots: string[];
  };
}
```

### 21.3 Section Shell Strategy

De tranh parentId bug, full-page generation v2 nen tao section shell truoc:

1. Planner tao `sectionId`: `section-0`, `section-1`.
2. Client/backend tao real Section node cho moi section:
   - `componentType: "Section"`
   - `parentId: rootNodeId`
   - style section-level tu `DesignSystemPlan`.
3. Tao map:
   - `section-0 -> uuid-a`
   - `section-1 -> uuid-b`
4. Section agents chi generate children trong real section id hoac logical section id duoc compiler map.

Len client co the stream:

```text
plan_ready -> client tao section shells
section_ready -> apply children vao shell tuong ung
```

Hoac backend compile commands gom ca Section + children:

```text
section_ready -> commands first ADD_NODE Section, then children reference temp section id
```

Khuyen nghi: backend compile ca Section + children de client don gian hon, nhung phai dam bao transaction.

## 22. Contract Resolver

Contract resolver lay data tu `ComponentRegistry`, `PropSchema`, `ContainerConfig`, `PresetCatalog`.

Nen tao module:

```text
packages/builder-core/src/ai-contracts/
  componentContract.ts
  schemaFromPropSchema.ts
  validateDraftNode.ts
  validateCommandPatch.ts
```

Hoac neu backend khong import builder packages, tao package shared:

```text
packages/builder-ai-contracts/
```

Contract resolver output:

```ts
interface AIComponentContract {
  type: string;
  summary: string;
  category: string;
  isContainer: boolean;
  allowedChildren: string[] | "any";
  propJsonSchema: JsonSchema;
  defaultProps: Record<string, unknown>;
  stylePolicy: StylePolicy;
  examples: Example[];
}
```

Luu y:

- Khong can gui tat ca contract vao planner.
- Planner dung summary.
- Section agent chi nhan contracts cua components no duoc phep dung.

## 23. Validation Rules Can Co

### 23.1 Command Validation

Voi moi command:

- `type` phai nam trong allowlist theo mode.
- Payload phai dung interface.
- Node id target phai ton tai voi update/remove/move.
- `ADD_NODE.componentType` phai ton tai.
- `ADD_NODE.parentId` phai ton tai hoac la temp id se duoc resolve.
- `ADD_NODE.insertIndex` hop le.
- `REMOVE_NODE` khong xoa root.
- `UPDATE_STYLE` style keys hop le.
- `UPDATE_PROPS` props hop le theo component.

### 23.2 Tree Validation

- Khong orphan.
- Khong cycle.
- Root chi chua root-eligible/top-level component.
- Leaf khong co children.
- Container ton trong `allowedChildTypes`.
- Slot-based component dung slotName hop le.
- Max/min children ton trong.

### 23.3 Props Validation

Theo `PropSchema`:

- `string`: string.
- `richtext`: string HTML da sanitize/allowed tags.
- `number`: number va min/max.
- `slider`: number va min/max/step.
- `boolean`: boolean.
- `select`: value nam trong options.
- `color`: CSS color hop le va nam trong token neu strict.
- `image`: URL/media ref hop le.
- `json`: JSON shape theo component-specific schema neu co.
- `spacing`, `border`, `shadow`: shape hop le.
- `icon`: icon nam trong icon registry neu co.
- `font`: font trong token/allowed list.

### 23.4 Style Validation

- Style key nam trong `StyleConfig` allowlist.
- Khong dung CSS nguy hiem.
- `position: absolute` chi khi layout cho phep.
- Color phai trong token/palette neu strict.
- Font phai trong token.
- Font size phai theo typography scale hoac allowed range.
- Spacing phai theo spacing scale.
- zIndex trong range.
- Mobile responsive bat buoc voi grid nhieu cot.

### 23.5 Content Validation

- Khong placeholder.
- Khong lorem ipsum.
- Khong "click here" chung chung.
- CTA label co action.
- H1 ton tai cho page/hero.
- Alt text co nghia cho image.
- Neu content truth mode strict:
  - Khong tao fake stats.
  - Khong tao customer quote gia.
  - Dung phrase trung tinh neu user khong cung cap facts.
- Neu demo mode:
  - Co the tao content realistic nhung nen danh dau la sample/demo neu can.

### 23.6 Responsive Validation

- Section padding mobile.
- Grid 2+ columns stack mobile.
- Images fluid mobile.
- Text sizes mobile hop ly.
- Button labels mobile ngan neu can.
- Khong overflow horizontally.

## 24. Style System Cho AI

AI can mot style contract ro thay vi chi prompt "dep" hoac "professional".

### 24.1 Design Tokens

Hien co:

```ts
interface DesignTokens {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  borderRadius?: string;
  backgroundColor?: string;
  textColor?: string;
}
```

Nen mo rong:

```ts
interface DesignTokensV2 {
  colors: {
    background: string;
    foreground: string;
    surface: string;
    surfaceAlt: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
  };
  typography: {
    headingFontFamily: string;
    bodyFontFamily: string;
    scale: Record<"h1" | "h2" | "h3" | "body" | "caption", TypographyToken>;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    sectionY: string;
    sectionX: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    card: string;
    floating: string;
  };
}
```

### 24.2 Section Rhythm

Planner nen quyet dinh:

- Hero: cao, padding lon, H1 noi bat.
- Feature: grid 3 cot desktop, 1 cot mobile.
- Stats: compact row/grid.
- Testimonials: cards.
- Pricing: 2-3 cards.
- FAQ: stacked accordion/collapsible.
- CTA: high contrast, short.
- Footer: dense, muted.

### 24.3 Style Governance

Validator nen enforce:

- Khong qua nhieu mau random.
- Khong doi font tung section neu khong co y do.
- Button style dong nhat.
- Radius dong nhat.
- Card padding/gap dong nhat.
- Section background alternating co chu dich.

## 25. Content System Cho AI

Nen co `ContentStrategy`:

```ts
interface ContentStrategy {
  language: string;
  tone: "professional" | "playful" | "minimal" | "bold" | string;
  audience?: string;
  facts: Array<{ key: string; value: string; source: "user" | "inferred" }>;
  claimPolicy: "strict" | "demo";
  ctaPolicy: {
    primaryAction: string;
    secondaryAction?: string;
  };
}
```

Content slots:

```ts
interface ContentSlot {
  id: string;
  role: "headline" | "subheadline" | "paragraph" | "cta" | "feature" | "stat" | "quote" | "nav" | "footer";
  constraints: {
    minWords?: number;
    maxWords?: number;
    mustUseFacts?: string[];
    forbid?: string[];
  };
}
```

Voi strict mode:

- Neu user khong cung cap so lieu, dung "Reduce manual work" thay vi "Save 40%".
- Neu user khong cung cap testimonial, dung "Customer stories" section khong quote gia, hoac bo testimonial.

Voi demo mode:

- Co the tao sample stats/testimonials nhung nen co warning metadata.

## 26. Parallel Vs Sequential

### 26.1 Khi Nen Sequential

- Style cua section sau phu thuoc section truoc.
- Content narrative can chay lien mach.
- Page ngan, khong can performance toi da.

### 26.2 Khi Nen Parallel

- Planner da khoa global design spec.
- Section independent.
- Co validator/compiler deterministic.
- Co merge/apply order ro.

### 26.3 De Xuat Hybrid

1. Planner sequential.
2. Design system sequential.
3. Generate section drafts parallel.
4. Validate/repair parallel.
5. Compile/apply theo order section.

Nhu vay nhanh nhung van giu page coherent.

## 27. Trang Thai Can Dat Sau Nang Cap

Full-page generate thanh cong khi:

- Co plan ro rang.
- Section order hop ly.
- Moi section co purpose rieng, khong trung lap.
- Tree khong orphan/cycle.
- Tat ca component ton tai.
- Parent-child hop le.
- Props hop le.
- Style dung tokens.
- Responsive dung toi thieu.
- Content khong placeholder.
- H1/CTA/nav/footer hop ly theo page type.
- Section apply atomic.
- User co the undo full page hoac tung section.
- Neu section fail, UI biet section nao fail va vi sao.

## 28. Roadmap De Xuat

### Phase 0 - Fix Loi Nghiem Trong

- Sua parentId bug trong full-page generator.
- Khong de `section-0` thanh parentId ao.
- Them command validation toi thieu truoc khi dispatch.
- Reject unknown component type.
- Log validation errors ro rang.

### Phase 1 - AI Contracts

- Sinh `ComponentCatalogSummary` tu registry.
- Sinh `ComponentContract` chi tiet tu `ComponentDefinition`.
- Sinh JSON Schema/Zod tu `PropSchema`.
- Them `validateAICommand()` va `validateSectionDraft()`.
- Dung contracts trong full-page section generator.

### Phase 2 - Planner V2

- Tao `BriefExtractor`.
- Tao `PagePlan` schema strict.
- Tao `DesignSystemPlan`.
- Tao `SectionPlan`.
- Outline schema dung enum strict.
- Planner khong generate command.

### Phase 3 - SectionTreeDraft + Compiler

- Yeu cau section agents output `SectionTreeDraft`.
- Validator chay tren draft.
- Compiler bien draft thanh commands.
- Temp id mapping deterministic.
- Section apply atomic.

### Phase 4 - Repair Loop

- Them bounded repair loop.
- Ghi validation issues cho repair.
- Fallback to preset neu repair fail.

### Phase 5 - Quality Gates

- Content quality checker.
- Responsive checker.
- Design consistency checker.
- Visual smoke test voi renderer/playwright neu co.
- Snapshot regression cho generated documents.

### Phase 6 - Advanced Orchestration

- Parallel section agents.
- Component specialist agents.
- Page-level critic agent.
- Cost/token budgeting.
- Cache component contracts/preset contracts.

## 29. De Xuat Module/File Moi

Backend:

```text
apps/api/src/services/ai-v2/
  brief-extractor.ts
  planner.ts
  design-system-planner.ts
  contract-resolver.ts
  section-agent.ts
  repair-agent.ts
  validator.ts
  compiler.ts
  orchestrator.ts
  schemas.ts
```

Shared/core:

```text
packages/builder-core/src/ai/
  component-contract.ts
  prop-schema-to-zod.ts
  validate-component-props.ts
  validate-node-tree.ts
  validate-command.ts
```

Editor:

```text
packages/builder-editor/src/ai/page-generator-v2/
  usePageGeneratorV2.ts
  PageGeneratorV2Modal.tsx
  generation-events.ts
```

Tests:

```text
apps/api/src/services/ai-v2/__tests__/
packages/builder-core/src/ai/__tests__/
packages/builder-editor/src/ai/__tests__/
```

## 30. Test Strategy

### 30.1 Unit Tests

- `propSchemaToZod`.
- `validateProps`.
- `validateTree`.
- `validateCommand`.
- `compileSectionDraft`.
- `mapTempIds`.
- `deriveNestingRules`.
- `serializeComponentsCompact`.

### 30.2 Integration Tests

- Generate simple SaaS landing page.
- Generate portfolio.
- Generate ecommerce page.
- Generate page with gallery.
- Generate section only.
- Chat update selected node.
- Full-page replace mode removes old root children.

### 30.3 Negative Tests

- Unknown component rejected.
- Invalid select option repaired/rejected.
- ParentId missing rejected.
- Leaf with children rejected.
- Grid without mobile responsive warning/error.
- Placeholder content rejected.
- Fake stats rejected in strict mode.

### 30.4 Visual/Runtime Tests

- Render generated document with `RuntimeRenderer`.
- No orphan nodes.
- No console render errors.
- Mobile viewport no obvious horizontal overflow.
- Section order matches plan.

## 31. Logging Va Observability

Hien co `AI_DEBUG=true` in ra:

- Request body.
- System prompt.
- User prompt.
- Design tokens.
- Section decisions.
- AI response preview.
- Errors.

Nen mo rong:

- `generationId`.
- `sectionId`.
- `agentName`.
- Token usage.
- Latency per stage.
- Validation issues.
- Repair attempts.
- Applied command count.
- Skipped section count.
- Final status.

Structured logs nen co:

```ts
interface AIGenerationLog {
  generationId: string;
  stage: string;
  sectionId?: string;
  provider: string;
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  status: "ok" | "error" | "repaired" | "skipped";
  issues?: ValidationIssue[];
}
```

## 32. Security Va Safety

Can quan tam:

- Prompt injection tu user prompt.
- JSON/HTML richtext sanitization.
- Remote image URLs.
- Uploaded files.
- CSS unsafe values.
- Link URLs.
- API keys backend env only.
- Do not log secrets.
- Limit request body.
- Rate limit AI endpoints.
- Timeout LLM calls.

AI output khong nen duoc tin tuong truc tiep.

## 33. Quyet Dinh Kien Truc De Xuat

1. **Registry la source of truth** cho component, prop, capability, nesting.
2. **AI output la draft**, khong phai final command.
3. **Compiler deterministic** tao commands cuoi.
4. **Validator deterministic** chan output sai.
5. **Repair loop co gioi han**, khong vo han.
6. **Planner tao design spec truoc**, section agents khong tu y style.
7. **Parallel chi sau khi design spec da khoa**.
8. **Apply atomic theo section**.
9. **Content policy ro rang**: demo vs strict.
10. **SSE phai stream ca plan, progress, validation warnings**, khong chi commands.

## 34. Ket Luan

Du an hien tai co nen tang tot: monorepo ro, core framework-agnostic, registry/capabilities/propSchema, command-driven state, editor/runtime tach lop, AI da di qua command pipeline, va full-page generation da co buoc outline truoc section. Day la cac dieu kien can de xay dung AI builder nghiem tuc.

Nhung de AI hoat dong on dinh khi component ngay cang nhieu, khong the tiep tuc chi dua vao prompt. Can chuyen tu "LLM sinh command truc tiep" sang "LLM sinh plan/draft theo contract, he thong validate/compile/apply". Khi co `Planner + Section Agents + Validator + Compiler + Transaction Apply`, full-page generate moi co the dam bao:

- Dung cau truc.
- Dung component.
- Dung props.
- Dung parent-child.
- Dung responsive.
- Dung style tokens.
- Content hop ly.
- Output nhat quan giua cac section.
- Co kha nang debug/sua loi khi AI sai.

Uu tien cao nhat la sua parentId full-page bug va them validation layer truoc khi apply. Sau do moi nen mo rong sang multi-agent/parallel orchestration.

## 35. Cap Nhat 2026-06-17 - AI Page Generation v2

Luồng `POST /api/ai/generate-page` đã được thay bằng pipeline provider-neutral:

```text
User prompt + palette/tone
  -> CreativeBrief + PagePlan
  -> plan_ready skeleton Section commands
  -> SectionPlan từng section
  -> deterministic compiler
  -> section_ready / section_failed fallback
  -> complete success|partial|failed
```

Các điểm đã chuyển từ kế hoạch sang triển khai:

- `PagePlan` là source of truth cho số section, thứ tự, loại section và stable `ai-*` section IDs.
- Prompt ngắn của user phổ thông mặc định được mở rộng thành page `standard`, không phải output tối giản.
- Client nhận `plan_ready` và render skeleton trước khi content từng section hoàn tất.
- AI không còn là nguồn chính sinh raw builder commands cho full-page generation; backend compiler tạo commands từ `SectionPlan`.
- Lỗi từng section không abort toàn bộ page. Sau retry, backend emit `section_failed` với fallback commands và kết thúc `complete.status = "partial"` nếu cần.
- Palette/tone từ UI được gửi như generation options riêng, không chỉ nối vào prompt text.
- `.claude/ARCHITECTURE.md` chưa được sửa trực tiếp. Proposal nằm ở `docs/AI_GENERATION_V2_ARCHITECTURE_PROPOSAL.md`.

## 36. Cap Nhat 2026-06-17 - Rich Component Awareness

AI Page Generation v2 da duoc mo rong de biet component nang cao theo cach an toan:

- Backend tao `ComponentCapability` manifest rut gon tu `availableComponents`, chi gom `type`,
  `purpose`, `bestFor`, `requiredProps`, `keyProps`, `variants`, va `fallbackTo`.
- `SectionPlan` co them intent fields: `layoutVariant`, `preferredComponents`,
  `interactionIntent`, `mediaItems`, `navItems`, va `visualEmphasis`.
- LLM chi duoc chon intent/preferred component co trong manifest; invalid preferred component bi
  drop truoc compiler.
- Compiler co strategy rieng cho `NavigationMenu`, `GalleryPro`, `GalleryGrid`, `GallerySlider`,
  `CollapsibleText`, `TextMarquee`, `TextMask`, `Shape`, `Row`, `Column`, `Grid`, `Image`,
  `Button`, `Text`, va `Divider`.
- Prompt ngan ve nganh co tinh visual nhu dich vu thu cung co the sinh them `gallery` section,
  nhung normalizer van giu cac section bat buoc nhu `hero`, `services`, `trust`, `cta`, `footer`.
- Media fallback deterministic thay the `src` thieu/khong hop le bang anh phu hop nganh/section.
- Validator compiler da chan duplicate node ID, parent khong ton tai, leaf component lam parent,
  leaf node nam truc tiep duoi root, missing required props, va enum values khong hop le.
- Logging `AI_DEBUG` co them metadata ve manifest, section type, preferred/selected/fallback
  component, fallback reason, rich component usage, media item count, va validation error code.

Ket qua mong doi: output landing page sinh dong hon, co navigation/galleries/marquee/FAQ expandable
khi registry co component, nhung van provider-neutral va khong cho AI sinh raw HTML/CSS hay raw
builder command cho full-page generation.

## 37. Cap Nhat 2026-06-17 - AI Component Contract Layer 0.1.0

Da them tang hybrid component contract de tien gan kien truc registry-driven:

- Editor gui them `propSchema`, `capabilities`, va `defaultProps` trong AI context.
- Backend tao catalog summary cho tat ca component available, khong chi nhom hardcoded.
- Component phuc tap van co curated metadata/adapters de tranh AI cau hinh sai.
- `ComponentContractResolver` resolve contract chi tiet on-demand cho candidate components cua tung
  section.
- `SectionPlan` co them `componentIntents` de AI noi ro vai tro component, vi du
  `gallery_carousel -> GallerySlider`, thay vi bắn props/commands.
- Compiler merge `componentIntents` vao preference va validate props theo contract/schema truoc khi
  stream command.
- Version phase nay la `0.1.0` vi them contract layer va AI API/types moi, nhung document schema va
  command contract khong doi.
