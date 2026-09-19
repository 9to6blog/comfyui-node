import { button, installStyles, svgIcon, viewUrl } from "./common.js";

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
    const previous = button("", () => show(index - 1), "이전 이미지", "previous");
    const next = button("", () => show(index + 1), "다음 이미지", "next");
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
        button("", () => setZoom(zoom / 1.25), "축소", "zoomOut"), percent,
        button("", () => setZoom(zoom * 1.25), "확대", "zoomIn"),
        button("맞춤", fit, "창 크기에 맞춤", "fit"), button("1:1", () => setZoom(1), "원본 픽셀 크기", "actual"),
        button("닫기", () => dialog.close(), "미리보기 닫기", "close"));
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
    const header = document.createElement("header");
    header.className = "ns-image-header";
    const brand = document.createElement("div");
    brand.className = "ns-image-brand";
    brand.append(svgIcon("grid"), document.createTextNode("9to6 Image Grid"));
    const countBadge = document.createElement("span");
    countBadge.className = "ns-image-count";
    countBadge.textContent = "0개";
    const help = document.createElement("div");
    help.className = "ns-image-help";
    help.textContent = "실행 결과를 한눈에 보고, 클릭해서 원본 크기로 확인합니다.";
    header.append(brand, countBadge, help);
    const status = document.createElement("div");
    status.className = "ns-image-status";
    status.textContent = "워크플로를 실행하면 전달받은 이미지가 여기에 표시됩니다.";
    const grid = document.createElement("div");
    grid.className = "ns-image-grid";
    const scroll = document.createElement("div");
    scroll.className = "ns-image-scroll";
    scroll.append(grid);
    const empty = document.createElement("div");
    empty.className = "ns-image-empty";
    empty.textContent = "아직 결과 이미지가 없습니다.";
    grid.append(empty);
    root.append(header, status, scroll);
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
        countBadge.textContent = `${items.length}개`;
        status.textContent = `${items.length}개 결과 · 클릭 확대 · 방향키 이동 · Esc 닫기`;
        if (!items.length) {
            const emptyState = document.createElement("div");
            emptyState.className = "ns-image-empty";
            emptyState.textContent = "이번 실행에서 표시할 이미지가 없습니다.";
            grid.append(emptyState);
        }
        items.forEach((item, index) => {
            const caption = item.label ? `${item.label} · ${item.width} × ${item.height}` : `${String(index + 1).padStart(2, "0")} · ${item.width} × ${item.height}`;
            const tile = button(caption, () => { activeDialog = openLightbox(items, index, api); }, `이미지 ${index + 1} 크게 보기`);
            tile.className = "ns-image-tile";
            const image = document.createElement("img");
            image.loading = "lazy";
            image.src = viewUrl(api, item, true);
            image.alt = `Image ${index + 1}`;
            tile.prepend(image);
            grid.append(tile);
        });
    }
    const widget = node.addDOMWidget("gallery", "NINETOSIX_IMAGE_GRID", root, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 320, getMaxHeight: () => 800,
    });
    widget.options.minNodeSize = [480, 380];
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
