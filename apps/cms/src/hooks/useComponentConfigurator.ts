import { useState, useMemo, useCallback } from "react";
import type { ComponentDefinition, StyleConfig, BuilderDocument } from "@ui-builder/builder-core";
import { buildPreviewDocument } from "@/lib/buildPreviewDocument";

export interface UseComponentConfiguratorReturn {
  props: Record<string, unknown>;
  style: Partial<StyleConfig>;
  document: BuilderDocument | null;
  setProp: (key: string, value: unknown) => void;
  setStyleProp: (key: string, value: unknown) => void;
  reset: () => void;
}

export function useComponentConfigurator(
  definition: ComponentDefinition | null,
  /** Override initial props — palette item props take priority over definition.defaultProps */
  initialProps?: Record<string, unknown>,
  /** Override initial style — palette item style takes priority over definition.defaultStyle */
  initialStyle?: Partial<StyleConfig>,
): UseComponentConfiguratorReturn {
  const defaultProps = useMemo(
    () => initialProps ?? definition?.defaultProps ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const defaultStyle = useMemo(
    () => initialStyle ?? (definition?.defaultStyle ?? {}) as Partial<StyleConfig>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [props, setProps] = useState<Record<string, unknown>>(defaultProps);
  const [styleState, setStyleState] = useState<Partial<StyleConfig>>(defaultStyle);

  const setProp = useCallback((key: string, value: unknown) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setStyleProp = useCallback((key: string, value: unknown) => {
    setStyleState((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete (next as Record<string, unknown>)[key];
      } else {
        (next as Record<string, unknown>)[key] = value;
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setProps(defaultProps);
    setStyleState(defaultStyle);
  }, [defaultProps, defaultStyle]);

  const document = useMemo(
    () =>
      definition
        ? buildPreviewDocument(definition.type, props, styleState)
        : null,
    [definition, props, styleState],
  );

  return { props, style: styleState, document, setProp, setStyleProp, reset };
}
