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
  type PopupLocaleContent,
  type PopupPlacement,
  type PopupRules,
  type PopupTargeting,
  type PopupSchedule,
  type PopupFrequencyConfig,
  type PopupCampaign,
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

/** V5 callbacks — locale/targeting/schedule/frequency edits (undoable). */
export interface PopupPropertyPanelV5Handlers {
  onAddLocale: (popupId: string, locale: string, opts: { cloneFromBase?: boolean }) => void;
  onUpdateLocale: (popupId: string, locale: string, patch: Partial<Omit<PopupLocaleContent, "locale">>) => void;
  onRemoveLocale: (popupId: string, locale: string) => void;
  onEditLocaleContent: (popupId: string, locale: string | null) => void;
  activeLocale: string | null;
  onUpdateTargeting: (popupId: string, targeting: Partial<PopupTargeting>) => void;
  onUpdateSchedule: (popupId: string, schedule: Partial<PopupSchedule>) => void;
  onUpdateFrequency: (popupId: string, frequency: Partial<PopupFrequencyConfig>) => void;
}

/** V6 callbacks — campaign membership editing. */
export interface PopupPropertyPanelV6Handlers {
  campaigns: Record<string, PopupCampaign>;
  onAssignCampaign: (popupId: string, campaignId: string | null) => void;
  onSetPriority: (popupId: string, priority: number) => void;
}

export interface PopupPropertyPanelProps {
  popup: PopupDefinition;
  document: BuilderDocument;
  onChange: (popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>) => void;
  /** Optional V4 analytics/experiment editing handlers. */
  v4?: PopupPropertyPanelV4Handlers;
  /** Optional V5 locale/targeting/schedule/frequency editing handlers. */
  v5?: PopupPropertyPanelV5Handlers;
  /** Optional V6 campaign membership editing handlers. */
  v6?: PopupPropertyPanelV6Handlers;
}

export function PopupPropertyPanel({ popup, document, onChange, v4, v5, v6 }: PopupPropertyPanelProps) {
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
          {v5 && (
            <>
              <PanelSection title="Localization">
                <LocaleFields popup={popup} v5={v5} />
              </PanelSection>
              <PanelSection title="Targeting">
                <TargetingFields popup={popup} v5={v5} />
              </PanelSection>
              <PanelSection title="Schedule">
                <ScheduleFields popup={popup} v5={v5} />
              </PanelSection>
              <PanelSection title="Frequency">
                <FrequencyFields popup={popup} v5={v5} />
              </PanelSection>
            </>
          )}
          {v6 && (
            <PanelSection title="Campaign">
              <CampaignMembershipFields popup={popup} v6={v6} />
            </PanelSection>
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

// ── V5: Locale Fields ──────────────────────────────────────────────────────────

function LocaleFields({ popup, v5 }: { popup: PopupDefinition; v5: PopupPropertyPanelV5Handlers }) {
  const [newLocale, setNewLocale] = React.useState("");
  const locales = popup.locales ?? [];
  return (
    <div className="space-y-2">
      {locales.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No locales yet. Add a locale to override content per language.</p>
      )}
      {locales.map((lc) => {
        const isActive = v5.activeLocale === lc.locale;
        return (
          <div key={lc.locale} className={`space-y-2 rounded border p-2 ${isActive ? "border-primary bg-primary/5" : "bg-background"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium">{lc.locale}</span>
              <div className="flex gap-1">
                {lc.rootNodeId && (
                  <Button variant={isActive ? "default" : "outline"} size="sm" className="h-6 text-[10px]" onClick={() => v5.onEditLocaleContent(popup.id, isActive ? null : lc.locale)}>
                    {isActive ? "Editing" : "Edit content"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => v5.onRemoveLocale(popup.id, lc.locale)}>
                  Remove
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Input
          className="h-8 flex-1 text-xs"
          placeholder="BCP-47 tag (e.g. fr, fr-CA)"
          value={newLocale}
          onChange={(e) => setNewLocale(e.target.value)}
        />
        <Button variant="outline" size="sm" className="h-8 text-[11px]" disabled={!newLocale.trim()} onClick={() => { v5.onAddLocale(popup.id, newLocale.trim(), { cloneFromBase: true }); setNewLocale(""); }}>
          Copy content
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-[11px]" disabled={!newLocale.trim()} onClick={() => { v5.onAddLocale(popup.id, newLocale.trim(), { cloneFromBase: false }); setNewLocale(""); }}>
          Patch only
        </Button>
      </div>
      <TextSetting label="Fallback locale" value={popup.fallbackLocale ?? ""} onChange={(fallbackLocale) => { /* handled via onChange on the parent panel */ void fallbackLocale; }} />
    </div>
  );
}

// ── V5: Targeting Fields ───────────────────────────────────────────────────────

const CONDITION_OPERATORS = ["eq","neq","gt","lt","gte","lte","contains","truthy","falsy","in","notIn","matches"] as const;

function TargetingFields({ popup, v5 }: { popup: PopupDefinition; v5: PopupPropertyPanelV5Handlers }) {
  const targeting = popup.rules.targeting ?? { enabled: false, groups: [] };
  const groups = targeting.groups ?? [];
  return (
    <div className="space-y-2">
      <BooleanSetting label="Enabled" value={targeting.enabled} onChange={(enabled) => v5.onUpdateTargeting(popup.id, { enabled })} />
      {groups.map((group, gi) => (
        <div key={gi} className="space-y-1.5 rounded border bg-background p-2">
          <div className="flex items-center justify-between">
            <SelectSetting label="Match" value={group.match} options={["all", "any"]} onChange={(match) => {
              const next = [...groups]; next[gi] = { ...group, match: match as "all" | "any" }; v5.onUpdateTargeting(popup.id, { groups: next });
            }} />
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => {
              v5.onUpdateTargeting(popup.id, { groups: groups.filter((_, i) => i !== gi) });
            }}>Remove group</Button>
          </div>
          {group.conditions.map((cond, ci) => (
            <div key={ci} className="grid grid-cols-3 gap-1">
              <Input className="h-7 text-[10px]" placeholder="variable" value={cond.variable} onChange={(e) => {
                const nc = [...group.conditions]; nc[ci] = { ...cond, variable: e.target.value }; const ng = [...groups]; ng[gi] = { ...group, conditions: nc }; v5.onUpdateTargeting(popup.id, { groups: ng });
              }} />
              <Select value={cond.operator} onValueChange={(op) => {
                const nc = [...group.conditions]; nc[ci] = { ...cond, operator: op as typeof CONDITION_OPERATORS[number] }; const ng = [...groups]; ng[gi] = { ...group, conditions: nc }; v5.onUpdateTargeting(popup.id, { groups: ng });
              }}>
                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_OPERATORS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-7 text-[10px]" placeholder="value" value={typeof cond.value === "string" ? cond.value : String(cond.value ?? "")} onChange={(e) => {
                const nc = [...group.conditions]; nc[ci] = { ...cond, value: e.target.value }; const ng = [...groups]; ng[gi] = { ...group, conditions: nc }; v5.onUpdateTargeting(popup.id, { groups: ng });
              }} />
            </div>
          ))}
          <Button variant="ghost" size="sm" className="h-6 w-full text-[10px]" onClick={() => {
            const nc = [...group.conditions, { variable: "", operator: "eq" as const, value: "" }]; const ng = [...groups]; ng[gi] = { ...group, conditions: nc }; v5.onUpdateTargeting(popup.id, { groups: ng });
          }}>+ Add condition</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 w-full text-[11px]" onClick={() => v5.onUpdateTargeting(popup.id, { groups: [...groups, { match: "all", conditions: [] }] })}>
        + Add group
      </Button>
    </div>
  );
}

// ── V5: Schedule Fields ────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ScheduleFields({ popup, v5 }: { popup: PopupDefinition; v5: PopupPropertyPanelV5Handlers }) {
  const schedule = popup.rules.scheduling ?? { enabled: false };
  const tw = schedule.timeWindow;
  return (
    <div className="space-y-2">
      <BooleanSetting label="Enabled" value={schedule.enabled} onChange={(enabled) => v5.onUpdateSchedule(popup.id, { enabled })} />
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Start date</Label>
          <Input type="date" className="h-8 text-xs" value={schedule.startDate?.slice(0, 10) ?? ""} onChange={(e) => v5.onUpdateSchedule(popup.id, { startDate: e.target.value || undefined })} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-[10px] text-muted-foreground">End date</Label>
          <Input type="date" className="h-8 text-xs" value={schedule.endDate?.slice(0, 10) ?? ""} onChange={(e) => v5.onUpdateSchedule(popup.id, { endDate: e.target.value || undefined })} />
        </div>
      </div>
      <TextSetting label="Timezone (IANA)" value={schedule.timezone ?? ""} onChange={(timezone) => v5.onUpdateSchedule(popup.id, { timezone: timezone || undefined })} />
      <div className="grid grid-cols-2 gap-2">
        <NumberSetting label="Start hour (0–23)" value={tw?.startHour ?? 0} onChange={(startHour) => v5.onUpdateSchedule(popup.id, { timeWindow: { ...(tw ?? { startHour: 0, endHour: 23 }), startHour } })} />
        <NumberSetting label="End hour (0–23)" value={tw?.endHour ?? 23} onChange={(endHour) => v5.onUpdateSchedule(popup.id, { timeWindow: { ...(tw ?? { startHour: 0, endHour: 23 }), endHour } })} />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-[10px] text-muted-foreground">Days of week</Label>
        <div className="flex flex-wrap gap-1">
          {DAYS.map((day, idx) => {
            const selected = tw?.daysOfWeek?.includes(idx) ?? false;
            return (
              <button
                key={idx}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${selected ? "bg-primary text-primary-foreground" : "border bg-background text-muted-foreground"}`}
                onClick={() => {
                  const cur = tw?.daysOfWeek ?? [0,1,2,3,4,5,6];
                  const next = selected ? cur.filter((d) => d !== idx) : [...cur, idx].sort();
                  v5.onUpdateSchedule(popup.id, { timeWindow: { ...(tw ?? { startHour: 0, endHour: 23 }), daysOfWeek: next } });
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── V5: Frequency Fields ───────────────────────────────────────────────────────

const FREQ_UNITS = ["session", "hour", "day", "week", "month"] as const;

function FrequencyFields({ popup, v5 }: { popup: PopupDefinition; v5: PopupPropertyPanelV5Handlers }) {
  const freq = popup.rules.frequency ?? {};
  const cap = freq.cap;
  const goals = popup.goals ?? [];
  return (
    <div className="space-y-2">
      <BooleanSetting label="Cap enabled" value={!!cap} onChange={(enabled) => v5.onUpdateFrequency(popup.id, { cap: enabled ? { maxShows: 1, per: "session" } : undefined })} />
      {cap && (
        <div className="grid grid-cols-2 gap-2">
          <NumberSetting label="Max shows" value={cap.maxShows} onChange={(maxShows) => v5.onUpdateFrequency(popup.id, { cap: { ...cap, maxShows } })} />
          <SelectSetting label="Per" value={cap.per} options={FREQ_UNITS as unknown as string[]} onChange={(per) => v5.onUpdateFrequency(popup.id, { cap: { ...cap, per: per as typeof FREQ_UNITS[number] } })} />
        </div>
      )}
      {goals.length > 0 && (
        <div className="grid gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Suppress after goals</Label>
          <div className="space-y-1">
            {goals.map((goal) => {
              const suppressed = freq.suppressAfterGoalIds?.includes(goal.id) ?? false;
              return (
                <label key={goal.id} className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={suppressed} onCheckedChange={(checked) => {
                    const cur = freq.suppressAfterGoalIds ?? [];
                    v5.onUpdateFrequency(popup.id, { suppressAfterGoalIds: checked ? [...cur, goal.id] : cur.filter((id) => id !== goal.id) });
                  }} />
                  <span className="text-[11px]">{goal.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <TextSetting label="Storage key prefix (optional)" value={freq.storageKeyPrefix ?? ""} onChange={(storageKeyPrefix) => v5.onUpdateFrequency(popup.id, { storageKeyPrefix: storageKeyPrefix || undefined })} />
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

// ── V6: Campaign membership ────────────────────────────────────────────────────

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  review: "In Review",
  published: "Published",
  paused: "Paused",
  archived: "Archived",
};

const CONFLICT_POLICY_LABELS: Record<string, string> = {
  queue: "Queue",
  suppress: "Suppress",
  replace: "Replace",
  stack: "Stack",
};

function CampaignMembershipFields({ popup, v6 }: { popup: PopupDefinition; v6: PopupPropertyPanelV6Handlers }) {
  const campaigns = Object.values(v6.campaigns);
  const activeCampaign = popup.campaignId ? v6.campaigns[popup.campaignId] : undefined;

  return (
    <div className="space-y-2">
      <div className="grid gap-1.5">
        <Label className="text-[10px] text-muted-foreground">Campaign</Label>
        <Select
          value={popup.campaignId ?? "__none__"}
          onValueChange={(val) => v6.onAssignCampaign(popup.id, val === "__none__" ? null : val)}
        >
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— No campaign —</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {activeCampaign && (
        <div className="rounded-md border bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground space-y-0.5">
          <div>Status: <span className="text-foreground font-medium">{CAMPAIGN_STATUS_LABELS[activeCampaign.status] ?? activeCampaign.status}</span></div>
          <div>Conflict policy: <span className="text-foreground">{CONFLICT_POLICY_LABELS[activeCampaign.conflictPolicy ?? "stack"] ?? activeCampaign.conflictPolicy}</span></div>
          {activeCampaign.status !== "published" && (
            <div className="text-amber-600 dark:text-amber-400">This popup will be gated (not published)</div>
          )}
        </div>
      )}
      <div className="grid gap-1.5">
        <Label className="text-[10px] text-muted-foreground">Priority</Label>
        <input
          type="number"
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          value={popup.priority ?? 0}
          onChange={(e) => v6.onSetPriority(popup.id, Number(e.target.value))}
        />
        <p className="text-[9px] text-muted-foreground">Higher value = wins arbitration within campaign.</p>
      </div>
    </div>
  );
}
