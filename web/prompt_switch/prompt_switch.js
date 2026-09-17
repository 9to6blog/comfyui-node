import { app } from "../../../scripts/app.js";
import { createSaveShortcutGuard, markPromptInputs } from "./shortcut_guard.js";
import { mountPromptPanel, preparePromptNodeWidgets } from "./panel.js";

const LISTENER_KEY = Symbol.for("9to6.promptSwitch.saveShortcutGuard");

app.registerExtension({
    name: "9to6.PromptSwitch.SaveShortcut",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData?.name !== "NineToSixMultiPromptSwitch") return;
        const previousCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = previousCreated?.apply(this, arguments);
            preparePromptNodeWidgets(this);
            return result;
        };
    },
    setup() {
        if (document[LISTENER_KEY]) {
            document.removeEventListener("keydown", document[LISTENER_KEY], true);
        }
        const handler = createSaveShortcutGuard(app);
        document.addEventListener("keydown", handler, true);
        document[LISTENER_KEY] = handler;
    },
    nodeCreated(node) {
        markPromptInputs(node);
        mountPromptPanel(node);
    },
    loadedGraphNode(node) {
        markPromptInputs(node);
        mountPromptPanel(node);
    },
});
