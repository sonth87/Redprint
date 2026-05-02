# Builder Presets Refactor Proposal

## 1. Mục tiêu

Refactor `builder-presets` từ một preset editor dạng "JSON snapshot editor" thành một hệ authoring preset đủ mạnh để:

- chỉnh sửa component có sẵn một cách trực quan và an toàn
- thêm component mới vào preset dễ dàng
- hỗ trợ tốt 3 nhóm preset:
  - base component variants: `Text`, `Button`, `Image`, `Divider`, ...
  - composite/custom components: `Gallery`, `Slider`, `Navigation`, ...
  - group/section presets: `Section`, `Hero`, `Feature Grid`, `CTA`, ...
- cho phép editor tiêu thụ preset ổn định, nhất quán, không mất dữ liệu
- mở rộng được cho custom component và hệ design system trong tương lai

## 2. Vấn đề hiện tại

### 2.1 Preset hiện tại mới là snapshot, chưa phải component config

`builder-presets` hiện mô tả preset chủ yếu bằng:

- `componentType`
- `props`
- `style`
- `children`

Mô hình này phù hợp cho preset đơn giản, nhưng không đủ cho nhu cầu authoring component/group preset vì thiếu:

- `responsiveProps`
- `responsiveStyle` cho child nodes
- `interactions`
- `slots/regions`
- structural constraints
- node metadata phục vụ editor
- inheritance / base variant
- lock state
- semantic roles

Kết quả là preset chỉ là một cây node tĩnh, không diễn tả được ý nghĩa cấu trúc của `hero`, `gallery`, `section`, `actions`, `media`, ...

### 2.2 Type model bị phân mảnh

Hiện có hai mô hình preset:

- `packages/builder-core/src/presets/palette-types.ts`
- `packages/builder-presets/src/types/palette.types.ts`

`builder-core` đã có schema phong phú hơn, nhưng `builder-presets` vẫn dùng local type rút gọn. Điều này tạo ra:

- mismatch giữa runtime editor và preset editor
- mất dữ liệu khi round-trip
- khó mở rộng vì cùng một khái niệm có hai source of truth

### 2.3 Round-trip dữ liệu không đầy đủ

`buildPreviewDocument()` và `documentToItem()` hiện không preserve đầy đủ dữ liệu preset:

- child chỉ giữ `props/style/children`
- `responsiveProps` gần như không được serialize đầy đủ cho child
- `interactions` không đi qua preset editor
- metadata của node không được lưu lại
- các cấu hình editor-specific không có nơi tồn tại ổn định

Điều này khiến preset editor có thể "chỉnh được" nhưng lưu lại xong thì mất thông tin.

### 2.4 UX authoring cho section/group preset còn yếu

Các thao tác hiện tại còn thô:

- thêm child phải đi qua dialog 2 bước, không theo ngữ cảnh
- reorder mới tốt ở mức sibling đơn giản
- không có khái niệm insert before / after / inside rõ ràng
- không có duplicate / wrap / unwrap / replace subtree
- không có slot-aware editing
- không có structural guidance cho section phức tạp như hero

Kết quả là sửa một preset `Section Hero` khó, dễ vỡ cấu trúc, thao tác chậm.

### 2.5 Chưa phân biệt rõ 3 loại preset

Hiện `variant preset`, `composite preset`, `section preset` gần như dùng chung một trải nghiệm. Trong thực tế:

- base variant cần chỉnh props/style nhanh
- composite preset cần chỉnh cấu trúc nội bộ và prop contract
- section preset cần layout editing + slot editing + structural safety

Dùng cùng một editor cho cả ba loại sẽ luôn tạo UX trung bình, không tối ưu cho loại nào.

## 3. Nguyên tắc refactor

### 3.1 Một source of truth cho preset schema

Preset schema phải nằm ở `builder-core`, và `builder-presets`, `builder-editor`, `apps/api`, `apps/cms` đều dùng chung.

### 3.2 Round-trip an toàn

Mọi dữ liệu hiển thị/chỉnh sửa được trong preset editor phải serialize ngược lại đầy đủ.

### 3.3 Preset không chỉ là cây node

Preset phải diễn tả được:

- cấu trúc
- vai trò của từng node
- vùng có thể chỉnh sửa
- giới hạn của child
- các điểm extension của editor

### 3.4 Authoring theo intent

Người dùng muốn:

- thêm title vào hero
- thay media bên phải bằng slider
- đổi layout hero từ split sang centered
- thêm CTA phụ

Editor phải bám theo intent đó, thay vì chỉ expose raw tree thao tác thấp cấp.

### 3.5 Tương thích ngược có kiểm soát

Refactor nên có migration path cho preset cũ, không yêu cầu rewrite toàn bộ dữ liệu ngay một lần.

## 4. Kiến trúc mục tiêu

Mục tiêu là chuyển `builder-presets` sang 4 lớp:

1. `Preset Schema Layer`
2. `Preset Document Layer`
3. `Preset Authoring UI Layer`
4. `Runtime Placement Layer`

### 4.1 Preset Schema Layer

Nằm ở `builder-core`, mô tả chuẩn dữ liệu preset.

Phân tách rõ:

- catalog metadata
- preset definition
- node-level authoring metadata
- structural constraints

### 4.2 Preset Document Layer

Là adapter 2 chiều:

- `preset -> builder document`
- `builder document -> preset`

Adapter này phải preserve được:

- props/style/responsive props/responsive style
- interactions
- node metadata
- layout semantics
- lock/editability

### 4.3 Preset Authoring UI Layer

Nằm ở `builder-presets`, là authoring UI chuyên cho preset.

Bao gồm:

- catalog browser
- variant editor
- composite editor
- section editor
- structure panel
- slot editor
- component insertion flows

### 4.4 Runtime Placement Layer

Nằm ở `builder-editor`, chịu trách nhiệm:

- add preset vào document runtime
- resolve placement rules
- resolve slot/region behavior
- preserve preset metadata nếu cần

Layer này không nên tự suy luận quá nhiều từ cấu trúc cây thô như hiện tại.

## 5. Schema đề xuất

## 5.1 Top-level preset model

Đề xuất thay `PaletteItem` hiện tại bằng một model chuẩn hơn:

```ts
type PresetKind = "variant" | "composite" | "section";

interface PresetDefinition {
  id: string;
  version: string;
  kind: PresetKind;

  componentType: string;
  name: string;
  description?: string;
  thumbnail?: string | null;

  category?: string;
  tags?: string[];
  i18n?: Record<string, { name?: string; description?: string }>;

  purpose?: string;
  industryHints?: string[];
  layoutVariant?: string;

  extendsPresetId?: string;

  authoring?: PresetAuthoringConfig;
  root: PresetNodeDefinition;
}
```

### Ý nghĩa

- `kind`: xác định loại preset và loại UI authoring
- `version`: phục vụ migration
- `extendsPresetId`: cho phép variant kế thừa từ preset base
- `root`: thay vì tách `props/style/children`, toàn bộ preset là một cây node đầy đủ
- `authoring`: chứa cấu hình editor-specific

## 5.2 Node model

```ts
interface PresetNodeDefinition {
  id: string;
  componentType: string;
  name?: string;

  props?: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  interactions?: InteractionConfig[];

  role?: string;
  slot?: string;

  editor?: PresetNodeEditorConfig;
  constraints?: PresetNodeConstraints;

  children?: PresetNodeDefinition[];
}
```

### Ý nghĩa

- `role`: semantic role như `hero-title`, `hero-media`, `cta-primary`
- `slot`: node thuộc vùng nào, ví dụ `content`, `media`, `actions`
- `editor`: node có khóa hay được phép chỉnh gì
- `constraints`: child policy

## 5.3 Node editor config

```ts
interface PresetNodeEditorConfig {
  label?: string;
  icon?: string;

  editable?: boolean;
  removable?: boolean;
  duplicable?: boolean;
  movable?: boolean;

  editableProps?: string[];
  editableStyleSections?: string[];

  lockedStructure?: boolean;
  hiddenInTree?: boolean;
  preferredAddFlow?: "quick-add" | "slot-picker" | "preset-picker";
}
```

### Mục tiêu

- cho phép preset author khóa bớt những gì không nên sửa
- tree và canvas có thể hiển thị label thân thiện hơn
- mỗi node có thể định nghĩa experience authoring phù hợp

## 5.4 Constraints model

```ts
interface PresetNodeConstraints {
  canContainChildren?: boolean;
  acceptedChildTypes?: string[];
  acceptedPresetKinds?: PresetKind[];
  acceptedSlots?: string[];
  minChildren?: number;
  maxChildren?: number;
  allowedTransforms?: Array<"wrap" | "unwrap" | "replace" | "duplicate" | "move">;
}
```

### Mục tiêu

- editor biết lúc nào được add component
- editor biết drop target hợp lệ
- tránh làm hỏng section phức tạp

## 5.5 Preset authoring config

```ts
interface PresetAuthoringConfig {
  mode?: "variant" | "composite" | "section";
  preferredViewport?: "desktop" | "tablet" | "mobile";
  canvasMode?: "flow" | "free";
  treeMode?: "raw" | "semantic";
  insertionPolicy?: "strict" | "guided" | "free";
  slotDefinitions?: PresetSlotDefinition[];
}

interface PresetSlotDefinition {
  id: string;
  label: string;
  description?: string;
  accepts?: string[];
  maxItems?: number;
  required?: boolean;
}
```

### Mục tiêu

- section preset có thể author theo slot
- variant preset có thể không cần tree phức tạp
- editor hiển thị đúng interaction model cho từng preset

## 6. Phân loại preset mới

## 6.1 Variant preset

Dùng cho:

- text styles
- button variants
- image styles
- divider variants

Đặc điểm:

- thường chỉ có 1 root node
- có thể có ít hoặc không có children
- UX chính là props/style/token editor

### Yêu cầu UI

- preview nhanh
- prop/style controls nhanh
- compare với base preset
- override reset

## 6.2 Composite preset

Dùng cho:

- gallery slider
- navigation block
- pricing card
- testimonial card

Đặc điểm:

- có cấu trúc nội bộ
- có thể có vùng child giới hạn
- cần reorder/add/remove có kiểm soát

### Yêu cầu UI

- tree rõ
- add child theo constraint
- replace subtree
- duplicate block con

## 6.3 Section preset

Dùng cho:

- hero
- features
- stats
- CTA
- testimonials

Đặc điểm:

- là layout block cấp section
- thường có nhiều vùng như content/media/actions/background
- cần authoring theo slot và pattern

### Yêu cầu UI

- semantic tree
- slot-based insertion
- layout switching
- structural locks
- replace block theo vai trò

## 7. UX đề xuất cho builder-presets

## 7.1 Thay đổi tổng thể layout editor

Đề xuất editor mới có 4 vùng:

1. Left rail: `Structure` / `Slots` / `Outline`
2. Main canvas: preview + direct manipulation
3. Right panel: `Properties` / `Style` / `Layout` / `Rules`
4. Context bar: các hành động nhanh theo node được chọn

### Mục tiêu

- giảm phụ thuộc vào một panel tree thô
- tăng thao tác theo context
- dễ sửa section phức tạp hơn

## 7.2 Structure panel mới

Structure panel cần có 2 chế độ:

- `Raw Tree`
- `Semantic Tree`

Ví dụ hero semantic tree:

- Hero Section
- Content
- Eyebrow
- Heading
- Description
- Actions
- Primary CTA
- Secondary CTA
- Media
- Image / Slider

### Lợi ích

- người dùng không cần hiểu toàn bộ DOM tree
- thao tác đúng ý đồ business/layout

## 7.3 Slot-based add flow

Khi chọn một node/slot, editor nên cho 3 kiểu add:

- Add Component
- Add Preset
- Replace Current

Ví dụ khi chọn slot `actions`:

- chỉ hiện `Button`, `Container`, `Text`, hoặc preset CTA item
- không hiện bừa tất cả component

### Cần có

- search
- filter theo compatible types
- gợi ý preset cùng role
- insert before / after / inside

## 7.4 Contextual toolbar mới

Khi chọn node, toolbar nên có:

- Add Before
- Add After
- Add Inside
- Duplicate
- Replace
- Wrap
- Remove
- Move Up
- Move Down

Riêng section/group node có thêm:

- Change Layout
- Convert to Slot Template
- Lock Structure

## 7.5 Layout switching cho section preset

Section preset như hero cần hỗ trợ đổi layout mà không phải xóa làm lại:

- centered
- split-left
- split-right
- media-background

### Cách làm

- mỗi layout là một preset transform hoặc preset variant
- editor cho phép `Switch Layout`
- transform phải map các role hiện có sang layout mới

Ví dụ:

- `hero-title` vẫn là `hero-title`
- `hero-actions` vẫn được giữ
- chỉ thay cấu trúc container/grid/column bao quanh

## 7.6 Direct manipulation tốt hơn trên canvas

Cần tăng các thao tác trực tiếp:

- click chọn node/slot
- drag để reorder trong flow
- highlight vùng drop hợp lệ
- add placeholder trong slot rỗng
- replace component từ canvas

### Cho section hero

Khi slot `media` rỗng, canvas nên hiện CTA như:

- Add Image
- Add Gallery
- Add Slider

thay vì bắt user mở tree rồi tìm Add Child.

## 7.7 Property panel theo role

Right panel nên có tab:

- Content
- Design
- Layout
- Behavior
- Rules

Và panel phải thay đổi theo loại node:

- text node: content + typography
- button node: label/link/icon + button style
- slot container: layout rules + accepted child types
- section root: section layout + background + spacing + structure policy

## 8. Runtime behavior cần đổi trong builder-editor

## 8.1 Không nên suy luận section chỉ bằng `componentType === "Section" && children.length > 0`

Hiện logic designed section dựa nhiều vào cấu trúc thô. Cần đổi sang check bằng schema:

- `kind === "section"`
- `authoring.mode === "section"`
- `slotDefinitions` hoặc `role` metadata

### Lợi ích

- runtime placement rõ nghĩa hơn
- không phụ thuộc vào hack cấu trúc

## 8.2 Placement rules rõ ràng

Mỗi preset nên có placement policy:

```ts
interface PresetPlacementPolicy {
  target: "root-section" | "inside-slot" | "free" | "replace-node";
  acceptedParentTypes?: string[];
  acceptedSlotIds?: string[];
}
```

Ví dụ:

- `section preset` chỉ được add vào root page hoặc replace empty section
- `button variant` có thể add vào `actions` slot
- `gallery composite` có thể add vào `media` slot

## 8.3 Preserve preset metadata khi insert

Khi add preset vào runtime document, nên có option preserve:

- `presetId`
- `presetKind`
- `role`
- `slot`

Điều này giúp AI, editor, analytics, migration làm việc dễ hơn.

## 9. Hệ thống inheritance / variant

## 9.1 Base preset

Ví dụ:

- `button/base`
- `button/primary`
- `button/secondary`
- `button/ghost`

`button/primary` có thể `extendsPresetId = "button/base"`

### Lợi ích

- tái sử dụng prop/style
- update base dễ propagate
- design system đồng nhất hơn

## 9.2 Override visualization

Trong editor nên có:

- field nào đang inherited
- field nào đang override
- reset override

Điều này rất quan trọng nếu muốn builder-presets thực sự phục vụ design system.

## 10. Migration strategy

## 10.1 Nguyên tắc

Không rewrite tất cả preset cũ bằng tay. Cần có migration adapter.

## 10.2 Legacy preset adapter

Tạo adapter:

```ts
legacy PaletteItem -> PresetDefinition
```

Rules:

- `kind` mặc định:
  - nếu root là `Section` và có children thì `section`
  - nếu có children nhưng không phải `Section` thì `composite`
  - còn lại là `variant`
- `root` được tạo từ `componentType/props/style/children`
- child cũ được map sang `PresetNodeDefinition`
- dữ liệu thiếu được fill bằng default hợp lý

## 10.3 Versioned migrations

Trong `builder-core` cần có:

- `migratePreset(input): PresetDefinition`
- `detectPresetVersion(input): string`

### Lợi ích

- preset cũ vẫn mở được trong editor mới
- save ra version mới dần theo thời gian

## 11. Các thay đổi package-level

## 11.1 `packages/builder-core`

### Thêm mới

- preset schema chuẩn
- preset migration utils
- preset document adapters
- placement policy types

### Refactor

- hợp nhất `palette-types.ts` và preset types hiện có
- export đầy đủ type helpers

## 11.2 `packages/builder-presets`

### Thêm mới

- semantic structure panel
- slot editor
- preset transform engine cho layout switching
- preset serializer/deserializer mới
- inheritance-aware editor state

### Refactor

- bỏ local `palette.types.ts` hoặc chỉ giữ alias sang core
- tách editor theo mode:
  - `VariantPresetEditor`
  - `CompositePresetEditor`
  - `SectionPresetEditor`
- refactor `AddChildDialog` thành `InsertNodeDialog` / `ReplaceNodeDialog`

## 11.3 `packages/builder-editor`

### Thêm mới

- preset placement resolver
- slot-aware drop resolver
- section preset insertion rules

### Refactor

- bỏ bớt logic special-case theo `Section + children`
- dùng metadata chuẩn từ preset schema

## 11.4 `apps/cms`

### Thêm mới

- preset kind filters
- preset governance fields
- migration status indicator
- preview for slot/role metadata

## 11.5 `apps/api`

### Thêm mới

- serialize preset summary theo schema mới
- AI context có role/slot/layout semantics

### Lợi ích

AI sẽ match `hero`, `media`, `cta`, `stats` tốt hơn thay vì chỉ nhìn cây componentType thô.

## 12. Đề xuất chi tiết theo module

## 12.1 Refactor type system

### Thay đổi

- di chuyển type preset chuẩn về `builder-core`
- `builder-presets` re-export type từ core
- tạo namespace rõ:
  - `PresetDefinition`
  - `PresetNodeDefinition`
  - `PresetAuthoringConfig`
  - `PresetPlacementPolicy`

### Kết quả mong muốn

- chỉ còn 1 schema preset
- editor và runtime tiêu thụ cùng data model

## 12.2 Refactor serializer

### Thay đổi

Tạo mới:

- `buildPresetDocument(preset)`
- `serializePresetDocument(document, meta)`

### Yêu cầu

- preserve node ids
- preserve responsive props/style
- preserve interactions
- preserve role/slot/editor metadata
- preserve order ổn định

### Kết quả mong muốn

- mở preset lên rồi save lại không mất dữ liệu

## 12.3 Refactor editor state

### Thay đổi

Tạo `usePresetEditorState()` chứa:

- selected node
- selected slot
- current mode
- available insert actions
- preset dirty state
- inheritance state

### Kết quả mong muốn

- UI authoring không phải tự nối state rời rạc từ nhiều nơi

## 12.4 Refactor node insertion

### Thay đổi

Thay `AddChildDialog` bằng hệ insertion thống nhất:

- `InsertNodeDialog`
- `InsertPresetDialog`
- `ReplaceNodeDialog`

### Chức năng

- chọn insertion target
- lọc theo constraints
- gợi ý preset tương thích
- insert before/after/inside
- clone subtree khi cần

### Kết quả mong muốn

- thêm component vào hero/section nhanh hơn rất nhiều

## 12.5 Refactor structure editing

### Thay đổi

Thêm actions:

- duplicate node
- move up/down
- wrap in container/grid/column
- unwrap node
- replace subtree
- convert to slot block

### Kết quả mong muốn

- sửa section theo workflow thực tế, không phải thao tác thấp cấp

## 12.6 Refactor section authoring

### Thay đổi

Tạo `SectionPresetEditor` riêng:

- semantic slots
- layout switcher
- quick add CTA/content/media
- slot placeholder trên canvas

### Kết quả mong muốn

- chỉnh hero section nhanh, an toàn, ít vỡ layout

## 12.7 Refactor runtime preset placement

### Thay đổi

Tạo `PresetPlacementResolver` trong `builder-editor`:

- nhận `preset definition`
- nhận target context
- quyết định:
  - add root section
  - insert into empty section
  - replace compatible node
  - insert into slot

### Kết quả mong muốn

- logic add preset nhất quán giữa click-to-add và drag/drop

## 13. Roadmap refactor

## Phase 0. Discovery và design freeze

### Mục tiêu

- chốt schema
- chốt taxonomy preset
- chốt migration strategy

### Việc cần làm

- audit toàn bộ luồng dùng preset hiện tại
- thống kê preset data đang tồn tại
- phân loại preset hiện có theo `variant/composite/section`
- chốt schema mới ở `builder-core`
- review với team editor/CMS/API

### Deliverables

- schema spec
- migration mapping spec
- UX flow spec

## Phase 1. Hợp nhất data model

### Mục tiêu

Tạo source of truth mới cho preset schema.

### Việc cần làm

- thêm schema preset mới vào `builder-core`
- viết type guard và migration utils
- deprecate local `builder-presets/src/types/palette.types.ts`
- cập nhật export của `builder-presets`

### Deliverables

- `PresetDefinition` mới
- migration adapter từ preset cũ

### Exit criteria

- mọi package compile với type preset mới
- preset cũ vẫn load được qua adapter

## Phase 2. Round-trip document engine

### Mục tiêu

Bảo toàn dữ liệu preset khi edit/save.

### Việc cần làm

- thay `buildPreviewDocument()` bằng adapter mới
- thay `documentToItem()` bằng serializer mới
- preserve node ids và metadata
- thêm test round-trip cho:
  - variant preset
  - composite preset
  - section preset

### Deliverables

- `presetToDocument()`
- `documentToPreset()`
- test fixtures

### Exit criteria

- preset mở lên rồi save lại không mất fields

## Phase 3. Refactor authoring shell

### Mục tiêu

Tách editor shell khỏi mô hình hiện tại.

### Việc cần làm

- tạo `usePresetEditorState`
- refactor `PresetEditor`
- chia mode:
  - variant
  - composite
  - section
- thêm semantic structure panel

### Deliverables

- editor shell mới
- structure panel mới

### Exit criteria

- mở được cả 3 loại preset với shell mới

## Phase 4. Insertion và structure operations

### Mục tiêu

Làm cho thao tác thêm/sửa/reorder node usable.

### Việc cần làm

- thay `AddChildDialog`
- thêm insert before/after/inside
- thêm duplicate / replace / wrap / unwrap
- thêm constraint-aware filtering
- refactor tree drag/drop

### Deliverables

- insertion dialogs mới
- structure actions mới

### Exit criteria

- sửa hero structure không còn lệ thuộc tree thao tác thấp cấp

## Phase 5. Section editor chuyên biệt

### Mục tiêu

Tối ưu authoring cho hero/section.

### Việc cần làm

- thêm slot definitions
- thêm slot placeholders trên canvas
- thêm layout switching
- thêm semantic role editing
- thêm quick actions cho content/media/actions

### Deliverables

- `SectionPresetEditor`
- slot-aware canvas overlays

### Exit criteria

- chỉnh một hero section phổ biến nhanh và ổn định

## Phase 6. Runtime placement refactor

### Mục tiêu

Đồng bộ `builder-editor` với preset schema mới.

### Việc cần làm

- tạo `PresetPlacementResolver`
- refactor `useDragHandlers`
- refactor `useClickToAdd`
- bỏ special-case heuristic cũ
- preserve preset metadata khi insert

### Deliverables

- placement engine mới
- integration tests

### Exit criteria

- drag/drop và click-to-add chạy cùng rule set

## Phase 7. CMS và API integration

### Mục tiêu

Đưa schema mới ra ngoài hệ thống.

### Việc cần làm

- cập nhật CMS forms
- cập nhật API serialisation
- cập nhật AI preset summaries
- hiển thị preset kind / layout / slot metadata

### Deliverables

- CMS support cho preset mới
- API support cho preset mới

### Exit criteria

- hệ thống ngoài editor đọc được preset schema mới

## 14. Ưu tiên triển khai thực tế

Nếu cần làm theo thứ tự mang lại giá trị nhanh nhất, nên ưu tiên:

1. Hợp nhất schema preset
2. Round-trip serializer đầy đủ
3. Refactor insertion flow
4. Structure operations
5. Section editor chuyên biệt
6. Runtime placement engine
7. Inheritance / advanced authoring

### Lý do

- nếu schema và serializer chưa đúng, làm UI trước sẽ tiếp tục chồng nợ
- pain point lớn nhất hiện tại là thêm/sửa/move trong section
- section editor chỉ nên làm sau khi data model và insertion engine đã ổn

## 15. Rủi ro chính

### 15.1 Scope lớn

Refactor này đụng:

- `builder-core`
- `builder-presets`
- `builder-editor`
- `apps/cms`
- `apps/api`

Cần tách phase rõ để tránh big bang rewrite.

### 15.2 Migration preset cũ

Preset cũ có thể không đủ metadata để map hoàn hảo sang schema mới. Cần:

- sensible defaults
- migration warnings
- công cụ nâng cấp preset dần

### 15.3 UI complexity

Nếu làm quá nhiều editor feature cùng lúc, preset editor dễ trở nên nặng và khó dùng. Cần:

- ưu tiên section authoring pain points trước
- giữ variant editor đơn giản

### 15.4 Tương thích runtime

`builder-editor` đang có special-case logic cho designed sections. Nếu refactor không đồng bộ, drag/drop sẽ bị sai hành vi.

## 16. Success criteria

Refactor được coi là thành công khi đạt các tiêu chí sau:

- preset schema có 1 source of truth
- preset editor không làm mất dữ liệu sau round-trip
- thêm component vào hero/section đơn giản, đúng ngữ cảnh
- đổi vị trí component trong section rõ ràng và ổn định
- section preset có slot/role semantics
- runtime editor tiêu thụ preset theo rule rõ ràng, không còn heuristic mong manh
- custom component có thể tham gia preset system với constraints và authoring config rõ ràng

## 17. Kết luận

`builder-presets` nên được refactor từ một preset snapshot editor thành một authoring system cho preset-driven builder. Trọng tâm không chỉ là cải thiện UI, mà là thay lại data model để editor có thể hiểu:

- node này là gì
- node này thuộc vùng nào
- vùng này cho phép thêm gì
- hành động nào là hợp lệ
- layout nào đang được dùng

Khi data model đủ giàu và round-trip đủ an toàn, UX cho `hero`, `gallery`, `section`, `button variants`, `text variants` mới có thể thực sự tốt.

## 18. Kế hoạch thực thi ngắn hạn đề xuất

Đề xuất bắt đầu ngay với 3 workstream đầu tiên:

1. Thiết kế schema preset mới trong `builder-core`
2. Viết adapter `legacy preset <-> new preset`
3. Thay serializer/deserializer của `builder-presets`

Sau đó mới chuyển sang:

4. insertion flow mới
5. structure operations
6. section editor chuyên biệt

Đây là thứ tự hợp lý nhất để giảm nợ kỹ thuật và tạo nền vững cho các bước UI tiếp theo.

## 19. File-by-file refactor map

Phần này chuyển proposal thành bản đồ chỉnh sửa cụ thể theo file/package hiện có.

## 19.1 `packages/builder-core`

### File mới đề xuất

- `src/presets/schema.ts`
  - định nghĩa `PresetDefinition`, `PresetNodeDefinition`, `PresetAuthoringConfig`, `PresetPlacementPolicy`
- `src/presets/migrate.ts`
  - `detectPresetVersion()`
  - `migratePreset()`
  - `upgradeLegacyPaletteItem()`
- `src/presets/document-adapter.ts`
  - `presetToDocument()`
  - `documentToPreset()`
- `src/presets/placement.ts`
  - types và helpers cho placement rules
- `src/presets/constraints.ts`
  - helpers validate slot/child constraints

### File cần refactor

- `src/presets/palette-types.ts`
  - đổi `PaletteItem` hiện tại thành catalog shell trỏ tới `PresetDefinition`
  - tránh lặp lại node schema ở đây
- `src/presets/types.ts`
  - deprecate `ComponentPreset`/`PresetChildNode` cũ
  - hoặc giữ tạm như legacy types
- `src/index.ts`
  - export schema mới
  - export migration/document adapter utils

### Hướng refactor

Không nên sửa chồng trực tiếp lên `PaletteItem` cũ theo kiểu incremental nhỏ lẻ quá lâu. Nên tạo schema mới song song, sau đó mới di chuyển dần consumer sang schema mới.

## 19.2 `packages/builder-presets`

### File mới đề xuất

- `src/lib/presetDocument.ts`
  - wrapper gọi adapter từ core
- `src/lib/presetMigrations.ts`
  - bridge helper để nhận dữ liệu cũ từ CMS
- `src/hooks/usePresetEditorState.ts`
  - state machine trung tâm cho preset authoring
- `src/hooks/usePresetInsertActions.ts`
  - tính toán add/replace actions theo context node/slot
- `src/components/StructurePanel.tsx`
  - panel tree mới
- `src/components/SemanticTreePanel.tsx`
  - semantic view cho section/composite presets
- `src/components/SlotPanel.tsx`
  - quản lý slot/region
- `src/components/InsertNodeDialog.tsx`
  - thay cho `AddChildDialog`
- `src/components/ReplaceNodeDialog.tsx`
  - replace component/subtree
- `src/components/VariantPresetEditor.tsx`
- `src/components/CompositePresetEditor.tsx`
- `src/components/SectionPresetEditor.tsx`
- `src/components/LayoutSwitcher.tsx`
  - đổi layout cho section presets

### File cần refactor mạnh

- `src/components/PresetEditor.tsx`
  - biến thành shell/router theo `preset.kind`
- `src/components/AddChildDialog.tsx`
  - loại bỏ hoặc rename thành bridge legacy
- `src/components/NodeTreePanel.tsx`
  - giảm vai trò tree thô
- `src/components/InteractiveCanvas.tsx`
  - thêm slot overlays, insertion affordances
- `src/components/PropSchemaEditor.tsx`
  - đổi sang panel theo role/kind
- `src/lib/buildPreviewDocument.ts`
  - thay bằng adapter đầy đủ hoặc giữ wrapper gọi core adapter
- `src/types/palette.types.ts`
  - bỏ local schema hoặc alias sang `builder-core`
- `src/index.ts`
  - export editor API mới

### File nên giữ nhưng giảm trách nhiệm

- `PresetInfoPanel`
- `MiniRender`
- `StyleSections`
- `PropControl`

Các file này vẫn có ích, nhưng không nên giữ logic cấu trúc preset ở đây.

## 19.3 `packages/builder-editor`

### File mới đề xuất

- `src/presets/PresetPlacementResolver.ts`
- `src/presets/placementTypes.ts`
- `src/presets/slotDropResolver.ts`

### File cần refactor

- `src/hooks/useDragHandlers.ts`
  - bỏ logic special-case dựa trên `Section + children`
- `src/hooks/useClickToAdd.ts`
  - chuyển sang gọi placement resolver chung
- `src/hooks/presetUtils.ts`
  - hỗ trợ add recursive theo schema node đầy đủ
- `src/hooks/useDropSlotResolver.ts`
  - nối với slot-aware placement nếu đã có

### Mục tiêu

`drag/drop` và `click-to-add` phải dùng cùng một pipeline:

- resolve preset definition
- resolve placement context
- validate constraints
- build command batch
- commit add/replace/move actions

## 19.4 `apps/cms`

### File cần thêm hoặc refactor

- form edit preset metadata
- preset kind filter UI
- migration badge cho preset legacy
- visual summary cho slot/layout/role

### Mục tiêu

CMS không chỉ là nơi nhập `name/thumbnail/tags`, mà phải hiển thị được preset là loại gì và có khả năng authoring gì.

## 19.5 `apps/api`

### Cần refactor

- serializer preset compact summary
- AI prompt context builder
- section generator / outline generator

### Mục tiêu

AI nên đọc được:

- preset kind
- purpose
- layout variant
- available slots
- semantic roles

thay vì chỉ đọc `componentType + children`.

## 20. Contract dữ liệu đề xuất

## 20.1 Catalog contract

Catalog không nên embed toàn bộ preset definition vào mọi nơi nếu payload quá lớn. Nên tách:

```ts
interface PaletteCatalogItem {
  id: string;
  presetId: string;
  type: "variant" | "composite" | "section";
  componentType: string;
  name: string;
  description?: string;
  thumbnail?: string | null;
  tags?: string[];
  purpose?: string;
  layoutVariant?: string;
}
```

### Gợi ý

- catalog load danh sách nhẹ
- editor hoặc palette fetch `PresetDefinition` đầy đủ theo `presetId`

## 20.2 Preset editor input contract

```ts
interface PresetEditorInput {
  preset: PresetDefinition;
  registry: ComponentRegistry;
  availablePresets?: PresetDefinition[];
  onChange?: (next: PresetDefinition) => void;
  onReset?: () => void;
}
```

### Mục tiêu

- editor chỉ nhận full preset definition
- không phụ thuộc `PaletteItem` rút gọn

## 20.3 Runtime placement contract

```ts
interface PlacePresetRequest {
  preset: PresetDefinition;
  targetNodeId?: string;
  targetSlotId?: string;
  intent: "click-add" | "drag-drop" | "replace";
  position?: "before" | "after" | "inside";
}
```

### Mục tiêu

- placement resolver chạy được cho mọi entry point

## 21. Hero preset mẫu theo schema mới

Dưới đây là ví dụ rút gọn cho một `hero split-left` preset.

```ts
const heroSplitLeftPreset: PresetDefinition = {
  id: "section.hero.split-left",
  version: "2.0.0",
  kind: "section",
  componentType: "Section",
  name: "Hero Split Left",
  description: "Hero section with left content and right media",
  purpose: "hero",
  layoutVariant: "split-left",
  authoring: {
    mode: "section",
    preferredViewport: "desktop",
    canvasMode: "flow",
    treeMode: "semantic",
    insertionPolicy: "guided",
    slotDefinitions: [
      { id: "content", label: "Content", accepts: ["Text", "Button", "Container"], required: true },
      { id: "actions", label: "Actions", accepts: ["Button", "Container"], maxItems: 3 },
      { id: "media", label: "Media", accepts: ["Image", "GallerySlider", "GalleryGrid"], maxItems: 1 },
    ],
  },
  root: {
    id: "root",
    componentType: "Section",
    role: "hero-root",
    props: {},
    style: {
      paddingTop: "96px",
      paddingBottom: "96px",
    },
    editor: {
      label: "Hero Section",
      editable: true,
      removable: false,
      movable: true,
      lockedStructure: false,
    },
    children: [
      {
        id: "container",
        componentType: "Container",
        role: "hero-container",
        style: {
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "40px",
          alignItems: "center",
        },
        editor: {
          label: "Hero Layout",
          editableStyleSections: ["layout", "spacing"],
        },
        children: [
          {
            id: "content",
            componentType: "Container",
            slot: "content",
            role: "hero-content",
            constraints: {
              canContainChildren: true,
              acceptedChildTypes: ["Text", "Button", "Container"],
            },
            children: [
              {
                id: "eyebrow",
                componentType: "Text",
                role: "hero-eyebrow",
                props: { text: "New release" },
                editor: { label: "Eyebrow" },
              },
              {
                id: "title",
                componentType: "Text",
                role: "hero-title",
                props: { text: "<h1>Build pages faster</h1>" },
                editor: { label: "Title" },
              },
              {
                id: "description",
                componentType: "Text",
                role: "hero-description",
                props: { text: "<p>Preset-driven authoring for flexible landing pages.</p>" },
                editor: { label: "Description" },
              },
              {
                id: "actions",
                componentType: "Container",
                slot: "actions",
                role: "hero-actions",
                constraints: {
                  canContainChildren: true,
                  acceptedChildTypes: ["Button", "Container"],
                  maxChildren: 3,
                },
                children: [
                  {
                    id: "primary-cta",
                    componentType: "Button",
                    role: "cta-primary",
                    props: { text: "Get Started" },
                    editor: { label: "Primary CTA" },
                  },
                ],
              },
            ],
          },
          {
            id: "media",
            componentType: "Container",
            slot: "media",
            role: "hero-media",
            constraints: {
              canContainChildren: true,
              acceptedChildTypes: ["Image", "GallerySlider", "GalleryGrid"],
              maxChildren: 1,
            },
            children: [
              {
                id: "hero-image",
                componentType: "Image",
                role: "hero-image",
                props: { src: "/placeholder.jpg", alt: "Hero media" },
                editor: { label: "Hero Image" },
              },
            ],
          },
        ],
      },
    ],
  },
};
```

### Giá trị của schema này

- editor biết `content`, `actions`, `media` là slot
- editor biết `title`, `description`, `primary CTA` là role
- editor biết slot nào nhận được component nào
- đổi layout có thể map dựa trên role thay vì đoán theo vị trí child

## 22. Transforms cần có cho section presets

Để section authoring thật sự usable, cần một lớp transform cho preset tree.

## 22.1 Các transform cốt lõi

- `switchSectionLayout(preset, nextLayout)`
- `wrapNode(preset, nodeId, wrapperType)`
- `unwrapNode(preset, nodeId)`
- `replaceNodeWithPreset(preset, nodeId, replacementPreset)`
- `duplicateNode(preset, nodeId)`
- `moveNode(preset, nodeId, targetParentId, insertIndex)`

## 22.2 Yêu cầu transform

- preserve role nếu có thể
- preserve slot assignment nếu hợp lệ
- preserve node ids ổn định khi không cần tạo mới
- validate constraints sau khi transform

## 22.3 Ví dụ layout switch

Khi đổi `hero split-left -> hero centered`:

- `hero-title`, `hero-description`, `hero-actions` được giữ nguyên
- `hero-media` có thể chuyển xuống dưới content hoặc thành background
- container layout style thay đổi
- semantic tree vẫn còn nguyên role

## 23. Test strategy

Refactor này cần test nhiều hơn hiện tại để tránh hỏng silent behavior.

## 23.1 Unit tests cho `builder-core`

- migrate legacy preset sang new schema
- round-trip `preset -> document -> preset`
- constraint validation
- slot validation
- placement rule resolution
- section transform logic

## 23.2 Component tests cho `builder-presets`

- variant preset editor render đúng
- composite preset editor add/remove child đúng
- section preset editor hiện slot placeholders đúng
- insert dialog chỉ show compatible components
- semantic tree phản ánh role/slot đúng

## 23.3 Integration tests cho `builder-editor`

- click add section preset vào page
- drag section preset vào empty section
- add button preset vào actions slot
- replace media slot bằng gallery preset
- preserve preset metadata sau insert

## 23.4 Migration snapshot tests

Nên có fixture cho:

- preset text variant legacy
- preset composite legacy
- preset section legacy

Và snapshot output sau migration.

## 24. Backlog triển khai chi tiết

## 24.1 Sprint A: Schema + migration

### Task list

- tạo `builder-core/src/presets/schema.ts`
- tạo `builder-core/src/presets/migrate.ts`
- export schema mới từ `builder-core/src/index.ts`
- tạo legacy adapter từ `PaletteItem`
- thêm fixtures migration

### Definition of done

- typecheck pass
- test migration pass
- preset cũ load được thành schema mới

## 24.2 Sprint B: Document adapter

### Task list

- tạo `presetToDocument()`
- tạo `documentToPreset()`
- preserve responsive/interactions/metadata
- thay wrapper `buildPreviewDocument`
- thay `documentToItem` trong `PresetEditor`

### Definition of done

- không còn mất dữ liệu khi save từ preset editor

## 24.3 Sprint C: Editor shell

### Task list

- tạo `usePresetEditorState`
- refactor `PresetEditor` thành shell
- tách `VariantPresetEditor`, `CompositePresetEditor`, `SectionPresetEditor`
- thêm structure panel cơ bản

### Definition of done

- shell mới render được cả preset migrated và preset mới

## 24.4 Sprint D: Insert/replace flow

### Task list

- thay `AddChildDialog` bằng `InsertNodeDialog`
- thêm replace dialog
- thêm insert before/after/inside
- filter theo constraints

### Definition of done

- thao tác add/replace node trong section usable

## 24.5 Sprint E: Section authoring

### Task list

- semantic tree
- slot overlays
- quick add cho slot rỗng
- layout switcher
- section transforms đầu tiên

### Definition of done

- sửa một hero split-left mà không cần tree thao tác thấp cấp

## 24.6 Sprint F: Runtime integration

### Task list

- thêm placement resolver
- refactor `useClickToAdd`
- refactor `useDragHandlers`
- preserve metadata

### Definition of done

- runtime editor add preset ổn định theo rule mới

## 25. Chia nhỏ PR hợp lý

Để tránh PR quá lớn, nên tách như sau:

### PR 1

- schema mới ở `builder-core`
- migration utils
- export mới

### PR 2

- document adapter mới
- tests round-trip
- bridge wrappers cho `builder-presets`

### PR 3

- refactor `PresetEditor` shell
- `usePresetEditorState`

### PR 4

- `InsertNodeDialog`
- replace flow
- structure actions cơ bản

### PR 5

- `SectionPresetEditor`
- semantic tree
- slot placeholders

### PR 6

- `builder-editor` placement resolver
- drag/drop + click-to-add refactor

### PR 7

- CMS/API updates

## 26. Thứ tự cắt bỏ technical debt

Để refactor không rối, cần ưu tiên xóa các debt sau:

1. local preset types trong `builder-presets`
2. `documentToItem` serialize thiếu dữ liệu
3. `buildPreviewDocument` dựng node thiếu metadata
4. special-case `Designed Section` dựa trên heuristic
5. `AddChildDialog` chỉ clone `props/style` không clone schema node đầy đủ

## 27. MVP refactor khả thi nhất

Nếu cần một phiên bản khả thi trong thời gian ngắn, MVP nên gồm:

- schema mới
- migration adapter
- round-trip serializer đúng
- insert before/after/inside
- replace node
- semantic tree cơ bản cho section

### Chưa cần ngay trong MVP

- inheritance UI hoàn chỉnh
- layout transforms phức tạp
- CMS authoring nâng cao
- AI integration nâng cao

### Lý do

MVP này đã xử lý trực tiếp pain point hiện tại:

- khó thêm component
- khó đổi vị trí
- khó chỉnh sửa hero/section

## 28. Khuyến nghị triển khai ngay sau proposal

Nếu đi tiếp từ tài liệu này, bước thực thi đầu tiên tôi khuyến nghị là:

1. tạo schema mới trong `builder-core`
2. chuyển `builder-presets` sang re-export type từ `builder-core`
3. thay `buildPreviewDocument` và `documentToItem` bằng adapter round-trip chuẩn

Sau ba bước này, hệ sẽ có nền dữ liệu đủ sạch để làm tiếp insertion UX và section editor.
