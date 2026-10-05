#!/usr/bin/env python3
import json, pathlib
P=pathlib.Path(__file__).parent
base=json.load(open(P/'COMPARATOR_RESULTS.json',encoding='utf-8'))
zero=json.load(open(P/'TIMING_SENSITIVITY_RESULTS_0MS.json',encoding='utf-8'))
hundred=json.load(open(P/'TIMING_SENSITIVITY_RESULTS_100MS.json',encoding='utf-8'))
cons=['pre_vs_csr','hyd_vs_csr','pre_vs_hyd']
fields=['D','D_legacy','OpenWC','R','R_alt']
for alt,label in [(zero,'0 ms'),(hundred,'100 ms')]:
    assert len(alt['cases'])==17
    for b,a in zip(base['cases'],alt['cases']):
        assert b['id']==a['id']
        for con in cons:
            for field in fields:
                assert b['runs'][0][con][field] == a['runs'][0][con][field], (label,b['id'],con,field)
print('PASS')
print('0 ms, 20 ms, and 100 ms produce identical decisions for all 51 contrasts under D, D_legacy, OpenWC, R, and R_alt.')
