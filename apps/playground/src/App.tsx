import React, { useState } from "react";
import { BuilderEditor, i18n } from "@ui-builder/builder-editor";
import { RuntimeRenderer } from "@ui-builder/builder-renderer";
import { ComponentRegistry } from "@ui-builder/builder-core";
import { Button } from "@ui-builder/ui";
import { Pen, Eye, Code, Github, Languages } from "lucide-react";
import { useBuilderSetup } from "./hooks/useBuilderSetup";
import { SAMPLE_COMPONENTS } from "./components/sample-components";
import koTranslations from "./i18n/ko.json";
import koFlatTranslations from "./i18n/ko-flat.json";

type Tab = "editor" | "preview" | "json";
type Locale = "en" | "vi" | "ko" | "ko-flat";

/**
 * Playground App — dual-mode editor + preview + JSON inspector.
 *
 * Tab "Editor" → full BuilderEditor with all panels
 * Tab "Preview" → RuntimeRenderer (production render, no editor chrome)
 * Tab "JSON" → raw document JSON inspector
 */
export function App() {
  const { builder, groupRegistry, paletteCatalog } = useBuilderSetup();
  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [locale, setLocale] = useState<Locale>("en");

  const toggleLocale = () => {
    const next: Locale = 
      locale === "en" ? "vi" : 
      locale === "vi" ? "ko" : 
      locale === "ko" ? "ko-flat" :
      "en";
    i18n.changeLanguage(next === "ko-flat" ? "ko" : next);
    setLocale(next);
  };

  // Demo: Support both nested (ko.json) and flat (ko-flat.json) formats
  // The flat format uses keys like "toolbar.undo" instead of { toolbar: { undo: "..." } }
  const i18nResources = React.useMemo(
    () => ({
      ko: { translation: locale === "ko-flat" ? koFlatTranslations : koTranslations },
    }),
    [locale]
  );

  // Build a registry for the runtime renderer (same components)
  const runtimeRegistry = React.useMemo(() => {
    const reg = new ComponentRegistry();
    for (const comp of SAMPLE_COMPONENTS) {
      reg.registerComponent(comp);
    }
    return reg;
  }, []);

  const state = builder.getState();
  const docJson = JSON.stringify(state.document, null, 2);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">

      {/* ── App Header ── */}
      <header className="flex items-center justify-between h-11 px-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center text-background text-xs font-black">
            B
          </div>
          <span className="text-sm font-semibold">UI Builder</span>
          <span className="text-xs text-muted-foreground ml-1 border border-border rounded px-1.5 py-0.5">
            Playground
          </span>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {(
            [
              { id: "editor" as Tab, label: "Editor", icon: Pen },
              { id: "preview" as Tab, label: "Preview", icon: Eye },
              { id: "json" as Tab, label: "JSON", icon: Code },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors " +
                (activeTab === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={
              locale === "en"
                ? "Switch to Tiếng Việt"
                : locale === "vi"
                ? "Switch to 한국어 (nested)"
                : locale === "ko"
                ? "Switch to 한국어 (flat)"
                : "Switch to English"
            }
          >
            <Languages className="h-3.5 w-3.5" />
            {locale === "en" ? "EN" : locale === "vi" ? "VI" : locale === "ko" ? "KO" : "KO*"}
          </button>
          <a
            href="https://github.com/sonth87/Redprint"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-hidden">

        {/* Editor tab - always mounted to preserve zoom/pan/selection state */}
        <div className="h-full" style={{ display: activeTab === "editor" ? "flex" : "none" }}>
          <BuilderEditor
            builder={builder}
            groupRegistry={groupRegistry}
            paletteCatalog={paletteCatalog}
            locale={locale}
            i18nResources={i18nResources}
            className="h-full"
          />
        </div>

        {/* Preview tab — RuntimeRenderer */}
        {activeTab === "preview" && (
          <div className="h-full overflow-auto bg-muted/40 flex items-start justify-center p-8">
            {/* Artboard frame — mirrors the editor canvas frame exactly so that
                position:absolute nodes, widths, and overflow behave identically. */}
            <div
              style={{
                width: state.document.canvasConfig.width ?? 1280,
                minHeight: state.document.canvasConfig.height ?? 800,
                backgroundColor: state.document.canvasConfig.backgroundColor ?? "#ffffff",
                position: "relative",
                // boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              <RuntimeRenderer
                document={state.document}
                registry={runtimeRegistry}
                config={{
                  breakpoint: "desktop",
                  variables: {},
                  attachNodeIds: false,
                }}
              />
            </div>
          </div>
        )}

        {/* JSON tab */}
        {activeTab === "json" && (
          <div className="h-full overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Document JSON
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(docJson);
                }}
                className="text-xs h-7"
              >
                Copy
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted rounded-lg p-4 overflow-auto h-[calc(100%-3rem)] text-foreground/80 leading-5">
              {docJson}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}
