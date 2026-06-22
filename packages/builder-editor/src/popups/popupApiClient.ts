import type { PopupTemplate } from "@ui-builder/builder-core";

export interface SavedPopupEntry extends PopupTemplate {
  savedAt: string;
  updatedAt: string;
}

function base(backendUrl: string) {
  return backendUrl.replace(/\/$/, "");
}

export const popupApiClient = {
  async listLibrary(backendUrl: string): Promise<SavedPopupEntry[]> {
    const res = await fetch(`${base(backendUrl)}/api/popups`);
    if (!res.ok) throw new Error(`Failed to load popup library: ${res.status}`);
    const data = await res.json();
    return data.popups ?? [];
  },

  async saveToLibrary(
    backendUrl: string,
    entry: Pick<SavedPopupEntry, "name" | "description" | "category" | "tags" | "thumbnail" | "popup" | "root">,
  ): Promise<SavedPopupEntry> {
    const res = await fetch(`${base(backendUrl)}/api/popups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`Failed to save popup: ${res.status}`);
    const data = await res.json();
    return data.popup;
  },

  async updateLibraryEntry(
    backendUrl: string,
    id: string,
    patch: Partial<Pick<SavedPopupEntry, "name" | "description" | "category" | "tags" | "thumbnail">>,
  ): Promise<SavedPopupEntry> {
    const res = await fetch(`${base(backendUrl)}/api/popups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Failed to update popup: ${res.status}`);
    const data = await res.json();
    return data.popup;
  },

  async deleteFromLibrary(backendUrl: string, id: string): Promise<void> {
    const res = await fetch(`${base(backendUrl)}/api/popups/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete popup: ${res.status}`);
  },

  async listTemplates(backendUrl: string): Promise<PopupTemplate[]> {
    const res = await fetch(`${base(backendUrl)}/api/popups/templates`);
    if (!res.ok) throw new Error(`Failed to load templates: ${res.status}`);
    const data = await res.json();
    return data.templates ?? [];
  },
};
