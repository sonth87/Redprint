export interface PaletteItemChild {
  componentType: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  children?: PaletteItemChild[];
}

export interface PaletteItem {
  id: string;
  componentType: string;
  name: string;
  thumbnail?: string | null;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  responsiveStyle?: Record<string, unknown>;
  tags?: string[];
  i18n?: Record<string, { name?: string }>;
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
