import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
  Checkbox,
  ScrollArea,
} from "@ui-builder/ui";
import {
  Sparkles,
  Columns2,
  Maximize2,
  CheckCircle2,
  XCircle,
  Monitor,
  Tablet,
  Smartphone,
  Layers,
  Check,
} from "lucide-react";
import type { Breakpoint, BuilderDocument, ComponentRegistry } from "@ui-builder/builder-core";
import { RuntimeRenderer } from "@ui-builder/builder-renderer";
import { useBuilder } from "@ui-builder/builder-react";
import {
  type AIChangeGroup,
  applySelectedGroupsToStaging,
} from "./stagingDocument";

export interface AIDiffPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseDocument: BuilderDocument;
  changeGroups: AIChangeGroup[];
  onAccept: (selectedGroups: AIChangeGroup[]) => void;
  onDiscard: () => void;
  registry?: ComponentRegistry;
}

export function AIDiffPreviewModal({
  open,
  onOpenChange,
  baseDocument,
  changeGroups: initialGroups,
  onAccept,
  onDiscard,
  registry: passedRegistry,
}: AIDiffPreviewModalProps) {
  const { builder } = useBuilder();
  const effectiveRegistry = passedRegistry ?? builder.registry;

  const [groups, setGroups] = useState<AIChangeGroup[]>(initialGroups);
  const [viewMode, setViewMode] = useState<"split" | "single">("split");
  const [activeTab, setActiveTab] = useState<"after" | "before">("after");
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");

  // Keep groups in sync if initialGroups change
  React.useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  // Compute staging document based on enabled groups
  const stagedDocument = useMemo(() => {
    return applySelectedGroupsToStaging(baseDocument, groups);
  }, [baseDocument, groups]);

  const enabledCount = groups.filter((g) => g.enabled).length;
  const totalCount = groups.length;

  const toggleGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)),
    );
  };

  const handleSelectAll = () => {
    setGroups((prev) => prev.map((g) => ({ ...g, enabled: true })));
  };

  const handleDeselectAll = () => {
    setGroups((prev) => prev.map((g) => ({ ...g, enabled: false })));
  };

  const handleAcceptSelected = () => {
    const selected = groups.filter((g) => g.enabled);
    onAccept(selected);
    onOpenChange(false);
  };

  const handleAcceptAll = () => {
    const all = groups.map((g) => ({ ...g, enabled: true }));
    onAccept(all);
    onOpenChange(false);
  };

  const handleDiscard = () => {
    onDiscard();
    onOpenChange(false);
  };

  const getViewportWidth = (bp: Breakpoint): string => {
    switch (bp) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      case "desktop":
      default:
        return "100%";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[94vw] w-[94vw] h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0 border overflow-hidden shadow-2xl ui-builder-scope"
        aria-describedby={undefined}
      >
        {/* Top Header */}
        <DialogHeader className="px-6 py-3.5 border-b bg-background flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                AI Changes Preview
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {enabledCount}/{totalCount} Changes Selected
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Review and toggle individual suggested modifications before applying to the canvas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            {/* View Mode Switcher */}
            <div className="flex items-center border rounded-md p-0.5 bg-muted/30">
              <Button
                variant={viewMode === "split" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode("split")}
                title="Split View (Side-by-side)"
              >
                <Columns2 className="w-3.5 h-3.5" />
                Split
              </Button>
              <Button
                variant={viewMode === "single" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode("single")}
                title="Single View with Tab Switcher"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Single
              </Button>
            </div>

            {/* Breakpoint Switcher */}
            <div className="flex items-center border rounded-md p-0.5 bg-muted/30">
              <Button
                variant={breakpoint === "desktop" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setBreakpoint("desktop")}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={breakpoint === "tablet" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setBreakpoint("tablet")}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={breakpoint === "mobile" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setBreakpoint("mobile")}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-muted/10">
          {/* Left Sidebar: Change Groups Checklist */}
          <div className="w-72 border-r bg-background flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                Change Groups ({totalCount})
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-primary hover:underline font-medium"
                >
                  All
                </button>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-muted-foreground hover:underline"
                >
                  None
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1.5">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => toggleGroup(group.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
                      group.enabled
                        ? "bg-primary/5 border-primary/30 text-foreground"
                        : "bg-muted/10 border-border/40 text-muted-foreground opacity-60"
                    }`}
                  >
                    <Checkbox
                      checked={group.enabled}
                      onCheckedChange={() => toggleGroup(group.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" title={group.title}>
                        {group.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4 font-mono font-normal uppercase"
                        >
                          {group.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {group.commands.length} {group.commands.length === 1 ? "cmd" : "cmds"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Preview Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {viewMode === "split" ? (
              /* Split View: Left = Before, Right = After */
              <div className="flex-1 grid grid-cols-2 divide-x overflow-hidden">
                {/* Before View */}
                <div className="flex flex-col overflow-hidden bg-background">
                  <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Original (Before)</span>
                    <Badge variant="outline" className="text-[10px]">Canvas State</Badge>
                  </div>
                  <div className="flex-1 overflow-auto p-4 flex justify-center bg-muted/10">
                    <div
                      className="border rounded-md shadow-sm bg-white overflow-hidden transition-all duration-200"
                      style={{
                        width: getViewportWidth(breakpoint),
                        minHeight: "100%",
                      }}
                    >
                      <RuntimeRenderer
                        document={baseDocument}
                        registry={effectiveRegistry}
                        config={{ breakpoint }}
                      />
                    </div>
                  </div>
                </div>

                {/* After View */}
                <div className="flex flex-col overflow-hidden bg-background">
                  <div className="px-4 py-2 border-b bg-primary/5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      AI Proposed (After)
                    </span>
                    <Badge variant="default" className="text-[10px] bg-primary">
                      {enabledCount} applied
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-auto p-4 flex justify-center bg-muted/10">
                    <div
                      className="border-2 border-primary/20 rounded-md shadow-md bg-white overflow-hidden transition-all duration-200"
                      style={{
                        width: getViewportWidth(breakpoint),
                        minHeight: "100%",
                      }}
                    >
                      <RuntimeRenderer
                        document={stagedDocument}
                        registry={effectiveRegistry}
                        config={{ breakpoint }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Single View: Tab Switcher (Before / After) */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b bg-background flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={activeTab === "after" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setActiveTab("after")}
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Proposed (After)
                    </Button>
                    <Button
                      variant={activeTab === "before" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveTab("before")}
                    >
                      Original (Before)
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activeTab === "after" ? `${enabledCount} changes enabled` : "Base document"}
                  </Badge>
                </div>

                <div className="flex-1 overflow-auto p-6 flex justify-center bg-muted/10">
                  <div
                    className="border rounded-md shadow-md bg-white overflow-hidden transition-all duration-200"
                    style={{
                      width: getViewportWidth(breakpoint),
                      minHeight: "100%",
                    }}
                  >
                    <RuntimeRenderer
                      document={activeTab === "after" ? stagedDocument : baseDocument}
                      registry={effectiveRegistry}
                      config={{ breakpoint }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <DialogFooter className="px-6 py-3 border-t bg-background flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <XCircle className="w-3.5 h-3.5" />
              Discard All Changes
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground mr-1">
              Ready to apply {enabledCount} of {totalCount} items
            </span>

            {enabledCount < totalCount && enabledCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAcceptSelected}
                className="gap-1.5 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Accept Selected ({enabledCount})
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={handleAcceptAll}
              className="gap-1.5 text-xs shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accept All ({totalCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
