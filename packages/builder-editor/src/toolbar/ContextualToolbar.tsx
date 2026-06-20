import React, { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, Copy, Trash2, ArrowUp, ArrowDown, GripVertical, CornerLeftUp, ImageIcon, Link2, Paintbrush, Frame, Images, Settings2, Maximize2, ListTree, LayoutPanelTop, Unlink } from "lucide-react";
import { useDocument, useBuilder } from "@ui-builder/builder-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { TOOLTIP_DELAY_MS, normalizeCarouselConfig } from "@ui-builder/shared";
import { AIToolsPopover } from "../ai/ai-tools/AIToolsPopover";
import { AISectionPopover } from "../ai/ai-section/AISectionPopover";
import { useAIConfig } from "../ai/AIConfigContext";
import { ImageFilterPicker } from "../panels/ImageFilterPicker";
import { ImageFramePanel } from "../panels/ImageFramePanel";
import { FloatingPanel } from "../panels/FloatingPanel";
import { GalleryUnifiedSettingsPanel } from "../panels/gallery";
import { MenuLayoutPanel, MenuManagerPanel, MenuStretchPopover } from "./menu/MenuToolbarPanels";


function getClampedPanelPos(
  rect: DOMRect,
  panelWidth: number,
  _panelHeight?: number,
) {
  const margin = 8;
  let x = rect.left;
  const y = rect.bottom + 6;

  if (x + panelWidth + margin > window.innerWidth) {
    x = window.innerWidth - panelWidth - margin;
  }
  if (x < margin) x = margin;

  return { x, y };
}

export interface ContextualToolbarProps {
  nodeId: string;
  rect: { x: number; y: number; width: number; height: number };
  zoom: number;
  panOffset: { x: number; y: number };
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragHandlePointerDown: (e: React.PointerEvent) => void;
  /** Open media manager and apply selected asset URL to given prop key */
  onOpenMediaManager?: (propKey: string) => void;
  /** Open the GalleryMediaManager dialog for the selected gallery node */
  onOpenGalleryManager?: () => void;
}

// All component types that use the GalleryPro engine (share Manage Media + Settings buttons)
const GALLERY_TYPES = new Set([
  "GalleryPro", "GalleryMasonry", "GalleryCollage", "GallerySliderPro",
  "GallerySlideshow", "GalleryThumbnails", "GalleryHoneycomb",
  "GalleryFreestyle", "Gallery3DCarousel", "GalleryStacked",
]);

function normalizeImageLinkUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    /^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)
  ) return trimmed;
  return `https://${trimmed}`;
}

function ImageLinkPanel({
  url,
  target,
  onApply,
  onRemove,
  onClose,
}: {
  url: string;
  target: string;
  onApply: (url: string, target: "_blank" | "_self") => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [draftUrl, setDraftUrl] = React.useState(url);
  const [draftTarget, setDraftTarget] = React.useState<"_blank" | "_self">(target === "_self" ? "_self" : "_blank");

  React.useEffect(() => {
    setDraftUrl(url);
    setDraftTarget(target === "_self" ? "_self" : "_blank");
  }, [url, target]);

  const apply = () => {
    onApply(normalizeImageLinkUrl(draftUrl), draftTarget);
    onClose();
  };

  return (
    <div className="grid gap-3 p-1.5">
      <div className="rounded-md border bg-muted/35 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
            <Link2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold">Image link</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {url ? url : "No link set"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-[11px] font-medium">URL</Label>
        <Input
          autoFocus
          className="h-8 text-xs"
          placeholder="https://example.com"
          value={draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-[11px] font-medium">Open link in</Label>
        <Select value={draftTarget} onValueChange={(value) => setDraftTarget(value === "_self" ? "_self" : "_blank")}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_blank">New tab</SelectItem>
            <SelectItem value="_self">Current tab</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={!url && !draftUrl.trim()}
          onClick={() => {
            onRemove();
            onClose();
          }}
        >
          <Unlink className="mr-1.5 h-3.5 w-3.5" />
          Remove
        </Button>
        <Button size="sm" className="h-8 px-3 text-xs" onClick={apply}>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Apply
        </Button>
      </div>
    </div>
  );
}

export const ContextualToolbar: React.FC<ContextualToolbarProps> = ({ nodeId, rect, zoom, panOffset, onDelete, onDuplicate, onMoveUp, onMoveDown, onDragHandlePointerDown, onOpenMediaManager, onOpenGalleryManager }) => {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [frameOpen, setFrameOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [menuStretchOpen, setMenuStretchOpen] = React.useState(false);
  const [menuManagerOpen, setMenuManagerOpen] = React.useState(false);
  const [menuLayoutOpen, setMenuLayoutOpen] = React.useState(false);
  const [filterPos, setFilterPos] = React.useState({ x: 0, y: 0 });
  const [framePos, setFramePos] = React.useState({ x: 0, y: 0 });
  const [linkPos, setLinkPos] = React.useState({ x: 0, y: 0 });
  const [settingsPos, setSettingsPos] = React.useState({ x: 0, y: 0 });
  const [menuStretchPos, setMenuStretchPos] = React.useState({ x: 0, y: 0 });
  const [menuManagerPos, setMenuManagerPos] = React.useState({ x: 0, y: 0 });
  const [menuLayoutPos, setMenuLayoutPos] = React.useState({ x: 0, y: 0 });

  // Close floating panels when the selected node changes
  React.useEffect(() => {
    setFilterOpen(false);
    setFrameOpen(false);
    setLinkOpen(false);
    setSettingsOpen(false);
    setMenuStretchOpen(false);
    setMenuManagerOpen(false);
    setMenuLayoutOpen(false);
  }, [nodeId]);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const frameBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const menuStretchBtnRef = useRef<HTMLButtonElement>(null);
  const menuManagerBtnRef = useRef<HTMLButtonElement>(null);
  const menuLayoutBtnRef = useRef<HTMLButtonElement>(null);
  const { document: builderDoc } = useDocument();
  const { builder, dispatch } = useBuilder();
  const { t } = useTranslation();
  const node = builderDoc.nodes[nodeId];
  const aiConfig = useAIConfig();

  // Resolve component definition to check AI capabilities
  const registry = builder?.registry;
  const definition = node && registry ? registry.getComponent(node.type) : null;
  const hasAIText = definition?.capabilities.aiTextGeneration === true;
  const hasAIImage = definition?.capabilities.aiImageGeneration === true;
  const hasAI = hasAIText || hasAIImage;
  const aiMode = hasAIImage ? "image" : "text";

  // Section AI Assistant
  const isSection = node?.type === "Section";
  const isGalleryNode = node ? GALLERY_TYPES.has(node.type) : false;
  const isMenuNode = node?.type === "NavigationMenu";
  const currentChildIds = isSection
    ? Object.values(builderDoc.nodes)
        .filter((n) => n.parentId === nodeId)
        .map((n) => n.id)
    : [];
  const availableComponentTypes = registry
    ? registry.listComponents().map((d) => d.type)
    : [];
  const handleUndo = useCallback(() => { builder.undo(); }, [builder]);

  // Derive current content for AI (richtext prop or image src)
  const richTextProp = definition?.propSchema.find((p) => p.type === "richtext");
  const imageProp = definition?.propSchema.find((p) => p.type === "image");
  const currentAIContent: string = node && hasAIImage
    ? String(node.props[imageProp?.key ?? "src"] ?? "")
    : String(node?.props[richTextProp?.key ?? "content"] ?? node?.props.text ?? node?.props.content ?? "");

  const handleAIConfirm = useCallback(
    (newContent: string) => {
      const targetKey = hasAIImage
        ? (imageProp?.key ?? "src")
        : (richTextProp?.key ?? "content");
      dispatch({
        type: "UPDATE_PROPS",
        payload: { nodeId, props: { [targetKey]: newContent } },
        description: "AI Tools — apply content",
      });
    },
    [hasAIImage, imageProp, richTextProp, nodeId, dispatch],
  );

  const wrap = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  if (!node) return null;

  const TOOLBAR_HEIGHT = 40;
  // Convert canvas-space rect to viewport-space (accounting for zoom + panOffset)
  const viewportX = rect.x * zoom + panOffset.x;
  const viewportY = rect.y * zoom + panOffset.y;
  // Position above the node. If off-screen, put below.
  const yPos = viewportY - TOOLBAR_HEIGHT - 8 > 0
    ? viewportY - TOOLBAR_HEIGHT - 8
    : viewportY + rect.height * zoom + 8;

  const xPos = viewportX;

  // Breadcrumbs string
  const defaultComponentName = definition?.name ?? "";
  const hasCustomName = node.name && node.name !== defaultComponentName;
  let breadcrumb = hasCustomName ? node.name : node.type;
  // Gallery nodes: hiện "Gallery" hoặc "Carousel" thay vì type kỹ thuật
  if (isGalleryNode && !hasCustomName) {
    const lm = String(node.props["layoutMode"] ?? "grid");
    breadcrumb = ["slider", "slideshow", "carousel-3d"].includes(lm) ? "Carousel" : "Gallery";
  }
  // Tạm bỏ tính năng này.
  // if (node.parentId && node.parentId !== "root") {
  //   const pNode = document.nodes[node.parentId];
  //   if (pNode) {
  //     breadcrumb = `${pNode.name || pNode.type} > ${breadcrumb}`;
  //   }
  // }

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div
        className="absolute z-30 flex items-center bg-background/95 backdrop-blur-md rounded-md border shadow-md p-1 gap-1"
        style={{
          left: xPos,
          top: yPos,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-1 pl-1 pr-2 border-r cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onDragHandlePointerDown}
          title={t("contextToolbar.dragToMove")}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none truncate max-w-[150px]">
            {breadcrumb}
          </span>
        </div>

        {node.parentId && node.parentId !== "root" && !isSection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={wrap(() => dispatch({ type: "SELECT_NODE", payload: { nodeId: node.parentId } }))}>
                <CornerLeftUp className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Select Parent</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onMoveUp)}>
              <ArrowUp className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.moveUp")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onMoveDown)}>
              <ArrowDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.moveDown")}</TooltipContent>
        </Tooltip>

        {hasAI && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <AIToolsPopover
              mode={aiMode}
              currentContent={currentAIContent}
              componentType={node.type.toLowerCase()}
              aiConfig={aiConfig}
              onConfirm={handleAIConfirm}
            />
          </>
        )}

        {isSection && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <AISectionPopover
              sectionNodeId={nodeId}
              currentChildIds={currentChildIds}
              availableComponentTypes={availableComponentTypes}
              aiConfig={aiConfig}
              dispatch={dispatch}
              undo={handleUndo}
            />
          </>
        )}

        {/* NavigationMenu-specific quick actions */}
        {isMenuNode && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={menuStretchBtnRef}
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("menuToolbar.stretch.title", "Stretch")}
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuStretchBtnRef.current) {
                      const r = menuStretchBtnRef.current.getBoundingClientRect();
                      setMenuStretchPos(getClampedPanelPos(r, 280, 170));
                    }
                    setMenuManagerOpen(false);
                    setMenuLayoutOpen(false);
                    setMenuStretchOpen((v) => !v);
                  }}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("menuToolbar.stretch.title", "Stretch")}</TooltipContent>
            </Tooltip>

            {menuStretchOpen && node && createPortal(
              <FloatingPanel
                title={t("menuToolbar.stretch.title", "Stretch")}
                defaultPosition={{ x: menuStretchPos.x, y: menuStretchPos.y }}
                width={280}
                onClose={() => setMenuStretchOpen(false)}
              >
                <MenuStretchPopover node={node} dispatch={dispatch} />
              </FloatingPanel>,
              document.body,
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={menuManagerBtnRef}
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("menuToolbar.manager.title", "Manage Menu")}
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuManagerBtnRef.current) {
                      const r = menuManagerBtnRef.current.getBoundingClientRect();
                      setMenuManagerPos(getClampedPanelPos(r, 560, 560));
                    }
                    setMenuStretchOpen(false);
                    setMenuLayoutOpen(false);
                    setMenuManagerOpen((v) => !v);
                  }}
                >
                  <ListTree className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("menuToolbar.manager.title", "Manage Menu")}</TooltipContent>
            </Tooltip>

            {menuManagerOpen && node && createPortal(
              <FloatingPanel
                title={t("menuToolbar.manager.title", "Manage Menu")}
                defaultPosition={{ x: menuManagerPos.x, y: menuManagerPos.y }}
                width={560}
                onClose={() => setMenuManagerOpen(false)}
              >
                <MenuManagerPanel node={node} document={builderDoc} dispatch={dispatch} />
              </FloatingPanel>,
              document.body,
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={menuLayoutBtnRef}
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("menuToolbar.layout.title", "Menu Layout")}
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuLayoutBtnRef.current) {
                      const r = menuLayoutBtnRef.current.getBoundingClientRect();
                      setMenuLayoutPos(getClampedPanelPos(r, 380, 580));
                    }
                    setMenuStretchOpen(false);
                    setMenuManagerOpen(false);
                    setMenuLayoutOpen((v) => !v);
                  }}
                >
                  <LayoutPanelTop className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("menuToolbar.layout.title", "Menu Layout")}</TooltipContent>
            </Tooltip>

            {menuLayoutOpen && node && createPortal(
              <FloatingPanel
                title={t("menuToolbar.layout.title", "Menu Layout")}
                defaultPosition={{ x: menuLayoutPos.x, y: menuLayoutPos.y }}
                width={380}
                scrollable
                onClose={() => setMenuLayoutOpen(false)}
              >
                <MenuLayoutPanel node={node} dispatch={dispatch} />
              </FloatingPanel>,
              document.body,
            )}
          </>
        )}

        {/* Image-specific quick actions */}
        {node.type === "Image" && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Change Image */}
            {onOpenMediaManager && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={wrap(() => {
                      setFilterOpen(false);
                      setFrameOpen(false);
                      setLinkOpen(false);
                      onOpenMediaManager("src");
                    })}
                  >
                    <ImageIcon className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Change Image</TooltipContent>
              </Tooltip>
            )}

            {/* Filter picker — draggable FloatingPanel */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={filterBtnRef}
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (filterBtnRef.current) {
                      const r = filterBtnRef.current.getBoundingClientRect();
                      setFilterPos(getClampedPanelPos(r, 380, 450));
                    }
                    setFrameOpen(false);
                    setLinkOpen(false);
                    setFilterOpen((v) => !v);
                  }}
                >
                  <Paintbrush className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Filter</TooltipContent>
            </Tooltip>
            {filterOpen && createPortal(
              <FloatingPanel
                title="Image Filter"
                defaultPosition={{ x: filterPos.x, y: filterPos.y }}
                width={256}
                scrollable
                onClose={() => setFilterOpen(false)}
              >
                <ImageFilterPicker
                  previewSrc={String(node.props.src ?? "")}
                  value={String(node.props.filter ?? "none")}
                  onChange={(filter) => {
                    dispatch({
                      type: "UPDATE_PROPS",
                      payload: { nodeId, props: { filter } },
                      description: "Set image filter",
                    });
                  }}
                />
              </FloatingPanel>,
              document.body,
            )}

            {/* Frame Design — draggable FloatingPanel */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={frameBtnRef}
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (frameBtnRef.current) {
                      const r = frameBtnRef.current.getBoundingClientRect();
                      setFramePos(getClampedPanelPos(r, 320, 500));
                    }
                    setFilterOpen(false);
                    setLinkOpen(false);
                    setFrameOpen((v) => !v);
                  }}
                >
                  <Frame className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Frame Design</TooltipContent>
            </Tooltip>
            {frameOpen && createPortal(
              <FloatingPanel
                title="Frame Design"
                defaultPosition={{ x: framePos.x, y: framePos.y }}
                width={320}
                scrollable
                onClose={() => setFrameOpen(false)}
              >
                <ImageFramePanel
                  node={node}
                  onStyleChange={(style) => {
                    dispatch({
                      type: "UPDATE_STYLE",
                      payload: { nodeId, style },
                      description: "Set image frame",
                    });
                  }}
                  onPropChange={(props) => {
                    dispatch({
                      type: "UPDATE_PROPS",
                      payload: { nodeId, props },
                      description: "Set image frame effect",
                    });
                  }}
                />
              </FloatingPanel>,
              document.body,
            )}

            {/* Set Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={linkBtnRef}
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (linkBtnRef.current) {
                      const r = linkBtnRef.current.getBoundingClientRect();
                      setLinkPos(getClampedPanelPos(r, 300, 260));
                    }
                    setFilterOpen(false);
                    setFrameOpen(false);
                    setLinkOpen((v) => !v);
                  }}
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Set Link</TooltipContent>
            </Tooltip>
            {linkOpen && createPortal(
              <FloatingPanel
                title="Image Link"
                defaultPosition={{ x: linkPos.x, y: linkPos.y }}
                width={300}
                onClose={() => setLinkOpen(false)}
              >
                <ImageLinkPanel
                  url={String(node.props.linkUrl ?? "")}
                  target={String(node.props.linkTarget ?? "_blank")}
                  onApply={(linkUrl, linkTarget) => {
                    dispatch({
                      type: "UPDATE_PROPS",
                      payload: { nodeId, props: { linkUrl, linkTarget } },
                      description: "Set image link",
                    });
                  }}
                  onRemove={() => {
                    dispatch({
                      type: "UPDATE_PROPS",
                      payload: { nodeId, props: { linkUrl: "", linkTarget: "_blank" } },
                      description: "Remove image link",
                    });
                  }}
                  onClose={() => setLinkOpen(false)}
                />
              </FloatingPanel>,
              document.body,
            )}
          </>
        )}

        {/* Gallery-specific quick actions — shown for all GalleryPro-engine variants */}
        {isGalleryNode && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Manage Media */}
            {onOpenGalleryManager && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={wrap(() => {
                      setSettingsOpen(false);
                      onOpenGalleryManager();
                    })}
                  >
                    <Images className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Manage Media</TooltipContent>
              </Tooltip>
            )}

            {/* Settings button — mở unified panel (Layout + Design) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={settingsBtnRef}
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (settingsBtnRef.current) {
                      const r = settingsBtnRef.current.getBoundingClientRect();
                      setSettingsPos(getClampedPanelPos(r, 380, 560));
                    }
                    setSettingsOpen((v) => !v);
                  }}
                >
                  <Settings2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Settings</TooltipContent>
            </Tooltip>

            {/* Unified Settings panel */}
            {settingsOpen && node && createPortal(
              <FloatingPanel
                title="Settings"
                defaultPosition={{ x: settingsPos.x, y: settingsPos.y }}
                width={380}
                onClose={() => setSettingsOpen(false)}
              >
                <GalleryUnifiedSettingsPanel
                  node={node}
                  onPropChange={(props) => {
                    dispatch({ type: "UPDATE_PROPS", payload: { nodeId, props }, description: "Gallery settings" });
                  }}
                  onConfigChange={(partial) => {
                    const current = normalizeCarouselConfig(node.props["carouselConfig"]);
                    dispatch({
                      type: "UPDATE_PROPS",
                      payload: { nodeId, props: { carouselConfig: { ...current, ...partial } } },
                      description: "Carousel settings",
                    });
                  }}
                />
              </FloatingPanel>,
              document.body,
            )}
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onDuplicate)}>
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.duplicate")}</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive text-red-500" onClick={wrap(onDelete)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.delete")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
