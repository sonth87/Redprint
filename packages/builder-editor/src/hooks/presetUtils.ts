import { v4 as uuidv4 } from "uuid";
import type { PresetChildNode, Breakpoint, StyleConfig } from "@ui-builder/builder-core";

export interface AddNodeAction {
  type: "ADD_NODE";
  payload: {
    nodeId: string;
    parentId: string;
    componentType: string;
    props?: Record<string, unknown>;
    style?: Partial<StyleConfig>;
    insertIndex?: number;
    responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
    responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  };
  groupId?: string;
  description?: string;
}

/**
 * Recursively generates a list of ADD_NODE actions from a preset children tree.
 */
export function generateRecursiveAddActions(
  children: PresetChildNode[],
  parentId: string,
  groupId: string,
  dispatch: (action: any) => void
): void {
  children.forEach((child, index) => {
    const nodeId = uuidv4();
    
    // 1. Add the child node
    dispatch({
      type: "ADD_NODE",
      payload: {
        nodeId,
        parentId,
        componentType: child.componentType || (child as any).type,
        props: child.props,
        style: child.style,
        insertIndex: index,
      },
      groupId,
      description: `Add ${child.componentType} (preset)`,
    });

    // 2. Recursively add its children
    if (child.children && child.children.length > 0) {
      generateRecursiveAddActions(child.children, nodeId, groupId, dispatch);
    }
  });
}
