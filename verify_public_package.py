#!/usr/bin/env python3
import csv,json,pathlib
P=pathlib.Path(__file__).parent
frame=json.load(open(P/'SOURCE_FRAME_60_ISSUES.json',encoding='utf-8'))
prov=json.load(open(P/'CASE_PROVENANCE.json',encoding='utf-8'))
micro=json.load(open(P/'MICROREPRODUCTIONS.json',encoding='utf-8'))
emp=json.load(open(P/'EMPIRICAL_SUMMARY.json',encoding='utf-8'))
front=json.load(open(P/'CONTRACT_FRONTIER_SUMMARY.json',encoding='utf-8'))
hprov=json.load(open(P/'TEMPORAL_HOLDOUT_PROVENANCE.json',encoding='utf-8'))
hsum=json.load(open(P/'TEMPORAL_HOLDOUT_SUMMARY.json',encoding='utf-8'))
rows=list(csv.DictReader(open(P/'CASE_CONTRAST_SUMMARY.csv',encoding='utf-8')))
hrows=list(csv.DictReader(open(P/'TEMPORAL_HOLDOUT_CASE_CONTRAST_SUMMARY.csv',encoding='utf-8')))
assert frame['unique_issue_count']==60
assert len(prov['cases'])==17 and len(micro)==17 and len(rows)==51
assert emp['captured_browser_states']==1020
assert front['contracts_enumerated']==8192
x=front['exhaustive_frontier']
assert x['zero_false_negative_contracts']==4096 and x['contracts_with_false_negative']==4096
assert x['properties_present_in_every_zero_false_negative_contract']==['indeterminate']
assert x['minimal_lexicographic_optimum']['properties']==['indeterminate']
assert len(hprov['cases'])==3 and len(hrows)==9 and hsum['aggregate']['agreement_count']==9
assert all(c['issue_created_utc']>hprov['original_discovery_capture_created_utc'] for c in hprov['cases'])
assert (x['full_13_field_combined_20_case_60_contrast']['TP'],x['full_13_field_combined_20_case_60_contrast']['TN'],x['full_13_field_combined_20_case_60_contrast']['FP'],x['full_13_field_combined_20_case_60_contrast']['FN'])==(31,22,7,0)
print('public package verification: PASS')
print('60-source frame; 17 discovery cases / 51 contrasts; 3 temporal-holdout cases / 9 contrasts.')
print('8,192 contracts enumerated; 4,096/4,096 indeterminate split; combined full-contract agreement 53/60.')
