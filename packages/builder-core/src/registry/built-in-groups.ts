/**
 * Built-in component groups and sub-groups.
 *
 * This file is the single source of truth for the palette structure shown in
 * the product screenshot. Consumers can register additional groups via
 * GroupRegistry.registerGroup() / registerSubGroup().
 *
 * Structure (matching the attached screenshot):
 *   Văn bản (text)          → Tiêu đề, Đoạn văn, Danh sách
 *   Nút bấm (button)        → Nút bấm đơn, Nhóm nút
 *   Ảnh (image)
 *   Gallery
 *   Hình hộp (container)
 *   Biểu tượng (icon)
 *   Đường kẻ (divider)
 *   Form
 *   Sản phẩm mẫu (product)
 *   Video
 *   Collection List
 *   Carousel
 *   Tabs
 *   Frame
 *   Accordion
 *   Table
 *   Survey
 *   Menu
 *   Mã HTML (html)
 */

import type { ComponentGroup, ComponentSubGroup } from "./types";

export const BUILT_IN_GROUPS: ComponentGroup[] = [
  { id: "text",        label: "Text",              icon: "type",                 order: 0,  i18nKey: "groups.text" },
  { id: "image",       label: "Image",             icon: "image",                order: 1,  i18nKey: "groups.image" },
  { id: "button",      label: "Button",            icon: "square-mouse-pointer", order: 2,  i18nKey: "groups.button" },
  { id: "gallery",     label: "Gallery",           icon: "images",               order: 3,  i18nKey: "groups.gallery" },
  { id: "decorative",  label: "Decorative",        icon: "sparkles",             order: 4,  i18nKey: "groups.decorative" },
  { id: "menu",        label: "Menu & Anchor",     icon: "more-horizontal",      order: 5,  i18nKey: "groups.menu" },
  { id: "collection",  label: "List",              icon: "layout-list",          order: 6,  i18nKey: "groups.collection" },
  { id: "container",   label: "Box",               icon: "box",                  order: 7,  i18nKey: "groups.container" },
  { id: "icon",        label: "Icon",              icon: "star",                 order: 8,  i18nKey: "groups.icon" },
  { id: "divider",     label: "Divider",           icon: "minus",                order: 9,  i18nKey: "groups.divider" },
  { id: "form",        label: "Form",              icon: "layout-panel-top",     order: 10, i18nKey: "groups.form" },
  { id: "product",     label: "Product",           icon: "list-ordered",         order: 11, i18nKey: "groups.product" },
  { id: "video",       label: "Video",             icon: "play-circle",          order: 12, i18nKey: "groups.video" },
  { id: "carousel",    label: "Carousel",          icon: "monitor",              order: 13, i18nKey: "groups.carousel" },
  { id: "tabs",        label: "Tabs",              icon: "panel-top",            order: 14, i18nKey: "groups.tabs" },
  { id: "frame",       label: "Frame",             icon: "frame",                order: 15, i18nKey: "groups.frame" },
  { id: "accordion",   label: "Accordion",         icon: "menu",                 order: 16, i18nKey: "groups.accordion" },
  { id: "table",       label: "Table",             icon: "table",                order: 17, i18nKey: "groups.table" },
  { id: "survey",      label: "Survey",            icon: "list-checks",          order: 18, i18nKey: "groups.survey" },
  { id: "html",        label: "HTML Code",         icon: "code-2",               order: 19, i18nKey: "groups.html" },
  // Internal — layout components shown in their own section
  { id: "layout",      label: "Layout",            icon: "layout",               order: 20, i18nKey: "groups.layout" },
];

export const BUILT_IN_SUB_GROUPS: ComponentSubGroup[] = [
  // ── Text sub-groups ──────────────────────────────────────────────────────
  { id: "themed-text",      parentGroupId: "text",   label: "Themed Text",      icon: "sparkles",            order: 0, i18nKey: "subGroups.themedText" },
  { id: "heading",          parentGroupId: "text",   label: "Titles",            icon: "heading",             order: 1, i18nKey: "subGroups.heading" },
  { id: "paragraph",        parentGroupId: "text",   label: "Paragraphs",        icon: "align-left",          order: 2, i18nKey: "subGroups.paragraph" },
  { id: "collapsible-text", parentGroupId: "text",   label: "Collapsible Text",  icon: "chevrons-down-up",    order: 3, i18nKey: "subGroups.collapsibleText" },
  { id: "text-marquee",     parentGroupId: "text",   label: "Text Marquee",      icon: "move-right",          order: 4, i18nKey: "subGroups.textMarquee" },
  { id: "text-mask",        parentGroupId: "text",   label: "Text Mask",         icon: "scan-text",           order: 5, i18nKey: "subGroups.textMask" },
  { id: "list",             parentGroupId: "text",   label: "List",              icon: "list",                order: 6, i18nKey: "subGroups.list" },

  // ── Image sub-groups ─────────────────────────────────────────────────────
  { id: "single-image",     parentGroupId: "image",  label: "Single Image",      icon: "image",               order: 0, i18nKey: "subGroups.singleImage" },
  { id: "image-with-text",  parentGroupId: "image",  label: "Image with Text",   icon: "layout-panel-left",   order: 1, i18nKey: "subGroups.imageWithText" },

  // ── Button sub-groups ────────────────────────────────────────────────────
  { id: "button-single",       parentGroupId: "button", label: "Text & Icon Buttons", icon: "mouse-pointer-click",  order: 0, i18nKey: "subGroups.buttonSingle" },
  { id: "button-icon",         parentGroupId: "button", label: "Icon Buttons",         icon: "circle-dot",           order: 1, i18nKey: "subGroups.buttonIcon" },
  { id: "button-image",        parentGroupId: "button", label: "Image Buttons",        icon: "image-play",           order: 2, i18nKey: "subGroups.buttonImage" },
  { id: "button-document",     parentGroupId: "button", label: "Document Buttons",     icon: "file-down",            order: 3, i18nKey: "subGroups.buttonDocument" },
  { id: "button-group",        parentGroupId: "button", label: "Button Group",         icon: "layout-template",      order: 4, i18nKey: "subGroups.buttonGroup" },

  // ── Gallery sub-groups ───────────────────────────────────────────────────
  { id: "gallery-standard",  parentGroupId: "gallery", label: "Standard",          icon: "layout-grid",         order: 0, i18nKey: "subGroups.galleryStandard" },
  { id: "gallery-slides",    parentGroupId: "gallery", label: "Slides & Carousel", icon: "layout-panel-top",    order: 1, i18nKey: "subGroups.gallerySlides" },
  { id: "gallery-creative",  parentGroupId: "gallery", label: "Creative",          icon: "sparkles",            order: 2, i18nKey: "subGroups.galleryCreative" },

  // ── Decorative sub-groups ────────────────────────────────────────────────
  { id: "basic-shapes",    parentGroupId: "decorative", label: "Basic Shapes",   icon: "shapes",              order: 0, i18nKey: "subGroups.basicShapes" },
  { id: "lines",           parentGroupId: "decorative", label: "Lines",          icon: "minus",               order: 1, i18nKey: "subGroups.lines" },
  { id: "arrows",          parentGroupId: "decorative", label: "Arrows",         icon: "arrow-right",         order: 2, i18nKey: "subGroups.arrows" },

  // ── Menu & Anchor sub-groups ─────────────────────────────────────────────
  { id: "menu-horizontal", parentGroupId: "menu",    label: "Horizontal Menus",  icon: "menu",                order: 0, i18nKey: "subGroups.menuHorizontal" },
  { id: "menu-vertical",   parentGroupId: "menu",    label: "Vertical Menus",    icon: "panel-left",          order: 1, i18nKey: "subGroups.menuVertical" },
  { id: "menu-hamburger",  parentGroupId: "menu",    label: "Hamburger Menus",   icon: "align-justify",       order: 2, i18nKey: "subGroups.menuHamburger" },
  { id: "anchors",         parentGroupId: "menu",    label: "Anchors",           icon: "anchor",              order: 3, i18nKey: "subGroups.anchors" },

  // ── List sub-groups ──────────────────────────────────────────────────────
  { id: "repeaters",       parentGroupId: "collection", label: "Repeaters",        icon: "layout-list",       order: 0, i18nKey: "subGroups.repeaters" },
  { id: "hover-repeaters", parentGroupId: "collection", label: "Hover Repeaters",  icon: "mouse-pointer-2",   order: 1, i18nKey: "subGroups.hoverRepeaters" },
  { id: "blank-repeaters", parentGroupId: "collection", label: "Blank Repeaters",  icon: "rectangle-horizontal", order: 2, i18nKey: "subGroups.blankRepeaters" },

  // ── Container (Box) sub-groups ───────────────────────────────────────────
  { id: "container-box",   parentGroupId: "container", label: "Container Boxes",  icon: "box",               order: 0, i18nKey: "subGroups.containerBox" },
  { id: "styled-box",      parentGroupId: "container", label: "Styled Boxes",     icon: "sparkles",          order: 1, i18nKey: "subGroups.styledBox" },

  // ── Layout sub-groups ────────────────────────────────────────────────────
  { id: "grid",   parentGroupId: "layout", label: "Grid & Column", icon: "grid-3x3",    order: 0, i18nKey: "subGroups.grid" },
];
