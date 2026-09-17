"""ComfyUI entry point for 9to6 Prompt Switch."""

from .prompt_switch import NineToSixMultiPromptSwitch

NODE_CLASS_MAPPINGS = {
    "NineToSixMultiPromptSwitch": NineToSixMultiPromptSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "NineToSixMultiPromptSwitch": "9to6 Multi Prompt Switch",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
