import assert from "node:assert/strict";
import { test } from "node:test";

// panel.js imports ComfyUI's browser-only app module, so keep state behavior in
// this source-level test dependency-free by importing a generated data URL.
const panelSource = await (await import("node:fs/promises")).readFile(
    new URL("../../web/prompt_switch/panel.js", import.meta.url), "utf8");

function extractFunction(name) {
    const start = panelSource.indexOf(`export function ${name}`);
    assert.notEqual(start, -1, `${name} export must exist`);
    const brace = panelSource.indexOf("{", start);
    let depth = 0;
    for (let index = brace; index < panelSource.length; index++) {
        if (panelSource[index] === "{") depth++;
        if (panelSource[index] === "}" && --depth === 0) return panelSource.slice(start, index + 1).replace("export ", "");
    }
    throw new Error(`Could not extract ${name}`);
}

const moduleUrl = `data:text/javascript,${encodeURIComponent(`${extractFunction("shiftedSlotValues")}\n${extractFunction("exclusiveEnabledValues")}\n${extractFunction("normalizeEnabledValues")}\n${extractFunction("normalizeLegacyState")}\nexport { shiftedSlotValues, exclusiveEnabledValues, normalizeEnabledValues, normalizeLegacyState };`)}`;
const { shiftedSlotValues, exclusiveEnabledValues, normalizeEnabledValues, normalizeLegacyState } = await import(moduleUrl);

test("removing a prompt shifts later cards and clears the final visible slot", () => {
    const values = [
        { title: "Subject", enabled: true, prompt: "portrait" },
        { title: "Light", enabled: false, prompt: "soft light" },
        { title: "Style", enabled: true, prompt: "watercolor" },
        { title: "Hidden", enabled: true, prompt: "keep outside visible range" },
    ];
    assert.deepEqual(shiftedSlotValues(values, 2, 3), [
        values[0], values[2], { title: "", enabled: false, prompt: "" }, values[3],
    ]);
});

test("removing the first of ten slots keeps ordering stable", () => {
    const values = Array.from({ length: 10 }, (_, index) => ({ title: `${index + 1}`, enabled: true, prompt: `${index + 1}` }));
    const next = shiftedSlotValues(values, 1, 10);
    assert.equal(next[0].title, "2");
    assert.equal(next[8].title, "10");
    assert.deepEqual(next[9], { title: "", enabled: false, prompt: "" });
});

test("turning one prompt on always clears every other selection", () => {
    assert.deepEqual(exclusiveEnabledValues([true, true, false, true], 3, true), [false, false, true, false]);
    assert.deepEqual(exclusiveEnabledValues([false, false, true], 3, false), [false, false, false]);
    assert.deepEqual(normalizeEnabledValues([false, true, true, true]), [false, true, false, false]);
    assert.deepEqual(normalizeEnabledValues([false, false, false]), [false, false, false]);
});

test("legacy dynamic switch data keeps content but normalizes to one ON", () => {
    const state = normalizeLegacyState({
        count: 4,
        titles: ["A", "B", "C", "D"],
        texts: ["one", "two", "three", "four"],
        enabled: [false, true, true, false],
    });
    assert.equal(state.count, 4);
    assert.deepEqual(state.titles, ["A", "B", "C", "D"]);
    assert.deepEqual(state.texts, ["one", "two", "three", "four"]);
    assert.deepEqual(state.enabled, [false, true, false, false]);
    assert.deepEqual(normalizeLegacyState(null).enabled, [true, false, false]);
});

test("panel includes inline SVG icons and scrollable list styling", () => {
    assert.match(panelSource, /createElementNS\(SVG_NS, "svg"\)/);
    assert.match(panelSource, /\.ns-prompt-list \{[^}]*overflow-y: auto/s);
    assert.match(panelSource, /DEFAULT_VISIBLE_PROMPTS = 3/);
    assert.match(panelSource, /PROMPT_SLOTS = 10/);
    assert.match(panelSource, /exclusiveEnabledValues\(normalizedEnabled, index, !enabled\)/);
    assert.match(panelSource, /LEGACY_NODE_TYPE = "TextToggleSwitchNode"/);
    assert.match(panelSource, /dataset\.compatibility = "TextToggleSwitchNode"/);
    assert.doesNotMatch(panelSource, /widget\.computeSize\s*=\s*width/, "panel DOM widget must remain growable when the node is resized");
});
