import { button, installStyles, svgIcon, viewUrl } from "./common.js";
import { openLightbox } from "./gallery.js";

export function createCompare(node, api) {
    installStyles();
    const root = document.createElement("div");
    root.className = "ns-image-panel";
    root.dataset.ninetosix = "image-compare";
    const header = document.createElement("header");
    header.className = "ns-image-header";
    const brand = document.createElement("div");
    brand.className = "ns-image-brand";
    brand.append(svgIcon("compare"), document.createTextNode("9to6 Image Compare"));
    const countBadge = document.createElement("span");
    countBadge.className = "ns-image-count";
    countBadge.textContent = "대기 중";
    const help = document.createElement("div");
    help.className = "ns-image-help";
    help.textContent = "두 이미지를 나란히, 슬라이더로, 또는 차이 열지도로 비교합니다.";
    header.append(brand, countBadge, help);

    const toolbar = document.createElement("div");
    toolbar.className = "ns-image-toolbar";
    const status = document.createElement("div");
    status.className = "ns-image-status";
    status.textContent = "워크플로를 실행하면 비교 결과가 여기에 표시됩니다.";

    const stage = document.createElement("div");
    stage.className = "ns-compare-stage";
    const scroll = document.createElement("div");
    scroll.className = "ns-image-scroll";
    scroll.append(stage);
    root.append(header, toolbar, status, scroll);
    root.addEventListener("pointerdown", event => event.stopPropagation());
    root.addEventListener("wheel", event => event.stopPropagation(), { passive: true });

    let current = null, mode = "side_by_side", activeDialog = null;

    function imageButton(entry, title) {
        const tile = button(title, () => {
            activeDialog = openLightbox([entry], 0, api);
        }, `${title} 크게 보기`);
        tile.className = "ns-image-tile";
        const image = document.createElement("img");
        image.loading = "lazy";
        image.src = viewUrl(api, entry);
        image.alt = title;
        tile.prepend(image);
        return tile;
    }

    function renderSideBySide() {
        stage.replaceChildren();
        const pair = document.createElement("div");
        pair.className = "ns-compare-pair";
        pair.append(
            imageButton(current.a, current.a.label),
            imageButton(current.b, current.b.label),
        );
        stage.append(pair);
    }

    function renderSlider() {
        stage.replaceChildren();
        const wrap = document.createElement("div");
        wrap.className = "ns-compare-slider";
        const imageB = document.createElement("img");
        imageB.src = viewUrl(api, current.b);
        imageB.alt = current.b.label;
        const clip = document.createElement("div");
        clip.className = "ns-compare-clip";
        const imageA = document.createElement("img");
        imageA.src = viewUrl(api, current.a);
        imageA.alt = current.a.label;
        clip.append(imageA);
        const divider = document.createElement("div");
        divider.className = "ns-compare-divider";
        const range = document.createElement("input");
        range.type = "range";
        range.min = 0;
        range.max = 100;
        range.value = 50;
        range.className = "ns-compare-range";
        range.setAttribute("aria-label", "비교 슬라이더 위치");
        const update = () => {
            clip.style.width = `${range.value}%`;
            imageA.style.width = `${wrap.clientWidth}px`;
            divider.style.left = `${range.value}%`;
        };
        range.addEventListener("input", update);
        wrap.append(imageB, clip, divider, range);
        stage.append(wrap);
        update();
    }

    function renderDifference() {
        stage.replaceChildren();
        const note = document.createElement("div");
        note.className = "ns-image-help";
        note.textContent = "차이 열지도 · 밝을수록 두 이미지의 픽셀 차이가 큽니다.";
        const diff = {"filename": "preview.png", "subfolder": current.a.subfolder, "type": "temp",
                      "width": current.a.width, "height": current.a.height, "label": "Difference"};
        stage.append(note, imageButton(diff, "차이 열지도"));
    }

    function render() {
        if (!current) return;
        for (const control of toolbar.querySelectorAll("button")) {
            control.dataset.active = String(control.dataset.mode === mode);
        }
        if (mode === "slider") renderSlider();
        else if (mode === "difference") renderDifference();
        else renderSideBySide();
        status.textContent = `${current.a.label} ↔ ${current.b.label} · ${current.a.width} × ${current.a.height} · 클릭 확대`;
    }

    function modeButton(label, value, iconName) {
        const control = button(label, () => { mode = value; render(); }, `${label} 모드`, iconName);
        control.dataset.mode = value;
        return control;
    }
    toolbar.append(
        modeButton("나란히", "side_by_side", "grid"),
        modeButton("슬라이더", "slider", "compare"),
        modeButton("차이", "difference", "zoomIn"),
    );

    function update(message) {
        const data = message?.ninetosix_compare;
        if (!data?.a || !data?.b) return;
        activeDialog?.close();
        current = data;
        mode = ["side_by_side", "slider", "difference"].includes(data.mode) ? data.mode : "side_by_side";
        countBadge.textContent = "비교 완료";
        render();
    }

    const widget = node.addDOMWidget("compare", "NINETOSIX_IMAGE_COMPARE", root, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 280, getMaxHeight: () => 700,
    });
    widget.options.minNodeSize = [440, 360];
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
