#!/usr/bin/env python3
"""Review archived power provenance, values and explicit input activity evidence."""

import argparse
from collections import Counter
import json
from pathlib import Path
import re
import subprocess

from audit_fpga_context import digest, reviewed_data
from run_fpga_power import REVIEW, verify_input_activity, verify_reopened
from summarize_fpga_implementation import ROOT, VARIANTS, require, sha256


def table_value(text, label):
    rows = re.findall(r"^\|\s*" + re.escape(label) + r"\s*\|\s*([^|]+)\|", text, re.MULTILINE)
    require(len(rows) == 1, "Missing or repeated power field: " + label)
    return rows[0].strip()


def review(directory):
    implementation = reviewed_data(REVIEW)
    audit_path = ROOT / "output/fpga/context_audit/ubuntu/audit.json"
    audit = json.loads(audit_path.read_text())
    require(audit["generator_sha256"] == digest(ROOT / "scripts/audit_fpga_context.py"), "Audit generator differs")
    require(audit["review_manifest_sha256"] == digest(REVIEW / "review_manifest.json"), "Audit review identity differs")
    require(audit["checkpoint_audit_status"] == "inputs_matched_routes_fingerprinted", "Incomplete Ubuntu audit")
    inputs = {str(audit_path.relative_to(ROOT)): digest(audit_path)}
    for variant in VARIANTS:
        for recovered in audit["runs"][variant]["matched_completed_logs"]:
            path = audit_path.parent / recovered["copy"]
            require(digest(path) == recovered["sha256"], "Recovered log changed")
            inputs[str(path.relative_to(ROOT))] = digest(path)
    result = {"schema_version": 1, "scope": "Archived routed OOC vectorless estimates; values rounded to 0.001 W",
              "runs": {}, "implementation_review_manifest_sha256": digest(REVIEW / "review_manifest.json")}
    assumptions = []
    for variant in VARIANTS:
        folder = directory / variant
        receipt = json.loads((folder / "power_run.json").read_text())
        require(receipt["variant"] == variant and receipt["status"] == "reports_generated_pending_power_review",
                "Power run did not complete: " + variant)
        for name, expected in receipt["artifact_sha256"].items():
            require(digest(folder / name) == expected, "Archived artifact changed: " + variant + "/" + name)
            inputs[str((folder / name).relative_to(ROOT))] = expected
        inputs[str((folder / "power_run.json").relative_to(ROOT))] = digest(folder / "power_run.json")
        for kind, path in (("driver", "fpga/power.tcl"), ("runner", "scripts/run_fpga_power.py")):
            recorded = subprocess.check_output(["git", "show", receipt["revision"] + ":" + path], cwd=ROOT)
            require(sha256(recorded) == receipt[kind + "_sha256"], "Recorded power source differs: " + kind)
        require(receipt["audit_sha256"] == digest(audit_path) == digest(folder / "context_audit.json"), "Audit copy differs")
        require((folder / "implementation_review_manifest.json").read_bytes() == (REVIEW / "review_manifest.json").read_bytes(),
                "Implementation review copy differs")
        audit_run = audit["runs"][variant]
        require(audit_run["synthesis_checkpoint"]["sha256"] == audit_run["synthesis_checkpoint"]["expected_sha256"] ==
                implementation["runs"][variant]["identity"]["checkpoint_sha256"], "Synthesis identity differs")
        require(receipt["checkpoint_sha256"] == audit_run["routed_checkpoint"]["sha256"], "Routed fingerprint differs")
        reopened = verify_reopened(folder, implementation["runs"][variant])
        report = (folder / "power.rpt").read_text()
        log = (folder / "vivado.log").read_text()
        require(re.search(r"^report_power completed successfully\s*$", log, re.MULTILINE), "Power completion missing")
        require(not re.search(r"^(ERROR:|CRITICAL WARNING:)", log, re.MULTILINE), "Power run contains an error or critical warning")
        warnings = dict(Counter(re.findall(r"^WARNING: \[([^\]]+)\]", log, re.MULTILINE)))
        power = {key: float(table_value(report, label)) for key, label in (
            ("total_w", "Total On-Chip Power (W)"), ("dynamic_w", "Dynamic (W)"), ("device_static_w", "Device Static (W)"))}
        require(abs(power["total_w"] - power["dynamic_w"] - power["device_static_w"]) <= 0.002, "Inconsistent rounded power totals")
        advisory = report.rsplit("\n4. Advisory\n", 1)[1]
        issues = []
        try:
            activity = verify_input_activity(folder)
        except OSError as error:
            activity = {"verified": False, "reason": "Missing or unreadable input activity evidence: " + Path(error.filename).name}
            issues.append("Explicit input activity readback is incomplete or inconsistent")
        except (ValueError, KeyError) as error:
            activity = {"verified": False, "reason": str(error)}
            issues.append("Explicit input activity readback is incomplete or inconsistent")
        if warnings.get("Power 33-294"):
            issues.append("Port-connectivity warnings occur while applying activity; intended overrides are unverified")
        conditions = (folder / "operating_conditions.rpt").read_text()
        environment = dict(re.findall(r"^([^=\n]+?)\s*=\s*([^\n]+)$", conditions, re.MULTILINE))
        assumptions.append(receipt["assumptions"])
        result["runs"][variant] = {
            "estimated_power": power, "confidence": table_value(report.rsplit("\n1.1 On-Chip Components\n", 1)[0], "Confidence Level"),
            "junction_temperature_c": float(table_value(report, "Junction Temperature (C)")),
            "power_report_ambient_temperature_c": float(table_value(report, "Ambient Temp (C)")),
            "operating_conditions": environment, "reported_input_confidence": table_value(report, "I/O nodes activity"),
            "reported_internal_confidence": table_value(report, "Internal nodes activity"),
            "advisory_rows": dict(Counter(re.findall(r"^\| (Low|Medium|High)\s*\|", advisory, re.MULTILINE))),
            "logged_warnings": warnings, "warning_limit_reached": "further instances of the messages will be disabled" in log,
            "input_activity_report_blank": not (folder / "input_activity.rpt").read_text().strip(),
            "input_activity_crosscheck": activity, "reopened_report_crosscheck": reopened,
            "routed_checkpoint_sha256": receipt["checkpoint_sha256"], "review_issues": issues}
    require(assumptions[0] == assumptions[1], "Declared power assumptions differ between variants")
    result["declared_assumptions"] = assumptions[0]
    result["accepted_for_controlled_power_comparison"] = not any(run["review_issues"] for run in result["runs"].values())
    result["review_status"] = "input_activity_recheck_required" if not result["accepted_for_controlled_power_comparison"] else "activity_checked_vectorless_estimates"
    result["limitations"] = ["Generic vectorless activity, not a benchmark trace or measured board power",
                              "Both original timing summaries fail at the assumed 50 MHz",
                              "External clock and physical interface context remain incomplete",
                              "Medium internal-activity confidence and reported control advisories require qualification",
                              "Fixed junction temperature takes precedence; ambient is a tool-derived result",
                              "No high-precision component subtraction or energy-per-instruction claim"]
    return result, inputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report-dir", type=Path, default=ROOT / "output/fpga/power")
    args = parser.parse_args()
    result, inputs = review(args.report_dir.resolve())
    output = args.report_dir / "archive_review.json"
    output.write_text(json.dumps(result, indent=2) + "\n")
    manifest = {"generator": str(Path(__file__).relative_to(ROOT)), "generator_sha256": digest(Path(__file__)),
                "source_file_sha256": inputs, "archive_review_sha256": digest(output)}
    (args.report_dir / "archive_review_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("Review status: " + result["review_status"])
    for variant, run in result["runs"].items():
        print(variant + ": " + str(run["estimated_power"]) + "; " + run["confidence"] + " confidence")
        for issue in run["review_issues"]:
            print("  " + issue)


if __name__ == "__main__":
    main()
