"""Check that routed figures display the reviewed values and correct scopes."""

import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import generate_routed_figures as figures


class RoutedFigureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = figures.ROOT / "output/fpga/implementation"
        cls.data, cls.synthesis = figures.checked_inputs(cls.folder)

    def test_heatmap_preserves_overall_and_register_scope(self):
        figure = figures.timing_figure(self.data)
        try:
            self.assertEqual(figure.axes[0].images[0].get_array().tolist(),
                             [[-.884, .058, -2.232, 9.5], [-29.556, -29.556, -2.168, 9.5]])
            self.assertEqual(figure.axes[0].images[0].norm.vcenter, 0)
            self.assertEqual(sum(text.get_text() == "filtered worst path" for text in figure.axes[0].texts), 2)
        finally:
            figures.plt.close(figure)

    def test_internal_delay_segments_sum_to_reported_totals(self):
        figure = figures.path_figure(self.data)
        try:
            self.assertEqual([round(patch.get_width(), 3) for patch in figure.axes[0].patches],
                             [4.599, 15.073, 15.399, 33.988])
            self.assertAlmostEqual(4.599 + 15.073, self.data["runs"]["baseline"]["register_setup_paths"][0]["data_delay_ns"])
            self.assertAlmostEqual(15.399 + 33.988, self.data["runs"]["extended"]["register_setup_paths"][0]["data_delay_ns"])
        finally:
            figures.plt.close(figure)

    def test_stage_lines_use_two_actual_stages(self):
        figure = figures.stage_figure(self.data, self.synthesis)
        try:
            for line, values in zip(figure.axes[0].lines, ([3034, 2987], [4178, 4205])):
                self.assertEqual(list(line.get_ydata()), values)
                self.assertEqual(list(line.get_xdata()), [0, 1])
            self.assertEqual(list(figure.axes[1].lines[0].get_ydata()), [2.994, -.884])
            self.assertEqual(list(figure.axes[1].lines[1].get_ydata()), [-30.8, -29.556])
        finally:
            figures.plt.close(figure)

    def test_changed_review_data_is_rejected(self):
        with tempfile.TemporaryDirectory(dir=figures.ROOT / "tmp") as temporary:
            folder = Path(temporary)
            shutil.copy(self.folder / "review_manifest.json", folder)
            manifest = json.loads((folder / "review_manifest.json").read_text())
            for name in (*manifest["source_file_sha256"], *manifest["artifact_sha256"]):
                target = folder / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(self.folder / name, target)
            data = folder / "implementation_results.json"
            data.write_text(data.read_text().replace('"total_luts": 4205', '"total_luts": 42'))
            with self.assertRaisesRegex(ValueError, "Review evidence changed"):
                figures.checked_inputs(folder)

    def test_status_text_follows_endpoint_results(self):
        altered = copy.deepcopy(self.data)
        altered["runs"]["extended"]["timing"]["setup_failing_endpoints"] = 0
        self.assertIn("setup fail / pass", figures.status_text(altered))


if __name__ == "__main__":
    unittest.main()
