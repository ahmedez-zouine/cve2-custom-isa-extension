"""Checks for checkpoint verification and recovery of the correct Vivado run."""

import copy
from datetime import datetime, timedelta
import hashlib
from pathlib import Path
import tempfile
import unittest

from audit_fpga_context import ROOT, checkpoint_info, inspect_log
from summarize_fpga_implementation import fields


class ContextAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = ROOT / "output/fpga/implementation"
        cls.identity = fields((cls.folder / "baseline/implementation_info.txt").read_text())

    def test_actual_completed_baseline_log_matches(self):
        result = inspect_log(self.folder / "baseline/vivado.log", self.identity)
        self.assertTrue(result["matches_recorded_run"], result["rejection_reasons"])
        self.assertGreater(result["warning_counts"]["Route 35-198"], 0)

    def test_refused_retry_cannot_be_recovered_as_completion(self):
        identity = fields((self.folder / "extended/implementation_info.txt").read_text())
        self.assertFalse(inspect_log(self.folder / "extended/vivado.log", identity)["matches_recorded_run"])

    def test_other_variant_is_rejected(self):
        identity = copy.deepcopy(self.identity)
        identity["variant"] = "extended"
        self.assertFalse(inspect_log(self.folder / "baseline/vivado.log", identity)["matches_recorded_run"])

    def test_other_run_time_is_rejected(self):
        identity = copy.deepcopy(self.identity)
        for key in ("started_utc", "finished_utc"):
            identity[key] = (datetime.fromisoformat(identity[key].replace("Z", "+00:00")) + timedelta(hours=1)).isoformat()
        self.assertFalse(inspect_log(self.folder / "baseline/vivado.log", identity)["matches_recorded_run"])

    def test_quoted_completion_is_not_a_completion_record(self):
        text = (self.folder / "baseline/vivado.log").read_text()
        text = text.replace("\nImplementation reports written to ", '\nputs "Implementation reports written to ')
        with tempfile.TemporaryDirectory(dir=ROOT / "tmp") as temporary:
            log = Path(temporary) / "quoted.log"
            log.write_text(text)
            self.assertFalse(inspect_log(log, self.identity)["matches_recorded_run"])

    def test_checkpoint_status_distinguishes_unknown_and_mismatch(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "tmp") as temporary:
            path = Path(temporary) / "fixture.dcp"
            self.assertEqual(checkpoint_info(path, "0" * 64)["status"], "unavailable")
            content = b"TEST FIXTURE, NOT A VIVADO CHECKPOINT\n"
            path.write_bytes(content)
            expected = hashlib.sha256(content).hexdigest()
            self.assertEqual(checkpoint_info(path, expected)["status"], "matched")
            self.assertEqual(checkpoint_info(path, "0" * 64)["status"], "mismatch")
            self.assertEqual(checkpoint_info(path)["status"], "fingerprinted_only")


if __name__ == "__main__":
    unittest.main()
