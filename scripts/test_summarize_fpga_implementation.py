"""Checks for the archived implementation pair and rejection of mixed evidence."""

from pathlib import Path
import shutil
import tempfile
import unittest

from summarize_fpga_implementation import ROOT, load_reports


class ImplementationEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.archive = ROOT / "output/fpga/implementation"
        cls.result = load_reports(cls.archive)

    def copied_archive(self):
        temporary = tempfile.TemporaryDirectory(dir=ROOT / "tmp", prefix="implementation-evidence-")
        self.addCleanup(temporary.cleanup)
        directory = Path(temporary.name)
        for variant in ("baseline", "extended"):
            shutil.copytree(self.archive / variant, directory / variant)
        return directory

    def test_reported_results_and_missing_extended_log(self):
        baseline, extended = (self.result["runs"][variant] for variant in ("baseline", "extended"))
        self.assertEqual((baseline["resources"]["total_luts"], extended["resources"]["total_luts"]), (2987, 4205))
        self.assertEqual((baseline["register_setup_paths"][0]["slack_ns"], extended["register_setup_paths"][0]["slack_ns"]), (0.058, -29.556))
        self.assertTrue(extended["register_setup_paths"][0]["traverses_isqrt"])
        self.assertTrue(baseline["completed_implementation_log_available"])
        self.assertFalse(extended["completed_implementation_log_available"])
        self.assertEqual(extended["launch_logs"]["vivado.log"], "refused_retry")
        self.assertEqual(self.result["baseline_source_files_verified"], 180)

    def test_missing_report_rejected(self):
        directory = self.copied_archive()
        (directory / "extended/hold_paths.rpt").unlink()
        with self.assertRaises(FileNotFoundError):
            load_reports(directory)

    def test_synthesis_stage_in_routed_archive_rejected(self):
        directory = self.copied_archive()
        report = directory / "baseline/utilization.rpt"
        report.write_text(report.read_text().replace("Design State : Routed", "Design State : Synthesized"))
        with self.assertRaisesRegex(ValueError, "Wrong design stage"):
            load_reports(directory)

    def test_different_target_rejected(self):
        directory = self.copied_archive()
        info = directory / "extended/implementation_info.txt"
        info.write_text(info.read_text().replace("clock_period_ns: 20.0", "clock_period_ns: 40.0"))
        with self.assertRaisesRegex(ValueError, "Target mismatch"):
            load_reports(directory)

    def test_added_timing_exception_rejected(self):
        directory = self.copied_archive()
        xdc = directory / "extended/implemented_constraints.xdc"
        xdc.write_text(xdc.read_text() + "\nset_false_path -from [all_registers]\n")
        with self.assertRaisesRegex(ValueError, "Implemented constraints differ"):
            load_reports(directory)


if __name__ == "__main__":
    unittest.main()
