import React from "react";
import {
  Button,
  Checkbox,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@ui-builder/ui";
import {
  getDefaultPopupAnimation,
  getDefaultPopupBehavior,
  getDefaultPopupKindConfig,
  type Breakpoint,
  type BuilderDocument,
  type PopupAnimation,
  type PopupAutoTrigger,
  type PopupDefinition,
  type PopupGoal,
  type PopupKind,
  type PopupKindConfig,
  type PopupPlacement,
  type PopupRules,
} from "@ui-builder/builder-core";

const KIND_OPTIONS: PopupKind[] = ["modal", "drawer", "bottomSheet", "bar", "fullscreen"];
const PLACEMENT_OPTIONS: PopupPlacement[] = ["center", "top", "bottom", "left", "right"];
const ANIMATION_OPTIONS: PopupAnimation["enter"][] = ["fade", "scale", "slide-up", "slide-down", "slide-left", "slide-right", "none"];
const GOAL_TYPE_OPTIONS: PopupGoal["type"][] = ["click", "submit", "close", "customEvent", "urlVisit"];

/** V4 callbacks — command-based goal/variant/experiment edits (undoable). */
export interface PopupPropertyPanelV4Handlers {
  onAddGoal: (popupId: string) => void;
  onUpdateGoal: (popupId: string, goalId: string, goal: Partial<Omit<PopupGoal, "id">>) => void;
  onRemoveGoal: (popupId: string, goalId: string) => void;
  onAddVariant: (popupId: string, cloneFromBase: boolean) => void;
  onUpdateVariant: (popupId: string, variantId: string, variant: Record<string, unknown>) => void;
  onRemoveVariant: (popupId: string, variantId: string) => void;
  onEditVariantContent: (popupId: string, variantId: string | null) => void;
  onUpdateExperiment: (popupId: string, experiment: Record<string, unknown>) => void;
  activeVariantId: string | null;
}

export interface PopupPropertyPanelProps {
  popup: PopupDefinition;
  document: BuilderDocument;
  onChange: (popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>) => void;
  /** Optional V4 analytics/experiment editing handlers. */
  v4?: PopupPropertyPanelV4Handlers;
}

export function PopupPropertyPanel({ popup, document, onChange, v4 }: PopupPropertyPanelProps) {
  const sections = React.useMemo(
    () => Object.values(document.nodes).filter((node) => node.type === "Section"),
    [document.nodes],
  );

  const updateKindConfig = (kindConfig: PopupKindConfig) => onChange({ kindConfig });
  const updateBehavior = (behavior: PopupDefinition["behavior"]) => onChange({ behavior });
  const updateRules = (rules: PopupRules) => onChange({ rules });
  const updateAnimation = (animation: PopupAnimation) => onChange({ animation });

  const changeKind = (kind: PopupKind) => {
    onChange({
      kind,
      placement: getDefaultPlacement(kind),
      kindConfig: getDefaultPopupKindConfig(kind),
      behavior: getDefaultPopupBehavior(kind),
      animation: getDefaultPopupAnimation(kind),
    });
  };

  const changePlacement = (placement: PopupPlacement) => {
    const nextConfig =
      popup.kindConfig.kind === "modal"
        ? { ...popup.kindConfig, offsetX: 0, offsetY: 0 }
        : popup.kindConfig;
    onChange({ placement, kindConfig: nextConfig });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-3 py-2">
        <p className="truncate text-xs font-semibold">{popup.name}</p>
        <p className="font-mono text-[10px] text-muted-foreground">Popup shell · {popup.kind}</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          <PanelSection title="Identity">
            <TextSetting label="Name" value={popup.name} onChange={(name) => onChange({ name })} />
            <BooleanSetting label="Enabled" value={popup.enabled} onChange={(enabled) => onChange({ enabled })} />
          </PanelSection>

          <PanelSection title="Layout">
            <div className="grid grid-cols-2 gap-2">
              <SelectSetting label="Kind" value={popup.kind} options={KIND_OPTIONS} onChange={(value) => changeKind(value as PopupKind)} />
              <SelectSetting label="Placement" value={popup.placement} options={PLACEMENT_OPTIONS} onChange={(value) => changePlacement(value as PopupPlacement)} />
            </div>
            <KindConfigFields popup={popup} onChange={updateKindConfig} />
          </PanelSection>

          <PanelSection title="Behavior">
            <div className="grid grid-cols-2 gap-2">
              <BooleanSetting label="Backdrop" value={popup.behavior.backdrop.enabled} onChange={(enabled) => updateBehavior({ ...popup.behavior, backdrop: { ...popup.behavior.backdrop, enabled } })} />
              <BooleanSetting label="Close button" value={popup.behavior.showCloseButton} onChange={(showCloseButton) => updateBehavior({ ...popup.behavior, showCloseButton })} />
              <BooleanSetting label="ESC close" value={popup.behavior.closeOnEscape} onChange={(closeOnEscape) => updateBehavior({ ...popup.behavior, closeOnEscape })} />
              <BooleanSetting label="Backdrop close" value={popup.behavior.closeOnBackdropClick} onChange={(closeOnBackdropClick) => updateBehavior({ ...popup.behavior, closeOnBackdropClick })} />
              <BooleanSetting label="Body lock" value={popup.behavior.lockBodyScroll} onChange={(lockBodyScroll) => updateBehavior({ ...popup.behavior, lockBodyScroll })} />
              <BooleanSetting label="Trap focus" value={popup.behavior.trapFocus} onChange={(trapFocus) => updateBehavior({ ...popup.behavior, trapFocus })} />
            </div>
            {popup.behavior.backdrop.enabled && (
              <div className="grid grid-cols-3 gap-2">
                <TextSetting label="Backdrop color" value={popup.behavior.backdrop.color} onChange={(color) => updateBehavior({ ...popup.behavior, backdrop: { ...popup.behavior.backdrop, color } })} />
                <NumberSetting label="Opacity" value={popup.behavior.backdrop.opacity} onChange={(opacity) => updateBehavior({ ...popup.behavior, backdrop: { ...popup.behavior.backdrop, opacity } })} step="0.05" />
                <TextSetting label="Blur" value={popup.behavior.backdrop.blur ?? ""} onChange={(blur) => updateBehavior({ ...popup.behavior, backdrop: { ...popup.behavior.backdrop, blur } })} />
              </div>
            )}
          </PanelSection>

          <PanelSection title="Trigger">
            <TriggerFields trigger={popup.autoTrigger} sections={sections} onChange={(autoTrigger) => onChange({ autoTrigger })} />
          </PanelSection>

          <PanelSection title="Rules">
            <DeviceRules document={document} rules={popup.rules} onChange={updateRules} />
            <div className="grid grid-cols-2 gap-2">
              <BooleanSetting label="Once/session" value={popup.rules.showOncePerSession === true} onChange={(showOncePerSession) => updateRules({ ...popup.rules, showOncePerSession })} />
              <BooleanSetting label="Hide on submit" value={popup.rules.hideAfterSubmit === true} onChange={(hideAfterSubmit) => updateRules({ ...popup.rules, hideAfterSubmit })} />
              <NumberSetting label="Every days" value={popup.rules.showOnceEveryDays ?? 0} onChange={(showOnceEveryDays) => updateRules({ ...popup.rules, showOnceEveryDays: showOnceEveryDays > 0 ? showOnceEveryDays : undefined })} />
              <NumberSetting label="Max shows" value={popup.rules.maxShows ?? 0} onChange={(maxShows) => updateRules({ ...popup.rules, maxShows: maxShows > 0 ? maxShows : undefined })} />
            </div>
          </PanelSection>

          <PanelSection title="Animation">
            <div className="grid grid-cols-2 gap-2">
              <SelectSetting label="Enter" value={popup.animation.enter} options={ANIMATION_OPTIONS} onChange={(enter) => updateAnimation({ ...popup.animation, enter: enter as PopupAnimation["enter"] })} />
              <SelectSetting label="Exit" value={popup.animation.exit ?? popup.animation.enter} options={ANIMATION_OPTIONS} onChange={(exit) => updateAnimation({ ...popup.animation, exit: exit as PopupAnimation["enter"] })} />
              <NumberSetting label="Duration" value={popup.animation.durationMs} onChange={(durationMs) => updateAnimation({ ...popup.animation, durationMs })} />
              <TextSetting label="Easing" value={popup.animation.easing ?? "ease"} onChange={(easing) => updateAnimation({ ...popup.animation, easing })} />
            </div>
          </PanelSection>

          {v4 && (
            <>
              <PanelSection title="Goals">
                <GoalFields popup={popup} document={document} v4={v4} />
              </PanelSection>
              <PanelSection title="A/B Test">
                <ExperimentFields popup={popup} v4={v4} />
              </PanelSection>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function GoalFields({
  popup,
  document,
  v4,
}: {
  popup: PopupDefinition;
  document: BuilderDocument;
  v4: PopupPropertyPanelV4Handlers;
}) {
  const contentNodes = React.useMemo(
    () => Object.values(document.nodes).filter((n) => n.id !== popup.rootNodeId),
    [document.nodes, popup.rootNodeId],
  );
  const goals = popup.goals ?? [];
  return (
    <div className="space-y-2">
      {goals.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No goals yet. Track clicks, submits, or closes.</p>
      )}
      {goals.map((goal) => (
        <div key={goal.id} className="space-y-2 rounded border bg-background p-2">
          <div className="grid grid-cols-2 gap-2">
            <TextSetting label="Name" value={goal.name} onChange={(name) => v4.onUpdateGoal(popup.id, goal.id, { name })} />
            <SelectSetting label="Type" value={goal.type} options={GOAL_TYPE_OPTIONS} onChange={(type) => v4.onUpdateGoal(popup.id, goal.id, { type: type as PopupGoal["type"] })} />
          </div>
          {(goal.type === "click" || goal.type === "submit") && (
            <div className="grid gap-1.5">
              <Label className="text-[10px] text-muted-foreground">Target node</Label>
              <Select value={goal.targetNodeId ?? ""} onValueChange={(targetNodeId) => v4.onUpdateGoal(popup.id, goal.id, { targetNodeId })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a node" /></SelectTrigger>
                <SelectContent>
                  {contentNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>{node.name ?? node.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {goal.type === "customEvent" && (
            <TextSetting label="Event name" value={goal.eventName ?? ""} onChange={(eventName) => v4.onUpdateGoal(popup.id, goal.id, { eventName })} />
          )}
          {goal.type === "urlVisit" && (
            <TextSetting label="URL pattern" value={goal.urlPattern ?? ""} onChange={(urlPattern) => v4.onUpdateGoal(popup.id, goal.id, { urlPattern })} />
          )}
          <Button variant="ghost" size="sm" className="h-7 w-full text-[11px] text-destructive" onClick={() => v4.onRemoveGoal(popup.id, goal.id)}>
            Remove goal
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-8 w-full text-[11px]" onClick={() => v4.onAddGoal(popup.id)}>
        + Add goal
      </Button>
    </div>
  );
}

function ExperimentFields({ popup, v4 }: { popup: PopupDefinition; v4: PopupPropertyPanelV4Handlers }) {
  const experiment = popup.experiment ?? { enabled: false, assignment: "random" as const };
  const variants = popup.variants ?? [];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <BooleanSetting label="Enabled" value={experiment.enabled} onChange={(enabled) => v4.onUpdateExperiment(popup.id, { enabled })} />
        <SelectSetting label="Assignment" value={experiment.assignment} options={["random", "sticky"]} onChange={(assignment) => v4.onUpdateExperiment(popup.id, { assignment })} />
      </div>
      <TextSetting label="Seed (optional)" value={experiment.seed ?? ""} onChange={(seed) => v4.onUpdateExperiment(popup.id, { seed })} />

      <div className="rounded border bg-background p-2 text-[11px] text-muted-foreground">Base (default content)</div>
      {variants.map((variant) => {
        const isActive = v4.activeVariantId === variant.id;
        const winner = experiment.winnerVariantId === variant.id;
        return (
          <div key={variant.id} className={`space-y-2 rounded border p-2 ${isActive ? "border-primary bg-primary/5" : "bg-background"}`}>
            <div className="grid grid-cols-2 gap-2">
              <TextSetting label="Name" value={variant.name} onChange={(name) => v4.onUpdateVariant(popup.id, variant.id, { name })} />
              <NumberSetting label="Weight" value={variant.weight} onChange={(weight) => v4.onUpdateVariant(popup.id, variant.id, { weight })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <BooleanSetting label="Enabled" value={variant.enabled} onChange={(enabled) => v4.onUpdateVariant(popup.id, variant.id, { enabled })} />
              <BooleanSetting label="Winner" value={winner} onChange={(isWinner) => v4.onUpdateExperiment(popup.id, { winnerVariantId: isWinner ? variant.id : undefined })} />
            </div>
            <div className="flex gap-2">
              {variant.rootNodeId && (
                <Button variant={isActive ? "default" : "outline"} size="sm" className="h-7 flex-1 text-[11px]" onClick={() => v4.onEditVariantContent(popup.id, isActive ? null : variant.id)}>
                  {isActive ? "Editing content" : "Edit content"}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-[11px] text-destructive" onClick={() => v4.onRemoveVariant(popup.id, variant.id)}>
                Remove
              </Button>
            </div>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8 flex-1 text-[11px]" onClick={() => v4.onAddVariant(popup.id, true)}>
          + Variant (copy content)
        </Button>
        <Button variant="outline" size="sm" className="h-8 flex-1 text-[11px]" onClick={() => v4.onAddVariant(popup.id, false)}>
          + Variant (patch only)
        </Button>
      </div>
    </div>
  );
}

function KindConfigFields({
  popup,
  onChange,
}: {
  popup: PopupDefinition;
  onChange: (kindConfig: PopupKindConfig) => void;
}) {
  const config = popup.kindConfig;
  if (config.kind === "modal") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <TextSetting label="Width" value={config.width ?? ""} onChange={(width) => onChange({ ...config, width, size: "custom" })} />
        <TextSetting label="Height" value={config.height ?? ""} onChange={(height) => onChange({ ...config, height, size: "custom" })} />
        <TextSetting label="Max width" value={config.maxWidth ?? ""} onChange={(maxWidth) => onChange({ ...config, maxWidth })} />
        <TextSetting label="Max height" value={config.maxHeight ?? ""} onChange={(maxHeight) => onChange({ ...config, maxHeight })} />
        <NumberSetting label="Offset X" value={config.offsetX ?? 0} onChange={(offsetX) => onChange({ ...config, offsetX })} />
        <NumberSetting label="Offset Y" value={config.offsetY ?? 0} onChange={(offsetY) => onChange({ ...config, offsetY })} />
        <BooleanSetting label="Draggable" value={config.draggable === true} onChange={(draggable) => onChange({ ...config, draggable })} />
        <BooleanSetting label="Resizable" value={config.resizable !== false} onChange={(resizable) => onChange({ ...config, resizable })} />
      </div>
    );
  }
  if (config.kind === "drawer") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <TextSetting label="Width" value={config.width} onChange={(width) => onChange({ ...config, width })} />
        <TextSetting label="Min width" value={config.minWidth ?? ""} onChange={(minWidth) => onChange({ ...config, minWidth })} />
        <TextSetting label="Max width" value={config.maxWidth ?? ""} onChange={(maxWidth) => onChange({ ...config, maxWidth })} />
        <BooleanSetting label="Resizable" value={config.resizable === true} onChange={(resizable) => onChange({ ...config, resizable })} />
      </div>
    );
  }
  if (config.kind === "bottomSheet") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <TextSetting label="Initial height" value={config.initialHeight} onChange={(initialHeight) => onChange({ ...config, initialHeight })} />
        <TextSetting label="Min height" value={config.minHeight ?? ""} onChange={(minHeight) => onChange({ ...config, minHeight })} />
        <TextSetting label="Max height" value={config.maxHeight ?? ""} onChange={(maxHeight) => onChange({ ...config, maxHeight })} />
        <TextSetting label="Snap points" value={(config.snapPoints ?? []).join(", ")} onChange={(value) => onChange({ ...config, snapPoints: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
        <BooleanSetting label="Draggable" value={config.draggable} onChange={(draggable) => onChange({ ...config, draggable })} />
        <BooleanSetting label="Drag close" value={config.dragToClose} onChange={(dragToClose) => onChange({ ...config, dragToClose })} />
      </div>
    );
  }
  if (config.kind === "bar") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <TextSetting label="Height" value={config.height ?? ""} onChange={(height) => onChange({ ...config, height })} />
        <BooleanSetting label="Sticky" value={config.sticky} onChange={(sticky) => onChange({ ...config, sticky })} />
        <BooleanSetting label="Push page" value={config.pushPageContent === true} onChange={(pushPageContent) => onChange({ ...config, pushPageContent })} />
      </div>
    );
  }
  return <p className="text-[11px] text-muted-foreground">Fullscreen popups fill the viewport.</p>;
}

function TriggerFields({
  trigger,
  sections,
  onChange,
}: {
  trigger: PopupAutoTrigger;
  sections: Array<{ id: string; name?: string; type: string }>;
  onChange: (trigger: PopupAutoTrigger) => void;
}) {
  return (
    <div className="space-y-2">
      <SelectSetting
        label="Auto trigger"
        value={trigger.type}
        options={["manual", "pageLoad", "scrollDepth", "sectionVisible"]}
        onChange={(type) => {
          if (type === "pageLoad") onChange({ type, delayMs: 1000 });
          else if (type === "scrollDepth") onChange({ type, percent: 50 });
          else if (type === "sectionVisible") onChange({ type, targetNodeId: sections[0]?.id ?? "", threshold: 0.25 });
          else onChange({ type: "manual" });
        }}
      />
      {trigger.type === "pageLoad" && <NumberSetting label="Delay ms" value={trigger.delayMs ?? 0} onChange={(delayMs) => onChange({ type: "pageLoad", delayMs })} />}
      {trigger.type === "scrollDepth" && <NumberSetting label="Percent" value={trigger.percent} onChange={(percent) => onChange({ type: "scrollDepth", percent })} />}
      {trigger.type === "sectionVisible" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label className="text-[10px] text-muted-foreground">Section</Label>
            <Select value={trigger.targetNodeId} onValueChange={(targetNodeId) => onChange({ ...trigger, targetNodeId })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>{section.name ?? section.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberSetting label="Threshold" value={trigger.threshold ?? 0.25} onChange={(threshold) => onChange({ ...trigger, threshold })} step="0.05" />
        </div>
      )}
    </div>
  );
}

function DeviceRules({
  document,
  rules,
  onChange,
}: {
  document: BuilderDocument;
  rules: PopupRules;
  onChange: (rules: PopupRules) => void;
}) {
  const selected = rules.devices;
  const toggle = (breakpoint: Breakpoint, checked: boolean) => {
    const current = selected ?? document.breakpoints.map((bp) => bp.breakpoint);
    const next = checked ? Array.from(new Set([...current, breakpoint])) : current.filter((item) => item !== breakpoint);
    onChange({ ...rules, devices: next.length === document.breakpoints.length ? undefined : next });
  };
  return (
    <div className="grid gap-1.5">
      <Label className="text-[10px] text-muted-foreground">Devices</Label>
      <div className="flex flex-wrap gap-2">
        {document.breakpoints.map((bp) => (
          <label key={bp.breakpoint} className="flex items-center gap-1.5 rounded border bg-background px-2 py-1 text-[10px] text-muted-foreground">
            <Checkbox
              checked={!selected || selected.includes(bp.breakpoint)}
              onCheckedChange={(checked) => toggle(bp.breakpoint, checked === true)}
            />
            {bp.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-2 rounded-md border bg-muted/15 p-2">{children}</div>
    </section>
  );
}

function TextSetting({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input className="h-8 text-xs" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberSetting({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input className="h-8 text-xs" type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function BooleanSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 rounded border bg-background px-2 py-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SelectSetting({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function getDefaultPlacement(kind: PopupKind): PopupPlacement {
  if (kind === "drawer") return "right";
  if (kind === "bar" || kind === "bottomSheet") return "bottom";
  return "center";
}
