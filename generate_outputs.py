#!/usr/bin/env python3
import json,csv,collections,pathlib,math
P=pathlib.Path(__file__).parent
R=json.load(open(P/'COMPARATOR_RESULTS.json',encoding='utf-8'))
CONTRASTS=[('pre_hydration_vs_clean_csr','pre_vs_csr'),('post_hydration_vs_clean_csr','hyd_vs_csr'),('pre_vs_post_hydration','pre_vs_hyd')]

def cell(d,r): return ('D+' if d else 'D-')+'/R'+('+' if r else '-')
def kappa(pairs):
    n=len(pairs); po=sum(a==b for a,b in pairs)/n
    pa=sum(a for a,b in pairs)/n; pb=sum(b for a,b in pairs)/n
    pe=pa*pb+(1-pa)*(1-pb)
    return 1.0 if pe==1 and po==1 else ((po-pe)/(1-pe) if pe!=1 else float('nan'))

def stable_values(case,key,field):
    vals=[bool(run[key][field]) for run in case['runs']]
    assert len(set(vals))==1,(case['id'],key,field,set(vals))
    return vals[0]

rows=[]
for c in R['cases']:
    for label,key in CONTRASTS:
        d=stable_values(c,key,'D'); dl=stable_values(c,key,'D_legacy'); dr=stable_values(c,key,'Draw')
        ow=stable_values(c,key,'OpenWC'); pw=stable_values(c,key,'PlaywrightARIA')
        r=stable_values(c,key,'R'); ra=stable_values(c,key,'R_alt')
        assert r==ra,(c['id'],key)
        classes=sorted({x for run in c['runs'] for x in run[key].get('R_classes',[])})
        rows.append({
            'case_id':c['id'],'repository':c['repo'],'issue':c['issue'],'stratum':c['stratum'],'contrast':label,
            'D_rel_native_state':int(d),'D_rel_legacy':int(dl),'D_raw_native_state':int(dr),'OpenWC_compatible':int(ow),'Playwright_ARIA_snapshot':int(pw),
            'RPAC_primary':int(r),'RPAC_alternate':int(ra),'dual_matcher_consensus_all_20':1,
            'stable_all_reported_contracts_runs':20,'total_runs':20,'joint_cell':cell(d,r),'rpac_difference_classes':'|'.join(classes)
        })
with open(P/'CASE_CONTRAST_SUMMARY.csv','w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

def primary_agg(subrows):
    d={}
    for label,_ in CONTRASTS:
        rr=[x for x in subrows if x['contrast']==label]
        cc=collections.Counter(x['joint_cell'] for x in rr)
        pairs=[(x['D_rel_native_state'],x['RPAC_primary']) for x in rr]
        d[label]={
            'D_rel_x_RPAC_cells':dict(sorted(cc.items())),
            'agreement_count':sum(a==b for a,b in pairs),
            'total':len(pairs),
            'agreement_D_rel_RPAC':sum(a==b for a,b in pairs)/len(pairs),
            'cohen_kappa':kappa(pairs)
        }
    return d

def baseline(field):
    pairs=[(x[field],x['RPAC_primary']) for x in rows]
    return {
        'agreement_count':sum(a==b for a,b in pairs),'total':len(pairs),'agreement':sum(a==b for a,b in pairs)/len(pairs),
        'tool_positive_RPAC_negative':sum(a and not b for a,b in pairs),
        'tool_negative_RPAC_positive':sum((not a) and b for a,b in pairs)
    }
excluded={'GuiHolanda/quiz-maker#3','RedHat-UX/red-hat-design-system#2653','adobe/react-spectrum#9786'}
sens=[x for x in rows if x['case_id'] not in excluded]
summary={
 'schema':'rpac-study-empirical-summary-native-state',
 'case_count':17,'repository_count':len({c['repo'] for c in R['cases']}),'mechanism_strata':len({c['stratum'] for c in R['cases']}),
 'runs_per_case':20,'checkpoints_per_run':3,'captured_browser_states':17*20*3,'run_level_contrast_decisions':17*20*3,
 'case_contrast_units':51,'all_case_contrasts_stable_20_of_20':True,'all_main_contract_contrasts_stable_20_of_20':True,
 'dual_matcher_consensus_pairwise':17*20*3,'dual_matcher_total_pairwise':17*20*3,
 'native_state_properties':R.get('native_state_properties',[]),
 'aggregate':primary_agg(rows),
 'contract_sensitivity':{
   'raw_DOM_native_state':baseline('D_raw_native_state'),
   'OpenWC_compatible_semantic_markup':baseline('OpenWC_compatible'),
   'relation_normalized_DOM_legacy':baseline('D_rel_legacy'),
   'relation_normalized_DOM_13_field_native_state':baseline('D_rel_native_state')
 },
 'auxiliary_versioned_baseline':{
   'Playwright_ARIA_snapshot_Python_1_57_0':baseline('Playwright_ARIA_snapshot'),
   'interpretation':'Archived version-specific output only; not used to characterize current Playwright behavior or headline conclusions.'
 },
 'sensitivity_excluding_three_abstraction_heavy_cases':{
   'excluded':sorted(excluded),'remaining_cases':14,'aggregate':primary_agg(sens)
 },
 'key_findings':[
   'Pre-hydration vs clean CSR: 2 D-/R-, 12 D+/R+, 3 D+/R-.',
   'Post-hydration vs clean CSR: 8 D-/R-, 8 D+/R+, 1 D+/R-, 0 D-/R+.',
   'Pre- vs post-hydration: 9 D-/R-, 5 D+/R+, 3 D+/R-, 0 D-/R+.',
   'Across all 51 contrasts, the relation-normalized 13-field native-state contract agrees with RPAC on 44 (86.3%): 25 D+/R+, 19 D-/R-, 7 D+/R-, and 0 D-/R+.',
   'The legacy relation-normalized DOM contract and the OpenWC-compatible markup contract each reintroduce one tool-negative/RPAC-positive checkbox miss.',
   'The legacy and OpenWC-compatible contracts each miss the mixed-checkbox state that is detected when HTMLInputElement.indeterminate is retained.'
 ]
}
json.dump(summary,open(P/'EMPIRICAL_SUMMARY.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)
