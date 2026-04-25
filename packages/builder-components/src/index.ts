// Component definitions — individual named exports
export { TextComponent } from "./components/Text";
export { ButtonComponent } from "./components/Button";
export { ContainerComponent } from "./components/Container";
export { ImageComponent } from "./components/Image";
export { DividerComponent } from "./components/Divider";
export { SectionComponent } from "./components/Section";
export { GridComponent } from "./components/Grid";
export { ColumnComponent } from "./components/Column";
export { RowComponent } from "./components/Row";
export { TextMarqueeComponent } from "./components/TextMarquee";
export { CollapsibleTextComponent } from "./components/CollapsibleText";
export { TextMaskComponent } from "./components/TextMask";
export { GalleryGridComponent } from "./components/GalleryGrid";
export { GallerySliderComponent } from "./components/GallerySlider";
export { GalleryProComponent } from "./components/GalleryPro";
export { ShapeComponent } from "./components/Shape";
export { NavigationMenuComponent } from "./components/NavigationMenu";
export { RepeaterComponent } from "./components/Repeater";
export { AnchorComponent } from "./components/Anchor";

// Utility
export { extendComponent } from "./utils/extendComponent";

// Re-export defineComponent for convenience
export { defineComponent } from "@ui-builder/builder-core";

// Aggregated array — same order as the original SAMPLE_COMPONENTS
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { SectionComponent } from "./components/Section";
import { ContainerComponent } from "./components/Container";
import { GridComponent } from "./components/Grid";
import { ColumnComponent } from "./components/Column";
import { RowComponent } from "./components/Row";
import { TextComponent } from "./components/Text";
import { ButtonComponent } from "./components/Button";
import { ImageComponent } from "./components/Image";
import { DividerComponent } from "./components/Divider";
import { TextMarqueeComponent } from "./components/TextMarquee";
import { CollapsibleTextComponent } from "./components/CollapsibleText";
import { TextMaskComponent } from "./components/TextMask";
import { GalleryGridComponent } from "./components/GalleryGrid";
import { GallerySliderComponent } from "./components/GallerySlider";
import { GalleryProComponent } from "./components/GalleryPro";
import { ShapeComponent } from "./components/Shape";
import { NavigationMenuComponent } from "./components/NavigationMenu";
import { RepeaterComponent } from "./components/Repeater";
import { AnchorComponent } from "./components/Anchor";

export const BASE_COMPONENTS: ComponentDefinition[] = [
  SectionComponent,
  ContainerComponent,
  GridComponent,
  ColumnComponent,
  RowComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
  DividerComponent,
  TextMarqueeComponent,
  CollapsibleTextComponent,
  TextMaskComponent,
  GalleryGridComponent,
  GallerySliderComponent,
  GalleryProComponent,
  ShapeComponent,
  NavigationMenuComponent,
  RepeaterComponent,
  AnchorComponent,
];
