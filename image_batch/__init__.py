"""Image list loading and gallery preview nodes."""

from .nodes import NineToSixImageBatchLoader, NineToSixImageCompare, NineToSixImageGrid

NODE_CLASS_MAPPINGS = {
    "NineToSixImageBatchLoader": NineToSixImageBatchLoader,
    "NineToSixImageCompare": NineToSixImageCompare,
    "NineToSixImageGrid": NineToSixImageGrid,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "NineToSixImageBatchLoader": "9to6 Image Batch Loader",
    "NineToSixImageCompare": "9to6 Image Compare",
    "NineToSixImageGrid": "9to6 Image Grid",
}
