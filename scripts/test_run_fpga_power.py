"""Check rejection of stale inputs and mismatched reopened FPGA reports."""

import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from audit_fpga_context import digest
from run_fpga_power import REVIEW, ROOT, validate_audit, verify_reopened


class PowerInputTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(dir=ROOT / "tmp")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        synth = self.root / "build/fpga/baseline/post_synth.dcp"
        route = self.root / "build/fpga/implementation/baseline/post_route.dcp"
        for path in (synth, route):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"TEST FIXTURE, NOT A VIVADO CHECKPOINT: " + path.name.encode())
        self.audit = {
            "generator_sha256": digest(ROOT / "scripts/audit_fpga_context.py"),
            "review_manifest_sha256": digest(REVIEW / "review_manifest.json"),
            "checkpoint_audit_status": "inputs_matched_routes_fingerprinted",
            "runs": {"baseline": {
                "part": "xc7a35tcsg324-1", "clock_period_ns": 20.0,
                "synthesis_checkpoint": {"path": str(synth), "status": "matched",
                                         "sha256": digest(synth), "expected_sha256": digest(synth)},
                "routed_checkpoint": {"path": str(route), "status": "fingerprinted_only", "sha256": digest(route)},
            }}}

    def test_unchanged_audited_inputs_are_selected(self):
        selected = validate_audit(self.audit, self.root, REVIEW, ("baseline",))
        self.assertEqual(selected["baseline"].name, "post_route.dcp")

    def test_changed_routed_file_is_rejected(self):
        Path(self.audit["runs"]["baseline"]["routed_checkpoint"]["path"]).write_bytes(b"changed")
        with self.assertRaisesRegex(ValueError, "changed or missing"):
            validate_audit(self.audit, self.root, REVIEW, ("baseline",))

    def test_audit_of_other_evidence_is_rejected(self):
        self.audit["review_manifest_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "different reviewed evidence"):
            validate_audit(self.audit, self.root, REVIEW, ("baseline",))

    def test_other_checkpoint_path_is_rejected(self):
        self.audit["runs"]["baseline"]["routed_checkpoint"]["path"] = str(self.root / "other.dcp")
        with self.assertRaisesRegex(ValueError, "status/path"):
            validate_audit(self.audit, self.root, REVIEW, ("baseline",))

    def test_report_crosscheck_requires_the_recorded_variant(self):
        directory = self.root / "reports"
        directory.mkdir()
        for name in ("utilization.rpt", "route_status.rpt", "timing_summary.rpt"):
            shutil.copyfile(REVIEW / "baseline" / name, directory / ("reopened_" + name))
        data = json.loads((REVIEW / "implementation_results.json").read_text())
        self.assertEqual(verify_reopened(directory, data["runs"]["baseline"])["resources"], "matched")
        with self.assertRaisesRegex(ValueError, "resource counts differ"):
            verify_reopened(directory, data["runs"]["extended"])
        wrong_timing = copy.deepcopy(data["runs"]["baseline"])
        wrong_timing["timing"]["wns_ns"] += 0.1
        with self.assertRaisesRegex(ValueError, "timing differs"):
            verify_reopened(directory, wrong_timing)


if __name__ == "__main__":
    unittest.main()
