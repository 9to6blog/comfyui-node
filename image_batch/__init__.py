"""Image list loading and gallery preview nodes."""

from .nodes import NineToSixImageBatchLoader, NineToSixImageGrid

NODE_CLASS_MAPPINGS = {
    "NineToSixImageBatchLoader": NineToSixImageBatchLoader,
    "NineToSixImageGrid": NineToSixImageGrid,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "NineToSixImageBatchLoader": "9to6 Image Batch Loader",
    "NineToSixImageGrid": "9to6 Image Grid",
}
