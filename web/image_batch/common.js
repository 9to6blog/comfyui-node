export const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|tiff?|gif)$/i;
const SVG_NS = "http://www.w3.org/2000/svg";

const ICONS = {
    images: ["M4 5h16v14H4z", "m7 14 3-3 3 3 2-2 3 3", "M8.5 9h.01"],
    upload: ["M12 16V4", "m7 9 5-5 5 5", "M5 20h14"],
    folder: ["M3 6h7l2 2h9v11H3z"],
    clear: ["M4 7h16", "M9 7V4h6v3", "M7 7l1 13h8l1-13"],
    up: ["M12 19V5", "m6 11 6-6 6 6"],
    down: ["M12 5v14", "m6 13 6 6 6-6"],
    remove: ["M5 5l14 14", "M19 5 5 19"],
    grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
    previous: ["M15 18l-6-6 6-6"],
    next: ["m9 18 6-6-6-6"],
    zoomOut: ["M5 12h14"],
    zoomIn: ["M12 5v14", "M5 12h14"],
    fit: ["M8 3H3v5", "M16 3h5v5", "M8 21H3v-5", "M16 21h5v-5"],
    actual: ["M4 4h16v16H4z", "M9 9h6v6H9z"],
    close: ["M5 5l14 14", "M19 5 5 19"],
};

export function svgIcon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("ns-image-icon");
    for (const pathData of ICONS[name] ?? []) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", pathData);
        svg.append(path);
    }
    return svg;
}

export function viewUrl(api, image, thumbnail = false) {
    const query = new URLSearchParams({
        filename: thumbnail ? image.thumbnail ?? image.name ?? image.filename : image.filename ?? image.name,
        subfolder: image.subfolder ?? "",
        type: image.type ?? "input",
    });
    return api.apiURL(`/view?${query}`);
}

export function parseSelection(value) {
    const entries = JSON.parse(value || "[]");
    if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry.name !== "string"
        || typeof (entry.subfolder ?? "") !== "string" || (entry.type ?? "input") !== "input")) {
        throw new Error("Invalid image selection. Please select the images again.");
    }
    return entries;
}

export function button(label, action, title = label, iconName = null, className = "") {
    const element = document.createElement("button");
    element.type = "button";
    if (className) element.className = className;
    element.title = title;
    element.setAttribute("aria-label", title);
    if (iconName) element.append(svgIcon(iconName));
    if (label) {
        const text = document.createElement("span");
        text.className = "ns-image-button-label";
        text.textContent = label;
        element.append(text);
    }
    element.addEventListener("click", action);
    return element;
}

export function installStyles() {
    if (document.getElementById("ninetosix-image-styles")) return;
    const style = document.createElement("style");
    style.id = "ninetosix-image-styles";
    style.textContent = `
    .ns-image-panel {
        --ns-image-bg:color-mix(in srgb,var(--comfy-menu-bg,#17191d) 92%,#fff 8%);
        --ns-image-card:color-mix(in srgb,var(--comfy-input-bg,#24272d) 90%,#fff 10%);
        --ns-image-border:color-mix(in srgb,var(--border-color,#4b505b) 76%,transparent);
        --ns-image-muted:var(--descrip-text,#aeb4bf); --ns-image-text:var(--input-text,#f4f6f8);
        --ns-image-accent:#ffb238; --ns-image-accent-soft:color-mix(in srgb,#ffb238 17%,transparent);
        color:var(--ns-image-text); background:var(--ns-image-bg); font:12px/1.45 Inter,system-ui,sans-serif;
        box-sizing:border-box; padding:10px; border:1px solid var(--ns-image-border); border-radius:10px;
        height:100%; min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:9px;
    }
    .ns-image-panel *, .ns-image-dialog * { box-sizing:border-box; }
    .ns-image-panel button,.ns-image-dialog button {
        appearance:none; display:inline-flex; align-items:center; justify-content:center; gap:6px;
        min-height:32px; border:1px solid var(--ns-image-border,#4c5669) !important; border-radius:7px;
        background:transparent !important; color:var(--ns-image-text,#f4f7ff) !important;
        padding:5px 9px; font:inherit; font-weight:700; text-shadow:none !important; cursor:pointer;
    }
    .ns-image-panel button:hover,.ns-image-dialog button:hover { border-color:#ffb238 !important; background:rgba(255,178,56,.13) !important; }
    .ns-image-panel button:focus-visible,.ns-image-dialog button:focus-visible { outline:2px solid #ffb238; outline-offset:2px; }
    .ns-image-panel button:disabled { opacity:.4; cursor:default; }
    .ns-image-icon { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; flex:0 0 auto; }
    .ns-image-header { display:grid; grid-template-columns:1fr auto; gap:4px 10px; align-items:center; flex:0 0 auto; }
    .ns-image-brand { display:flex; align-items:center; gap:7px; min-width:0; font-weight:800; letter-spacing:.01em; }
    .ns-image-brand .ns-image-icon { width:18px; height:18px; color:var(--ns-image-accent); }
    .ns-image-count { padding:3px 8px; color:var(--ns-image-accent); background:var(--ns-image-accent-soft); border-radius:999px; font-weight:800; white-space:nowrap; }
    .ns-image-help { grid-column:1/-1; color:var(--ns-image-muted); font-size:11px; }
    .ns-image-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:6px; flex:0 0 auto; }
    .ns-image-panel .ns-image-primary { color:#17130c !important; border-color:#ffb238 !important; background:#ffb238 !important; }
    .ns-image-panel .ns-image-primary:hover { background:#ffc15e !important; }
    .ns-image-status { overflow-wrap:anywhere; color:var(--ns-image-muted); padding:7px 9px; border-radius:7px; background:rgba(0,0,0,.14); flex:0 0 auto; }
    .ns-image-status[data-error="true"] { color:#ffb8b8; }
    .ns-image-scroll { min-height:0; flex:1 1 auto; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; padding-right:3px; }
    .ns-image-list { display:flex; flex-direction:column; gap:7px; }
    .ns-image-row { display:grid; grid-template-columns:52px minmax(0,1fr) auto; align-items:center; gap:8px; padding:7px; border:1px solid var(--ns-image-border); border-radius:9px; background:var(--ns-image-card); }
    .ns-image-row img { width:52px; height:52px; object-fit:contain; background:#11151c; border-radius:6px; }
    .ns-image-row-info { min-width:0; }
    .ns-image-row-index { display:block; color:var(--ns-image-accent); font-size:10px; font-weight:800; }
    .ns-image-row-name { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:650; }
    .ns-image-row-actions { display:flex; gap:4px; }
    .ns-image-panel .ns-image-icon-button { width:30px; min-width:30px; height:30px; min-height:30px; padding:0; color:var(--ns-image-muted) !important; }
    .ns-image-panel .ns-image-remove:hover { color:#fff !important; border-color:#e45d65 !important; background:#b8323c !important; }
    .ns-image-grid { display:grid; gap:8px; align-content:start; }
    .ns-image-panel .ns-image-tile { min-width:0; padding:5px; display:block; background:var(--ns-image-card) !important; }
    .ns-image-tile img { width:100%; aspect-ratio:1; object-fit:contain; display:block; background:#11151c; border-radius:5px; }
    .ns-image-tile .ns-image-button-label { display:block; font-size:11px; margin-top:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ns-image-muted); }
    .ns-image-empty { min-height:150px; display:grid; place-items:center; padding:24px; border:1px dashed var(--ns-image-border); border-radius:9px; color:var(--ns-image-muted); text-align:center; }
    .ns-image-dialog { width:94vw; height:92vh; max-width:1600px; max-height:none; padding:12px; border:1px solid #63718b; border-radius:10px; background:#171c24; color:#f4f7ff; font:14px system-ui,sans-serif; }
    .ns-image-dialog::backdrop { background:rgba(0,0,0,.8); }
    .ns-image-dialog[open] { display:flex; flex-direction:column; }
    .ns-image-dialog header { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding-bottom:10px; }
    .ns-image-dialog header strong { margin-right:auto; }
    .ns-image-dialog button { --ns-image-border:#4c5669; --ns-image-text:#f4f7ff; }
    .ns-image-viewport { flex:1; min-height:0; overflow:auto; background:#0b1018; }
    .ns-image-stage { min-width:100%; min-height:100%; display:flex; padding:16px; width:max-content; height:max-content; }
    .ns-image-stage img { display:block; margin:auto; max-width:none; max-height:none; object-fit:contain; }
    .ns-image-error { color:#ffb8b8; padding:8px; }
    `;
    document.head.append(style);
}
