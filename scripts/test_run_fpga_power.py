"""Check rejection of stale inputs and mismatched reopened FPGA reports."""

import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from audit_fpga_context import digest
from run_fpga_power import (REVIEW, ROOT, expected_input_activity, validate_audit,
                            verify_input_activity, verify_reopened)


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
        self.write_identity(directory, "cve2_fpga_top")
        data = json.loads((REVIEW / "implementation_results.json").read_text())
        self.assertEqual(verify_reopened(directory, data["runs"]["baseline"])["resources"], "matched")
        with self.assertRaisesRegex(ValueError, "resource counts differ"):
            verify_reopened(directory, data["runs"]["extended"])
        wrong_timing = copy.deepcopy(data["runs"]["baseline"])
        wrong_timing["timing"]["wns_ns"] += 0.1
        with self.assertRaisesRegex(ValueError, "timing differs"):
            verify_reopened(directory, wrong_timing)

    @staticmethod
    def write_identity(directory, session_design):
        (directory / "checkpoint_identity.txt").write_text(
            "session_design: " + session_design + "\npart: xc7a35tcsg324-1\n"
            "u_core_ref_name: cve2_top\nu_cve2_core_ref_name: cve2_core\nclock_period_ns: 20.0\n")

    def test_reopened_session_alias_preserves_metric_checks(self):
        directory = self.root / "renamed_reports"
        directory.mkdir()
        for name in ("utilization.rpt", "route_status.rpt", "timing_summary.rpt"):
            text = (REVIEW / "baseline" / name).read_text().replace("cve2_fpga_top", "post_route")
            (directory / ("reopened_" + name)).write_text(text)
        self.write_identity(directory, "post_route")
        data = json.loads((REVIEW / "implementation_results.json").read_text())
        self.assertEqual(verify_reopened(directory, data["runs"]["baseline"])["session_design"], "post_route")
        with self.assertRaisesRegex(ValueError, "resource counts differ"):
            verify_reopened(directory, data["runs"]["extended"])
        self.write_identity(directory, "other_session")
        with self.assertRaisesRegex(ValueError, "differs from session identity"):
            verify_reopened(directory, data["runs"]["baseline"])

    @unittest.skipUnless(shutil.which("tclsh"), "Tcl interpreter unavailable")
    def test_tcl_identity_guard_uses_hierarchy_and_part_not_session_name(self):
        checkpoint = self.root / "build/fpga/implementation/baseline/post_route.dcp"
        # Stop at the first report: this exercises the guard, not vendor power analysis.
        harness = r'''
set argc 2
set argv [list [lindex $argv 1] [lindex $argv 2]]
set test_part $::env(TEST_PART)
set test_ref $::env(TEST_REF)
proc version {args} { return "2024.2" }
proc open_checkpoint {args} {}
proc current_project {} { return "checkpoint_project" }
proc current_design {} { return "post_route" }
proc get_cells {args} { return [lindex $args end] }
proc get_clocks {args} { return "core_clk" }
proc get_property {name object} {
    switch $name {
        PART { return $::test_part }
        REF_NAME {
            if {$object eq "u_core"} { return $::test_ref }
            return "cve2_core"
        }
        PERIOD { return 20.0 }
        default { error "Unexpected stub property" }
    }
}
proc set_param {args} {}
proc report_utilization {args} { error "TEST_ONLY_IDENTITY_GUARD_PASSED" }
if {[catch {source $::env(POWER_DRIVER)} result]} { puts $result; exit 0 }
error "Harness failed to stop"
'''
        harness_path = self.root / "guard.tcl"
        harness_path.write_text(harness)
        environment = dict(os.environ, POWER_DRIVER=str(ROOT / "fpga/power.tcl"))
        for part, ref, message in (("xc7a35tcsg324-1", "cve2_top", "TEST_ONLY_IDENTITY_GUARD_PASSED"),
                                   ("wrong-part", "cve2_top", "Unexpected checkpoint part:"),
                                   ("xc7a35tcsg324-1", "wrong_core", "Unexpected module at u_core:")):
            environment.update(TEST_PART=part, TEST_REF=ref)
            result = subprocess.run([shutil.which("tclsh"), str(harness_path), "unused", str(checkpoint), str(self.root)],
                                    env=environment, text=True, capture_output=True, check=True)
            self.assertIn(message, result.stdout)

    def write_activity_fixture(self):
        expected = expected_input_activity()
        rows = ["port\tnet\tstatic_probability\tsignal_rate_mtr_s"]
        activity = []
        for index, (port, (probability, rate)) in enumerate(expected.items()):
            net = "fixture_net_" + str(index)
            rows.append(f"{port}\t{net}\t{probability}\t{rate}")
            activity.append(f"{net}:  static probability = {probability} (A)  signal rate = {rate} (A)")
        (self.root / "input_bindings.tsv").write_text("\n".join(rows) + "\n")
        for name in ("input_activity.rpt", "input_activity_after.rpt"):
            (self.root / name).write_text("\n".join(activity) + "\n")

    def test_activity_requires_complete_explicit_readback_before_and_after(self):
        self.write_activity_fixture()
        self.assertEqual(verify_input_activity(self.root)["verified_input_bits"], 93)
        path = self.root / "input_activity_after.rpt"
        path.write_text(path.read_text().replace("(A)", "(D)", 1))
        with self.assertRaisesRegex(ValueError, "not explicitly assigned"):
            verify_input_activity(self.root)

    def test_blank_or_changed_activity_cannot_pass(self):
        self.write_activity_fixture()
        path = self.root / "input_activity.rpt"
        original = path.read_text()
        path.write_text("\n")
        with self.assertRaisesRegex(ValueError, "Incomplete net activity"):
            verify_input_activity(self.root)
        path.write_text(original.replace("static probability = 1.0", "static probability = 0.5", 1))
        with self.assertRaisesRegex(ValueError, "Input activity differs"):
            verify_input_activity(self.root)

    @unittest.skipUnless(shutil.which("tclsh"), "Tcl interpreter unavailable")
    def test_tcl_readback_rejects_ignored_annotations(self):
        harness = r'''
set argc 0
catch {source $::env(POWER_DRIVER)}
proc get_nets {args} {
    if {$::env(TEST_MODE) eq "disconnected"} { return {} }
    return {fixture_net}
}
proc set_switching_activity {args} {}
proc report_switching_activity {args} {
    switch $::env(TEST_MODE) {
        matched { return {fixture_net: static probability = 1 (A) signal rate = 0 (A)} }
        defaulted { return {fixture_net: static probability = 1 (D) signal rate = 0 (D)} }
        changed { return {fixture_net: static probability = 0.5 (A) signal rate = 6.25 (A)} }
        blank { return {} }
    }
}
if {[catch {checked_input_activity rst_ni 1 0} result]} { puts "REJECTED: $result" } else { puts "MATCHED" }
'''
        path = self.root / "activity_guard.tcl"
        path.write_text(harness)
        for mode in ("matched", "defaulted", "changed", "blank", "disconnected"):
            environment = dict(os.environ, POWER_DRIVER=str(ROOT / "fpga/power.tcl"), TEST_MODE=mode)
            result = subprocess.run([shutil.which("tclsh"), str(path)], env=environment,
                                    text=True, capture_output=True, check=True)
            self.assertIn("MATCHED" if mode == "matched" else "REJECTED:", result.stdout)


if __name__ == "__main__":
    unittest.main()
