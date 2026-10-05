/* Practitioner-facing baseline contracts used for sensitivity analysis.
 *
 * openWcCompatibleProjection approximates the documented default semantics of
 * @open-wc/semantic-dom-diff 0.21.0 for the subset exercised by this benchmark:
 * comments are absent from the browser capture; whitespace is normalized;
 * script/style elements are excluded by capture; tag/attribute order is
 * canonicalized. Native IDL properties are intentionally not included because
 * semantic-dom-diff compares DOM/HTML, not runtime-only element properties.
 *
 * The Playwright baseline is the actual Locator.aria_snapshot() string captured
 * by Python Playwright at each checkpoint.
 */
function normText(x){return String(x??'').replace(/\s+/g,' ').trim();}
function stableAttrs(attrs){return Object.fromEntries(Object.entries(attrs||{}).map(([k,v])=>[String(k).toLowerCase(),normText(v)]).sort(([a],[b])=>a.localeCompare(b)));}
function openWcCompatibleProjection(nodes){
  return (nodes||[]).map((n,i)=>({
    path:n.path??String(i),
    tag:String(n.tag||'').toLowerCase(),
    text:normText(n.text||''),
    attributes:stableAttrs(n.attributes||{})
  })).sort((a,b)=>a.path.localeCompare(b.path));
}
function compareOpenWcCompatible(a,b){
  const left=openWcCompatibleProjection(a||[]), right=openWcCompatibleProjection(b||[]);
  return {positive:JSON.stringify(left)!==JSON.stringify(right),left,right,contract:'open-wc-semantic-dom-diff-0.21.0-compatible-default-subset'};
}
function normalizeAriaSnapshot(x){return String(x??'').replace(/\r\n/g,'\n').trim();}
function comparePlaywrightAriaSnapshot(a,b){
  const left=normalizeAriaSnapshot(a),right=normalizeAriaSnapshot(b);
  return {positive:left!==right,left,right,contract:'playwright-locator-aria-snapshot'};
}
module.exports={openWcCompatibleProjection,compareOpenWcCompatible,normalizeAriaSnapshot,comparePlaywrightAriaSnapshot};
