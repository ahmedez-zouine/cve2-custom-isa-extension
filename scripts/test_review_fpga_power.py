"""Keep the archived failed-annotation experiment out of final power claims."""

import unittest

from review_fpga_power import ROOT, review, table_value


class PowerReviewTests(unittest.TestCase):
    def test_summary_field_must_not_silently_select_an_advisory_header(self):
        text = "| Confidence Level | Medium |\n| Confidence Level | Status |\n"
        with self.assertRaisesRegex(ValueError, "repeated power field"):
            table_value(text, "Confidence Level")

    def test_archived_port_annotations_remain_unverified_despite_power_completion(self):
        result, sources = review(ROOT / "output/fpga/power")
        self.assertFalse(result["accepted_for_controlled_power_comparison"])
        self.assertEqual(result["review_status"], "input_activity_recheck_required")
        self.assertGreaterEqual(len(sources), 36)
        for run in result["runs"].values():
            self.assertTrue(run["input_activity_report_blank"])
            self.assertEqual(run["logged_warnings"]["Power 33-294"], 100)
            self.assertTrue(run["warning_limit_reached"])
            self.assertEqual(run["confidence"], "Medium")
            self.assertFalse(run["input_activity_crosscheck"].get("verified", False))
            self.assertEqual(run["advisory_rows"], {"Low": 50, "Medium": 14, "High": 2})


if __name__ == "__main__":
    unittest.main()
