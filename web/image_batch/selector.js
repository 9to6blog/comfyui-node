import { IMAGE_EXTENSIONS, button, installStyles, parseSelection, svgIcon, viewUrl } from "./common.js";

export function createImageSelector(node, inputName, inputData, api, app) {
    installStyles();
    const root = document.createElement("div");
    root.className = "ns-image-panel";
    root.dataset.ninetosix = "image-selector";
    const header = document.createElement("header");
    header.className = "ns-image-header";
    const brand = document.createElement("div");
    brand.className = "ns-image-brand";
    brand.append(svgIcon("images"), document.createTextNode("9to6 Image Batch Loader"));
    const countBadge = document.createElement("span");
    countBadge.className = "ns-image-count";
    const help = document.createElement("div");
    help.className = "ns-image-help";
    help.textContent = "여러 이미지나 폴더를 불러오고, 실행 순서를 한눈에 정리합니다.";
    header.append(brand, countBadge, help);
    const toolbar = document.createElement("div");
    toolbar.className = "ns-image-toolbar";
    const status = document.createElement("div");
    status.className = "ns-image-status";
    status.setAttribute("role", "status");
    const list = document.createElement("div");
    list.className = "ns-image-list";
    const scroll = document.createElement("div");
    scroll.className = "ns-image-scroll";
    scroll.append(list);
    const filesInput = document.createElement("input");
    filesInput.type = "file";
    filesInput.accept = ".png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,.gif";
    filesInput.multiple = true;
    filesInput.hidden = true;
    filesInput.dataset.role = "select-images";
    const folderInput = filesInput.cloneNode();
    folderInput.setAttribute("webkitdirectory", "");
    folderInput.dataset.role = "select-folder";
    root.append(header, toolbar, status, scroll, filesInput, folderInput);
    root.addEventListener("pointerdown", event => event.stopPropagation());
    root.addEventListener("wheel", event => event.stopPropagation(), { passive: true });

    let entries = [], busy = false, disposed = false, invalidValue = null, widget;
    const uploadFolder = `9to6-images/${crypto.randomUUID()}`;
    const abortController = new AbortController();
    function message(text, error = false) {
        status.textContent = text;
        status.dataset.error = String(error);
    }
    function change(next) {
        widget.value = JSON.stringify(next);
        node.graph?.change?.();
        app.canvas?.setDirty?.(true, true);
    }
    function render() {
        list.replaceChildren();
        for (const [index, entry] of entries.entries()) {
            const row = document.createElement("div");
            row.className = "ns-image-row";
            const image = document.createElement("img");
            image.loading = "lazy";
            image.src = viewUrl(api, entry);
            image.alt = "";
            const name = document.createElement("span");
            name.className = "ns-image-row-name";
            name.textContent = entry.label ?? entry.name;
            name.title = entry.label ?? entry.name;
            const info = document.createElement("div");
            info.className = "ns-image-row-info";
            const number = document.createElement("span");
            number.className = "ns-image-row-index";
            number.textContent = `IMAGE ${String(index + 1).padStart(2, "0")}`;
            info.append(number, name);
            const move = offset => {
                const next = [...entries];
                [next[index], next[index + offset]] = [next[index + offset], next[index]];
                change(next);
            };
            const up = button("", () => move(-1), "이미지 위로 이동", "up", "ns-image-icon-button");
            const down = button("", () => move(1), "이미지 아래로 이동", "down", "ns-image-icon-button");
            const remove = button("", () => change(entries.filter((_, item) => item !== index)), "목록에서 이미지 제거", "remove", "ns-image-icon-button ns-image-remove");
            up.disabled = busy || index === 0;
            down.disabled = busy || index === entries.length - 1;
            remove.disabled = busy;
            const actions = document.createElement("div");
            actions.className = "ns-image-row-actions";
            actions.append(up, down, remove);
            row.append(image, info, actions);
            list.append(row);
        }
        if (!entries.length) {
            const empty = document.createElement("div");
            empty.className = "ns-image-empty";
            empty.textContent = "아직 선택된 이미지가 없습니다. 위 버튼으로 파일이나 폴더를 추가하세요.";
            list.append(empty);
        }
        countBadge.textContent = `${entries.length}개`;
        for (const control of toolbar.querySelectorAll("button")) control.disabled = busy;
        if (!busy && invalidValue === null) message(`${entries.length}개 선택 · SVG 버튼으로 순서를 바꿀 수 있습니다.`);
    }
    async function uploadFiles(files, fromFolder = false) {
        if (busy || disposed) return;
        const supported = [...files].filter(file => IMAGE_EXTENSIONS.test(file.name));
        if (fromFolder) supported.sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }));
        if (!supported.length) { message("No supported image files selected.", true); return; }
        busy = true;
        render();
        const uploaded = [], failures = [];
        try {
            for (const [index, file] of supported.entries()) {
                if (disposed) return;
                message(`Uploading ${index + 1}/${supported.length}: ${file.name}`);
                const data = new FormData();
                // Directory-selected File objects may otherwise send their relative
                // path as the multipart filename. The path belongs in subfolder only.
                data.append("image", file, file.name);
                data.append("type", "input");
                const relative = (file.webkitRelativePath || "").split("/").slice(0, -1).filter(part => part && part !== "." && part !== "..").join("/");
                data.append("subfolder", relative ? `${uploadFolder}/${relative}` : uploadFolder);
                try {
                    const response = await api.fetchApi("/upload/image", { method: "POST", body: data, signal: abortController.signal });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    if (typeof result.name !== "string" || (result.type ?? "input") !== "input") throw new Error("Invalid upload response");
                    uploaded.push({ name: result.name, subfolder: result.subfolder ?? "", type: "input", label: file.webkitRelativePath || file.name });
                } catch (error) {
                    if (disposed) return;
                    failures.push(`${file.name}: ${error.message}`);
                }
            }
            if (disposed) return;
            change([...entries, ...uploaded]);
            if (uploaded.length) {
                const source = node.widgets?.find(item => item.name === "source");
                if (source) source.value = "selected_files";
            }
        } finally {
            busy = false;
            if (!disposed) {
                render();
                if (failures.length) message(`${uploaded.length} added; ${failures.length} failed. ${failures.join("; ")}`, true);
            }
        }
    }
    toolbar.append(
        button("이미지 선택", () => filesInput.click(), "컴퓨터에서 여러 이미지 선택", "upload", "ns-image-primary"),
        button("폴더 선택", () => folderInput.click(), "컴퓨터의 폴더에 있는 이미지 모두 업로드", "folder"),
        button("목록 비우기", () => change([]), "선택 목록만 비우기", "clear"),
    );
    filesInput.addEventListener("change", async () => { await uploadFiles(filesInput.files); filesInput.value = ""; });
    folderInput.addEventListener("change", async () => { await uploadFiles(folderInput.files, true); folderInput.value = ""; });

    widget = node.addDOMWidget(inputName, "NINETOSIX_IMAGE_FILES", root, {
        serialize: true, hideOnZoom: false,
        getValue: () => invalidValue ?? JSON.stringify(entries),
        setValue: value => {
            try { entries = parseSelection(value); invalidValue = null; render(); }
            catch (error) { invalidValue = value; entries = []; render(); message(error.message, true); }
        },
        getMinHeight: () => 260, getMaxHeight: () => 420,
    });
    widget.serializeValue = () => {
        if (busy) throw new Error("Image uploads are still running. Wait before saving or queueing this workflow.");
        return invalidValue ?? JSON.stringify(entries);
    };
    widget.options.minNodeSize = [440, 360];
    const originalRemove = widget.onRemove;
    widget.onRemove = function () { disposed = true; abortController.abort(); return originalRemove?.apply(this, arguments); };
    widget.value = inputData?.[1]?.default ?? "[]";
    return { widget, minWidth: 440, minHeight: 360 };
}
