#!/usr/bin/env python3
import json,csv, pathlib, sys
P=pathlib.Path(__file__).parent
raw=json.load(open(P/'RAW_BROWSER_CAPTURES.json',encoding='utf-8'))
h=json.load(open(P/'TEMPORAL_HOLDOUT_RESULTS.json',encoding='utf-8'))
f=json.load(open(P/'CONTRACT_FRONTIER_SUMMARY.json',encoding='utf-8'))
assert raw['created_utc']=='2026-09-16T14:44:37Z'
assert len(raw['cases'])==17 and raw['runs_per_case']==20
assert len(h['cases'])==3 and h['runs_per_case']==20
for c in h['cases']:
    assert c['issue_created_utc'] > raw['created_utc'], (c['id'],c['issue_created_utc'])
    assert len(c['runs'])==20
    for run in c['runs']:
        for key in ('pre_vs_csr','hyd_vs_csr','pre_vs_hyd'):
            assert run[key]['D']==run[key]['R']==run[key]['R_alt'], (c['id'],run['run'],key)
assert f['contracts_enumerated']==8192
x=f['exhaustive_frontier']
assert x['zero_false_negative_contracts']==4096
assert x['contracts_with_false_negative']==4096
assert x['properties_present_in_every_zero_false_negative_contract']==['indeterminate']
assert x['minimal_lexicographic_optimum']['properties']==['indeterminate']
assert (x['minimal_lexicographic_optimum']['TP'],x['minimal_lexicographic_optimum']['TN'],x['minimal_lexicographic_optimum']['FP'],x['minimal_lexicographic_optimum']['FN'])==(25,19,7,0)
assert (x['relation_normalized_base_no_native_properties']['TP'],x['relation_normalized_base_no_native_properties']['TN'],x['relation_normalized_base_no_native_properties']['FP'],x['relation_normalized_base_no_native_properties']['FN'])==(24,19,7,1)
assert x['holdout_full_13_field']['agreement']==1
assert (x['full_13_field_combined_20_case_60_contrast']['TP'],x['full_13_field_combined_20_case_60_contrast']['TN'],x['full_13_field_combined_20_case_60_contrast']['FP'],x['full_13_field_combined_20_case_60_contrast']['FN'])==(31,22,7,0)
print('extended verification: PASS')
