import React from "react";
import { useTranslation, Trans } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@ui-builder/ui";

interface DeleteConfirmDialogProps {
  /** The ID of the node pending deletion. `null` means dialog is closed. */
  nodeId: string | null;
  /** Number of child/descendant nodes that will also be deleted. */
  childCount: number;
  /** Called when the user confirms deletion. */
  onConfirm: () => void;
  /** Called when the user cancels or closes the dialog. */
  onCancel: () => void;
}

/**
 * Confirmation dialog shown before deleting a container node that has children.
 */
export function DeleteConfirmDialog({ nodeId, childCount, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!nodeId} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteConfirm.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="deleteConfirm.description"
              values={{ count: childCount }}
              components={{ 1: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("deleteConfirm.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
