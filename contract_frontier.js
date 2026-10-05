#!/usr/bin/env node
const fs=require('fs');
const {compareDomProjectionRelationNormalizedWithProps,PROP_NAMES}=require('./dom_baseline');
const {canonicalizeAX,compareCanonicalTrees}=require('./ax_contract');
const {compareBySemanticPathMultiset}=require('./ax_sensitivity');

const discovery=JSON.parse(fs.readFileSync(process.argv[2]||'RAW_BROWSER_CAPTURES.json','utf8'));
const holdout=JSON.parse(fs.readFileSync(process.argv[3]||'TEMPORAL_HOLDOUT_CAPTURES.json','utf8'));
const outJson=process.argv[4]||'CONTRACT_FRONTIER_SUMMARY.json';
const outCsv=process.argv[5]||'CONTRACT_FRONTIER_ALL_8192.csv';
const props=[...PROP_NAMES];
const contrasts=[['pre_vs_csr','pre','csr'],['hyd_vs_csr','hyd','csr'],['pre_vs_hyd','pre','hyd']];
function refDecision(a,b){
  const ca=canonicalizeAX(a.ax), cb=canonicalizeAX(b.ax);
  const p=compareCanonicalTrees(ca,cb), q=compareBySemanticPathMultiset(ca,cb);
  const r1=!p.equivalent, r2=!q.equivalent;
  if(r1!==r2) throw new Error('RPAC matcher disagreement');
  return r1;
}
function signatureRows(dataset){
  const rows=[];
  for(const c of dataset.cases){
    const run=c.runs[0];
    for(const [key,a,b] of contrasts){
      const r=refDecision(run[a],run[b]);
      const base=compareDomProjectionRelationNormalizedWithProps(run[a].dom,run[b].dom,new Set(),{}).positive;
      let propMask=0;
      for(let i=0;i<props.length;i++){
        const d=compareDomProjectionRelationNormalizedWithProps(run[a].dom,run[b].dom,new Set([props[i]]),{}).positive;
        if(d && !base) propMask|=(1<<i);
      }
      rows.push({case_id:c.id,contrast:key,r,base,propMask});
    }
  }
  return rows;
}
function evaluateRows(rows,mask){
  let TP=0,TN=0,FP=0,FN=0;
  for(const x of rows){
    const d=x.base || Boolean(x.propMask & mask), r=x.r;
    if(d&&r)TP++; else if(d&&!r)FP++; else if(!d&&r)FN++; else TN++;
  }
  const total=TP+TN+FP+FN;
  return {TP,TN,FP,FN,total,agreement:(TP+TN)/total};
}
function propsForMask(mask){const a=[]; for(let i=0;i<props.length;i++) if(mask&(1<<i))a.push(props[i]); return a;}
function verifyRunStability(dataset,mask){
  const s=new Set(propsForMask(mask));
  for(const c of dataset.cases){
    for(const [key,a,b] of contrasts){
      const dVals=new Set(),rVals=new Set();
      for(const run of c.runs){
        dVals.add(compareDomProjectionRelationNormalizedWithProps(run[a].dom,run[b].dom,s,{}).positive);
        rVals.add(refDecision(run[a],run[b]));
      }
      if(dVals.size!==1||rVals.size!==1) throw new Error(`unstable ${c.id} ${key}`);
    }
  }
  return true;
}
const discRows=signatureRows(discovery), holdRows=signatureRows(holdout);
const all=[];
for(let mask=0; mask<(1<<props.length); mask++){
  const d=evaluateRows(discRows,mask), h=evaluateRows(holdRows,mask);
  all.push({mask,n_props:propsForMask(mask).length,properties:propsForMask(mask),discovery:d,holdout:h});
}
const best=all.slice().sort((a,b)=>a.discovery.FN-b.discovery.FN||a.discovery.FP-b.discovery.FP||a.n_props-b.n_props||a.mask-b.mask)[0];
const zeroFn=all.filter(x=>x.discovery.FN===0);
const zeroFnIntersection=props.filter(p=>zeroFn.every(x=>x.properties.includes(p)));
const zeroFnUnion=props.filter(p=>zeroFn.some(x=>x.properties.includes(p)));
const fullMask=(1<<props.length)-1, indMask=1<<props.indexOf('indeterminate');
const full=all[fullMask], empty=all[0], indOnly=all[indMask];
const eqMetrics=(a,b,part)=>['TP','TN','FP','FN'].every(k=>a[part][k]===b[part][k]);
const propertyInfluence=props.map((p,i)=>{
  let changedDiscovery=0,changedHoldout=0;
  for(let mask=0; mask<(1<<props.length); mask++) if(!(mask&(1<<i))){
    const a=all[mask],b=all[mask|(1<<i)];
    if(!eqMetrics(a,b,'discovery')) changedDiscovery++;
    if(!eqMetrics(a,b,'holdout')) changedHoldout++;
  }
  return {property:p,pairs_tested:1<<(props.length-1),metric_changing_pairs_discovery:changedDiscovery,metric_changing_pairs_holdout:changedHoldout};
});
// Verify run-level stability for the three contracts highlighted in the article.
verifyRunStability(discovery,0); verifyRunStability(discovery,indMask); verifyRunStability(discovery,fullMask);
verifyRunStability(holdout,0); verifyRunStability(holdout,indMask); verifyRunStability(holdout,fullMask);
const discoveryCreated=discovery.created_utc;
const holdoutProvenance=holdout.cases.map(c=>({id:c.id,issue_created_utc:c.issue_created_utc,source_url:c.source_url,post_original_capture:Boolean(c.issue_created_utc&&discoveryCreated&&new Date(c.issue_created_utc)>new Date(discoveryCreated)),minutes_after_original_capture:c.issue_created_utc&&discoveryCreated?Math.round((new Date(c.issue_created_utc)-new Date(discoveryCreated))/60000):null}));
const combined={TP:full.discovery.TP+full.holdout.TP,TN:full.discovery.TN+full.holdout.TN,FP:full.discovery.FP+full.holdout.FP,FN:full.discovery.FN+full.holdout.FN};
combined.total=combined.TP+combined.TN+combined.FP+combined.FN; combined.agreement=(combined.TP+combined.TN)/combined.total;
const summary={
  schema:'rpac-capture-contract-frontier-v1',
  generated_utc:new Date().toISOString(),
  original_capture_created_utc:discoveryCreated,
  native_state_properties:props,
  contracts_enumerated:all.length,
  discovery:{cases:discovery.cases.length,contrasts:discRows.length},
  temporal_holdout:{cases:holdout.cases.length,contrasts:holdRows.length,provenance:holdoutProvenance},
  exhaustive_frontier:{
    zero_false_negative_contracts:zeroFn.length,
    contracts_with_false_negative:all.length-zeroFn.length,
    properties_present_in_every_zero_false_negative_contract:zeroFnIntersection,
    properties_present_in_any_zero_false_negative_contract:zeroFnUnion,
    minimal_lexicographic_optimum:{properties:best.properties,...best.discovery},
    relation_normalized_base_no_native_properties:empty.discovery,
    indeterminate_only:indOnly.discovery,
    full_13_field:full.discovery,
    holdout_full_13_field:full.holdout,
    holdout_indeterminate_only:indOnly.holdout,
    full_13_field_combined_20_case_60_contrast:combined,
    full_and_indeterminate_only_same_discovery_metrics:eqMetrics(full,indOnly,'discovery'),
    full_and_indeterminate_only_same_holdout_metrics:eqMetrics(full,indOnly,'holdout')
  },
  property_influence:propertyInfluence,
  interpretation:[
    'On the 17-case discovery benchmark, every one of the 4096 contracts containing indeterminate has 0 RPAC-positive/DOM-negative contrasts, while every one of the 4096 contracts omitting indeterminate has exactly 1.',
    'No other native-state property changes the aggregate binary decision metrics on the discovery benchmark.',
    'The three temporal-holdout issues were created after the original 17-case browser capture timestamp and therefore could not have influenced that capture; all 9 holdout contrasts agree between the relation-normalized DOM comparator and RPAC.',
    'The holdout validates the relation/lifecycle formulation on new issue mechanisms but does not independently validate the indeterminate-specific necessity result because none of the holdout issues is a native-indeterminate case.'
  ]
};
fs.writeFileSync(outJson,JSON.stringify(summary,null,2)+'\n');
const esc=x=>`"${String(x).replaceAll('"','""')}"`;
const header=['mask','n_props','properties','disc_TP','disc_TN','disc_FP','disc_FN','disc_agreement','hold_TP','hold_TN','hold_FP','hold_FN','hold_agreement'];
const lines=[header.join(',')];
for(const x of all) lines.push([x.mask,x.n_props,esc(x.properties.join('|')),x.discovery.TP,x.discovery.TN,x.discovery.FP,x.discovery.FN,x.discovery.agreement.toFixed(12),x.holdout.TP,x.holdout.TN,x.holdout.FP,x.holdout.FN,x.holdout.agreement.toFixed(12)].join(','));
fs.writeFileSync(outCsv,lines.join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
