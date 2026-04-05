/**
 * FontSize — adds a `fontSize` attribute to the `textStyle` mark via
 * `addGlobalAttributes`, matching the same pattern as @tiptap/extension-color.
 * Works alongside Color and Highlight without any mark conflicts.
 */
import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement) =>
              el.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes: Record<string, string | null>) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean } } }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean } } }) =>
          chain().setMark("textStyle", { fontSize: null }).run(),
    };
  },
});
