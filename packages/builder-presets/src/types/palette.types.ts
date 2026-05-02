export interface PaletteItemChild {
  componentType: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  responsiveProps?: Record<string, unknown>;
  responsiveStyle?: Record<string, unknown>;
  interactions?: unknown[];
  slot?: string;
  role?: string;
  children?: PaletteItemChild[];
}

export interface PaletteItem {
  id: string;
  type?: "variant" | "group";
  componentType: string;
  name: string;
  description?: string;
  thumbnail?: string | null;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  responsiveProps?: Record<string, unknown>;
  responsiveStyle?: Record<string, unknown>;
  tags?: string[];
  i18n?: Record<string, { name?: string }>;
  purpose?: string;
  industryHints?: string[];
  layoutVariant?: string;
  category?: string;
  children?: PaletteItemChild[];
}

export interface PaletteType {
  id: string;
  label: string;
  order?: number;
  layout?: string;
  items: PaletteItem[];
}

export interface PaletteGroup {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  i18n?: Record<string, string | Record<string, string>>;
  types: PaletteType[];
}
