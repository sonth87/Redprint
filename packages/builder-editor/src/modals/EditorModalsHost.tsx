import type { Asset, AssetProvider, AssetType } from "@ui-builder/builder-core";
import type { GalleryItem } from "@ui-builder/shared";
import { Toaster } from "@ui-builder/ui";
import { DeleteConfirmDialog } from "../panels/DeleteConfirmDialog";
import { AIAssistant } from "../ai/AIAssistant";
import { PageGeneratorModal } from "../ai/page-generator";
import { FigmaImportDialog } from "../figma/FigmaImportDialog";
import { MediaManager } from "../panels/MediaManager";
import { GalleryMediaManager } from "../panels/gallery";

export interface EditorModalsHostProps {
  aiOpen: boolean;
  onAiOpenChange: (open: boolean) => void;
  aiConfig: any;
  aiContext: any;

  pageGeneratorOpen: boolean;
  onPageGeneratorOpenChange: (open: boolean) => void;

  figmaOpen: boolean;
  onFigmaOpenChange: (open: boolean) => void;

  deleteConfirmNodeId: string | null;
  deleteConfirmChildCount: number;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;

  galleryManagerOpen: boolean;
  galleryManagerNodeId: string | null;
  onGalleryOpenChange: (open: boolean) => void;
  galleryItems: GalleryItem[];
  onGalleryItemsChange: (items: GalleryItem[]) => void;
  onOpenMediaManager: (onSelect?: any) => void;

  mediaManagerOpen: boolean;
  onMediaManagerOpenChange: (open: boolean) => void;
  assets: Asset[];
  onMediaSelect: (asset: Asset) => void;
  assetProvider?: AssetProvider;
  onMediaUpload?: (files: File[]) => Promise<Asset[]>;
  onMediaDelete?: (id: string) => void | Promise<void>;
  onMediaUrlAdd?: (url: string, type: AssetType) => void;
}

export function EditorModalsHost({
  aiOpen,
  onAiOpenChange,
  aiConfig,
  aiContext,
  pageGeneratorOpen,
  onPageGeneratorOpenChange,
  figmaOpen,
  onFigmaOpenChange,
  deleteConfirmNodeId,
  deleteConfirmChildCount,
  onConfirmDelete,
  onCancelDelete,
  galleryManagerOpen,
  galleryManagerNodeId,
  onGalleryOpenChange,
  galleryItems,
  onGalleryItemsChange,
  onOpenMediaManager,
  mediaManagerOpen,
  onMediaManagerOpenChange,
  assets,
  onMediaSelect,
  assetProvider,
  onMediaUpload,
  onMediaDelete,
  onMediaUrlAdd,
}: EditorModalsHostProps) {
  return (
    <>
      <AIAssistant
        open={aiOpen}
        onOpenChange={onAiOpenChange}
        config={aiConfig}
        context={aiContext}
      />
      <PageGeneratorModal
        open={pageGeneratorOpen}
        onOpenChange={onPageGeneratorOpenChange}
        config={aiConfig}
        context={aiContext}
      />
      <FigmaImportDialog open={figmaOpen} onOpenChange={onFigmaOpenChange} />

      <DeleteConfirmDialog
        nodeId={deleteConfirmNodeId}
        childCount={deleteConfirmChildCount}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />

      {galleryManagerOpen && galleryManagerNodeId && (
        <GalleryMediaManager
          open={galleryManagerOpen}
          onOpenChange={onGalleryOpenChange}
          items={galleryItems}
          onItemsChange={onGalleryItemsChange}
          onOpenMediaManager={onOpenMediaManager}
        />
      )}

      <MediaManager
        open={mediaManagerOpen}
        onOpenChange={onMediaManagerOpenChange}
        assets={assets}
        onSelect={onMediaSelect}
        onUpload={assetProvider?.upload ? onMediaUpload : undefined}
        onDelete={assetProvider?.delete ? onMediaDelete : undefined}
        onUrlAdd={onMediaUrlAdd}
        acceptTypes={["image"]}
      />

      <Toaster position="bottom-right" richColors />
    </>
  );
}
