"""Load separate IMAGE items and collect processed results without resizing them."""

import hashlib
import json
from pathlib import Path
import re
import uuid


IMAGE_EXTENSIONS = frozenset({".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".gif"})


def natural_key(value):
    return tuple((0, int(part)) if part.isdigit() else (1, part.casefold())
                 for part in re.split(r"(\d+)", str(value)))


def selected_paths(selected_files, input_directory):
    try:
        entries = json.loads(selected_files)
    except (TypeError, ValueError) as error:
        raise ValueError("Image selection is invalid. Select your images again.") from error
    if not isinstance(entries, list):
        raise ValueError("Image selection must be a JSON list.")
    root = Path(input_directory).resolve()
    paths = []
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("type", "input") != "input":
            raise ValueError("Selected images must come from ComfyUI's input directory.")
        name = entry.get("name")
        subfolder = entry.get("subfolder", "")
        if (not isinstance(name, str) or not name or any(c in name for c in ("/", "\\", "\0", ":"))
                or not isinstance(subfolder, str) or "\0" in subfolder):
            raise ValueError("Invalid selected image path.")
        path = (root / subfolder / name).resolve()
        if not path.is_relative_to(root):
            raise ValueError("Selected images must stay inside ComfyUI's input directory.")
        paths.append(path)
    return paths


def collect_paths(source, selected_files, folder, recursive, sort_order, start_index, max_images):
    import folder_paths

    if type(start_index) is not int or start_index < 0:
        raise ValueError("start_index must be a non-negative integer.")
    if type(max_images) is not int or max_images < 0:
        raise ValueError("max_images must be a non-negative integer (0 means all).")
    if sort_order not in {"selection", "name_ascending", "name_descending"}:
        raise ValueError("Unknown sort order.")

    input_directory = Path(folder_paths.get_input_directory()).resolve()
    if source == "selected_files":
        paths = selected_paths(selected_files, input_directory)
        sorting_root = input_directory
    elif source == "server_folder":
        if not isinstance(folder, str) or not folder.strip():
            raise ValueError("Enter a folder on the computer running ComfyUI.")
        directory = Path(folder.strip()).expanduser()
        if not directory.is_absolute():
            directory = input_directory / directory
        directory = directory.resolve()
        if not directory.is_dir():
            raise ValueError(f"Image folder does not exist: {directory}")
        iterator = directory.rglob("*") if recursive else directory.iterdir()
        paths = [p for p in iterator if p.is_file() and p.suffix.casefold() in IMAGE_EXTENSIONS]
        sorting_root = directory
    else:
        raise ValueError("source must be selected_files or server_folder.")

    if source == "server_folder" or sort_order != "selection":
        paths.sort(key=lambda p: (natural_key(p.relative_to(sorting_root)), str(p)),
                   reverse=sort_order == "name_descending")
    paths = paths[start_index:]
    if max_images:
        paths = paths[:max_images]
    if not paths:
        raise ValueError("No images to load. Select images or check your folder and range.")
    for path in paths:
        if path.suffix.casefold() not in IMAGE_EXTENSIONS:
            raise ValueError(f"Unsupported image format: {path.name}")
        if not path.is_file():
            raise ValueError(f"Selected image is missing: {path.name}. Upload it again.")
    return paths


class NineToSixImageBatchLoader:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "source": (["selected_files", "server_folder"], {"default": "selected_files"}),
            "selected_files": ("NINETOSIX_IMAGE_FILES", {"default": "[]"}),
            "folder": ("STRING", {"default": "", "tooltip": "Server-side folder. Relative paths start in ComfyUI/input."}),
            "recursive": ("BOOLEAN", {"default": False, "tooltip": "Include server-folder subdirectories."}),
            "sort_order": (["selection", "name_ascending", "name_descending"], {"default": "selection"}),
            "start_index": ("INT", {"default": 0, "min": 0, "max": 1000000}),
            "max_images": ("INT", {"default": 0, "min": 0, "max": 1000000,
                                    "tooltip": "0 = all images. Limit the range to reduce memory use."}),
        }}

    RETURN_TYPES = ("IMAGE", "MASK", "STRING", "INT")
    RETURN_NAMES = ("images", "masks", "filenames", "indices")
    OUTPUT_IS_LIST = (True, True, True, True)
    FUNCTION = "load_images"
    CATEGORY = "9to6/Image"
    DESCRIPTION = "Select multiple images or read a folder. Each output IMAGE item contains one original-size image."
    SEARCH_ALIASES = ["multiple images", "folder images", "image list", "이미지 다중 선택"]

    @classmethod
    def IS_CHANGED(cls, source, selected_files, folder, recursive, sort_order, start_index, max_images):
        # Include content, not just the file name: replacing a folder image must invalidate the cache.
        try:
            paths = collect_paths(source, selected_files, folder, recursive, sort_order, start_index, max_images)
            digest = hashlib.sha256()
            for path in paths:
                digest.update(str(path).encode("utf-8"))
                digest.update(b"\0")
                with path.open("rb") as image_file:
                    for chunk in iter(lambda: image_file.read(1024 * 1024), b""):
                        digest.update(chunk)
            return digest.hexdigest()
        except (ValueError, OSError):
            # Execution will report the actionable error; never reuse stale images.
            return float("nan")

    def load_images(self, source, selected_files, folder="", recursive=False,
                    sort_order="selection", start_index=0, max_images=0):
        import numpy as np
        from PIL import Image, ImageOps
        import torch

        paths = collect_paths(source, selected_files, folder, recursive, sort_order, start_index, max_images)
        images, masks, filenames = [], [], []
        for path in paths:
            try:
                with Image.open(path) as opened:
                    # One image per file. Animated files and multi-page TIFF use their first frame.
                    image = ImageOps.exif_transpose(opened)
                    rgb = np.array(image.convert("RGB"), dtype=np.float32) / 255.0
                    if "A" in image.getbands() or "transparency" in image.info:
                        alpha = np.array(image.convert("RGBA").getchannel("A"), dtype=np.float32) / 255.0
                        mask = torch.from_numpy(1.0 - alpha).unsqueeze(0)
                    else:
                        mask = torch.zeros((1, image.height, image.width), dtype=torch.float32)
                    images.append(torch.from_numpy(rgb).unsqueeze(0))
                    masks.append(mask)
                    filenames.append(path.name)
            except Exception as error:
                raise ValueError(f"Cannot load image {path.name}: {error}") from error
        return (images, masks, filenames, list(range(start_index + 1, start_index + len(images) + 1)))


class NineToSixImageGrid:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "images": ("IMAGE",),
            "columns": ("INT", {"default": 4, "min": 1, "max": 12}),
            "thumbnail_size": ("INT", {"default": 180, "min": 80, "max": 512, "step": 10}),
        }, "optional": {
            "labels": ("STRING",),
        }}

    INPUT_IS_LIST = True
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    OUTPUT_IS_LIST = (True,)
    OUTPUT_NODE = True
    FUNCTION = "show_grid"
    CATEGORY = "9to6/Image"
    DESCRIPTION = "Collect all received images into a clickable grid. Click for a full-resolution preview."
    SEARCH_ALIASES = ["image gallery", "grid preview", "contact sheet", "이미지 그리드"]

    def show_grid(self, images, columns, thumbnail_size, labels=None):
        import folder_paths
        import numpy as np
        from PIL import Image

        column_count, size = int(columns[0]), int(thumbnail_size[0])
        if not 1 <= column_count <= 12 or not 80 <= size <= 512:
            raise ValueError("Grid columns or thumbnail size is outside the supported range.")
        frame_labels = []
        if labels:
            for batch in labels:
                if isinstance(batch, str):
                    frame_labels.append(batch)
                else:
                    frame_labels.extend(str(item) for item in batch)
        frames = []
        for batch in images:
            if len(batch.shape) != 4 or batch.shape[-1] not in (1, 3, 4):
                raise ValueError("Image Grid expects IMAGE tensors shaped [batch, height, width, channels].")
            frames.extend(batch[index:index + 1] for index in range(batch.shape[0]))
        if not frames:
            raise ValueError("Image Grid received no images.")

        subfolder = f"9to6-grid/{uuid.uuid4().hex}"
        output_directory = Path(folder_paths.get_temp_directory()) / subfolder
        output_directory.mkdir(parents=True, exist_ok=False)
        previews = []
        for index, frame in enumerate(frames, start=1):
            array = frame[0].detach().cpu().float().numpy()
            array = np.nan_to_num(np.clip(array, 0, 1), nan=0.0)
            pixels = (array * 255).round().astype(np.uint8)
            if pixels.shape[-1] == 1:
                pixels = pixels[..., 0]
            image = Image.fromarray(pixels)
            filename = f"image_{index:05d}.png"
            thumbnail = f"thumb_{index:05d}.png"
            image.save(output_directory / filename, compress_level=1)
            small = image.copy()
            small.thumbnail((size * 2, size * 2), Image.Resampling.LANCZOS)
            small.save(output_directory / thumbnail, compress_level=4)
            previews.append({"filename": filename, "thumbnail": thumbnail, "subfolder": subfolder,
                             "type": "temp", "width": image.width, "height": image.height, "index": index,
                             "label": frame_labels[index - 1] if index <= len(frame_labels) else None})

        return {"ui": {"ninetosix_images": previews, "ninetosix_columns": [column_count],
                       "ninetosix_thumbnail_size": [size], "ninetosix_total": [len(previews)]},
                "result": (frames,)}


class NineToSixImageCompare:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "image_a": ("IMAGE",),
            "image_b": ("IMAGE",),
            "mode": (["side_by_side", "slider", "difference"], {"default": "side_by_side"}),
            "labels": ("STRING", {"default": "A,B", "tooltip": "Comma-separated labels for image A and B."}),
        }}

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("image_a", "image_b")
    OUTPUT_NODE = True
    FUNCTION = "compare"
    CATEGORY = "9to6/Image"
    DESCRIPTION = "Compare two images side-by-side, with a slider, or as a difference heatmap."
    SEARCH_ALIASES = ["image compare", "before after", "difference", "비교", "이미지 비교"]

    def compare(self, image_a, image_b, mode, labels):
        import folder_paths
        import numpy as np
        from PIL import Image

        if len(image_a.shape) != 4 or len(image_b.shape) != 4:
            raise ValueError("Compare expects IMAGE tensors shaped [batch, height, width, channels].")
        if image_a.shape[0] != 1 or image_b.shape[0] != 1:
            raise ValueError("Compare accepts exactly one image per input. Use Image Grid for batches.")

        array_a = image_a[0].detach().cpu().float().numpy()
        array_b = image_b[0].detach().cpu().float().numpy()
        array_a = np.nan_to_num(np.clip(array_a, 0, 1), nan=0.0)
        array_b = np.nan_to_num(np.clip(array_b, 0, 1), nan=0.0)
        if array_a.shape != array_b.shape:
            raise ValueError(f"Images must have the same dimensions. A: {array_a.shape}, B: {array_b.shape}")

        label_a, label_b = (labels.split(",") + ["", ""])[:2] if labels else ("A", "B")

        if mode == "difference":
            diff = np.abs(array_a - array_b)
            heatmap = np.zeros((*diff.shape[:2], 3), dtype=np.float32)
            heatmap[..., 0] = diff.mean(axis=-1) * 4.0
            heatmap[..., 1] = diff.mean(axis=-1) * 1.5
            heatmap = np.clip(heatmap, 0, 1)
            preview_array = heatmap
        else:
            preview_array = array_a

        subfolder = f"9to6-compare/{uuid.uuid4().hex}"
        output_directory = Path(folder_paths.get_temp_directory()) / subfolder
        output_directory.mkdir(parents=True, exist_ok=False)

        for name, array in (("a", array_a), ("b", array_b), ("preview", preview_array)):
            pixels = (array * 255).round().astype(np.uint8)
            if pixels.shape[-1] == 1:
                pixels = pixels[..., 0]
            Image.fromarray(pixels).save(output_directory / f"{name}.png", compress_level=1)

        height, width = array_a.shape[:2]
        return {
            "ui": {
                "ninetosix_compare": {
                    "a": {"filename": "a.png", "subfolder": subfolder, "type": "temp", "width": width, "height": height, "label": label_a.strip() or "A"},
                    "b": {"filename": "b.png", "subfolder": subfolder, "type": "temp", "width": width, "height": height, "label": label_b.strip() or "B"},
                    "mode": mode,
                    "difference": mode == "difference",
                }
            },
            "result": (image_a, image_b),
        }
