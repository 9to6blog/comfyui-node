import importlib.util
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "ninetosix_prompt_switch", ROOT / "__init__.py",
    submodule_search_locations=[str(ROOT)],
)
package = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = package
spec.loader.exec_module(package)
Node = package.NODE_CLASS_MAPPINGS["NineToSixMultiPromptSwitch"]


class PromptSwitchTests(unittest.TestCase):
    def setUp(self):
        self.node = Node()
        self.inputs = {
            name: config[1]["default"]
            for name, config in Node.INPUT_TYPES()["required"].items()
        }

    def run_node(self, **changes):
        return self.node.combine(**(self.inputs | changes))

    def test_only_first_enabled_prompt_is_selected_and_input_is_preserved(self):
        self.inputs.update(
            enabled_01=True, prompt_01="masterpiece",
            enabled_02=False, prompt_02="unwanted background",
            enabled_03=True, prompt_03="soft lighting",
        )
        before = self.inputs.copy()
        self.assertEqual(self.run_node(), ("masterpiece", 1))
        self.assertEqual(self.inputs, before)
        self.assertEqual(
            self.run_node(enabled_02=True),
            ("masterpiece", 1),
        )
        self.assertEqual(
            self.run_node(enabled_01=False, enabled_02=True),
            ("unwanted background", 1),
        )

    def test_selected_blank_prompt_returns_empty_without_falling_through(self):
        self.assertEqual(self.run_node(
            enabled_01=False, enabled_02=True, prompt_02=" \t\n ",
            enabled_03=True, prompt_03="B",
        ), ("", 0))

    def test_all_off_and_all_blank_produce_an_empty_string(self):
        self.assertEqual(self.run_node(), ("", 0))
        self.assertEqual(self.run_node(enabled_01=False, prompt_01="saved text"), ("", 0))

    def test_lowest_enabled_slot_wins_for_legacy_multi_on_workflows(self):
        self.assertEqual(self.run_node(
            enabled_10=True, prompt_10="ten",
            enabled_02=True, prompt_02="two", prompt_01="one",
        ), ("one", 1))
        self.assertEqual(self.run_node(
            enabled_01=False, enabled_02=True, prompt_02="two",
            enabled_10=True, prompt_10="ten",
        ), ("two", 1))

    def test_legacy_separator_choices_do_not_change_single_selection(self):
        for mode in ("comma", "newline", "space"):
            with self.subTest(mode=mode):
                self.assertEqual(self.run_node(
                    separator=mode, prompt_01="A", enabled_02=True, prompt_02="B",
                ), ("A", 1))

    def test_unicode_prompt_syntax_and_internal_spacing_remain_literal(self):
        prompt = "한옥 🌙\n(soft light:1.2), {red|blue}, a  b, C:\\art"
        self.assertEqual(self.run_node(prompt_01=prompt), (prompt, 1))
        schema = Node.INPUT_TYPES()["required"]
        for name, (_, options) in schema.items():
            if name.startswith("prompt_"):
                self.assertFalse(options["dynamicPrompts"])

    def test_duplicate_enabled_fragments_still_produce_one_selection(self):
        self.assertEqual(self.run_node(
            prompt_01="detail", enabled_02=True, prompt_02="detail",
        ), ("detail", 1))

    def test_titles_are_saved_but_never_added_to_output(self):
        self.assertEqual(self.run_node(
            title_01="인물", prompt_01="portrait",
            title_02="조명", enabled_02=True, prompt_02="soft light",
        ), ("portrait", 1))
        schema = Node.INPUT_TYPES()["required"]
        self.assertEqual(schema["title_01"][1]["default"], "")
        self.assertEqual(list(schema)[-1], "title_10")

    def test_bad_switch_values_are_not_treated_as_truthy(self):
        for bad_value in ("false", "true", 0, 1, None):
            with self.subTest(value=bad_value):
                with self.assertRaises(TypeError):
                    self.run_node(enabled_01=bad_value, prompt_01="A")

    def test_invalid_separator_or_enabled_prompt_type_fails(self):
        with self.assertRaises(ValueError):
            self.run_node(separator="invalid")
        with self.assertRaises(TypeError):
            self.run_node(prompt_01=42)

    def test_example_workflow_widget_round_trip(self):
        workflow = json.loads((ROOT / "examples" / "prompt-switch.json").read_text(encoding="utf-8"))
        node = workflow["nodes"][0]
        self.assertEqual(node["type"], "NineToSixMultiPromptSwitch")
        names = list(Node.INPUT_TYPES()["required"])
        self.assertEqual(len(node["widgets_values"]), len(names))
        restored = dict(zip(names, node["widgets_values"], strict=True))
        self.assertEqual(self.node.combine(**restored), ("masterpiece", 1))
        self.assertEqual(restored["title_01"], "품질")
        self.assertEqual(node["properties"]["ninetosixPromptCount"], 3)

    def test_repository_root_loads_nested_nodes_and_web_extension(self):
        repository = ROOT.parent
        repo_spec = importlib.util.spec_from_file_location(
            "ninetosix_repository", repository / "__init__.py",
            submodule_search_locations=[str(repository)],
        )
        repo_module = importlib.util.module_from_spec(repo_spec)
        sys.modules[repo_spec.name] = repo_module
        repo_spec.loader.exec_module(repo_module)
        node_type = repo_module.NODE_CLASS_MAPPINGS["NineToSixMultiPromptSwitch"]
        self.assertEqual(node_type().combine(prompt_01="loaded"), ("loaded", 1))
        self.assertTrue((repository / repo_module.WEB_DIRECTORY / "prompt_switch" / "prompt_switch.js").is_file())
        self.assertIn("NineToSixImageBatchLoader", repo_module.NODE_CLASS_MAPPINGS)
        self.assertIn("NineToSixImageGrid", repo_module.NODE_CLASS_MAPPINGS)


if __name__ == "__main__":
    unittest.main()
