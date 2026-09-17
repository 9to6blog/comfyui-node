export const NODE_TYPE = "NineToSixMultiPromptSwitch";
const INPUT_MARKER = "data-ninetosix-prompt-input";

function isPromptNode(node) {
    return node?.comfyClass === NODE_TYPE || node?.type === NODE_TYPE;
}

export function markPromptInputs(node) {
    if (!isPromptNode(node)) return;
    for (const widget of node.widgets ?? []) {
        if (!/^prompt_\d{2}$/.test(widget.name)) continue;
        // element is the current API; inputEl supports older ComfyUI releases.
        const element = widget.element ?? widget.inputEl;
        element?.setAttribute?.(INPUT_MARKER, "");
    }
}

export function isPromptInput(target, app) {
    if (!target || !["TEXTAREA", "INPUT"].includes(target.tagName)) return false;
    if (target.hasAttribute?.(INPUT_MARKER)) return true;

    // Vue-rendered widgets may replace their DOM element after node creation.
    const container = target.closest?.("[data-node-id]");
    if (!container) return false;
    const graph = app.canvas?.graph ?? app.graph;
    const node = graph?.getNodeById?.(container.getAttribute("data-node-id"));
    return isPromptNode(node);
}

export function createSaveShortcutGuard(app) {
    return (event) => {
        const isSaveKey = event.code === "KeyS" || event.key?.toLowerCase() === "s";
        if (!(event.ctrlKey || event.metaKey) || event.altKey || !isSaveKey) return;

        const target = event.composedPath?.()[0] ?? event.target;
        if (!isPromptInput(target, app)) return;

        // Cancel only the browser's Save Page default action. Keep propagation
        // intact so ComfyUI can handle its normal Save Workflow shortcut once.
        event.preventDefault();
    };
}
