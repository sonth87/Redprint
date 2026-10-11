import React, { useMemo, useRef, useEffect } from "react";
import {
  BuilderProvider,
  useBuilder,
  useSelection,
  useDocument,
  useBreakpoint,
  useHistory,
  NodeRenderer,
  BreakpointOverrideProvider,
} from "@ui-builder/builder-react";
import {
  DEVICE_VIEWPORT_PRESETS,
  resolveProps,
  type Asset,
  type AssetProvider,
  type AssetType,
  type BuilderAPI,
  type BuilderConfig,
  type CanvasMode,
  type ComponentDefinition,
  type GroupRegistry,
  type PaletteCatalog,
  type PopupDefinition,
  type PopupGoal,
  type PopupNodeTemplate,
  type PopupTemplate,
} from "@ui-builder/builder-core";
import {
  TRANSITION_FAST_CSS,
  TRANSITION_MID_CSS,
  type GalleryItem,
} from "@ui-builder/shared";
import { v4 as uuidv4 } from "uuid";
import { cn, toast } from "@ui-builder/ui";

import { CanvasRoot } from "./canvas/CanvasRoot";
import { EditorToolbar } from "./toolbar/EditorToolbar";
import { ArtboardContainer } from "./canvas/ArtboardContainer";
import { CanvasOverlays } from "./overlay/CanvasOverlays";
import { ScreenSpaceOverlays } from "./overlay/ScreenSpaceOverlays";
import { EditorPanelsHost } from "./panels/EditorPanelsHost";
import { EditorModalsHost } from "./modals/EditorModalsHost";
import { useSpacingOverlay } from "./hooks/useSpacingOverlay";
import { buildAIContext } from "./ai/buildAIContext";
import { AIConfigProvider } from "./ai/AIConfigContext";
import { initI18n, type SupportedLocale } from "./i18n";
import { useTranslation } from "react-i18next";
import { type RemotePaletteProvider } from "./types/remote-palette";
import { usePopupShellResize } from "./popups/usePopupShellResize";
import { usePopupShellDrag } from "./popups/usePopupShellDrag";

import { useViewport } from "./hooks/useViewport";
import { useResizeGesture } from "./hooks/useResizeGesture";
import { useRubberBand } from "./hooks/useRubberBand";
import { useMoveGesture } from "./hooks/useMoveGesture";
import { useRotateGesture } from "./hooks/useRotateGesture";
import { useSelectionRect } from "./hooks/useSelectionRect";
import { useHoverRect } from "./hooks/useHoverRect";
import { useDimensionCapture } from "./hooks/useDimensionCapture";
import { useDragHandlers } from "./hooks/useDragHandlers";
import { useClickToAdd } from "./hooks/useClickToAdd";
import { usePointerDown } from "./hooks/usePointerDown";
import { useZIndexHandlers } from "./hooks/useZIndexHandlers";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSectionResize } from "./hooks/useSectionResize";
import { useZoomFromCenter } from "./hooks/useZoomFromCenter";

// ── New extracted hooks ───────────────────────────────────────────────────
import { usePaletteState } from "./hooks/usePaletteState";
import { useLayersPanel } from "./hooks/useLayersPanel";
import { useAIConfig } from "./hooks/useAIConfig";
import { useCanvasDimensions } from "./hooks/useCanvasDimensions";
import { useAutoFitCanvas } from "./hooks/useAutoFitCanvas";
import { useInlineTextEdit } from "./hooks/useInlineTextEdit";
import { useDeleteConfirm } from "./hooks/useDeleteConfirm";
import { useMobileFrame } from "./hooks/useMobileFrame";
import { useNodeHandlers } from "./hooks/useNodeHandlers";
import { useDragHandleGesture } from "./hooks/useDragHandleGesture";
import { useRubberBandSelect } from "./hooks/useRubberBandSelect";
import { useCanvasActions } from "./hooks/useCanvasActions";
import { useBeforeUnload } from "./hooks/useBeforeUnload";

import {
  DEFAULT_COMPONENTS_PANEL_POS,
  DEFAULT_PROPERTIES_PANEL_POS,
  DUAL_GAP_PX,
} from "./constants";
// ── Context for Remote Palette Provider ─────────────────────────────────────

const RemotePaletteContext = React.createContext<RemotePaletteProvider | null>(null);

export const useRemotePaletteProvider = () => React.useContext(RemotePaletteContext);

// ── Inner editor (must be inside BuilderProvider) ─────────────────────────

function EditorInner({
  groupRegistry,
  paletteCatalog,
  remotePaletteProvider,
  locale,
  warnOnLeave,
  assetProvider,
}: {
  groupRegistry?: GroupRegistry;
  paletteCatalog?: PaletteCatalog;
  remotePaletteProvider?: RemotePaletteProvider;
  locale?: string;
  warnOnLeave?: boolean;
  assetProvider?: AssetProvider;
}) {
  const { t } = useTranslation();
  const { builder, state, dispatch } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { document } = useDocument();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const { undo, redo, canUndo, canRedo } = useHistory();

  useBeforeUnload((warnOnLeave ?? true) && canUndo);

  // ── Media / Asset state ──────────────────────────────────────────────────
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [mediaManagerOpen, setMediaManagerOpen] = React.useState(false);
  // Callback to call when user selects an asset in MediaManager
  const mediaSelectCallbackRef = React.useRef<((asset: Asset) => void) | null>(null);

  // Load assets on mount and whenever provider changes
  React.useEffect(() => {
    if (!assetProvider) return;
    assetProvider.listAssets({}).then((result) => setAssets(result.assets)).catch(() => {});
  }, [assetProvider]);

  const handleOpenMediaManager = React.useCallback((onSelect: (asset: Asset) => void) => {
    mediaSelectCallbackRef.current = onSelect;
    setMediaManagerOpen(true);
  }, []);

  const handleMediaSelect = React.useCallback((asset: Asset) => {
    mediaSelectCallbackRef.current?.(asset);
    mediaSelectCallbackRef.current = null;
    setMediaManagerOpen(false);
    // Refresh asset list
    assetProvider?.listAssets({}).then((r) => setAssets(r.assets)).catch(() => {});
  }, [assetProvider]);

  const handleMediaUpload = React.useCallback(async (files: File[]): Promise<Asset[]> => {
    if (!assetProvider?.upload) return [];
    const results = await Promise.allSettled(files.map((f) => assetProvider.upload!(f)));
    const uploaded: Asset[] = [];
    let errorCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled") uploaded.push(r.value);
      else errorCount++;
    }
    if (uploaded.length > 0) {
      setAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        return [...prev, ...uploaded.filter((a) => !existingIds.has(a.id))];
      });
      toast.success(
        uploaded.length === 1
          ? `"${uploaded[0]!.name}" uploaded`
          : `${uploaded.length} files uploaded`,
        { duration: 3000 }
      );
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} file${errorCount > 1 ? "s" : ""} failed to upload`);
    }
    return uploaded;
  }, [assetProvider]);

  const handleMediaDelete = React.useCallback(async (assetId: string) => {
    if (!assetProvider?.delete) return;
    await assetProvider.delete(assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }, [assetProvider]);

  const handleMediaUrlAdd = React.useCallback((url: string, type: AssetType) => {
    const asset: Asset = {
      id: url,
      url,
      type,
      name: url.split("/").pop() ?? url,
      source: "url",
    };
    handleMediaSelect(asset);
  }, [handleMediaSelect]);

  // ── Gallery media manager state ──────────────────────────────────────────
  const [galleryManagerOpen, setGalleryManagerOpen] = React.useState(false);
  const [galleryManagerNodeId, setGalleryManagerNodeId] = React.useState<string | null>(null);

  const handleOpenGalleryManager = React.useCallback(() => {
    const nodeId = selectedNodeIds[0];
    if (!nodeId) return;
    setGalleryManagerNodeId(nodeId);
    setGalleryManagerOpen(true);
  }, [selectedNodeIds]);

  const handleGalleryItemsChange = React.useCallback((nodeId: string, items: GalleryItem[]) => {
    dispatch({
      type: "UPDATE_PROPS",
      payload: { nodeId, props: { items } },
      description: "Update gallery items",
    });
  }, [dispatch]);

  // For ContextualToolbar: open media manager and apply result to a prop key
  const handleOpenMediaManagerForProp = React.useCallback((propKey: string) => {
    const nodeId = selectedNodeIds[0];
    if (!nodeId) return;
    handleOpenMediaManager((asset) => {
      dispatch({ type: "UPDATE_PROPS", payload: { nodeId, props: { [propKey]: asset.url } }, description: "Change Image" });
    });
  }, [selectedNodeIds, handleOpenMediaManager, dispatch]);

  const canvasMode: CanvasMode = state.editor.canvasMode ?? "single";
  const editingNodeId  = state.editor.editingNodeId  ?? null;
  const editingPropKey = state.editor.editingPropKey ?? null;
  const activePopupId = state.editor.activePopupId ?? null;
  const activePopupSelection = state.editor.activePopupSelection ?? null;
  const activePopupVariantId = state.editor.activePopupVariantId ?? null;
  const activePopupLocale = state.editor.activePopupLocale ?? null;
  const activePopup = activePopupId ? (document.popups?.[activePopupId] ?? null) : null;
  // Priority chain: variant root → locale root → base popup root.
  const activeVariantRootNodeId = activePopupVariantId
    ? activePopup?.variants?.find((v) => v.id === activePopupVariantId)?.rootNodeId
    : undefined;
  const activeLocaleRootNodeId = !activeVariantRootNodeId && activePopupLocale
    ? activePopup?.locales?.find((lc) => lc.locale === activePopupLocale)?.rootNodeId
    : undefined;
  const activeRootNodeId = activeVariantRootNodeId ?? activeLocaleRootNodeId ?? activePopup?.rootNodeId ?? document.rootNodeId;

  // ── Panel state ──────────────────────────────────────────────────────────
  const {
    paletteMode, setPaletteMode, activePaletteGroupId, setActivePaletteGroupId, handleGroupSelect, handlePaletteClose,
    pendingTargetSectionId, handleDSButtonClick,
  } = usePaletteState();
  const { layersOpen, layersPanelPos, handleLayersToggle } = useLayersPanel();
  const { aiOpen, setAiOpen, aiConfig, handleAIConfigChange } = useAIConfig();
  const [pageGeneratorOpen, setPageGeneratorOpen] = React.useState(false);
  const [figmaOpen, setFigmaOpen] = React.useState(false);
  const [popupsOpen, setPopupsOpen] = React.useState(false);
  const handlePopupsToggle = React.useCallback(() => {
    setPopupsOpen((v) => {
      const next = !v;
      if (next) setPaletteMode("docked");
      return next;
    });
  }, [setPaletteMode]);
  const [popupPreviewOpen, setPopupPreviewOpen] = React.useState(false);
  // Left/right panel collapse state for Ctrl+\ shortcut
  const [leftPanelVisible, setLeftPanelVisible] = React.useState(true);
  const [rightPanelVisible, setRightPanelVisible] = React.useState(true);
  const [popupTemplateVersion, setPopupTemplateVersion] = React.useState(0);

  React.useEffect(() => {
    const handlePanelToggle = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setLeftPanelVisible((v) => !v);
        setRightPanelVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handlePanelToggle);
    return () => window.removeEventListener("keydown", handlePanelToggle);
  }, []);

  React.useEffect(() => {
    setPopupPreviewOpen(false);
  }, [activePopupId]);

  // popupTemplateVersion is a manual invalidation counter incremented after register()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const popupTemplates = useMemo(() => builder.popupTemplates.list(), [builder.popupTemplates, popupTemplateVersion]);

  const dispatchPopupCommand = React.useCallback((command: Parameters<typeof dispatch>[0]) => {
    const result = dispatch(command);
    if (!result.success) {
      toast.error(result.error ?? "Popup action failed");
    }
    return result;
  }, [dispatch]);

  const handleCreatePopupFromTemplate = React.useCallback((template: PopupTemplate) => {
    const popupId = uuidv4();
    const rootNodeId = uuidv4();
    dispatchPopupCommand({
      type: "CREATE_POPUP",
      payload: {
        popupId,
        rootNodeId,
        name: template.popup.name ?? template.name,
        kind: template.popup.kind,
        placement: template.popup.placement,
        popup: template.popup,
        root: template.root,
      },
      description: `Create popup: ${template.name}`,
    });
  }, [dispatchPopupCommand]);

  const handleCreateBlankPopup = React.useCallback(() => {
    const popupId = uuidv4();
    const rootNodeId = uuidv4();
    dispatchPopupCommand({
      type: "CREATE_POPUP",
      payload: { popupId, rootNodeId, name: "New Popup", kind: "modal", placement: "center" },
      description: "Create popup",
    });
  }, [dispatchPopupCommand]);

  const handleEditPopup = React.useCallback((popupId: string | null) => {
    dispatchPopupCommand({ type: "SET_ACTIVE_POPUP", payload: { popupId }, description: popupId ? "Edit popup" : "Exit popup" });
    setPopupPreviewOpen(false);
  }, [dispatchPopupCommand]);

  const handleSelectPopupShell = React.useCallback(() => {
    dispatchPopupCommand({ type: "SET_ACTIVE_POPUP_SELECTION", payload: { selection: "shell" }, description: "Select popup shell" });
  }, [dispatchPopupCommand]);

  const handleSelectPopupContent = React.useCallback(() => {
    dispatchPopupCommand({ type: "SET_ACTIVE_POPUP_SELECTION", payload: { selection: "content" }, description: "Edit popup content" });
  }, [dispatchPopupCommand]);

  const handleUpdatePopup = React.useCallback((
    popupId: string,
    popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>,
    groupId?: string,
    description = "Update popup",
  ) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP", payload: { popupId, popup }, groupId, description });
  }, [dispatchPopupCommand]);

  // ── V4: goals / variants / experiment ──────────────────────────────────
  const handleAddGoal = React.useCallback((popupId: string) => {
    dispatchPopupCommand({ type: "ADD_POPUP_GOAL", payload: { popupId, goalId: uuidv4(), goal: { name: "New goal", type: "click" } }, description: "Add popup goal" });
  }, [dispatchPopupCommand]);

  const handleUpdateGoal = React.useCallback((popupId: string, goalId: string, goal: Partial<Omit<PopupGoal, "id">>) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP_GOAL", payload: { popupId, goalId, goal }, description: "Update popup goal" });
  }, [dispatchPopupCommand]);

  const handleRemoveGoal = React.useCallback((popupId: string, goalId: string) => {
    dispatchPopupCommand({ type: "REMOVE_POPUP_GOAL", payload: { popupId, goalId }, description: "Remove popup goal" });
  }, [dispatchPopupCommand]);

  const handleAddVariant = React.useCallback((popupId: string, cloneFromBase: boolean) => {
    dispatchPopupCommand({ type: "ADD_POPUP_VARIANT", payload: { popupId, variantId: uuidv4(), rootNodeId: cloneFromBase ? uuidv4() : undefined, cloneFromBase }, description: "Add popup variant" });
  }, [dispatchPopupCommand]);

  const handleUpdateVariant = React.useCallback((popupId: string, variantId: string, variant: Record<string, unknown>) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP_VARIANT", payload: { popupId, variantId, variant }, description: "Update popup variant" });
  }, [dispatchPopupCommand]);

  const handleRemoveVariant = React.useCallback((popupId: string, variantId: string) => {
    dispatchPopupCommand({ type: "REMOVE_POPUP_VARIANT", payload: { popupId, variantId }, description: "Remove popup variant" });
  }, [dispatchPopupCommand]);

  const handleEditVariantContent = React.useCallback((popupId: string, variantId: string | null) => {
    dispatchPopupCommand({ type: "SET_ACTIVE_POPUP_VARIANT", payload: { popupId, variantId }, description: "Edit variant content" });
  }, [dispatchPopupCommand]);

  const handleUpdateExperiment = React.useCallback((popupId: string, experiment: Record<string, unknown>) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP_EXPERIMENT", payload: { popupId, experiment }, description: "Update experiment" });
  }, [dispatchPopupCommand]);

  // ── V5: Locale handlers ──────────────────────────────────────────────────
  const handleAddLocale = React.useCallback((popupId: string, locale: string, opts: { cloneFromBase?: boolean }) => {
    dispatchPopupCommand({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale, rootNodeId: opts.cloneFromBase ? uuidv4() : undefined, cloneFromBase: opts.cloneFromBase }, description: "Add popup locale" });
  }, [dispatchPopupCommand]);

  const handleUpdateLocale = React.useCallback((popupId: string, locale: string, patch: Record<string, unknown>) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP_LOCALE", payload: { popupId, locale, patch }, description: "Update popup locale" });
  }, [dispatchPopupCommand]);

  const handleRemoveLocale = React.useCallback((popupId: string, locale: string) => {
    dispatchPopupCommand({ type: "REMOVE_POPUP_LOCALE", payload: { popupId, locale }, description: "Remove popup locale" });
  }, [dispatchPopupCommand]);

  const handleEditLocaleContent = React.useCallback((popupId: string, locale: string | null) => {
    dispatchPopupCommand({ type: "SET_ACTIVE_POPUP_LOCALE", payload: { popupId, locale }, description: "Edit locale content" });
  }, [dispatchPopupCommand]);

  // ── V5: Targeting / Schedule / Frequency handlers ────────────────────────
  const handleUpdateTargeting = React.useCallback((popupId: string, targeting: Record<string, unknown>) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP_TARGETING", payload: { popupId, targeting }, description: "Update popup targeting" });
  }, [dispatchPopupCommand]);

  const handleUpdateSchedule = React.useCallback((popupId: string, schedule: Record<string, unknown>) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP_SCHEDULE", payload: { popupId, schedule }, description: "Update popup schedule" });
  }, [dispatchPopupCommand]);

  const handleUpdateFrequency = React.useCallback((popupId: string, frequency: Record<string, unknown>) => {
    dispatchPopupCommand({ type: "UPDATE_POPUP_FREQUENCY", payload: { popupId, frequency }, description: "Update popup frequency" });
  }, [dispatchPopupCommand]);

  // ── V6: Campaign handlers (used by PopupPropertyPanel v6 section) ─────────

  const handleAssignCampaign = React.useCallback((popupId: string, campaignId: string | null) => {
    dispatchPopupCommand({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId }, description: "Assign campaign" });
  }, [dispatchPopupCommand]);

  const handleSetPopupPriority = React.useCallback((popupId: string, priority: number) => {
    dispatchPopupCommand({ type: "SET_POPUP_PRIORITY", payload: { popupId, priority }, description: "Set popup priority" });
  }, [dispatchPopupCommand]);


  const handleDuplicatePopup = React.useCallback((popupId: string) => {
    dispatchPopupCommand({
      type: "DUPLICATE_POPUP",
      payload: { popupId, newPopupId: uuidv4(), newRootNodeId: uuidv4() },
      description: "Duplicate popup",
    });
    setPopupPreviewOpen(false);
  }, [dispatchPopupCommand]);

  const handleDeletePopup = React.useCallback((popupId: string) => {
    dispatchPopupCommand({ type: "DELETE_POPUP", payload: { popupId }, description: "Delete popup" });
    setPopupPreviewOpen(false);
  }, [dispatchPopupCommand]);

  const handleTogglePopupEnabled = React.useCallback((popupId: string, enabled: boolean) => {
    dispatchPopupCommand({ type: enabled ? "ENABLE_POPUP" : "DISABLE_POPUP", payload: { popupId }, description: enabled ? "Enable popup" : "Disable popup" });
  }, [dispatchPopupCommand]);

  const handleSavePopupTemplate = React.useCallback(async (popupId: string) => {
    const popup = document.popups?.[popupId];
    const root = popup ? document.nodes[popup.rootNodeId] : null;
    if (!popup || !root) return;

    const buildTemplateNode = (nodeId: string): PopupNodeTemplate => {
      const node = document.nodes[nodeId]!;
      const children = Object.values(document.nodes)
        .filter((child) => child.parentId === nodeId)
        .sort((a, b) => a.order - b.order)
        .map((child) => buildTemplateNode(child.id));
      return {
        componentType: node.type,
        name: node.name,
        props: node.props,
        style: node.style,
        responsiveStyle: node.responsiveStyle,
        responsiveProps: node.responsiveProps,
        children: children.length > 0 ? children : undefined,
      };
    };

    const popupConfig = {
      name: popup.name,
      enabled: popup.enabled,
      kind: popup.kind,
      placement: popup.placement,
      kindConfig: popup.kindConfig,
      autoTrigger: popup.autoTrigger,
      behavior: popup.behavior,
      animation: popup.animation,
      rules: popup.rules,
    };
    const rootNode = buildTemplateNode(root.id);

    // Register in-memory (always)
    builder.popupTemplates.register({
      id: `custom-${popup.id}`,
      name: popup.name,
      category: "My Library",
      description: "Saved from editor",
      tags: ["custom", popup.kind],
      popup: popupConfig,
      root: rootNode,
    });
    setPopupTemplateVersion((v) => v + 1);

    // Persist to server if backendUrl is available
    if (aiConfig.backendUrl) {
      try {
        const { popupApiClient } = await import("./popups/popupApiClient");
        await popupApiClient.saveToLibrary(aiConfig.backendUrl, {
          name: popup.name,
          category: "My Library",
          description: "Saved from editor",
          tags: ["custom", popup.kind],
          thumbnail: null,
          popup: popupConfig,
          root: rootNode,
        });
        toast.success(`Saved "${popup.name}" to library`);
      } catch {
        toast.success(`Saved "${popup.name}" as template (local only)`);
      }
    } else {
      toast.success(`Saved "${popup.name}" as template`);
    }
  }, [builder.popupTemplates, document, aiConfig.backendUrl]);

  const [remoteCatalog, setRemoteCatalog] = React.useState<PaletteCatalog | undefined>();
  const [loadedGroups, setLoadedGroups] = React.useState<Set<string>>(new Set());
  const [isCatalogLoading, setIsCatalogLoading] = React.useState(false);
  const [isGroupLoading, setIsGroupLoading] = React.useState(false);
  const effectiveCatalog = paletteCatalog || remoteCatalog;

  // Initial metadata fetch
  React.useEffect(() => {
    if (remotePaletteProvider && !paletteCatalog && !remoteCatalog) {
      setIsCatalogLoading(true);
      remotePaletteProvider.fetchMetadata()
        .then(setRemoteCatalog)
        .catch(console.error)
        .finally(() => setIsCatalogLoading(false));
    }
  }, [remotePaletteProvider, paletteCatalog, remoteCatalog]);

  // On-demand group items fetch
  React.useEffect(() => {
    if (!remotePaletteProvider || !activePaletteGroupId || !remoteCatalog || loadedGroups.has(activePaletteGroupId)) {
      setIsGroupLoading(false);
      return;
    }

    setIsGroupLoading(true);
    remotePaletteProvider.fetchGroupItems(activePaletteGroupId).then((groupData) => {
      setRemoteCatalog((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map((g) => {
            if (g.id !== activePaletteGroupId) return g;
            return {
              ...g,
              types: g.types.map((t) => {
                const updatedType = groupData.types.find((ut) => ut.id === t.id);
                return updatedType ? { ...t, items: updatedType.items } : t;
              })
            };
          })
        };
      });
      setLoadedGroups((prev) => new Set(prev).add(activePaletteGroupId));
      setIsGroupLoading(false);
    }).catch((err) => {
      console.error(err);
      setIsGroupLoading(false);
    });
  }, [remotePaletteProvider, activePaletteGroupId, remoteCatalog, loadedGroups]);

  // ── Canvas geometry ──────────────────────────────────────────────────────
  const { canvasWidth, canvasMinHeight, sectionNodes } = useCanvasDimensions({ document, breakpoint });

  // ── Viewport (zoom / pan / tool) ─────────────────────────────────────────
  const { zoom, setZoom, panOffset, setPanOffset, activeTool, setActiveTool, showGrid, toggleGrid } = useViewport();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef      = useRef<HTMLDivElement>(null);
  const canvasFrameRef     = useRef<HTMLDivElement>(null);
  const mobileFrameRef     = useRef<HTMLDivElement>(null);
  const popupFrameRef      = useRef<HTMLDivElement>(null);
  const activeFrameRef = useRef<HTMLDivElement | null>(null);
  activeFrameRef.current =
    activePopup && popupFrameRef.current
      ? popupFrameRef.current
      : canvasMode === "dual" && breakpoint === "mobile" && mobileFrameRef.current
      ? mobileFrameRef.current
      : canvasFrameRef.current;

  useEffect(() => {
    if (activePopup && popupFrameRef.current) {
      activeFrameRef.current = popupFrameRef.current;
    }
  }, [activePopup]);

  const handlePopupShellResizeStart = usePopupShellResize({
    popup: activePopup,
    popupFrameRef,
    zoom,
    updatePopup: handleUpdatePopup,
  });
  const handlePopupShellDragStart = usePopupShellDrag({
    popup: activePopup,
    zoom,
    updatePopup: handleUpdatePopup,
  });

  const desktopWidth = document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width;
  const desktopHeight = document.canvasConfig.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height;
  const mobileWidth = DEVICE_VIEWPORT_PRESETS.mobile.width;
  const mobileHeight = DEVICE_VIEWPORT_PRESETS.mobile.height;

  const { mobileFramePos, handleMobileFrameGripDown, guides: mobileFrameGuides } = useMobileFrame({ zoom, desktopWidth, desktopHeight, mobileWidth, mobileHeight });

  const boundingWidth = canvasMode === "dual" 
    ? desktopWidth + DUAL_GAP_PX + mobileWidth + Math.max(0, mobileFramePos.x)
    : canvasWidth;

  const actualDesktopHeight = canvasFrameRef.current?.offsetHeight ?? canvasMinHeight;
  const actualMobileHeight = mobileFrameRef.current?.offsetHeight ?? mobileHeight;

  const boundingHeight = canvasMode === "dual"
    ? Math.max(actualDesktopHeight, actualMobileHeight + Math.max(0, mobileFramePos.y))
    : actualDesktopHeight;

  const { handleFitToScreen, isCanvasInViewport } = useAutoFitCanvas({
    breakpoint, canvasMode, canvasWidth, canvasMinHeight,
    boundingWidth, boundingHeight,
    canvasContainerRef, clearSelection, setZoom, setPanOffset, zoom, panOffset,
  });

  // ── Zoom from canvas center ──────────────────────────────────────────────
  const { handleZoomInFromCenter, handleZoomOutFromCenter } = useZoomFromCenter({
    canvasContainerRef, zoom, panOffset, setZoom, setPanOffset,
  });

  // ── Derived selection ────────────────────────────────────────────────────
  const selectedNodeId     = selectedNodeIds[0] ?? null;
  const selectedNode       = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
  const registry           = builder?.registry;
  const selectedDefinition = selectedNode && registry ? (registry.getComponent(selectedNode.type) ?? null) : null;
  const allComponents: ComponentDefinition[] = useMemo(() => registry ? registry.listComponents() : [], [registry]);

  const {
    snapEngine,
    getContainerConfig,
    handleAddSection,
    toggleCanvasMode,
  } = useCanvasActions({
    document, allComponents, registry, canvasMode, canvasWidth, canvasMinHeight,
    canvasActualHeight: actualDesktopHeight,
    showGrid, dispatch,
  });

  const { handleRubberBandSelect } = useRubberBandSelect({
    document: { nodes: document.nodes, rootNodeId: activeRootNodeId }, zoom, selectedNodeIds, select, clearSelection, canvasFrameRef: activeFrameRef,
  });

  const selectedSectionNode =
    !activePopup && selectedNodeId && document.nodes[selectedNodeId]?.type === "Section"
      ? document.nodes[selectedNodeId]
      : null;
  const currentSectionChildIds = selectedSectionNode
    ? Object.values(document.nodes)
        .filter((n) => n.parentId === selectedSectionNode.id)
        .map((n) => n.id)
    : [];

  const aiContext = useMemo(
    () => buildAIContext(state, allComponents, {
      includePageContext: aiConfig.includePageContext,
      paletteCatalog: paletteCatalog ?? undefined,
      designTokens: aiConfig.designTokens,
    }),
    [state, allComponents, aiConfig.includePageContext, paletteCatalog, aiConfig.designTokens],
  );

  // ── Snap engine (now handled by hook) ────────────────────────────────────


  // ── Gesture hooks ────────────────────────────────────────────────────────
  const { resizing, setResizing, snapGuides: resizeSnapGuides, distanceGuides: resizeDistanceGuides, liveDimensions: resizeLiveDimensions } =
    useResizeGesture({ zoom, breakpoint, showGrid, gridSize: document.canvasConfig.gridSize, snapEngine, nodes: document.nodes, canvasFrameRef, activeFrameRef, dispatch, getContainerConfig });

  const { rubberBanding, setRubberBanding, rubberBandRect } = useRubberBand({ zoom, canvasFrameRef, onSelectionEnd: handleRubberBandSelect });

  const { moving, setMoving, dragStartedRef, snapGuides: moveSnapGuides, distanceGuides: moveDistanceGuides, liveDimensions: moveLiveDimensions, flowDragOffset, flowDropTarget, highlightedNodeIds } =
    useMoveGesture({ zoom, breakpoint, snapEnabled: showGrid, snapEngine, nodes: document.nodes, canvasFrameRef, activeFrameRef, dispatch, rootNodeId: activeRootNodeId, getContainerConfig });

  useEffect(() => {
    const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;
    if (!frameEl || highlightedNodeIds.length === 0) return;
    const els = highlightedNodeIds
      .map(id => frameEl.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null)
      .filter((el): el is HTMLElement => el !== null);
    els.forEach(el => {
      el.style.boxShadow = "0 0 0 1px hsl(var(--snap-guide-color, 221.2 83.2% 53.3%))";
    });
    return () => {
      els.forEach(el => {
        el.style.boxShadow = "";
      });
    };
  }, [highlightedNodeIds, activeFrameRef, canvasFrameRef]);

  const { rotating, startRotate } = useRotateGesture({ breakpoint, dispatch });
  const { sectionResizing, startSectionResize } = useSectionResize({ zoom, showGrid, gridSize: document.canvasConfig.gridSize, breakpoint, nodes: document.nodes, dispatch });

  const snapGuides     = moving ? moveSnapGuides     : resizeSnapGuides;
  const distanceGuides = moving ? moveDistanceGuides : resizeDistanceGuides;
  const liveDimensions = moving ? moveLiveDimensions : resizeLiveDimensions;

  // ── Overlay hooks ────────────────────────────────────────────────────────
  const { selectionRect: selectionRectRaw, currentRotation } = useSelectionRect({
    selectedNodeIds, zoom, panOffset, nodes: document.nodes, canvasFrameRef, breakpoint, nodeQueryRef: activeFrameRef,
  });


  const { hoverRect, handleMouseOver, handleMouseOut, setHoveredNodeIdFromLayer } = useHoverRect({
    selectedNodeIds, rootNodeId: activeRootNodeId, zoom, panOffset, nodes: document.nodes, canvasFrameRef, nodeQueryRef: activeFrameRef,
  });

  const { spacingRects } = useSpacingOverlay({
    selectedNodeIds, zoom, panOffset, nodes: document.nodes,
    canvasContainerRef, canvasFrameRef, nodeQueryRef: activeFrameRef,
  });

  useDimensionCapture({ nodes: document.nodes, breakpoint, canvasFrameRef, dispatch });

  // ── Interaction hooks ────────────────────────────────────────────────────
  const { handleDragStart, handlePaletteDragStart, handleDrop, handleDragOver, handleDragEnter, handleDragLeave, isDSDragging, paletteFlowDropTarget } =
    useDragHandlers({ rootNodeId: activeRootNodeId, zoom, canvasFrameRef: activeFrameRef, dispatch, nodes: document.nodes, getContainerConfig, onAfterDrop: handlePaletteClose });

  const { addItem: handlePaletteItemClick } = useClickToAdd({ rootNodeId: activeRootNodeId, nodes: document.nodes, selectedNodeIds, pendingTargetSectionId: activePopup ? activeRootNodeId : pendingTargetSectionId, zoom, breakpoint, canvasContainerRef, canvasFrameRef: activeFrameRef, resolveComponentDefinition: (componentType) => registry?.getComponent(componentType), dispatch, onAfterAdd: handlePaletteClose });

  const { handlePointerDown } = usePointerDown({
    activeTool, zoom, rootNodeId: activeRootNodeId, nodes: document.nodes, canvasFrameRef, activeFrameRef,
    dragStartedRef, dispatch, clearSelection, setMoving, setRubberBanding, selectedNodeIds,
  });

  const { onMoveUp, onMoveDown } = useZIndexHandlers({ selectedNodeId, nodes: document.nodes, dispatch });

  // ── Node mutation handlers ────────────────────────────────────────────────
  const { handleToggleHidden, handleToggleLocked, handlePropChange, handleStyleChange, handleCanvasConfigChange } =
    useNodeHandlers({ selectedNodeId, breakpoint, dispatch, nodes: document.nodes });

  // ── Inline text editing ──────────────────────────────────────────────────
  const { tiptapEditor, setTiptapEditor, editingOverrideRect, setEditingOverrideRect, handleInlineCommit, handleInlineExit, handleCanvasDoubleClick } =
    useInlineTextEdit({ editingNodeId, editingPropKey, nodes: document.nodes, registry, dispatch, breakpoint });

  const selectionRectBase = editingNodeId ? (editingOverrideRect ?? selectionRectRaw) : selectionRectRaw;
  const selectionRect     = selectionRectBase && flowDragOffset
    ? { ...selectionRectBase, x: selectionRectBase.x + flowDragOffset.x, y: selectionRectBase.y + flowDragOffset.y }
    : selectionRectBase;

  // ── Delete with confirmation ──────────────────────────────────────────────
  const { deleteConfirmNodeId, setDeleteConfirmNodeId, deleteConfirmChildCount, handleDeleteNode, handleDeleteNodes, executeConfirmedDelete } =
    useDeleteConfirm({ nodes: document.nodes, rootNodeId: activeRootNodeId, sectionNodes, registry, dispatch });

  // ── Drag handle gesture ───────────────────────────────────────────────────
  const { handleDragHandlePointerDown } = useDragHandleGesture({
    selectedNodeId, selectedNodeIds, nodes: document.nodes, zoom, activeFrameRef, canvasFrameRef, dragStartedRef, setMoving,
  });

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts({
    selectedNodeIds, rootNodeId: activeRootNodeId, nodes: document.nodes, clipboard: state.editor.clipboard,
    breakpoint, editingNodeId, canvasContainerRef, dispatch, clearSelection, undo, redo, setBreakpoint, 
    onDeleteNode: handleDeleteNode, onDeleteNodes: handleDeleteNodes,
  });

  const canvasConfigParams = useMemo(
    () => ({ ...document.canvasConfig, showGrid, snapEnabled: showGrid }),
    [document.canvasConfig, showGrid],
  );

  const frameEventHandlers = {
    onDoubleClick: handleCanvasDoubleClick,
    onMouseOver: handleMouseOver,
    onMouseOut: handleMouseOut,
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  } as const;

  const sharedSectionOverlayProps = {
    nodes: document.nodes,
    rootNodeId: document.rootNodeId,
    zoom,
    panOffset,
    onAddSection: handleAddSection,
    onResizeStart: (nodeId: string, clientY: number, currentHeightPx: number, gid: string, minAllowedHeight: number) =>
      startSectionResize(nodeId, clientY, currentHeightPx, gid, minAllowedHeight),
    isResizing: sectionResizing !== null,
    onSelect: (nodeId: string) => select([nodeId]),
    selectedNodeIds,
    onOpenPaletteGroup: handleGroupSelect,
    onDSButtonClick: handleDSButtonClick,
    isDSDragging,
    aiConfig,
    dispatch,
    undo,
    availableComponentTypes: allComponents.map((c) => c.type),
  } as const;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AIConfigProvider config={aiConfig}>
      <div
        className="bg-background relative flex h-full w-full flex-col overflow-hidden"
        ref={canvasContainerRef}
        tabIndex={0}
        style={{ outline: "none" }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <EditorToolbar
          breakpoint={breakpoint} zoom={zoom} showGrid={showGrid} canUndo={canUndo} canRedo={canRedo}
          activeTool={activeTool} canvasMode={canvasMode}
          onBreakpointChange={setBreakpoint} onZoomChange={setZoom} onZoomInFromCenter={handleZoomInFromCenter} onZoomOutFromCenter={handleZoomOutFromCenter} onGridToggle={toggleGrid}
          onUndo={undo} onRedo={redo}
          onToolChange={(tool) => { setActiveTool(tool); if (tool === "pan") clearSelection(); }}
          onCanvasModeToggle={toggleCanvasMode} onFitToScreen={handleFitToScreen}
          onAIOpen={() => setAiOpen(true)}
          onFigmaOpen={() => setFigmaOpen(true)}
        />

        {/* Panels */}
        <EditorPanelsHost
          leftPanelVisible={leftPanelVisible}
          rightPanelVisible={rightPanelVisible}
          paletteMode={paletteMode}
          effectiveCatalog={effectiveCatalog}
          remotePaletteProvider={remotePaletteProvider}
          activePaletteGroupId={activePaletteGroupId}
          onGroupSelect={handleGroupSelect}
          locale={locale}
          layersOpen={layersOpen}
          onLayersToggle={handleLayersToggle}
          popupsOpen={popupsOpen}
          onPopupsToggle={handlePopupsToggle}
          document={document}
          activePopupId={activePopupId}
          popupTemplates={popupTemplates}
          aiConfig={aiConfig}
          onCreatePopupFromTemplate={handleCreatePopupFromTemplate}
          onCreateBlankPopup={handleCreateBlankPopup}
          onEditPopup={handleEditPopup}
          onDuplicatePopup={handleDuplicatePopup}
          onDeletePopup={handleDeletePopup}
          onTogglePopupEnabled={handleTogglePopupEnabled}
          onUpdatePopup={(popupId, popup) => handleUpdatePopup(popupId, popup)}
          onSavePopupTemplate={async (popupId) => handleSavePopupTemplate(popupId)}
          setActivePaletteGroupId={setActivePaletteGroupId}
          onPaletteClose={handlePaletteClose}
          onPaletteDragStart={handlePaletteDragStart}
          onPaletteItemClick={handlePaletteItemClick}
          isCatalogLoading={isCatalogLoading}
          isGroupLoading={isGroupLoading}
          allComponents={allComponents}
          onComponentDragStart={handleDragStart}
          groupRegistry={groupRegistry}
          layersPanelPos={layersPanelPos}
          activeRootNodeId={activeRootNodeId}
          selectedNodeIds={selectedNodeIds}
          activePopupSelection={activePopupSelection}
          onSelect={select}
          onToggleHidden={handleToggleHidden}
          onToggleLocked={handleToggleLocked}
          onNodeHover={setHoveredNodeIdFromLayer}
          activePopup={activePopup}
          onAddGoal={handleAddGoal}
          onUpdateGoal={handleUpdateGoal}
          onRemoveGoal={handleRemoveGoal}
          onAddVariant={handleAddVariant}
          onUpdateVariant={handleUpdateVariant}
          onRemoveVariant={handleRemoveVariant}
          onEditVariantContent={handleEditVariantContent}
          onUpdateExperiment={handleUpdateExperiment}
          activeVariantId={state.editor.activePopupVariantId ?? null}
          onAddLocale={handleAddLocale}
          onUpdateLocale={handleUpdateLocale}
          onRemoveLocale={handleRemoveLocale}
          onEditLocaleContent={handleEditLocaleContent}
          activePopupLocale={activePopupLocale}
          onUpdateTargeting={handleUpdateTargeting}
          onUpdateSchedule={handleUpdateSchedule}
          onUpdateFrequency={handleUpdateFrequency}
          onAssignCampaign={handleAssignCampaign}
          onSetPopupPriority={handleSetPopupPriority}
          selectedNode={selectedNode}
          selectedDefinition={selectedDefinition ?? undefined}
          breakpoint={breakpoint}
          onPropChange={handlePropChange}
          onStyleChange={handleStyleChange}
          onInteractionsChange={(interactions) => {
            if (!selectedNodeId) return;
            dispatch({
              type: "UPDATE_INTERACTIONS",
              payload: { nodeId: selectedNodeId, interactions },
              description: "Update interactions",
            });
          }}
          assets={assets}
          onOpenMediaManager={handleOpenMediaManager}
          spacingRects={spacingRects}
          onCanvasConfigChange={handleCanvasConfigChange}
          onAIConfigChange={handleAIConfigChange}
        />

        {/* Canvas area */}
        <div ref={canvasAreaRef} className="bg-muted/20 absolute inset-0 z-0 overflow-hidden">
          <CanvasRoot
            canvasConfig={canvasConfigParams}
            zoom={zoom}
            panOffset={panOffset}
            onZoomChange={setZoom}
            onPanOffsetChange={setPanOffset}
            activeTool={activeTool}
            className="h-full w-full"
            wheelListenerParent={canvasAreaRef}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (
                target.closest("[data-floating-panel]") ||
                target.closest("[data-resize-handle]") ||
                target.closest("[data-rotation-handle]")
              ) return;
              handlePointerDown(e);
            }}
          >
            <ArtboardContainer
              canvasMode={canvasMode}
              mobileFrameGuides={mobileFrameGuides}
              mobileWidth={mobileWidth}
              mobileFramePos={mobileFramePos}
              breakpoint={breakpoint}
              setBreakpoint={setBreakpoint}
              zoom={zoom}
              document={document}
              canvasFrameRef={canvasFrameRef}
              mobileFrameRef={mobileFrameRef}
              popupFrameRef={popupFrameRef}
              activePopup={activePopup}
              activePopupSelection={activePopupSelection}
              popupPreviewOpen={popupPreviewOpen}
              sharedSectionOverlayProps={sharedSectionOverlayProps}
              frameEventHandlers={frameEventHandlers}
              onPointerDown={handlePointerDown}
              onMobileFrameGripDown={handleMobileFrameGripDown}
              canvasWidth={canvasWidth}
              canvasMinHeight={actualDesktopHeight}
              sectionNodes={sectionNodes}
              onSelectPopupShell={handleSelectPopupShell}
              onSelectPopupContent={handleSelectPopupContent}
              onEditPopup={handleEditPopup}
              onDuplicatePopup={handleDuplicatePopup}
              onDeletePopup={handleDeletePopup}
              onTogglePopupEnabled={handleTogglePopupEnabled}
              onTogglePopupPreview={() => setPopupPreviewOpen((open) => !open)}
              onPopupShellResizeStart={handlePopupShellResizeStart}
              onPopupShellDragStart={handlePopupShellDragStart}
              onOpenPageGenerator={() => setPageGeneratorOpen(true)}
              onCanvasDoubleClick={handleCanvasDoubleClick}
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />

            <CanvasOverlays
              popupPreviewOpen={popupPreviewOpen}
              selectedNodeIds={selectedNodeIds}
              selectionRect={selectionRect}
              rubberBanding={rubberBanding}
              rubberBandRect={rubberBandRect}
              zoom={zoom}
              currentRotation={currentRotation}
              isSection={!!selectedSectionNode}
              activePopup={activePopup}
              onDoubleClick={handleCanvasDoubleClick}
              onResizeStart={(handle, e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectionRect || !selectedNodeId) return;
                if (document.nodes[selectedNodeId]?.locked) return;
                setResizing({
                  handle,
                  nodeId: selectedNodeId,
                  startPoint: { x: e.clientX, y: e.clientY },
                  startRect: { ...selectionRect },
                  gestureGroupId: uuidv4(),
                });
              }}
              onRotateStart={(e) => {
                if (!selectionRect || !selectedNodeId) return;
                if (document.nodes[selectedNodeId]?.locked) return;
                const queryRoot = activeFrameRef.current ?? canvasFrameRef.current;
                if (!queryRoot) return;
                const el = queryRoot.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement;
                if (!el) return;
                startRotate({
                  nodeId: selectedNodeId,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  elementRect: el.getBoundingClientRect(),
                  currentRotation,
                  gestureGroupId: uuidv4(),
                });
              }}
              hoverRect={hoverRect}
              showHelperLines={!!document.canvasConfig.showHelperLines}
              snapGuides={snapGuides}
              guideCanvasWidth={canvasMode === "dual" ? boundingWidth : canvasWidth}
              guideCanvasHeight={canvasMode === "dual" ? boundingHeight : actualDesktopHeight}
              helperLineColor={document.canvasConfig.helperLineColor}
              distanceGuides={distanceGuides}
              liveDimensions={liveDimensions}
              flowDropTarget={flowDropTarget}
              moving={moving}
              paletteFlowDropTarget={paletteFlowDropTarget}
              activeFrameRef={activeFrameRef}
              canvasFrameRef={canvasFrameRef}
              nodes={document.nodes}
            />
          </CanvasRoot>

          <ScreenSpaceOverlays
            popupPreviewOpen={popupPreviewOpen}
            spacingRects={spacingRects}
            selectedNodeIds={selectedNodeIds}
            selectedSectionNode={selectedSectionNode}
            sectionNodes={sectionNodes}
            activePopup={activePopup}
            selectionRect={selectionRect}
            zoom={zoom}
            panOffset={panOffset}
            editingNodeId={editingNodeId}
            editingPropKey={editingPropKey}
            document={document}
            registry={registry}
            breakpoint={breakpoint}
            activeFrameRef={activeFrameRef}
            canvasContainerRef={canvasContainerRef}
            rotating={rotating}
            currentRotation={currentRotation}
            resizing={resizing}
            isCanvasInViewport={isCanvasInViewport}
            tiptapEditor={tiptapEditor}
            setTiptapEditor={setTiptapEditor}
            setEditingOverrideRect={setEditingOverrideRect}
            onInlineCommit={handleInlineCommit}
            onInlineExit={handleInlineExit}
            onFitToScreen={handleFitToScreen}
            dispatch={dispatch}
            newNodeId={uuidv4}
            canvasMode={canvasMode}
            desktopFrameWidth={document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width}
            mobileFramePos={mobileFramePos}
            onDeleteNode={handleDeleteNode}
            onDeleteNodes={handleDeleteNodes}
            onDuplicateSingleNode={() => {
              if (!selectedNodeId) return;
              dispatch({
                type: "DUPLICATE_NODE",
                payload: { nodeId: selectedNodeId, offset: { x: 20, y: 20 }, newNodeId: uuidv4() },
                description: "Duplicate",
              });
            }}
            onDuplicateMultiNodes={() => {
              const newNodeIds = selectedNodeIds.map(() => uuidv4());
              dispatch({
                type: "DUPLICATE_NODES",
                payload: { nodeIds: selectedNodeIds, offset: { x: 20, y: 20 }, newNodeIds },
                description: `Duplicate ${selectedNodeIds.length} nodes`,
              });
            }}
            aiConfig={aiConfig}
            undo={undo}
            currentSectionChildIds={currentSectionChildIds}
            availableComponentTypes={allComponents.map((c) => c.type)}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDragHandlePointerDown={handleDragHandlePointerDown}
            onOpenMediaManagerForProp={assetProvider ? handleOpenMediaManagerForProp : undefined}
            onOpenGalleryManager={assetProvider ? handleOpenGalleryManager : undefined}
          />
        </div>
      </div>

      <EditorModalsHost
        aiOpen={aiOpen}
        onAiOpenChange={setAiOpen}
        aiConfig={aiConfig}
        aiContext={aiContext}
        pageGeneratorOpen={pageGeneratorOpen}
        onPageGeneratorOpenChange={setPageGeneratorOpen}
        figmaOpen={figmaOpen}
        onFigmaOpenChange={setFigmaOpen}
        deleteConfirmNodeId={deleteConfirmNodeId}
        deleteConfirmChildCount={deleteConfirmChildCount}
        onConfirmDelete={executeConfirmedDelete}
        onCancelDelete={() => setDeleteConfirmNodeId(null)}
        galleryManagerOpen={galleryManagerOpen}
        galleryManagerNodeId={galleryManagerNodeId}
        onGalleryOpenChange={(open) => {
          if (!open) setGalleryManagerNodeId(null);
          setGalleryManagerOpen(open);
        }}
        galleryItems={
          galleryManagerNodeId
            ? (((document.nodes[galleryManagerNodeId]?.props["items"]) as GalleryItem[] | undefined) ?? [])
            : []
        }
        onGalleryItemsChange={(items) => {
          if (galleryManagerNodeId) {
            handleGalleryItemsChange(galleryManagerNodeId, items);
          }
        }}
        onOpenMediaManager={handleOpenMediaManager}
        mediaManagerOpen={mediaManagerOpen}
        onMediaManagerOpenChange={(open) => {
          if (!open) mediaSelectCallbackRef.current = null;
          setMediaManagerOpen(open);
        }}
        assets={assets}
        onMediaSelect={handleMediaSelect}
        assetProvider={assetProvider}
        onMediaUpload={assetProvider?.upload ? handleMediaUpload : undefined}
        onMediaDelete={assetProvider?.delete ? handleMediaDelete : undefined}
        onMediaUrlAdd={handleMediaUrlAdd}
      />
    </AIConfigProvider>
  );
}

// ── Public BuilderEditor ───────────────────────────────────────────────────

export interface BuilderEditorProps {
  builder?: BuilderAPI;
  config?: BuilderConfig;
  className?: string;
  /** Optional GroupRegistry for 2-level component palette (Group -> SubGroup -> component) */
  groupRegistry?: GroupRegistry;
  /**
   * Optional palette catalog (JSON-driven "Add Elements" panel).
   * When provided, replaces the legacy ComponentPalette with the new Wix-style palette.
   */
  paletteCatalog?: PaletteCatalog;
  /** Whether to fetch the palette catalog from a remote API if paletteCatalog is not provided */
  useRemotePalette?: boolean;
  /** Custom provider for fetching remote palette data. If provided, overrides internal defaults. */
  remotePaletteProvider?: RemotePaletteProvider;
  /** Locale for i18n (e.g., "en", "vi") */
  locale?: SupportedLocale | string;
  /** Additional i18n resources to merge with built-in translations */
  i18nResources?: Record<string, { translation: Record<string, unknown> }>;
  /** Key separator for i18n. Default: "." Set to false to disable nesting. */
  i18nKeySeparator?: string | false;
  /** Show browser leave-confirmation when there are unsaved changes. Default: true */
  warnOnLeave?: boolean;
  /**
   * Asset provider for media management (upload, list, delete).
   * When provided, enables the MediaManager dialog and image controls.
   */
  assetProvider?: AssetProvider;
}

export function BuilderEditor({
  builder,
  config,
  className,
  groupRegistry,
  paletteCatalog,
  useRemotePalette: _useRemotePalette,
  remotePaletteProvider,
  locale,
  i18nResources,
  i18nKeySeparator,
  warnOnLeave,
  assetProvider,
}: BuilderEditorProps) {
  React.useEffect(() => {
    if (locale || i18nResources || i18nKeySeparator !== undefined) {
      initI18n({ language: locale, resources: i18nResources, keySeparator: i18nKeySeparator });
    }
  }, [locale, i18nResources, i18nKeySeparator]);

  return (
    <BuilderProvider builder={builder} config={config}>
      <RemotePaletteContext.Provider value={remotePaletteProvider ?? null}>
        <div className={cn("ui-builder-scope h-full w-full", className)}>
          <EditorInner
            groupRegistry={groupRegistry}
            paletteCatalog={paletteCatalog}
            remotePaletteProvider={remotePaletteProvider}
            locale={locale}
            warnOnLeave={warnOnLeave}
            assetProvider={assetProvider}
          />
        </div>
      </RemotePaletteContext.Provider>
    </BuilderProvider>
  );
}
