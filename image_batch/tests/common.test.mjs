import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSelection, viewUrl, IMAGE_EXTENSIONS } from "../../web/image_batch/common.js";

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
