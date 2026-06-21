import type { PopupTemplate } from "../document/popups";

export class PopupTemplateRegistry {
  private templates = new Map<string, PopupTemplate>();

  register(template: PopupTemplate): void {
    this.templates.set(template.id, template);
  }

  registerMany(templates: PopupTemplate[]): void {
    for (const template of templates) {
      this.register(template);
    }
  }

  unregister(id: string): boolean {
    return this.templates.delete(id);
  }

  get(id: string): PopupTemplate | undefined {
    return this.templates.get(id);
  }

  list(filter?: { category?: string; search?: string }): PopupTemplate[] {
    let templates = Array.from(this.templates.values());
    if (filter?.category) {
      templates = templates.filter((template) => template.category === filter.category);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      templates = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(q) ||
          template.description?.toLowerCase().includes(q) ||
          template.tags?.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return templates;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const template of this.templates.values()) {
      if (template.category) categories.add(template.category);
    }
    return Array.from(categories);
  }

  clear(): void {
    this.templates.clear();
  }

  get size(): number {
    return this.templates.size;
  }
}
