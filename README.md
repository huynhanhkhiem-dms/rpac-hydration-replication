# RPAC Hydration Replication Package

Public research artifacts for **Decision-Preserving Capture Contracts for Hydrated Web Systems: Accessibility Semantics, Exhaustive Refinement, and Temporal Validation**.

**Author:** Huynh Anh Khiem  
Faculty of Information Technology, Ton Duc Thang University, Ho Chi Minh City, Vietnam  
ORCID: 0009-0007-7210-174X

## What this repository contains

This repository contains the frozen source frame, study-authored provenance records, 17 discovery micro-reproductions, three post-capture temporal-holdout micro-reproductions, compact reported results, comparator implementations, exhaustive-contract code, capture scripts, and verification scripts.

The discovery frame contains 60 canonical public GitHub issue URLs. The executable benchmark contains 17 source-grounded micro-reproductions from that frozen frame. The temporal holdout contains three later public issue mechanisms whose creation timestamps are strictly after the original discovery browser-capture timestamp (`2026-09-16T14:44:37Z`).

The fixtures are controlled, study-authored mechanism translations. They are **not** full builds of the upstream applications.

## Headline frozen results

- Discovery benchmark: 17 cases, 51 lifecycle contrasts, 20 repetitions per case.
- Full 13-field relation-normalized DOM contract vs. RPAC: **44/51 agreement**, with 7 representation-only alarms and **0 semantic misses**.
- Relation-normalized base DOM with no native-state fields: **43/51 agreement**, with one semantic miss.
- Exhaustive refinement: all **2^13 = 8,192** native-state subsets were evaluated. Exactly 4,096 contracts include `indeterminate` and have zero observed semantic misses; exactly 4,096 omit it and retain one miss.
- Temporal holdout: **9/9** lifecycle contrasts agree between the unchanged full contract and RPAC.
- Combined discovery + holdout under the full contract: **53/60 agreement (88.3%)**, 31 D+/R+, 22 D-/R-, 7 D+/R-, 0 D-/R+.

These are finite-benchmark descriptions, not estimates of ecosystem prevalence. The temporal holdout does not independently validate the `indeterminate`-specific frontier result because none of its three mechanisms is an indeterminate case.

## Files

Core evidence and metadata:

- `SOURCE_FRAME_60_ISSUES.json` - frozen discovery-frame manifest.
- `CASE_PROVENANCE.json` - discovery source URLs, mechanism strata, and fidelity notes.
- `MICROREPRODUCTIONS.json` - 17 discovery pre/hydrated/clean-CSR executable states.
- `CASE_CONTRAST_SUMMARY.csv` and `EMPIRICAL_SUMMARY.json` - compact discovery results.
- `CONTRACT_FRONTIER_SUMMARY.json` - exhaustive 8,192-contract aggregate results.
- `TEMPORAL_HOLDOUT_*` - three-case holdout provenance, fixtures, compact contrast table, and summary.
- `TIMING_SENSITIVITY_SUMMARY.json` - compact 0/20/100 ms sensitivity result.
- `ENVIRONMENT.json` - frozen runtime metadata.

Code:

- `capture_batch.py` - browser capture runner; accepts an optional fixture JSON as the fifth argument.
- `capture_timing_sensitivity.py` - 0/100 ms timing recapture runner.
- `compare_batch.js` - comparator runner.
- `dom_baseline.js` - raw, legacy, relation-normalized, and arbitrary native-state-subset DOM comparators.
- `ax_contract.js` - primary RPAC canonicalization/comparison.
- `ax_sensitivity.js` - independent alternate RPAC matcher.
- `tool_baselines.js` - OpenWC-compatible comparator and archived Playwright-snapshot comparison.
- `contract_frontier.js` - exhaustive 8,192-subset enumerator.
- `generate_outputs.py` - compact discovery outputs.
- `verify_public_package.py` - verifies the committed compact public artifacts.
- `verify_results.py`, `verify_extended_results.py`, `verify_timing_sensitivity.py` - validators used after regenerating the larger artifacts.

## Quick verification of committed public artifacts

```bash
python verify_public_package.py
```

Expected output begins with:

```text
public package verification: PASS
```

## Environment

The frozen discovery capture used:

- Debian GNU/Linux 13 (trixie)
- Chromium 144.0.7559.96
- Python 3.13.5
- Python Playwright 1.57.0
- Node.js 22.16.0
- viewport 1280x720
- locale `en-US`
- main post-load settling window 20 ms

Install Python Playwright with:

```bash
python -m pip install -r requirements.txt
```

Use a compatible Chromium 144 build if exact browser-version replication is required. A deliberately documented later-browser replication is also scientifically useful but should not be described as byte-for-byte reproduction of the frozen run.

## Regenerate discovery artifacts

Capture all 17 discovery fixtures with 20 repetitions:

```bash
python capture_batch.py 0 17 20 RAW_BROWSER_CAPTURES.json MICROREPRODUCTIONS.json
node compare_batch.js RAW_BROWSER_CAPTURES.json COMPARATOR_RESULTS.json
python generate_outputs.py
python verify_results.py
```

Enumerate every native-state contract:

```bash
node contract_frontier.js RAW_BROWSER_CAPTURES.json TEMPORAL_HOLDOUT_CAPTURES.json CONTRACT_FRONTIER_SUMMARY.json CONTRACT_FRONTIER_ALL_8192.csv
```

## Regenerate temporal holdout

```bash
python capture_batch.py 0 3 20 TEMPORAL_HOLDOUT_CAPTURES.json TEMPORAL_HOLDOUT_MICROREPRODUCTIONS.json
node compare_batch.js TEMPORAL_HOLDOUT_CAPTURES.json TEMPORAL_HOLDOUT_RESULTS.json
python verify_extended_results.py
```

`verify_extended_results.py` expects both regenerated discovery and holdout artifacts plus the regenerated frontier summary in the repository root.

## Timing sensitivity

```bash
python capture_timing_sensitivity.py 0 TIMING_SENSITIVITY_RAW_0MS.json
python capture_timing_sensitivity.py 100 TIMING_SENSITIVITY_RAW_100MS.json
node compare_batch.js TIMING_SENSITIVITY_RAW_0MS.json TIMING_SENSITIVITY_RESULTS_0MS.json
node compare_batch.js TIMING_SENSITIVITY_RAW_100MS.json TIMING_SENSITIVITY_RESULTS_100MS.json
python verify_timing_sensitivity.py
```

The archived study found identical discovery decisions at 0, 20, and 100 ms for the reported D, D_legacy, OpenWC-compatible, RPAC-primary, and RPAC-alternate decisions. This is benchmark-specific and is not a general timing guarantee.

## Large generated artifacts and journal supplement

Large generated files are intentionally not committed to the public Git repository to keep the repository reviewable. They are reproducible from the committed fixtures and scripts. The complete frozen submission supplement also preserves the original raw browser captures and generated outputs, including:

- `RAW_BROWSER_CAPTURES.json`
- `COMPARATOR_RESULTS.json`
- `CONTRACT_FRONTIER_ALL_8192.csv`
- `TEMPORAL_HOLDOUT_CAPTURES.json`
- `TEMPORAL_HOLDOUT_RESULTS.json`
- the 0 ms and 100 ms raw timing-sensitivity captures/results

The manuscript identifies that complete archive as Supplementary Material 1.

## Interpretation boundary

The 17 discovery cases and three temporal-holdout cases are purposively mechanism-selected. Counts in this repository describe these finite benchmark sets. Three discovery cases are marked abstraction-heavy in `CASE_PROVENANCE.json`. The holdout was constructed after the later issue reports were read and with knowledge of the comparator definitions; it is not a preregistered blind external replication. Full upstream builds, prospectively frozen external source selection, and cross-browser/platform replication remain external-validation targets.

## Licensing and third-party material

Study code is licensed under the MIT License (`LICENSE`). Study-generated data/annotations are released under CC BY 4.0 as described in `DATA_LICENSE.md`. The CC BY 4.0 statement does not relicense linked third-party GitHub issues or upstream project materials. See `THIRD_PARTY_NOTICE.md`.
