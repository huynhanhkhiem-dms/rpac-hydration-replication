const fs=require('fs');
const {compareDomProjectionRelationNormalized,compareDomProjectionRelationNormalizedLegacy,compareDomProjectionRaw}=require('./dom_baseline');
const {canonicalizeAX,compareCanonicalTrees}=require('./ax_contract');
const {compareBySemanticPathMultiset}=require('./ax_sensitivity');
const {compareOpenWcCompatible,comparePlaywrightAriaSnapshot}=require('./tool_baselines');
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function cmp(a,b){
 const d=compareDomProjectionRelationNormalized(a.dom,b.dom,{});
 const dlegacy=compareDomProjectionRelationNormalizedLegacy(a.dom,b.dom,{});
 const dr=compareDomProjectionRaw(a.dom,b.dom,{});
 const owc=compareOpenWcCompatible(a.dom,b.dom);
 const pw=comparePlaywrightAriaSnapshot(a.playwright_aria_snapshot,b.playwright_aria_snapshot);
 const ca=canonicalizeAX(a.ax), cb=canonicalizeAX(b.ax);
 const r=compareCanonicalTrees(ca,cb), alt=compareBySemanticPathMultiset(ca,cb);
 return {
   D:d.positive,D_legacy:dlegacy.positive,Draw:dr.positive,
   OpenWC:owc.positive,PlaywrightARIA:pw.positive,
   R:!r.equivalent,R_alt:!alt.equivalent,
   R_consensus:(!r.equivalent)===(!alt.equivalent),
   R_diff_count:r.diffs.length,R_classes:[...new Set(r.diffs.flatMap(x=>x.classes||[]))].sort()
 };
}
for(const c of input.cases){for(const x of c.runs){x.pre_vs_csr=cmp(x.pre,x.csr);x.hyd_vs_csr=cmp(x.hyd,x.csr);x.pre_vs_hyd=cmp(x.pre,x.hyd);delete x.pre;delete x.hyd;delete x.csr;}}
input.schema='rpac-study-source-grounded-results-native-state';input.analyzed_utc=new Date().toISOString();
fs.writeFileSync(process.argv[3],JSON.stringify(input,null,2)+'\n');
