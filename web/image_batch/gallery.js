import { button, installStyles, viewUrl } from "./common.js";

export function openLightbox(items, initialIndex, api) {
    const dialog = document.createElement("dialog");
    dialog.className = "ns-image-dialog";
    dialog.setAttribute("aria-label", "Image preview");
    const header = document.createElement("header");
    const title = document.createElement("strong");
    const percent = document.createElement("span");
    const viewport = document.createElement("div");
    viewport.className = "ns-image-viewport";
    const stage = document.createElement("div");
    stage.className = "ns-image-stage";
    const image = document.createElement("img");
    const error = document.createElement("div");
    error.className = "ns-image-error";
    error.hidden = true;
    stage.append(image);
    viewport.append(stage);
    let index = initialIndex, zoom = 1;
    function setZoom(value) {
        zoom = Math.max(.05, Math.min(8, value));
        image.style.width = `${Math.round(items[index].width * zoom)}px`;
        image.style.height = `${Math.round(items[index].height * zoom)}px`;
        percent.textContent = `${Math.round(zoom * 100)}%`;
    }
    function fit() {
        setZoom(Math.min((viewport.clientWidth - 32) / items[index].width,
            (viewport.clientHeight - 32) / items[index].height, 1));
    }
    const previous = button("←", () => show(index - 1), "Previous image");
    const next = button("→", () => show(index + 1), "Next image");
    function show(value) {
        index = Math.max(0, Math.min(items.length - 1, value));
        const item = items[index];
        title.textContent = `${index + 1} / ${items.length} · ${item.width} × ${item.height}`;
        image.alt = `Image ${index + 1}`;
        image.src = viewUrl(api, item);
        error.hidden = true;
        previous.disabled = index === 0;
        next.disabled = index === items.length - 1;
        viewport.scrollTo(0, 0);
        fit();
    }
    header.append(title, previous, next,
        button("−", () => setZoom(zoom / 1.25), "Zoom out"), percent,
        button("+", () => setZoom(zoom * 1.25), "Zoom in"),
        button("Fit", fit, "Fit image to window"), button("1:1", () => setZoom(1), "Show original size"),
        button("Close", () => dialog.close()));
    image.addEventListener("error", () => { error.textContent = "Preview file unavailable. Run the workflow again to recreate it."; error.hidden = false; });
    dialog.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); event.stopPropagation(); show(index + (event.key === "ArrowLeft" ? -1 : 1));
        }
    });
    viewport.addEventListener("wheel", event => {
        if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom(zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)); }
    }, { passive: false });
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.append(header, error, viewport);
    document.body.append(dialog);
    dialog.showModal();
    show(initialIndex);
    return dialog;
}

export function createGallery(node, api) {
    installStyles();
    const root = document.createElement("div");
    root.className = "ns-image-panel";
    root.dataset.ninetosix = "image-gallery";
    const status = document.createElement("div");
    status.className = "ns-image-status";
    status.textContent = "Run the workflow to collect and preview all received images.";
    const grid = document.createElement("div");
    grid.className = "ns-image-grid";
    root.append(status, grid);
    root.addEventListener("pointerdown", event => event.stopPropagation());
    root.addEventListener("wheel", event => event.stopPropagation(), { passive: true });
    let items = [], activeDialog = null;
    function update(message) {
        if (!Array.isArray(message?.ninetosix_images)) return;
        activeDialog?.close();
        items = message.ninetosix_images;
        const columns = Math.max(1, Math.min(12, Number(message.ninetosix_columns?.[0] ?? 4)));
        grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
        grid.replaceChildren();
        status.textContent = `${items.length} images · click to enlarge · ← → to navigate · Esc to close`;
        items.forEach((item, index) => {
            const tile = button("", () => { activeDialog = openLightbox(items, index, api); }, `Open image ${index + 1}`);
            tile.className = "ns-image-tile";
            const image = document.createElement("img");
            image.loading = "lazy";
            image.src = viewUrl(api, item, true);
            image.alt = `Image ${index + 1}`;
            const caption = document.createElement("span");
            caption.textContent = `${index + 1} · ${item.width} × ${item.height}`;
            tile.append(image, caption);
            grid.append(tile);
        });
    }
    const widget = node.addDOMWidget("gallery", "NINETOSIX_IMAGE_GRID", root, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 320, getMaxHeight: () => 800,
    });
    widget.computeSize = width => [width, 440];
    widget.options.minNodeSize = [480, 500];
    const previousExecuted = node.onExecuted;
    node.onExecuted = function (message) {
        const result = previousExecuted?.apply(this, arguments);
        update(message);
        return result;
    };
    const previousRemove = widget.onRemove;
    widget.onRemove = function () { activeDialog?.close(); return previousRemove?.apply(this, arguments); };
    return { widget, update };
}
