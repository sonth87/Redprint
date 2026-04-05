/**
 * GroupRegistry — manages component groups (nhóm lớn) and sub-groups (nhóm nhỏ)
 * for the component palette.
 *
 * Groups are purely UI metadata — they do not affect how nodes are stored in the
 * document. They are used by the ComponentPalette to render a 2-level collapsible
 * tree: Group → SubGroup → Components.
 *
 * @example
 * const registry = new GroupRegistry();
 * registry.registerGroup({ id: "text", label: "Văn bản", icon: "type", order: 0 });
 * registry.registerSubGroup({ id: "heading", parentGroupId: "text", label: "Tiêu đề", order: 0 });
 */

import type { ComponentGroup, ComponentSubGroup, ComponentDefinition } from "./types";

export interface GroupTreeNode {
  group: ComponentGroup;
  subGroups: Array<{
    subGroup: ComponentSubGroup;
    components: ComponentDefinition[];
  }>;
  /** Components that belong directly to the group (no sub-group) */
  components: ComponentDefinition[];
}

export class GroupRegistry {
  private readonly groups = new Map<string, ComponentGroup>();
  private readonly subGroups = new Map<string, ComponentSubGroup>();

  // ── Groups ────────────────────────────────────────────────────────────────

  registerGroup(group: ComponentGroup): void {
    if (this.groups.has(group.id)) {
      console.warn(`[GroupRegistry] Overwriting existing group: "${group.id}"`);
    }
    this.groups.set(group.id, group);
  }

  unregisterGroup(id: string): boolean {
    // Also remove all sub-groups that belong to this group
    for (const [subId, sub] of this.subGroups) {
      if (sub.parentGroupId === id) this.subGroups.delete(subId);
    }
    return this.groups.delete(id);
  }

  getGroup(id: string): ComponentGroup | undefined {
    return this.groups.get(id);
  }

  getGroups(): ComponentGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => a.order - b.order);
  }

  hasGroup(id: string): boolean {
    return this.groups.has(id);
  }

  // ── Sub-groups ────────────────────────────────────────────────────────────

  registerSubGroup(subGroup: ComponentSubGroup): void {
    if (this.subGroups.has(subGroup.id)) {
      console.warn(`[GroupRegistry] Overwriting existing sub-group: "${subGroup.id}"`);
    }
    this.subGroups.set(subGroup.id, subGroup);
  }

  unregisterSubGroup(id: string): boolean {
    return this.subGroups.delete(id);
  }

  getSubGroup(id: string): ComponentSubGroup | undefined {
    return this.subGroups.get(id);
  }

  getSubGroupsOf(groupId: string): ComponentSubGroup[] {
    return Array.from(this.subGroups.values())
      .filter((s) => s.parentGroupId === groupId)
      .sort((a, b) => a.order - b.order);
  }

  // ── Group tree ────────────────────────────────────────────────────────────

  /**
   * Build a 2-level tree structure from the registered groups and a flat list
   * of component definitions. Components that have no `group` field are placed
   * in an implicit "Other" group.
   *
   * @param components - All registered ComponentDefinitions
   * @returns Ordered array of GroupTreeNode objects
   */
  getGroupTree(components: ComponentDefinition[]): GroupTreeNode[] {
    const sortedGroups = this.getGroups();

    // Build lookup: groupId → subGroupId → components
    const compsByGroup = new Map<string, Map<string, ComponentDefinition[]>>();
    const ungrouped: ComponentDefinition[] = [];

    for (const comp of components) {
      if (!comp.group) {
        ungrouped.push(comp);
        continue;
      }
      if (!compsByGroup.has(comp.group)) {
        compsByGroup.set(comp.group, new Map());
      }
      const subMap = compsByGroup.get(comp.group)!;
      const subKey = comp.subGroup ?? "__direct__";
      if (!subMap.has(subKey)) subMap.set(subKey, []);
      subMap.get(subKey)!.push(comp);
    }

    const tree: GroupTreeNode[] = [];

    for (const group of sortedGroups) {
      const subMap = compsByGroup.get(group.id) ?? new Map<string, ComponentDefinition[]>();
      const sortedSubGroups = this.getSubGroupsOf(group.id);

      const subGroupNodes = sortedSubGroups
        .map((subGroup) => ({
          subGroup,
          components: (subMap.get(subGroup.id) ?? []).slice().sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        }))
        .filter((n) => n.components.length > 0);

      const directComponents = (subMap.get("__direct__") ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      // Only include groups that have at least one component or sub-group
      if (subGroupNodes.length > 0 || directComponents.length > 0) {
        tree.push({ group, subGroups: subGroupNodes, components: directComponents });
      }
    }

    // Append ungrouped components as a catch-all group
    if (ungrouped.length > 0) {
      const otherGroup: ComponentGroup = {
        id: "__other__",
        label: "Other",
        order: 9999,
        i18nKey: "groups.other",
      };
      tree.push({ group: otherGroup, subGroups: [], components: ungrouped });
    }

    return tree;
  }

  get groupCount(): number {
    return this.groups.size;
  }

  get subGroupCount(): number {
    return this.subGroups.size;
  }
}
