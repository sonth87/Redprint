import React from "react";
import { ScrollArea, Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider, Separator } from "@ui-builder/ui";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { PropInfoTooltip } from "../components/PropInfoTooltip";
import { PropControl } from "../controls/PropControl";
import { ImageFilterPicker } from "../../ImageFilterPicker";
import { GridTemplateEditor } from "../controls/GridTemplateEditor";
import { NumericPropertyInput } from "../controls/NumericPropertyInput";
import { ShadowControl } from "../../../controls/shadow/ShadowControl";
import { ImagePropControl } from "../controls/ImagePropControl";
import { ColorSwatch } from "../../../controls/color/ColorSwatch";
import type { ComponentDefinition, BuilderNode } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";

export function DesignTab({
  definition,
  selectedNode,
  resolvedPropsMap,
  style,
  onPropChange,
  onStyleChange,
}: {
  definition: ComponentDefinition;
  selectedNode: BuilderNode;
  resolvedPropsMap: Record<string, any>;
  style: Record<string, any>;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  const isSectionNode = selectedNode.type === "Section";

  const renderBackgroundImageOptions = () => {
    if (!String(style.backgroundImage ?? "").startsWith("url(")) return null;
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("design.backgroundSize")}</Label>
          <Select
            value={String(style.backgroundSize ?? "cover")}
            onValueChange={(v) => onStyleChange("backgroundSize", v)}
          >
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {([ ["cover","cover"], ["contain","contain"], ["fill","100% 100%"], ["auto","auto"] ] as [string, string][]).map(([label, value]) => (
                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("design.backgroundPosition")}</Label>
          <Select
            value={String(style.backgroundPosition ?? "center")}
            onValueChange={(v) => onStyleChange("backgroundPosition", v)}
          >
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"].map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1 col-span-2">
          <Label className="text-[10px] text-muted-foreground">{t("design.backgroundRepeat")}</Label>
          <Select
            value={String(style.backgroundRepeat ?? "no-repeat")}
            onValueChange={(v) => onStyleChange("backgroundRepeat", v)}
          >
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["no-repeat", "repeat", "repeat-x", "repeat-y"].map((r) => (
                <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderBackgroundImageControl = () => {
    const rawBg = String(style.backgroundImage ?? "");
    const urlMatch = rawBg.match(/^url\(['"]?(.*?)['"]?\)$/);
    const isGradient = rawBg && !urlMatch;
    if (isGradient) {
      return (
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("design.backgroundImage")}</Label>
          <Input
            className="h-7 text-xs font-mono"
            value={rawBg}
            onChange={(e) => onStyleChange("backgroundImage", e.target.value || undefined)}
          />
        </div>
      );
    }
    return (
      <ImagePropControl
        schema={{ key: "backgroundImage", type: "image", label: t("design.backgroundImage") } as any}
        value={urlMatch ? urlMatch[1] : ""}
        onChange={(val) => {
          if (!val) {
            onStyleChange("backgroundImage", undefined);
            onStyleChange("backgroundSize", undefined);
            onStyleChange("backgroundPosition", undefined);
            onStyleChange("backgroundRepeat", undefined);
          } else {
            const v = String(val).trim();
            if (v.startsWith("http") || v.startsWith("/") || v.startsWith("data:")) {
              onStyleChange("backgroundImage", `url(${v})`);
              onStyleChange("backgroundSize", "cover");
              onStyleChange("backgroundPosition", "center");
              onStyleChange("backgroundRepeat", "no-repeat");
            } else {
              onStyleChange("backgroundImage", v);
            }
          }
        }}
      />
    );
  };

  return (
    <ScrollArea className="h-full">
      {/* Component props */}
      {definition.propSchema.length > 0 && !isSectionNode && (
        <CollapsibleSection title={t("propertyPanel.properties")}>
          {/* Grid gets a custom template editor instead of raw columnTemplate/customTemplate controls */}
          {selectedNode.type === "Grid" && (
            <GridTemplateEditor
              columns={Number(resolvedPropsMap["columns"] ?? 3)}
              customTemplate={String(resolvedPropsMap["customTemplate"] ?? "1fr 1fr 1fr")}
              onColumnsChange={(n) => onPropChange("columns", n)}
              onCustomTemplateChange={(s) => onPropChange("customTemplate", s)}
              onColumnTemplateChange={(s) => onPropChange("columnTemplate", s)}
            />
          )}
          {definition.propSchema.map((_schema) => {
            const schema = _schema as any;
            // Skip columnTemplate, customTemplate, columns for Grid — handled by GridTemplateEditor above
            if (selectedNode.type === "Grid" && (schema.key === "columnTemplate" || schema.key === "customTemplate" || schema.key === "columns")) {
              return null;
            }
            // Skip filter for Image — rendered as full ImageFilterPicker section below
            if (selectedNode.type === "Image" && schema.key === "filter") {
              return null;
            }
            if (schema.type === "group") {
              return (
                <div key={schema.key} className="space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground tracking-wide">
                    {schema.label}
                  </p>
                  {schema.children.map((child: any) => {
                    if (child.type === "row") {
                      return (
                        <div key={child.key} className="grid grid-cols-2 gap-2">
                          {child.children.map((subchild: any) => (
                            <PropControl
                              key={subchild.key}
                              schema={subchild}
                              value={resolvedPropsMap[subchild.key]}
                              onChange={(val) => onPropChange(subchild.key, val)}
                            />
                          ))}
                        </div>
                      );
                    }
                    return (
                      <PropControl
                        key={child.key}
                        schema={child}
                        value={resolvedPropsMap[child.key]}
                        onChange={(val) => onPropChange(child.key, val)}
                      />
                    );
                  })}
                </div>
              );
            }
            if (schema.type === "row") {
              return (
                <div key={schema.key} className="grid grid-cols-2 gap-2">
                  {schema.children.map((child: any) => (
                    <PropControl
                      key={child.key}
                      schema={child}
                      value={resolvedPropsMap[child.key]}
                      onChange={(val) => onPropChange(child.key, val)}
                    />
                  ))}
                </div>
              );
            }
            return (
              <PropControl
                key={schema.key}
                schema={schema}
                value={resolvedPropsMap[schema.key]}
                onChange={(val) => onPropChange(schema.key, val)}
              />
            );
          })}
        </CollapsibleSection>
      )}

      {/* Image filter picker — shown only for Image nodes */}
      {selectedNode.type === "Image" && (
        <CollapsibleSection title={t("design.filter")} defaultOpen={false}>
          <ImageFilterPicker
            previewSrc={String(resolvedPropsMap["src"] ?? "")}
            value={String(resolvedPropsMap["filter"] ?? "none")}
            onChange={(filter: string) => onPropChange("filter", filter)}
          />
        </CollapsibleSection>
      )}

      {/* Section: merged Background + Options at top */}
      {isSectionNode && (() => {
        const sectionOptions = (definition.propSchema.find((s: any) => s.key === "sectionOptionsGroup") as any)?.children ?? [];
        const dividerSchema = (definition.propSchema.find((s: any) => s.key === "dividerGroup") as any);
        return (
          <>
            <CollapsibleSection title={t("design.background")}>
              <div className="grid gap-1.5">
                <div className="flex items-center">
                  <Label className="text-[10px] text-muted-foreground">{t("design.backgroundColor")}</Label>
                  <PropInfoTooltip text={t("design.info.backgroundColor")} />
                </div>
                <div className="flex items-center gap-2">
                  <ColorSwatch
                    value={String(style.backgroundColor ?? "")}
                    onChange={(v) => onStyleChange("backgroundColor", v)}
                  />
                  <Input
                    className="h-7 text-xs flex-1 font-mono uppercase"
                    value={String(style.backgroundColor ?? "")}
                    onChange={(e) => onStyleChange("backgroundColor", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-1 mt-2">
                {renderBackgroundImageControl()}
                {renderBackgroundImageOptions()}
              </div>
              <Separator className="my-3" />
              <div className="space-y-3">
                {sectionOptions.map((child: any) => (
                  <PropControl
                    key={child.key}
                    schema={child}
                    value={resolvedPropsMap[child.key]}
                    onChange={(val) => onPropChange(child.key, val)}
                  />
                ))}
              </div>
            </CollapsibleSection>
            {dividerSchema && (
              <CollapsibleSection title={dividerSchema.label} defaultOpen={false}>
                <div className="space-y-3">
                  {dividerSchema.children.map((child: any) => {
                    if (child.type === "row") {
                      return (
                        <div key={child.key} className="grid grid-cols-2 gap-2">
                          {child.children.map((subchild: any) => (
                            <PropControl
                              key={subchild.key}
                              schema={subchild}
                              value={resolvedPropsMap[subchild.key]}
                              onChange={(val) => onPropChange(subchild.key, val)}
                            />
                          ))}
                        </div>
                      );
                    }
                    return (
                      <PropControl
                        key={child.key}
                        schema={child}
                        value={resolvedPropsMap[child.key]}
                        onChange={(val) => onPropChange(child.key, val)}
                      />
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}
          </>
        );
      })()}

      {/* Size */}
      <CollapsibleSection title={t("design.size")}>
        <div className="grid grid-cols-2 gap-2">
          {["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"].map((key) => (
            <div key={key} className="grid gap-1">
              <div className="flex items-center">
                <Label className="text-[10px] text-muted-foreground">{t(`design.${key}`)}</Label>
                <PropInfoTooltip text={t(`design.info.${key}`)} />
              </div>
              <NumericPropertyInput
                value={String(style[key] ?? "")}
                placeholder="auto"
                units={
                  ["width", "maxWidth"].includes(key) ? ["px", "%"] :
                  ["height", "minHeight", "maxHeight"].includes(key) ? ["px", "%", "vh"] :
                  ["px"]
                }
                onChange={(val) => onStyleChange(key, val || undefined)}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Spacing */}
      <CollapsibleSection title={t("design.spacing")}>
        <div className="grid grid-cols-2 gap-2">
          {["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map((key) => (
            <div key={key} className="grid gap-1">
              <div className="flex items-center">
                <Label className="text-[10px] text-muted-foreground">
                  {key === "padding" ? t("design.all") : t(`design.${key.replace("padding", "").toLowerCase()}`)}
                </Label>
                <PropInfoTooltip text={t(`design.info.${key}`)} />
              </div>
              <NumericPropertyInput
                value={String(style[key] ?? "")}
                placeholder="0"
                onChange={(val) => onStyleChange(key, val || undefined)}
              />
            </div>
          ))}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 gap-2">
          {["margin", "marginTop", "marginRight", "marginBottom", "marginLeft"].map((key) => (
            <div key={key} className="grid gap-1">
              <div className="flex items-center">
                <Label className="text-[10px] text-muted-foreground">
                  {key === "margin" ? t("design.all") : t(`design.${key.replace("margin", "").toLowerCase()}`)}
                </Label>
                <PropInfoTooltip text={t(`design.info.${key}`)} />
              </div>
              <NumericPropertyInput
                value={String(style[key] ?? "")}
                placeholder="0"
                onChange={(val) => onStyleChange(key, val || undefined)}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Typography */}
      <CollapsibleSection title={t("design.typography")}>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.fontFamily")}</Label>
              <PropInfoTooltip text={t("design.info.fontFamily")} />
            </div>
            <Input
              className="h-7 text-xs"
              value={String(style.fontFamily ?? "")}
              placeholder="inherit"
              onChange={(e) => onStyleChange("fontFamily", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.fontSize")}</Label>
              <PropInfoTooltip text={t("design.info.fontSize")} />
            </div>
            <NumericPropertyInput
              value={String(style.fontSize ?? "")}
              placeholder="16px"
              onChange={(val) => onStyleChange("fontSize", val || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.fontWeight")}</Label>
              <PropInfoTooltip text={t("design.info.fontWeight")} />
            </div>
            <Select
              value={String(style.fontWeight ?? "")}
              onValueChange={(v) => onStyleChange("fontWeight", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t("design.fontWeight")} />
              </SelectTrigger>
              <SelectContent>
                {["100","200","300","400","500","600","700","800","900"].map((w) => (
                  <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.lineHeight")}</Label>
              <PropInfoTooltip text={t("design.info.lineHeight")} />
            </div>
            <Input
              className="h-7 text-xs"
              value={String(style.lineHeight ?? "")}
              placeholder="1.5"
              onChange={(e) => onStyleChange("lineHeight", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.letterSpacing")}</Label>
              <PropInfoTooltip text={t("design.info.letterSpacing")} />
            </div>
            <NumericPropertyInput
              value={String(style.letterSpacing ?? "")}
              placeholder="0"
              onChange={(val) => onStyleChange("letterSpacing", val || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.textAlign")}</Label>
              <PropInfoTooltip text={t("design.info.textAlign")} />
            </div>
            <Select
              value={String(style.textAlign ?? "")}
              onValueChange={(v) => onStyleChange("textAlign", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t("design.textAlign")} />
              </SelectTrigger>
              <SelectContent>
                {["left", "center", "right", "justify"].map((a) => (
                  <SelectItem key={a} value={a} className="text-xs capitalize">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5 mt-2">
          <div className="flex items-center">
            <Label className="text-[10px] text-muted-foreground">{t("design.color")}</Label>
            <PropInfoTooltip text={t("design.info.color")} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
              value={String(style.color ?? "#000000")}
              onChange={(e) => onStyleChange("color", e.target.value)}
            />
            <Input
              className="h-7 text-xs flex-1 font-mono"
              value={String(style.color ?? "")}
              onChange={(e) => onStyleChange("color", e.target.value)}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Background — hidden for Section (handled in merged block above) */}
      {!isSectionNode && <CollapsibleSection title={t("design.background")} defaultOpen={false}>
        <div className="grid gap-1.5">
          <div className="flex items-center">
            <Label className="text-[10px] text-muted-foreground">{t("design.backgroundColor")}</Label>
            <PropInfoTooltip text={t("design.info.backgroundColor")} />
          </div>
          <div className="flex items-center gap-2">
            <ColorSwatch
              value={String(style.backgroundColor ?? "")}
              onChange={(v) => onStyleChange("backgroundColor", v)}
            />
            <Input
              className="h-7 text-xs flex-1 font-mono uppercase"
              value={String(style.backgroundColor ?? "")}
              onChange={(e) => onStyleChange("backgroundColor", e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1 mt-2">
          {renderBackgroundImageControl()}
          {renderBackgroundImageOptions()}
        </div>
      </CollapsibleSection>}

      {/* Border */}
      <CollapsibleSection title={t("design.border")} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.borderWidth")}</Label>
              <PropInfoTooltip text={t("design.info.borderWidth")} />
            </div>
            <NumericPropertyInput
              value={String(style.borderWidth ?? "")}
              placeholder="0"
              onChange={(val) => onStyleChange("borderWidth", val || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.borderStyle")}</Label>
              <PropInfoTooltip text={t("design.info.borderStyle")} />
            </div>
            <Select
              value={String(style.borderStyle ?? "")}
              onValueChange={(v) => onStyleChange("borderStyle", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t("design.borderStyle")} />
              </SelectTrigger>
              <SelectContent>
                {["none","solid","dashed","dotted","double"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.borderRadius")}</Label>
              <PropInfoTooltip text={t("design.info.borderRadius")} />
            </div>
            <NumericPropertyInput
              value={String(style.borderRadius ?? "")}
              placeholder="0"
              onChange={(val) => onStyleChange("borderRadius", val || undefined)}
            />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.borderColor")}</Label>
              <PropInfoTooltip text={t("design.info.borderColor")} />
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                className="h-7 w-8 rounded border border-input bg-background cursor-pointer"
                value={String(style.borderColor ?? "#000000")}
                onChange={(e) => onStyleChange("borderColor", e.target.value)}
              />
              <Input
                className="h-7 text-xs flex-1 font-mono"
                value={String(style.borderColor ?? "")}
                onChange={(e) => onStyleChange("borderColor", e.target.value)}
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Shadow & Effects */}
      <CollapsibleSection title={t("design.shadow")} defaultOpen={false}>
        <ShadowControl
          value={style.boxShadow as string | undefined}
          onChange={(css: string | undefined) => onStyleChange("boxShadow", css === "none" ? undefined : css)}
        />
      </CollapsibleSection>

      {/* Layout */}
      <CollapsibleSection title={t("design.layout")} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.display")}</Label>
              <PropInfoTooltip text={t("design.info.display")} />
            </div>
            <Select
              value={String(style.display ?? "")}
              onValueChange={(v) => onStyleChange("display", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t("design.display")} />
              </SelectTrigger>
              <SelectContent>
                {["block","flex","grid","inline-block","inline","none"].map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.position")}</Label>
              <PropInfoTooltip text={t("design.info.position")} />
            </div>
            <Select
              value={String(style.position ?? "")}
              onValueChange={(v) => onStyleChange("position", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t("design.position")} />
              </SelectTrigger>
              <SelectContent>
                {["static","relative","absolute","fixed","sticky"].map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.overflow")}</Label>
              <PropInfoTooltip text={t("design.info.overflow")} />
            </div>
            <Select
              value={String(style.overflow ?? "")}
              onValueChange={(v) => onStyleChange("overflow", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t("design.overflow")} />
              </SelectTrigger>
              <SelectContent>
                {["visible","hidden","scroll","auto"].map((o) => (
                  <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.zIndex")}</Label>
              <PropInfoTooltip text={t("design.info.zIndex")} />
            </div>
            <NumericPropertyInput
              value={String(style.zIndex ?? "")}
              placeholder="auto"
              units={[""]}
              onChange={(val) => onStyleChange("zIndex", val || undefined)}
            />
          </div>
        </div>

        {/* Flex-specific props */}
        {(style.display === "flex" || style.display === "inline-flex") && (
          <>
            <Separator className="my-2" />
            <p className="text-[10px] font-semibold text-muted-foreground">{t("design.flex")}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <div className="flex items-center">
                  <Label className="text-[10px] text-muted-foreground">{t("design.flexDirection")}</Label>
                  <PropInfoTooltip text={t("design.info.flexDirection")} />
                </div>
                <Select
                  value={String(style.flexDirection ?? "")}
                  onValueChange={(v) => onStyleChange("flexDirection", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="row" />
                  </SelectTrigger>
                  <SelectContent>
                    {["row","row-reverse","column","column-reverse"].map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center">
                  <Label className="text-[10px] text-muted-foreground">{t("design.flexWrap")}</Label>
                  <PropInfoTooltip text={t("design.info.flexWrap")} />
                </div>
                <Select
                  value={String(style.flexWrap ?? "")}
                  onValueChange={(v) => onStyleChange("flexWrap", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="nowrap" />
                  </SelectTrigger>
                  <SelectContent>
                    {["nowrap","wrap","wrap-reverse"].map((w) => (
                      <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center">
                  <Label className="text-[10px] text-muted-foreground">{t("design.justifyContent")}</Label>
                  <PropInfoTooltip text={t("design.info.justifyContent")} />
                </div>
                <Select
                  value={String(style.justifyContent ?? "")}
                  onValueChange={(v) => onStyleChange("justifyContent", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="start" />
                  </SelectTrigger>
                  <SelectContent>
                    {["flex-start","flex-end","center","space-between","space-around","space-evenly"].map((j) => (
                      <SelectItem key={j} value={j} className="text-xs">{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center">
                  <Label className="text-[10px] text-muted-foreground">{t("design.alignItems")}</Label>
                  <PropInfoTooltip text={t("design.info.alignItems")} />
                </div>
                <Select
                  value={String(style.alignItems ?? "")}
                  onValueChange={(v) => onStyleChange("alignItems", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="stretch" />
                  </SelectTrigger>
                  <SelectContent>
                    {["flex-start","flex-end","center","stretch","baseline"].map((a) => (
                      <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1 col-span-2">
                <div className="flex items-center">
                  <Label className="text-[10px] text-muted-foreground">{t("design.gap")}</Label>
                  <PropInfoTooltip text={t("design.info.gap")} />
                </div>
                <Input
                  className="h-7 text-xs"
                  value={String(style.gap ?? "")}
                  placeholder="0"
                  onChange={(e) => onStyleChange("gap", e.target.value || undefined)}
                />
              </div>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* Opacity & Filter */}
      <CollapsibleSection title={t("design.visual")} defaultOpen={false}>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Label className="text-[10px] text-muted-foreground">{t("design.opacity")}</Label>
              <PropInfoTooltip text={t("design.info.opacity")} />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round((Number(style.opacity ?? 1)) * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[Number(style.opacity ?? 1)]}
            onValueChange={([v]) => onStyleChange("opacity", String(v))}
          />
        </div>
        <div className="grid gap-1">
          <div className="flex items-center">
            <Label className="text-[10px] text-muted-foreground">{t("design.filter")}</Label>
            <PropInfoTooltip text={t("design.info.filter")} />
          </div>
          <Input
            className="h-7 text-xs font-mono"
            value={String(style.filter ?? "")}
            placeholder="blur(0px)"
            onChange={(e) => onStyleChange("filter", e.target.value || undefined)}
          />
        </div>
        <div className="grid gap-1">
          <div className="flex items-center">
            <Label className="text-[10px] text-muted-foreground">{t("design.backdropFilter")}</Label>
            <PropInfoTooltip text={t("design.info.backdropFilter")} />
          </div>
          <Input
            className="h-7 text-xs font-mono"
            value={String(style.backdropFilter ?? "")}
            placeholder="blur(0px)"
            onChange={(e) => onStyleChange("backdropFilter", e.target.value || undefined)}
          />
        </div>
        <div className="grid gap-1">
          <div className="flex items-center">
            <Label className="text-[10px] text-muted-foreground">{t("design.mixBlendMode")}</Label>
            <PropInfoTooltip text={t("design.info.mixBlendMode")} />
          </div>
          <Select
            value={String(style.mixBlendMode ?? "")}
            onValueChange={(v) => onStyleChange("mixBlendMode", v || undefined)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="normal" />
            </SelectTrigger>
            <SelectContent>
              {["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"].map((m) => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>

      {/* Transform */}
      <CollapsibleSection title={t("design.transform")} defaultOpen={false}>
        <div className="grid gap-1">
          <div className="flex items-center">
            <Label className="text-[10px] text-muted-foreground">{t("design.transform")}</Label>
            <PropInfoTooltip text={t("design.info.transform")} />
          </div>
          <Input
            className="h-7 text-xs font-mono"
            value={String(style.transform ?? "")}
            placeholder="rotate(0deg) scale(1)"
            onChange={(e) => onStyleChange("transform", e.target.value || undefined)}
          />
        </div>
      </CollapsibleSection>
    </ScrollArea>
  );
}
