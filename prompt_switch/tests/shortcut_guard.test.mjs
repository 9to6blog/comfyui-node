import assert from "node:assert/strict";
import { test } from "node:test";
import {
    NODE_TYPE,
    createSaveShortcutGuard,
    isPromptInput,
    markPromptInputs,
} from "../web/shortcut_guard.js";

function input({ marked = true, tagName = "TEXTAREA", nodeId = null } = {}) {
    const attributes = new Map(marked ? [["data-ninetosix-prompt-input", ""]] : []);
    return {
        tagName,
        setAttribute: (name, value) => attributes.set(name, value),
        hasAttribute: (name) => attributes.has(name),
        closest: () => nodeId === null ? null : { getAttribute: () => nodeId },
    };
}

function keyEvent(target, options = {}) {
    const event = new Event("keydown", { cancelable: true, bubbles: true });
    Object.assign(event, { ctrlKey: true, metaKey: false, altKey: false, key: "s", code: "KeyS", ...options });
    event.composedPath = () => [target];
    event.stopPropagation = () => assert.fail("ComfyUI must still receive the shortcut");
    event.stopImmediatePropagation = () => assert.fail("ComfyUI must still receive the shortcut");
    return event;
}

test("Ctrl+S cancels browser Save Page while preserving ComfyUI's listener", () => {
    const bus = new EventTarget();
    bus.addEventListener("keydown", createSaveShortcutGuard({}));
    let workflowHandlerCalls = 0;
    bus.addEventListener("keydown", () => workflowHandlerCalls++);
    const event = keyEvent(input());
    assert.equal(bus.dispatchEvent(event), false);
    assert.equal(event.defaultPrevented, true);
    assert.equal(workflowHandlerCalls, 1);
});

test("Cmd+S and physical KeyS with a non-Latin keyboard are also protected", () => {
    for (const options of [{ ctrlKey: false, metaKey: true }, { key: "ы" }, { shiftKey: true, key: "S" }]) {
        const event = keyEvent(input(), options);
        createSaveShortcutGuard({})(event);
        assert.equal(event.defaultPrevented, true);
    }
});

test("typing, copy, paste, undo, and Alt shortcuts remain untouched", () => {
    for (const options of [
        { ctrlKey: false }, { key: "c", code: "KeyC" },
        { key: "v", code: "KeyV" }, { key: "z", code: "KeyZ" }, { altKey: true },
    ]) {
        const event = keyEvent(input(), options);
        createSaveShortcutGuard({})(event);
        assert.equal(event.defaultPrevented, false);
    }
});

test("other nodes, unrelated inputs and canvas are not intercepted", () => {
    for (const target of [input({ marked: false }), input({ tagName: "CANVAS" }), null]) {
        const event = keyEvent(target);
        createSaveShortcutGuard({})(event);
        assert.equal(event.defaultPrevented, false);
    }
});

test("only this node's prompt widgets are marked, with legacy support", () => {
    const current = input({ marked: false });
    const legacy = input({ marked: false });
    const unrelated = input({ marked: false });
    markPromptInputs({ comfyClass: NODE_TYPE, widgets: [
        { name: "prompt_01", element: current },
        { name: "prompt_02", inputEl: legacy },
        { name: "separator", element: unrelated },
    ] });
    assert.equal(isPromptInput(current, {}), true);
    assert.equal(isPromptInput(legacy, {}), true);
    assert.equal(isPromptInput(unrelated, {}), false);
    markPromptInputs({ type: "OtherNode", widgets: [{ name: "prompt_01", element: unrelated }] });
    assert.equal(isPromptInput(unrelated, {}), false);
});

test("Vue inputs resolve against the active graph including subgraphs", () => {
    const target = input({ marked: false, nodeId: "17" });
    const app = {
        canvas: { graph: { getNodeById: (id) => id === "17" ? { type: NODE_TYPE } : null } },
        graph: { getNodeById: () => ({ type: "UnrelatedRootNode" }) },
    };
    const event = keyEvent(target);
    createSaveShortcutGuard(app)(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(isPromptInput(target, { graph: app.graph }), false);
});

test("the root graph is used when there is no active canvas graph", () => {
    const target = input({ marked: false, nodeId: "1" });
    assert.equal(isPromptInput(target, { graph: { getNodeById: () => ({ comfyClass: NODE_TYPE }) } }), true);
});
