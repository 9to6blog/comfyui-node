import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { createImageSelector } from "./selector.js";
import { createGallery } from "./gallery.js";

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
        if ((node.comfyClass ?? node.type) === "NineToSixImageGrid") createGallery(node, api);
    },
});
