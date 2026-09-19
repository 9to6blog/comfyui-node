import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { createImageSelector } from "./selector.js";
import { createGallery } from "./gallery.js";
import { createCompare } from "./compare.js";

app.registerExtension({
    name: "9to6.ImageBatch",
    getCustomWidgets() {
        return {
            NINETOSIX_IMAGE_FILES(node, inputName, inputData) {
                return createImageSelector(node, inputName, inputData, api, app);
            },
        };
    },
    nodeCreated(node) {
        const nodeType = node.comfyClass ?? node.type;
        if (nodeType === "NineToSixImageGrid") createGallery(node, api);
        if (nodeType === "NineToSixImageCompare") createCompare(node, api);
    },
});
