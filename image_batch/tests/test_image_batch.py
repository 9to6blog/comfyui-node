import hashlib
import json
import math
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image
import torch

from image_batch.nodes import NineToSixImageBatchLoader, NineToSixImageGrid, collect_paths


class ImageBatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.input = self.root / "input"
        self.preview = self.root / "temp"
        self.input.mkdir()
        self.preview.mkdir()
        self.folder_paths = types.SimpleNamespace(
            get_input_directory=lambda: str(self.input), get_temp_directory=lambda: str(self.preview),
        )
        self.patch = patch.dict(sys.modules, {"folder_paths": self.folder_paths})
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.loader = NineToSixImageBatchLoader()
        self.grid = NineToSixImageGrid()

    def create(self, name, size=(8, 6), color=(255, 0, 0)):
        path = self.input / name
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", size, color).save(path)
        return path

    def selection(self, *names):
        return json.dumps([{"name": Path(name).name, "subfolder": str(Path(name).parent), "type": "input"} for name in names])

    def options(self, **updates):
        return dict(source="server_folder", selected_files="[]", folder=str(self.input),
                    recursive=False, sort_order="selection", start_index=0, max_images=0) | updates

    def test_selected_images_keep_order_dimensions_and_exact_pixels(self):
        self.create("a.png", (5, 7), (30, 60, 90))
        self.create("b.png", (9, 3), (10, 20, 30))
        images, masks, names, indices = self.loader.load_images(**self.options(
            source="selected_files", selected_files=self.selection("b.png", "a.png"),
        ))
        self.assertEqual(names, ["b.png", "a.png"])
        self.assertEqual(indices, [1, 2])
        self.assertEqual([tuple(image.shape) for image in images], [(1, 3, 9, 3), (1, 7, 5, 3)])
        self.assertEqual([tuple(mask.shape) for mask in masks], [(1, 3, 9), (1, 7, 5)])
        np.testing.assert_allclose(images[0][0, 0, 0].numpy(), np.array([10, 20, 30]) / 255, atol=1e-7)
        self.assertTrue(all(torch.count_nonzero(mask) == 0 for mask in masks))

    def test_folder_natural_order_recursive_and_nonimage_filter(self):
        for name in ["image10.png", "image2.png", "image1.png", "nested/inner.png"]:
            self.create(name)
        (self.input / "notes.txt").write_text("not an image")
        self.assertEqual([p.name for p in collect_paths(**self.options())], ["image1.png", "image2.png", "image10.png"])
        self.assertEqual(len(collect_paths(**self.options(recursive=True))), 4)
        self.assertEqual([p.name for p in collect_paths(**self.options(sort_order="name_descending"))], ["image10.png", "image2.png", "image1.png"])

    def test_range_and_repeated_execution_are_deterministic(self):
        for index in range(4):
            self.create(f"{index}.png")
        options = self.options(start_index=1, max_images=2)
        first = self.loader.load_images(**options)
        second = self.loader.load_images(**options)
        self.assertEqual(first[2:], (["1.png", "2.png"], [2, 3]))
        self.assertEqual(second[2:], first[2:])
        self.assertEqual(len(collect_paths(**self.options(max_images=0))), 4)

    def test_alpha_mask_and_exif_rotation(self):
        rgba = Image.new("RGBA", (2, 1), (200, 100, 50, 255))
        rgba.putpixel((0, 0), (200, 100, 50, 0))
        rgba.save(self.input / "alpha.png")
        images, masks, _, _ = self.loader.load_images(**self.options())
        self.assertEqual(tuple(masks[0].shape), (1, 1, 2))
        self.assertEqual(masks[0].tolist(), [[[1.0, 0.0]]])
        rotated = Image.new("RGB", (3, 2), (10, 20, 30))
        exif = Image.Exif()
        exif[274] = 6
        rotated.save(self.input / "rotation.png", exif=exif)
        images, _, _, _ = self.loader.load_images(**self.options(source="selected_files", selected_files=self.selection("rotation.png")))
        self.assertEqual(tuple(images[0].shape), (1, 3, 2, 3))

    def test_relative_server_folder_is_relative_to_comfy_input(self):
        self.create("test/a.png")
        self.assertEqual(collect_paths(**self.options(folder="test")), [(self.input / "test/a.png").resolve()])
        self.assertEqual(collect_paths(**self.options(source="selected_files", selected_files=self.selection("test/a.png"),
                                                     sort_order="name_ascending")), [(self.input / "test/a.png").resolve()])

    def test_cache_fingerprint_tracks_content_replacement_addition_and_removal(self):
        path = self.create("a.bmp")
        options = self.options()
        before = self.loader.IS_CHANGED(**options)
        original_stat = path.stat()
        Image.new("RGB", (8, 6), (0, 255, 0)).save(path)
        os.utime(path, ns=(original_stat.st_atime_ns, original_stat.st_mtime_ns))
        after = self.loader.IS_CHANGED(**options)
        self.assertNotEqual(before, after)
        self.create("b.png")
        self.assertNotEqual(after, self.loader.IS_CHANGED(**options))
        path.unlink()
        self.assertTrue(math.isnan(self.loader.IS_CHANGED(**self.options(source="selected_files", selected_files=self.selection("a.bmp")))))

    def test_empty_missing_corrupt_and_invalid_selection_fail_with_context(self):
        with self.assertRaisesRegex(ValueError, "No images"):
            self.loader.load_images(**self.options())
        with self.assertRaisesRegex(ValueError, "missing"):
            self.loader.load_images(**self.options(source="selected_files", selected_files=self.selection("missing.png")))
        (self.input / "broken.png").write_bytes(b"not a PNG")
        with self.assertRaisesRegex(ValueError, "broken.png"):
            self.loader.load_images(**self.options())
        for value in ("invalid JSON", "{}", "[1]"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.loader.load_images(**self.options(source="selected_files", selected_files=value))

    def test_uploaded_selection_cannot_escape_input_directory(self):
        Image.new("RGB", (2, 2)).save(self.root / "outside.png")
        for entry in [
            {"name": "outside.png", "subfolder": ".."},
            {"name": "../outside.png"},
            {"name": "outside.png", "subfolder": str(self.root)},
            {"name": "outside.png", "type": "output"},
        ]:
            with self.subTest(entry=entry), self.assertRaises(ValueError):
                self.loader.load_images(**self.options(source="selected_files", selected_files=json.dumps([entry])))

    def test_grid_collects_lists_and_tensor_batches_at_original_size(self):
        first = torch.zeros((2, 6, 8, 3))
        first[0, :, :, 0] = 1
        first[1, :, :, 1] = 1
        second = torch.ones((1, 5, 9, 3))
        result = self.grid.show_grid([first, second], [3], [100])
        rows = result["ui"]["ninetosix_images"]
        self.assertEqual(len(rows), 3)
        self.assertEqual([(r["width"], r["height"]) for r in rows], [(8, 6), (8, 6), (9, 5)])
        self.assertEqual(len(result["result"][0]), 3)
        self.assertTrue(torch.equal(result["result"][0][1], first[1:2]))
        for row in rows:
            directory = self.preview / row["subfolder"]
            self.assertTrue((directory / row["filename"]).is_file())
            self.assertTrue((directory / row["thumbnail"]).is_file())
        with Image.open(self.preview / rows[1]["subfolder"] / rows[1]["filename"]) as image:
            self.assertEqual(image.getpixel((0, 0)), (0, 255, 0))

    def test_loader_processing_grid_preserves_all_results_and_original_files(self):
        paths = [self.create("a.png", (7, 4), (255, 0, 0)), self.create("b.png", (5, 8), (0, 0, 255))]
        hashes = [hashlib.sha256(p.read_bytes()).digest() for p in paths]
        loaded = self.loader.load_images(**self.options())
        processed = [1.0 - image for image in loaded[0]]
        result = self.grid.show_grid(processed, [2], [180])
        self.assertEqual(result["ui"]["ninetosix_total"], [2])
        self.assertEqual([hashlib.sha256(p.read_bytes()).digest() for p in paths], hashes)
        self.assertTrue(torch.equal(result["result"][0][0], processed[0]))

    def test_invalid_image_shape_and_empty_gallery_fail(self):
        for images in ([], [torch.zeros((3, 4, 3))]):
            with self.subTest(images=images), self.assertRaises(ValueError):
                self.grid.show_grid(images, [4], [180])


if __name__ == "__main__":
    unittest.main()
