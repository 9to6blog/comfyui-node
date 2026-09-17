export const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|tiff?|gif)$/i;

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

export function button(label, action, title = label) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.title = title;
    element.setAttribute("aria-label", title);
    element.addEventListener("click", action);
    return element;
}

export function installStyles() {
    if (document.getElementById("ninetosix-image-styles")) return;
    const style = document.createElement("style");
    style.id = "ninetosix-image-styles";
    style.textContent = `
    .ns-image-panel { color:#e8edf5; background:#20242c; font:12px/1.45 system-ui,sans-serif; box-sizing:border-box; padding:10px; border-radius:8px; height:100%; overflow:auto; }
    .ns-image-panel *, .ns-image-dialog * { box-sizing:border-box; }
    .ns-image-panel button,.ns-image-dialog button { border:1px solid #4c5669; border-radius:5px; background:#303949; color:#f4f7ff; padding:5px 8px; font:inherit; cursor:pointer; }
    .ns-image-panel button:hover,.ns-image-dialog button:hover { background:#45536a; }
    .ns-image-panel button:focus-visible,.ns-image-dialog button:focus-visible { outline:2px solid #91b6ff; outline-offset:2px; }
    .ns-image-panel button:disabled { opacity:.4; cursor:default; }
    .ns-image-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px; }
    .ns-image-status { overflow-wrap:anywhere; color:#b7c5da; margin:5px 0 9px; }
    .ns-image-status[data-error="true"] { color:#ffb8b8; }
    .ns-image-list { display:flex; flex-direction:column; gap:5px; max-height:260px; overflow:auto; }
    .ns-image-row { display:flex; align-items:center; gap:5px; padding:4px; border:1px solid #3d4656; border-radius:5px; }
    .ns-image-row img { width:44px; height:44px; object-fit:contain; background:#15181e; border-radius:3px; }
    .ns-image-row span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ns-image-grid { display:grid; gap:8px; }
    .ns-image-panel .ns-image-tile { min-width:0; padding:4px; background:#171c24; }
    .ns-image-tile img { width:100%; aspect-ratio:1; object-fit:contain; display:block; background:#11151c; }
    .ns-image-tile span { display:block; font-size:11px; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ns-image-dialog { width:94vw; height:92vh; max-width:1600px; max-height:none; padding:12px; border:1px solid #63718b; border-radius:10px; background:#171c24; color:#f4f7ff; font:14px system-ui,sans-serif; }
    .ns-image-dialog::backdrop { background:rgba(0,0,0,.8); }
    .ns-image-dialog[open] { display:flex; flex-direction:column; }
    .ns-image-dialog header { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding-bottom:10px; }
    .ns-image-dialog header strong { margin-right:auto; }
    .ns-image-viewport { flex:1; min-height:0; overflow:auto; background:#0b1018; }
    .ns-image-stage { min-width:100%; min-height:100%; display:flex; padding:16px; width:max-content; height:max-content; }
    .ns-image-stage img { display:block; margin:auto; max-width:none; max-height:none; object-fit:contain; }
    .ns-image-error { color:#ffb8b8; padding:8px; }
    `;
    document.head.append(style);
}
