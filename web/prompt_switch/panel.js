import { app } from "../../../scripts/app.js";

export const PROMPT_SLOTS = 10;
export const DEFAULT_VISIBLE_PROMPTS = 3;
export const VISIBLE_COUNT_PROPERTY = "ninetosixPromptCount";

const PANEL_KEY = Symbol.for("9to6.promptSwitch.panel");
const LEGACY_NODE_TYPE = "TextToggleSwitchNode";
const LEGACY_MAX_SLOTS = 32;
const STYLE_ID = "ninetosix-prompt-switch-styles";
const SVG_NS = "http://www.w3.org/2000/svg";

const ICONS = {
    add: ["M12 5v14M5 12h14"],
    remove: ["M4 7h16", "M9 7V4h6v3", "M7 7l1 13h8l1-13", "M10 11v5M14 11v5"],
    power: ["M12 2v10", "M6.34 5.34a8 8 0 1 0 11.32 0"],
    prompt: ["M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2", "M7 9h10M7 13h6"],
    title: ["M4 5h16M12 5v14M8 19h8"],
    up: ["M12 19V5", "M6 11l6-6 6 6"],
    down: ["M12 5v14", "M6 13l6 6 6-6"],
    copy: ["M8 8h11v11H8z", "M5 16V5h11"],
};

function svgIcon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("ns-prompt-icon");
    for (const pathData of ICONS[name]) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", pathData);
        svg.append(path);
    }
    return svg;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .ns-prompt-panel, .ns-prompt-panel * { box-sizing: border-box; }
        .ns-prompt-panel {
            --ns-bg: color-mix(in srgb, var(--comfy-menu-bg, #17191d) 92%, #fff 8%);
            --ns-card: color-mix(in srgb, var(--comfy-input-bg, #24272d) 90%, #fff 10%);
            --ns-border: color-mix(in srgb, var(--border-color, #4b505b) 76%, transparent);
            --ns-muted: var(--descrip-text, #aeb4bf);
            --ns-text: var(--input-text, #f4f6f8);
            --ns-accent: #ffb238;
            --ns-accent-soft: color-mix(in srgb, var(--ns-accent) 17%, transparent);
            height: 100%; min-height: 0; overflow: hidden; display: flex; flex-direction: column;
            gap: 9px; padding: 10px; color: var(--ns-text); background: var(--ns-bg);
            border: 1px solid var(--ns-border); border-radius: 10px; font: 12px/1.35 Inter, system-ui, sans-serif;
        }
        .ns-prompt-panel button, .ns-prompt-panel input, .ns-prompt-panel textarea, .ns-prompt-panel select { font: inherit; }
        .ns-prompt-panel button { color: inherit; }
        .ns-prompt-header { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; flex: 0 0 auto; }
        .ns-prompt-brand { display: flex; align-items: center; gap: 7px; min-width: 0; font-weight: 750; letter-spacing: .01em; }
        .ns-prompt-brand .ns-prompt-icon { width: 18px; height: 18px; color: var(--ns-accent); }
        .ns-prompt-count { padding: 3px 8px; color: var(--ns-accent); background: var(--ns-accent-soft); border-radius: 999px; font-weight: 700; white-space: nowrap; }
        .ns-prompt-help { grid-column: 1 / -1; color: var(--ns-muted); font-size: 11px; }
        .ns-prompt-panel input, .ns-prompt-panel textarea {
            width: 100%; min-width: 0; color: var(--ns-text); background: var(--comfy-input-bg, #111318);
            border: 1px solid var(--ns-border); border-radius: 7px; outline: none;
        }
        .ns-prompt-panel input { height: 31px; padding: 5px 9px; }
        .ns-prompt-panel textarea { min-height: 68px; padding: 8px 9px; resize: vertical; line-height: 1.45; }
        .ns-prompt-panel input:focus, .ns-prompt-panel textarea:focus {
            border-color: var(--ns-accent); box-shadow: 0 0 0 2px var(--ns-accent-soft);
        }
        .ns-prompt-list { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 8px; padding-right: 3px; scrollbar-gutter: stable; }
        .ns-prompt-card { flex: 0 0 auto; padding: 9px; border: 1px solid var(--ns-border); border-radius: 9px; background: var(--ns-card); }
        .ns-prompt-card[data-enabled="true"] { border-color: color-mix(in srgb, var(--ns-accent) 55%, var(--ns-border)); }
        .ns-prompt-card-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto auto; gap: 7px; align-items: center; margin-bottom: 7px; }
        .ns-prompt-index { width: 24px; text-align: center; color: var(--ns-muted); font-size: 11px; font-variant-numeric: tabular-nums; font-weight: 700; }
        .ns-prompt-title-wrap, .ns-prompt-text-wrap { position: relative; display: block; }
        .ns-prompt-title-wrap .ns-prompt-icon { position: absolute; left: 8px; top: 8px; width: 15px; height: 15px; color: var(--ns-muted); pointer-events: none; }
        .ns-prompt-title-wrap input { padding-left: 29px; font-weight: 650; }
        .ns-prompt-text-wrap .ns-prompt-icon { position: absolute; left: 8px; top: 9px; width: 15px; height: 15px; color: var(--ns-muted); pointer-events: none; }
        .ns-prompt-text-wrap textarea { padding-left: 29px; }
        .ns-prompt-toggle, .ns-prompt-remove, .ns-prompt-tool, .ns-prompt-add {
            display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 31px; border: 1px solid var(--ns-border);
            border-radius: 7px; background: transparent; cursor: pointer; transition: background .12s ease, border-color .12s ease, color .12s ease;
        }
        .ns-prompt-toggle { min-width: 61px; padding: 0 8px; color: var(--ns-muted); font-size: 11px; font-weight: 800; }
        .ns-prompt-toggle[aria-checked="true"] { color: #17130c; border-color: var(--ns-accent); background: var(--ns-accent); }
        .ns-prompt-remove, .ns-prompt-tool { width: 31px; padding: 0; color: var(--ns-muted); }
        .ns-prompt-card-tools { display: inline-flex; gap: 4px; }
        .ns-prompt-card-tools .ns-prompt-tool { width: 28px; height: 28px; }
        .ns-prompt-tool:hover { color: #fff; border-color: color-mix(in srgb, var(--ns-accent) 55%, var(--ns-border)); background: var(--ns-accent-soft); }
        .ns-prompt-remove:hover { color: #fff; border-color: #e45d65; background: #b8323c; }
        .ns-prompt-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
        .ns-prompt-footer { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; flex: 0 0 auto; }
        .ns-prompt-panel .ns-prompt-add {
            padding: 0 13px; justify-self: start; color: #17130c !important;
            border-color: #ffb238 !important; background: #ffb238 !important;
            font-weight: 850; text-shadow: none !important; opacity: 1;
        }
        .ns-prompt-panel .ns-prompt-add .ns-prompt-icon { color: #17130c !important; }
        .ns-prompt-add:hover, .ns-prompt-toggle[aria-checked="true"]:hover { filter: brightness(1.08); }
        .ns-prompt-add:disabled { cursor: default; filter: grayscale(1); opacity: .45; }
        .ns-prompt-remove:disabled, .ns-prompt-tool:disabled { cursor: default; opacity: .35; }
        .ns-prompt-remove:disabled:hover, .ns-prompt-tool:disabled:hover { color: var(--ns-muted); border-color: var(--ns-border); background: transparent; }
        .ns-prompt-status { color: var(--ns-muted); font-size: 11px; text-align: right; }
        /* Legacy Text Toggle Switch versions use different widget names, but
           all of them expose this DOM root. Its content is replaced by the
           compatibility panel above, so keep the raw panel out of layout. */
        .dom-widget:has(> .tsu-tts), .tsu-tts { display: none !important; visibility: hidden !important; pointer-events: none !important; }
        @media (max-width: 430px) {
            .ns-prompt-card-head { grid-template-columns: auto minmax(0, 1fr) auto; }
            .ns-prompt-remove { grid-column: 3; grid-row: 2; }
            .ns-prompt-toggle { grid-column: 2; grid-row: 2; justify-self: start; }
        }
    `;
    document.head.append(style);
}

function slotWidget(node, prefix, index) {
    return node.widgets?.find(widget => widget.name === `${prefix}_${String(index).padStart(2, "0")}`);
}

function originalPromptWidgets(node) {
    return (node.widgets ?? []).filter(widget =>
        widget.name === "separator" || /^(enabled|prompt|title)_\d{2}$/.test(widget.name ?? ""));
}

function hideNativeWidget(widget) {
    if (!widget.__ninetosixHidden) {
        widget.__ninetosixHidden = {
            type: widget.type,
            computeSize: widget.computeSize,
            draw: widget.draw,
            hidden: widget.hidden,
            optionsHidden: widget.options?.hidden,
        };
    }
    // Current Vue canvas rendering uses options.hidden, while older
    // LiteGraph builds use the hidden widget type and zero computed height.
    // Set every supported signal so the serialized backend widget remains in
    // place without being painted above the replacement panel.
    widget.options ??= {};
    widget.options.hidden = true;
    // ComfyUI's Vue canvas keeps a reactive copy of each widget. Updating the
    // legacy widget object alone is not enough after that copy is registered.
    // Reach the already-initialized Pinia store through the Vue app when it is
    // available, without importing a private hashed frontend module.
    const vueApp = app.vueApp ?? document.getElementById("vue-app")?.__vue_app__;
    const widgetValueStore = vueApp?.config?.globalProperties?.$pinia?._s?.get?.("widgetValue");
    const widgetState = widget.widgetId ? widgetValueStore?.getWidget?.(widget.widgetId) : null;
    if (widgetState?.options) widgetState.options.hidden = true;
    widget.type = "hidden";
    widget.hidden = true;
    widget.computeSize = () => [0, -4];
    // Some ComfyUI/widget versions continue calling draw even when a
    // converted widget reports zero height. A no-op draw prevents the raw
    // title/prompt fields from leaking behind the designed DOM panel.
    widget.draw = () => {};
    if (widget.element) widget.element.hidden = true;
    if (widget.inputEl) widget.inputEl.hidden = true;
}

// Called from beforeRegisterNodeDef so Vue's widget store sees these inputs as
// hidden on its very first snapshot. Calling the same helper again while
// mounting is intentional and keeps older LiteGraph-only builds compatible.
export function preparePromptNodeWidgets(node) {
    for (const widget of originalPromptWidgets(node)) hideNativeWidget(widget);
}

function valueOf(widget, fallback) {
    return widget?.value ?? fallback;
}

function updateWidget(node, widget, value) {
    if (!widget || Object.is(widget.value, value)) return;
    widget.value = value;
    widget.callback?.(value, node, widget);
    node.graph?.change?.();
    node.setDirtyCanvas?.(true, true);
    app.canvas?.setDirty?.(true, true);
}

export function deriveVisibleCount(node) {
    const stored = Number(node.properties?.[VISIBLE_COUNT_PROPERTY]);
    let highestUsed = 0;
    for (let index = 1; index <= PROMPT_SLOTS; index++) {
        const prompt = String(valueOf(slotWidget(node, "prompt", index), "")).trim();
        const title = String(valueOf(slotWidget(node, "title", index), "")).trim();
        if (prompt || title) highestUsed = index;
    }
    const savedCount = Number.isInteger(stored) && stored >= 1 && stored <= PROMPT_SLOTS ? stored : DEFAULT_VISIBLE_PROMPTS;
    // A legacy workflow has no visible-count property. Never hide populated
    // high-numbered slots while upgrading it to the designed panel.
    return Math.max(savedCount, highestUsed);
}

export function shiftedSlotValues(values, removeIndex, visibleCount) {
    const next = values.map(value => ({ ...value }));
    for (let index = removeIndex - 1; index < visibleCount - 1; index++) next[index] = { ...next[index + 1] };
    next[visibleCount - 1] = { title: "", enabled: false, prompt: "" };
    return next;
}

export function exclusiveEnabledValues(values, selectedIndex, enabled) {
    return values.map((_, index) => enabled && index === selectedIndex - 1);
}

export function normalizeEnabledValues(values) {
    const firstEnabled = values.findIndex(Boolean);
    return values.map((_, index) => index === firstEnabled);
}

export function normalizeLegacyState(state) {
    const source = state && typeof state === "object" ? state : {};
    const count = Math.max(1, Math.min(32, Math.round(Number(source.count) || 3)));
    const titles = Array.from({ length: count }, (_, index) =>
        String(Array.isArray(source.titles) ? source.titles[index] ?? `프롬프트 ${index + 1}` : `프롬프트 ${index + 1}`));
    const texts = Array.from({ length: count }, (_, index) =>
        String(Array.isArray(source.texts) ? source.texts[index] ?? "" : ""));
    const rawEnabled = Array.from({ length: count }, (_, index) =>
        Boolean(Array.isArray(source.enabled) ? source.enabled[index] : index === 0));
    const firstEnabled = rawEnabled.findIndex(Boolean);
    const enabled = rawEnabled.map((_, index) => index === (firstEnabled < 0 ? 0 : firstEnabled));
    return { count, titles, texts, enabled };
}

function setVisibleCount(node, count) {
    node.properties ??= {};
    node.properties[VISIBLE_COUNT_PROPERTY] = Math.max(1, Math.min(PROMPT_SLOTS, count));
    node.graph?.change?.();
    node.setDirtyCanvas?.(true, true);
}

function createInput(type, placeholder, ariaLabel) {
    const control = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") control.type = type;
    control.placeholder = placeholder;
    control.setAttribute("aria-label", ariaLabel);
    control.setAttribute("data-ninetosix-prompt-input", "");
    control.autocomplete = "off";
    return control;
}

function markNodeChanged(node) {
    node.graph?.change?.();
    node.setDirtyCanvas?.(true, true);
    app.canvas?.setDirty?.(true, true);
}

function smallIconButton(iconName, title, onClick, disabled = false, remove = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ns-prompt-tool${remove ? " ns-prompt-remove" : ""}`;
    button.title = title;
    button.setAttribute("aria-label", title);
    if (remove) button.dataset.remove = "true";
    button.disabled = disabled;
    button.append(svgIcon(iconName));
    button.addEventListener("click", onClick);
    return button;
}

function createLegacyPromptPanel(node) {
    installStyles();
    const rawWidget = node.widgets?.find(item => item.name === "slots_json");
    if (rawWidget) hideNativeWidget(rawWidget);
    let compatibilityWidget = null;

    function hideOldPanel() {
        const candidates = (node.widgets ?? []).filter(item =>
            item !== compatibilityWidget && (
                item === node._tsuTtsWidget || item.type === "tsu_sections" || item.name === "sections"
                || item.element?.classList?.contains("tsu-tts")
                || item.element?.querySelector?.(".tsu-tts")
            ));
        for (const oldWidget of candidates) {
            hideNativeWidget(oldWidget);
            if (oldWidget.element) oldWidget.element.hidden = true;
        }
    }
    hideOldPanel();

    const root = document.createElement("section");
    root.className = "ns-prompt-panel";
    root.dataset.ninetosix = "prompt-switcher";
    root.dataset.compatibility = "TextToggleSwitchNode";
    root.setAttribute("aria-label", "9to6 Multi Prompt Switcher");
    root.addEventListener("pointerdown", event => event.stopPropagation());
    root.addEventListener("wheel", event => event.stopPropagation(), { passive: true });

    const header = document.createElement("header");
    header.className = "ns-prompt-header";
    const brand = document.createElement("div");
    brand.className = "ns-prompt-brand";
    brand.append(svgIcon("prompt"), document.createTextNode("9to6 Multi Prompt Switcher"));
    const countBadge = document.createElement("span");
    countBadge.className = "ns-prompt-count";
    const help = document.createElement("div");
    help.className = "ns-prompt-help";
    help.textContent = "기존 워크플로 호환 모드 · 한 번에 하나만 선택합니다.";
    header.append(brand, countBadge, help);

    const list = document.createElement("div");
    list.className = "ns-prompt-list";
    list.setAttribute("role", "list");
    const footer = document.createElement("footer");
    footer.className = "ns-prompt-footer";
    const add = document.createElement("button");
    add.type = "button";
    add.className = "ns-prompt-add";
    add.append(svgIcon("add"), document.createTextNode("프롬프트 추가"));
    const status = document.createElement("span");
    status.className = "ns-prompt-status";
    footer.append(add, status);
    root.append(header, list, footer);

    function getState() {
        node.properties ??= {};
        node.properties.tsu_tts = normalizeLegacyState(node.properties.tsu_tts);
        return node.properties.tsu_tts;
    }

    function changed() {
        markNodeChanged(node);
        render();
    }

    function render() {
        hideOldPanel();
        if (rawWidget) hideNativeWidget(rawWidget);
        const state = getState();
        list.replaceChildren();

        for (let index = 0; index < state.count; index++) {
            const card = document.createElement("article");
            card.className = "ns-prompt-card";
            card.dataset.enabled = String(state.enabled[index]);
            card.setAttribute("role", "listitem");
            const cardHead = document.createElement("div");
            cardHead.className = "ns-prompt-card-head";
            const number = document.createElement("span");
            number.className = "ns-prompt-index";
            number.textContent = String(index + 1).padStart(2, "0");

            const titleWrap = document.createElement("label");
            titleWrap.className = "ns-prompt-title-wrap";
            const title = createInput("text", "제목 · 예: 조명, 화풍, 인물", `프롬프트 ${index + 1} 제목`);
            title.value = state.titles[index];
            title.addEventListener("input", () => {
                state.titles[index] = title.value;
                markNodeChanged(node);
            });
            titleWrap.append(svgIcon("title"), title);

            const tools = document.createElement("div");
            tools.className = "ns-prompt-card-tools";
            const move = offset => {
                const target = index + offset;
                if (target < 0 || target >= state.count) return;
                for (const values of [state.titles, state.texts, state.enabled]) {
                    [values[index], values[target]] = [values[target], values[index]];
                }
                changed();
            };
            tools.append(
                smallIconButton("up", `프롬프트 ${index + 1} 위로 이동`, () => move(-1), index === 0),
                smallIconButton("down", `프롬프트 ${index + 1} 아래로 이동`, () => move(1), index === state.count - 1),
                smallIconButton("copy", `프롬프트 ${index + 1} 복제`, () => {
                    if (state.count >= LEGACY_MAX_SLOTS) return;
                    state.titles.splice(index + 1, 0, `${state.titles[index]} 복사본`);
                    state.texts.splice(index + 1, 0, state.texts[index]);
                    state.enabled.splice(index + 1, 0, false);
                    state.count++;
                    changed();
                }, state.count >= LEGACY_MAX_SLOTS),
            );

            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "ns-prompt-toggle";
            toggle.setAttribute("role", "switch");
            toggle.setAttribute("aria-checked", String(state.enabled[index]));
            toggle.setAttribute("aria-label", `프롬프트 ${index + 1} ${state.enabled[index] ? "켜짐" : "꺼짐"}`);
            toggle.append(svgIcon("power"), document.createTextNode(state.enabled[index] ? "ON" : "OFF"));
            toggle.addEventListener("click", () => {
                state.enabled = state.enabled.map((_, item) => item === index);
                changed();
            });

            const remove = smallIconButton("remove", `프롬프트 ${index + 1} 제거`, () => {
                if (state.count <= 1) return;
                const wasEnabled = state.enabled[index];
                state.titles.splice(index, 1);
                state.texts.splice(index, 1);
                state.enabled.splice(index, 1);
                state.count--;
                if (wasEnabled || !state.enabled.some(Boolean)) {
                    state.enabled = state.enabled.map((_, item) => item === Math.min(index, state.count - 1));
                }
                changed();
            }, state.count <= 1, true);
            cardHead.append(number, titleWrap, tools, toggle, remove);

            const promptWrap = document.createElement("label");
            promptWrap.className = "ns-prompt-text-wrap";
            const prompt = createInput("textarea", "프롬프트 내용을 입력하세요…", `프롬프트 ${index + 1} 내용`);
            prompt.value = state.texts[index];
            prompt.addEventListener("input", () => {
                state.texts[index] = prompt.value;
                markNodeChanged(node);
            });
            promptWrap.append(svgIcon("prompt"), prompt);
            card.append(cardHead, promptWrap);
            list.append(card);
        }

        countBadge.textContent = `${state.count} / ${LEGACY_MAX_SLOTS}`;
        status.textContent = `1개 선택 · 기존 데이터 유지`;
        add.disabled = state.count >= LEGACY_MAX_SLOTS;
        add.title = add.disabled ? "최대 32개까지 추가할 수 있습니다" : "새 프롬프트 추가";
    }

    add.addEventListener("click", () => {
        const state = getState();
        if (state.count >= LEGACY_MAX_SLOTS) return;
        state.count++;
        state.titles.push(`프롬프트 ${state.count}`);
        state.texts.push("");
        state.enabled.push(false);
        changed();
        list.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        list.lastElementChild?.querySelector("input")?.focus({ preventScroll: true });
    });

    const widget = node.addDOMWidget("9to6_prompt_switcher", "NINETOSIX_PROMPT_SWITCHER", root, {
        serialize: false,
        hideOnZoom: false,
        getMinHeight: () => 190,
        getMaxHeight: () => 1200,
    });
    compatibilityWidget = widget;
    widget.options.minNodeSize = [400, 300];
    render();
    // The legacy extension may append its DOM widget after the global
    // nodeCreated hook. Hide that late widget once creation callbacks finish.
    requestAnimationFrame(() => {
        hideOldPanel();
        node.setDirtyCanvas?.(true, true);
    });
    return { widget, root, refresh: render };
}

function createPromptPanel(node) {
    installStyles();
    preparePromptNodeWidgets(node);

    const root = document.createElement("section");
    root.className = "ns-prompt-panel";
    root.dataset.ninetosix = "prompt-switcher";
    root.setAttribute("aria-label", "9to6 Multi Prompt Switcher");
    root.addEventListener("pointerdown", event => event.stopPropagation());
    root.addEventListener("wheel", event => event.stopPropagation(), { passive: true });

    const header = document.createElement("header");
    header.className = "ns-prompt-header";
    const brand = document.createElement("div");
    brand.className = "ns-prompt-brand";
    brand.append(svgIcon("prompt"), document.createTextNode("9to6 Multi Prompt Switcher"));
    const countBadge = document.createElement("span");
    countBadge.className = "ns-prompt-count";
    const help = document.createElement("div");
    help.className = "ns-prompt-help";
    help.textContent = "제목으로 구분하고, 한 번에 하나의 프롬프트만 선택합니다.";
    header.append(brand, countBadge, help);

    const list = document.createElement("div");
    list.className = "ns-prompt-list";
    list.setAttribute("role", "list");
    const footer = document.createElement("footer");
    footer.className = "ns-prompt-footer";
    const add = document.createElement("button");
    add.type = "button";
    add.className = "ns-prompt-add";
    add.append(svgIcon("add"), document.createTextNode("프롬프트 추가"));
    const status = document.createElement("span");
    status.className = "ns-prompt-status";
    footer.append(add, status);
    root.append(header, list, footer);

    let visibleCount = deriveVisibleCount(node);

    function remove(index) {
        const values = Array.from({ length: PROMPT_SLOTS }, (_, offset) => ({
            title: valueOf(slotWidget(node, "title", offset + 1), ""),
            enabled: Boolean(valueOf(slotWidget(node, "enabled", offset + 1), offset === 0)),
            prompt: valueOf(slotWidget(node, "prompt", offset + 1), ""),
        }));
        const next = shiftedSlotValues(values, index, visibleCount);
        for (let slot = index; slot <= visibleCount; slot++) {
            updateWidget(node, slotWidget(node, "title", slot), next[slot - 1].title);
            updateWidget(node, slotWidget(node, "enabled", slot), next[slot - 1].enabled);
            updateWidget(node, slotWidget(node, "prompt", slot), next[slot - 1].prompt);
        }
        visibleCount = Math.max(1, visibleCount - 1);
        setVisibleCount(node, visibleCount);
        render();
    }

    function render() {
        for (const widget of originalPromptWidgets(node)) hideNativeWidget(widget);
        visibleCount = deriveVisibleCount(node);
        const currentEnabled = Array.from({ length: PROMPT_SLOTS }, (_, slot) =>
            Boolean(valueOf(slotWidget(node, "enabled", slot + 1), slot === 0)));
        const normalizedEnabled = normalizeEnabledValues(currentEnabled);
        for (let slot = 1; slot <= PROMPT_SLOTS; slot++) {
            updateWidget(node, slotWidget(node, "enabled", slot), normalizedEnabled[slot - 1]);
        }
        list.replaceChildren();
        let enabledCount = 0;
        for (let index = 1; index <= visibleCount; index++) {
            const titleWidget = slotWidget(node, "title", index);
            const enabledWidget = slotWidget(node, "enabled", index);
            const promptWidget = slotWidget(node, "prompt", index);
            const card = document.createElement("article");
            card.className = "ns-prompt-card";
            card.setAttribute("role", "listitem");
            const cardHead = document.createElement("div");
            cardHead.className = "ns-prompt-card-head";
            const number = document.createElement("span");
            number.className = "ns-prompt-index";
            number.textContent = String(index).padStart(2, "0");
            const titleWrap = document.createElement("label");
            titleWrap.className = "ns-prompt-title-wrap";
            const title = createInput("text", "제목 · 예: 조명, 화풍, 인물", `프롬프트 ${index} 제목`);
            title.value = valueOf(titleWidget, "");
            title.addEventListener("input", () => updateWidget(node, titleWidget, title.value));
            titleWrap.append(svgIcon("title"), title);
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "ns-prompt-toggle";
            toggle.setAttribute("role", "switch");
            let enabled = Boolean(valueOf(enabledWidget, index === 1));
            if (enabled) enabledCount++;
            const paintToggle = () => {
                toggle.setAttribute("aria-checked", String(enabled));
                toggle.setAttribute("aria-label", `프롬프트 ${index} ${enabled ? "켜짐" : "꺼짐"}`);
                toggle.replaceChildren(svgIcon("power"), document.createTextNode(enabled ? "ON" : "OFF"));
                card.dataset.enabled = String(enabled);
            };
            toggle.addEventListener("click", () => {
                const next = exclusiveEnabledValues(normalizedEnabled, index, !enabled);
                for (let slot = 1; slot <= PROMPT_SLOTS; slot++) {
                    updateWidget(node, slotWidget(node, "enabled", slot), next[slot - 1]);
                }
                render();
            });
            paintToggle();
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "ns-prompt-remove";
            removeButton.title = "이 프롬프트 제거";
            removeButton.setAttribute("aria-label", `프롬프트 ${index} 제거`);
            removeButton.disabled = visibleCount === 1;
            if (removeButton.disabled) removeButton.title = "프롬프트는 최소 1개가 필요합니다";
            removeButton.append(svgIcon("remove"));
            removeButton.addEventListener("click", () => { if (visibleCount > 1) remove(index); });
            cardHead.append(number, titleWrap, toggle, removeButton);

            const promptWrap = document.createElement("label");
            promptWrap.className = "ns-prompt-text-wrap";
            const prompt = createInput("textarea", "프롬프트 내용을 입력하세요…", `프롬프트 ${index} 내용`);
            prompt.value = valueOf(promptWidget, "");
            prompt.addEventListener("input", () => updateWidget(node, promptWidget, prompt.value));
            promptWrap.append(svgIcon("prompt"), prompt);
            card.append(cardHead, promptWrap);
            list.append(card);
        }
        countBadge.textContent = `${visibleCount} / ${PROMPT_SLOTS}`;
        status.textContent = `${enabledCount ? "1개 선택" : "선택 없음"} · ${visibleCount === PROMPT_SLOTS ? "최대 개수" : "내부 스크롤 지원"}`;
        add.disabled = visibleCount >= PROMPT_SLOTS;
        add.title = add.disabled ? "최대 10개까지 추가할 수 있습니다" : "새 프롬프트 추가";
    }

    add.addEventListener("click", () => {
        if (visibleCount >= PROMPT_SLOTS) return;
        visibleCount++;
        setVisibleCount(node, visibleCount);
        render();
        list.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        list.lastElementChild?.querySelector("input")?.focus({ preventScroll: true });
    });

    const widget = node.addDOMWidget("prompt_switcher", "NINETOSIX_PROMPT_SWITCHER", root, {
        serialize: false,
        hideOnZoom: false,
        getMinHeight: () => 190,
        getMaxHeight: () => 1200,
    });
    widget.options.minNodeSize = [400, 300];
    render();
    // DOM widgets with no computeSize participate in ComfyUI's growable-widget
    // layout, so the panel receives the height left by a manual node resize.
    // Give only new/legacy nodes a practical first size; modern saved workflows
    // carry the count property and keep the user's chosen dimensions.
    requestAnimationFrame(() => {
        preparePromptNodeWidgets(node);
        requestAnimationFrame(() => preparePromptNodeWidgets(node));
        if (!Object.hasOwn(node.properties ?? {}, VISIBLE_COUNT_PROPERTY)) {
            node.setSize?.([Math.max(420, node.size?.[0] ?? 0), 600]);
        }
    });
    return { widget, root, refresh: render };
}

export function mountPromptPanel(node) {
    const nodeType = node.comfyClass ?? node.type;
    if (nodeType !== "NineToSixMultiPromptSwitch" && nodeType !== LEGACY_NODE_TYPE) return null;
    if (!node[PANEL_KEY]) {
        node[PANEL_KEY] = nodeType === LEGACY_NODE_TYPE ? createLegacyPromptPanel(node) : createPromptPanel(node);
    }
    else node[PANEL_KEY].refresh();
    return node[PANEL_KEY];
}
