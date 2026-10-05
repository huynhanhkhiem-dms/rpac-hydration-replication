#!/usr/bin/env python3
import json, pathlib, collections, csv, sys
P=pathlib.Path(__file__).parent
r=json.load(open(P/'COMPARATOR_RESULTS.json',encoding='utf-8'))
s=json.load(open(P/'EMPIRICAL_SUMMARY.json',encoding='utf-8'))
assert len(r['cases'])==17
assert r.get('runs_per_case')==20
expected_props=['value','checked','indeterminate','selected','disabled','readOnly','required','multiple','open','tabIndex','contentEditable','selectedIndex','inert']
assert r.get('native_state_properties')==expected_props
cons=['pre_vs_csr','hyd_vs_csr','pre_vs_hyd']
primary_expected={
 'pre_vs_csr':{'D-/R-':2,'D+/R+':12,'D+/R-':3},
 'hyd_vs_csr':{'D-/R-':8,'D+/R+':8,'D+/R-':1},
 'pre_vs_hyd':{'D-/R-':9,'D+/R+':5,'D+/R-':3},
}
all_pairs=[]; baseline={k:[] for k in ['Draw','OpenWC','D_legacy','D','PlaywrightARIA']}
for c in r['cases']:
    assert len(c['runs'])==20
    for con in cons:
        fields=['D','D_legacy','Draw','OpenWC','PlaywrightARIA','R','R_alt','R_consensus']
        for field in fields:
            vals=[run[con][field] for run in c['runs']]
            assert len(set(vals))==1,(c['id'],con,field,set(vals))
        for run in c['runs']:
            assert run[con]['R_consensus'] is True,(c['id'],con,run['run'])
        z=c['runs'][0][con]
        all_pairs.append((z['D'],z['R']))
        for k in baseline: baseline[k].append((z[k],z['R']))
for con in cons:
    cells=collections.Counter()
    for c in r['cases']:
        z=c['runs'][0][con]
        cell=('D+' if z['D'] else 'D-')+'/R'+('+' if z['R'] else '-')
        cells[cell]+=1
    assert dict(cells)==primary_expected[con],(con,cells)
assert len(all_pairs)==51
assert sum(a==b for a,b in all_pairs)==44
assert sum(a and not b for a,b in all_pairs)==7
assert sum((not a) and b for a,b in all_pairs)==0
expected_baselines={
 'Draw':(40,11,0),
 'OpenWC':(39,11,1),
 'D_legacy':(43,7,1),
 'D':(44,7,0),
 'PlaywrightARIA':(43,0,8),
}
for k,pairs in baseline.items():
    triple=(sum(a==b for a,b in pairs),sum(a and not b for a,b in pairs),sum((not a) and b for a,b in pairs))
    assert triple==expected_baselines[k],(k,triple)
assert s['captured_browser_states']==1020 and s['dual_matcher_consensus_pairwise']==1020
rows=list(csv.DictReader(open(P/'CASE_CONTRAST_SUMMARY.csv',encoding='utf-8')))
assert len(rows)==51
print('PASS')
print('17 cases x 20 repetitions x 3 checkpoints = 1,020 captured browser states.')
print('51/51 reported case-contrast decisions are stable across 20 repetitions for the archived 20 ms capture set.')
print('1,020/1,020 run-level RPAC matcher decisions agree between the two implementations.')
print('Relation-normalized 13-field native-state D_rel vs RPAC: 44/51 agreement; 7 D+/R-; 0 D-/R+.')
print('Legacy D_rel: 43/51; 7 D+/R-; 1 D-/R+. OpenWC-compatible: 39/51; 11 D+/R-; 1 D-/R+. Archived Playwright Python 1.57.0 snapshot baseline: 43/51; 0 D+/R-; 8 D-/R+ (version-specific auxiliary result, not a current-tool claim).')
