import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSelection, viewUrl, IMAGE_EXTENSIONS } from "../../web/image_batch/common.js";

const fs = await import("node:fs/promises");
const commonSource = await fs.readFile(new URL("../../web/image_batch/common.js", import.meta.url), "utf8");
const selectorSource = await fs.readFile(new URL("../../web/image_batch/selector.js", import.meta.url), "utf8");
const gallerySource = await fs.readFile(new URL("../../web/image_batch/gallery.js", import.meta.url), "utf8");
const compareSource = await fs.readFile(new URL("../../web/image_batch/compare.js", import.meta.url), "utf8");

test("selection survives workflow serialization with original order and Unicode names", () => {
    const entries = [{name: "한옥 #1.png", subfolder: "9to6-images/a", type: "input"}, {name: "b.png", subfolder: "", type: "input"}];
    assert.deepEqual(parseSelection(JSON.stringify(entries)), entries);
});

test("malformed or non-input selections are rejected rather than silently replaced", () => {
    for (const value of ["x", "{}", "[null]", '[{"name":1}]', '[{"name":"x.png","type":"output"}]']) {
        assert.throws(() => parseSelection(value));
    }
});

test("image URLs encode special characters and distinguish thumbnails from originals", () => {
    const api = {apiURL: path => `http://comfyui.test${path}`};
    const entry = {filename: "원본 #1 & 2.png", thumbnail: "thumb.png", subfolder: "a/b c", type: "temp"};
    const original = new URL(viewUrl(api, entry));
    assert.equal(original.searchParams.get("filename"), entry.filename);
    assert.equal(original.searchParams.get("subfolder"), entry.subfolder);
    assert.equal(new URL(viewUrl(api, entry, true)).searchParams.get("filename"), "thumb.png");
    assert.equal(IMAGE_EXTENSIONS.test("photo.JPEG"), true);
    assert.equal(IMAGE_EXTENSIONS.test("notes.txt"), false);
});

test("both image nodes use designed SVG panels that remain resizable", () => {
    assert.match(commonSource, /createElementNS\(SVG_NS, "svg"\)/);
    assert.match(commonSource, /\.ns-image-scroll \{[^}]*overflow:auto/s);
    assert.match(commonSource, /\.ns-image-panel \.ns-image-primary \{[^}]*color:#17130c !important;[^}]*background:#ffb238 !important;/s);
    assert.match(selectorSource, /9to6 Image Batch Loader/);
    assert.match(selectorSource, /svgIcon\("images"\)/);
    assert.match(selectorSource, /change\(uploaded\)/, "a new file or folder pick must replace the list, not append");
    assert.doesNotMatch(selectorSource, /change\(\[\.\.\.entries, \.\.\.uploaded\]\)/);
    assert.match(gallerySource, /9to6 Image Grid/);
    assert.match(gallerySource, /svgIcon\("grid"\)/);
    assert.doesNotMatch(selectorSource, /widget\.computeSize\s*=/);
    assert.doesNotMatch(gallerySource, /widget\.computeSize\s*=/);
});

test("compare node uses the shared design system and offers three modes", () => {
    assert.match(compareSource, /9to6 Image Compare/);
    assert.match(compareSource, /svgIcon\("compare"\)/);
    assert.match(compareSource, /side_by_side/);
    assert.match(compareSource, /slider/);
    assert.match(compareSource, /difference/);
    assert.match(compareSource, /openLightbox/);
    assert.match(commonSource, /compare: \[/);
    assert.match(commonSource, /\.ns-compare-slider/);
    assert.doesNotMatch(compareSource, /widget\.computeSize\s*=/);
});
