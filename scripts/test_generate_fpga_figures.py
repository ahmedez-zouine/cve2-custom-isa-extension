"""Regression checks for report selection and misleading evidence failures."""

import copy
from pathlib import Path
import shutil
import tempfile
import unittest

import generate_fpga_figures as figures

REPORTS = figures.ROOT / "output/fpga"


class ReportTests(unittest.TestCase):
    def test_saved_report_totals_and_slack(self):
        original, _ = figures.read_run(REPORTS / "baseline", "baseline")
        extended, _ = figures.read_run(REPORTS / "extended", "extended")
        self.assertEqual(original["resources"]["total_luts"], 3034)
        self.assertEqual(extended["resources"]["total_luts"], 4178)
        self.assertEqual(original["resources"]["ffs"], 1961)
        self.assertEqual(extended["resources"]["ffs"], 1962)
        self.assertEqual(original["timing"]["wns_ns"], 2.994)
        self.assertEqual(extended["timing"]["wns_ns"], -30.800)
        self.assertEqual(original["timing"]["hold_failing_endpoints"], 368)

    def test_top_row_not_primitive_or_module_sum(self):
        text = (REPORTS / "baseline/utilization.rpt").read_text()
        changed = text.replace("3034", "3210")
        self.assertEqual(figures.parse_resources(changed)["total_luts"], 3210)
        with self.assertRaises(ValueError):
            figures.parse_resources(text.replace("cve2_fpga_top", "another_top"))

    def test_incomplete_and_inconsistent_timing_rejected(self):
        text = (REPORTS / "extended/timing_summary.rpt").read_text()
        with self.assertRaises(ValueError):
            figures.parse_timing(text.replace("| Design Timing Summary", "| Other summary"))
        with self.assertRaises(ValueError):
            figures.parse_timing(text.replace("-30.800", "30.800"))

    def test_failed_log_and_wrong_device_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary) / "baseline"
            shutil.copytree(REPORTS / "baseline", directory)
            log = directory / "vivado.log"
            successful = log.read_bytes()
            log.write_bytes((directory / "preparation_failed.log").read_bytes())
            with self.assertRaisesRegex(ValueError, "No successful synthesis log"):
                figures.read_run(directory, "baseline")
            log.write_bytes(successful)
            timing = directory / "timing_summary.rpt"
            timing.write_text(timing.read_text().replace("7a35t-csg324", "7a100t-csg324"))
            with self.assertRaisesRegex(ValueError, "FPGA device mismatch"):
                figures.read_run(directory, "baseline")

    def test_missing_evidence_stops_collection(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(FileNotFoundError):
                figures.load_reports(Path(temporary))

    def test_status_text_follows_changed_results(self):
        original, _ = figures.read_run(REPORTS / "baseline", "baseline")
        extended, _ = figures.read_run(REPORTS / "extended", "extended")
        evidence = {"runs": {"baseline": original, "extended": extended}}
        self.assertIn("with isqrt fails setup", figures.check_status(evidence, "setup"))
        updated = copy.deepcopy(evidence)
        updated["runs"]["extended"]["timing"]["setup_failing_endpoints"] = 0
        self.assertIn("with isqrt passes setup", figures.check_status(updated, "setup"))

    def test_heatmap_contains_worst_slack_in_nanoseconds(self):
        original, _ = figures.read_run(REPORTS / "baseline", "baseline")
        extended, _ = figures.read_run(REPORTS / "extended", "extended")
        figure = figures.timing_figure({"runs": {"baseline": original, "extended": extended}})
        try:
            matrix = figure.axes[0].images[0].get_array().tolist()
            self.assertEqual(matrix, [[2.994, -.956, 9.5], [-30.8, -.956, 9.5]])
            self.assertEqual(figure.axes[0].images[0].norm.vcenter, 0)
        finally:
            figures.plt.close(figure)

    def test_scatter_contains_exactly_the_two_reported_configurations(self):
        original, _ = figures.read_run(REPORTS / "baseline", "baseline")
        extended, _ = figures.read_run(REPORTS / "extended", "extended")
        figure = figures.tradeoff_figure({"runs": {"baseline": original, "extended": extended}})
        try:
            points = [tuple(point) for collection in figure.axes[0].collections
                      for point in collection.get_offsets()]
            self.assertEqual(points, [(3034, 2.994), (4178, -30.8)])
            self.assertEqual(len(figure.axes[0].lines), 1)
        finally:
            figures.plt.close(figure)


if __name__ == "__main__":
    unittest.main()
