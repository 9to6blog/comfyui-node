"""Join only enabled prompt fields, without any external dependencies."""

PROMPT_SLOTS = 10
SEPARATORS = {
    "comma": ", ",
    "newline": "\n",
    "space": " ",
}


class NineToSixMultiPromptSwitch:
    """Keep prompt fragments in a workflow and include only enabled ones."""

    @classmethod
    def INPUT_TYPES(cls):
        inputs = {
            "separator": (
                list(SEPARATORS),
                {"default": "comma", "tooltip": "Legacy compatibility field. A switcher outputs only one prompt."},
            ),
        }
        for index in range(1, PROMPT_SLOTS + 1):
            inputs[f"enabled_{index:02d}"] = (
                "BOOLEAN",
                {
                    "default": index == 1,
                    "label_on": "ON",
                    "label_off": "OFF",
                    "tooltip": f"Include prompt {index:02d}. OFF keeps its text in your workflow.",
                },
            )
            inputs[f"prompt_{index:02d}"] = (
                "STRING",
                {
                    "default": "",
                    "multiline": True,
                    "dynamicPrompts": False,
                    "placeholder": f"Prompt {index:02d}",
                    "tooltip": "Literal text. Blank fields are skipped; internal formatting is preserved.",
                },
            )
        # Keep titles after the original separator/enabled/prompt fields.  This
        # preserves the widget order used by workflows created before v0.3.
        for index in range(1, PROMPT_SLOTS + 1):
            inputs[f"title_{index:02d}"] = (
                "STRING",
                {
                    "default": "",
                    "placeholder": f"Prompt {index:02d} title",
                    "tooltip": "A workflow-only label that helps identify this prompt. It is not included in the output.",
                },
            )
        return {"required": inputs, "optional": {"clip": ("CLIP",)}}

    RETURN_TYPES = ("STRING", "INT", "CONDITIONING")
    RETURN_NAMES = ("text", "active_count", "conditioning")
    OUTPUT_TOOLTIPS = (
        "The first enabled prompt. The UI keeps selection exclusive; all OFF returns an empty string.",
        "1 when the selected prompt is non-empty, otherwise 0.",
        "Encoded with the connected CLIP model. Connect a CLIP model to enable this output.",
    )
    FUNCTION = "combine"
    CATEGORY = "9to6/Prompt"
    DESCRIPTION = (
        "Organize up to ten titled prompts and select no more than one at a time. "
        "Turning one prompt ON automatically turns the previous selection OFF. "
        "Connect text to a CLIP Text Encode text input, or connect a CLIP model "
        "to use the conditioning output directly."
    )
    SEARCH_ALIASES = ["multi prompt", "prompt switch", "prompt toggle", "다중 프롬프트"]

    def combine(self, separator="comma", clip=None, **kwargs):
        if separator not in SEPARATORS:
            raise ValueError("separator must be comma, newline, or space")

        selected_prompt = None
        for index in range(1, PROMPT_SLOTS + 1):
            enabled_name = f"enabled_{index:02d}"
            prompt_name = f"prompt_{index:02d}"
            enabled = kwargs.get(enabled_name, index == 1)
            if not isinstance(enabled, bool):
                raise TypeError(f"{enabled_name} must be a BOOLEAN")
            if not enabled or selected_prompt is not None:
                continue

            prompt = kwargs.get(prompt_name, "")
            if not isinstance(prompt, str):
                raise TypeError(f"{prompt_name} must be a STRING")
            selected_prompt = prompt.strip()

        text = selected_prompt or ""
        active = 1 if selected_prompt else 0
        conditioning = None
        if clip is not None:
            tokens = clip.tokenize(text)
            conditioning = clip.encode_from_tokens_scheduled(tokens)
        return (text, active, conditioning)
