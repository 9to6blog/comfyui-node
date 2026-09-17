import { app } from "../../scripts/app.js";
import { createSaveShortcutGuard, markPromptInputs } from "./shortcut_guard.js";

const LISTENER_KEY = Symbol.for("9to6.promptSwitch.saveShortcutGuard");

app.registerExtension({
    name: "9to6.PromptSwitch.SaveShortcut",
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
    },
    loadedGraphNode(node) {
        markPromptInputs(node);
    },
});
