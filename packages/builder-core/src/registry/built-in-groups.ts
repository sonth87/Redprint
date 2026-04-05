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
  { id: "text",       label: "Text",            icon: "type",          order: 0,  i18nKey: "groups.text" },
  { id: "button",     label: "Button",          icon: "square-mouse-pointer", order: 1,  i18nKey: "groups.button" },
  { id: "image",      label: "Image",           icon: "image",         order: 2,  i18nKey: "groups.image" },
  { id: "gallery",    label: "Gallery",         icon: "images",        order: 3,  i18nKey: "groups.gallery" },
  { id: "container",  label: "Container",       icon: "box",           order: 4,  i18nKey: "groups.container" },
  { id: "icon",       label: "Icon",            icon: "star",          order: 5,  i18nKey: "groups.icon" },
  { id: "divider",    label: "Divider",         icon: "minus",         order: 6,  i18nKey: "groups.divider" },
  { id: "form",       label: "Form",            icon: "layout-panel-top", order: 7,  i18nKey: "groups.form" },
  { id: "product",    label: "Product",         icon: "list-ordered",  order: 8,  i18nKey: "groups.product" },
  { id: "video",      label: "Video",           icon: "play-circle",   order: 9,  i18nKey: "groups.video" },
  { id: "collection", label: "Collection List", icon: "layout-list",   order: 10, i18nKey: "groups.collection" },
  { id: "carousel",   label: "Carousel",        icon: "monitor",       order: 11, i18nKey: "groups.carousel" },
  { id: "tabs",       label: "Tabs",            icon: "panel-top",     order: 12, i18nKey: "groups.tabs" },
  { id: "frame",      label: "Frame",           icon: "frame",         order: 13, i18nKey: "groups.frame" },
  { id: "accordion",  label: "Accordion",       icon: "menu",          order: 14, i18nKey: "groups.accordion" },
  { id: "table",      label: "Table",           icon: "table",         order: 15, i18nKey: "groups.table" },
  { id: "survey",     label: "Survey",          icon: "list-checks",   order: 16, i18nKey: "groups.survey" },
  { id: "menu",       label: "Menu",            icon: "more-horizontal", order: 17, i18nKey: "groups.menu" },
  { id: "html",       label: "HTML Code",       icon: "code-2",        order: 18, i18nKey: "groups.html" },
  // Internal — layout components shown in their own section
  { id: "layout",     label: "Layout",          icon: "layout",        order: 19, i18nKey: "groups.layout" },
];

export const BUILT_IN_SUB_GROUPS: ComponentSubGroup[] = [
  // Text sub-groups
  { id: "heading",   parentGroupId: "text",   label: "Heading",       icon: "heading",    order: 0, i18nKey: "subGroups.heading" },
  { id: "paragraph", parentGroupId: "text",   label: "Paragraph",     icon: "align-left", order: 1, i18nKey: "subGroups.paragraph" },
  { id: "list",      parentGroupId: "text",   label: "List",          icon: "list",       order: 2, i18nKey: "subGroups.list" },

  // Button sub-groups
  { id: "button-single", parentGroupId: "button", label: "Button",       icon: "mouse-pointer-click", order: 0, i18nKey: "subGroups.buttonSingle" },
  { id: "button-group",  parentGroupId: "button", label: "Button Group", icon: "layout-template",     order: 1, i18nKey: "subGroups.buttonGroup" },

  // Layout sub-groups
  { id: "grid",   parentGroupId: "layout", label: "Grid & Column", icon: "grid-3x3",    order: 0, i18nKey: "subGroups.grid" },
];
