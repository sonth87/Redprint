/**
 * COMMAND_REFERENCE — canonical builder command documentation sent to the LLM.
 *
 * Single source of truth. Previously duplicated between client buildSystemMessage()
 * and the backend /chat handler. Now lives here only — the client no longer sends it.
 */

export const COMMAND_REFERENCE = `## Command Reference

### ADD_NODE — Add a new component to the canvas
{ "type": "ADD_NODE", "payload": { "componentType": "ComponentType", "parentId": "root", "nodeId": "temp-unique-id", "props": {}, "style": {}, "responsiveStyle": { "mobile": { "flexDirection": "column" } }, "responsiveProps": { "mobile": { "label": "Short" } }, "responsiveHidden": { "tablet": true } } }
IMPORTANT:
- The payload field MUST be "componentType" (NOT "type").
- Use "root" as parentId for top-level sections/containers.
- To build NESTED layouts, assign a temporary "nodeId" (e.g. "temp-hero", "temp-grid-1") in each ADD_NODE, then use that same ID as "parentId" in child ADD_NODE commands. The system resolves all IDs to real UUIDs automatically.
- For RESPONSIVE DESIGN: Use "responsiveStyle", "responsiveProps", or "responsiveHidden" mapped by breakpoint ("desktop" | "tablet" | "mobile").

### UPDATE_STYLE — Update CSS styles on an existing node
{ "type": "UPDATE_STYLE", "payload": { "nodeId": "uuid", "style": { "backgroundColor": "#fff", "fontSize": "16px" } } }

### UPDATE_PROPS — Update component content/configuration
{ "type": "UPDATE_PROPS", "payload": { "nodeId": "uuid", "props": { "text": "content" } } }

### RENAME_NODE — Rename a node in the layers panel
{ "type": "RENAME_NODE", "payload": { "nodeId": "uuid", "name": "New Name" } }

### UPDATE_RESPONSIVE_STYLE — Update styles for a specific breakpoint
{ "type": "UPDATE_RESPONSIVE_STYLE", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile", "style": {} } }

### UPDATE_RESPONSIVE_PROPS — Update props for a specific breakpoint
{ "type": "UPDATE_RESPONSIVE_PROPS", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile", "props": {} } }

### TOGGLE_RESPONSIVE_HIDDEN — Hide/show a node on a specific breakpoint
{ "type": "TOGGLE_RESPONSIVE_HIDDEN", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile" } }

### RESET_RESPONSIVE_STYLE — Remove all breakpoint overrides and revert to base style
{ "type": "RESET_RESPONSIVE_STYLE", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile" } }

### DUPLICATE_NODE — Duplicate an existing node
{ "type": "DUPLICATE_NODE", "payload": { "nodeId": "uuid" } }

### UPDATE_CANVAS_CONFIG — Update canvas-level settings
{ "type": "UPDATE_CANVAS_CONFIG", "payload": { "config": {} } }

### UPDATE_INTERACTIONS — Update interaction/event handlers on a node
{ "type": "UPDATE_INTERACTIONS", "payload": { "nodeId": "uuid", "interactions": [] } }

## Output Format — CRITICAL
Respond with EXACTLY ONE JSON object. No markdown, no code blocks, no preamble, no trailing text.
{ "message": "Brief explanation of what you are doing", "commands": [ ... ] }
If there are no commands to execute: { "message": "...", "commands": [] }
For existing nodes, use real UUIDs from the context. For NEW nodes, use temp IDs ("temp-xxx") and reference them as parentId in children.
Always respond in the same language the user uses in their prompt.`;
