/* Alternate RPAC matcher for the prespecified sensitivity analysis.
 * Unlike the primary sequence alignment, this comparator is order-insensitive:
 * it compares a multiset of semantic-path fingerprints plus resolved relation
 * endpoint fingerprints. It is never substituted for the primary comparator after
 * outcomes are observed; disagreements are reported as sensitivity results.
 */
function stableObject(obj) {
  if (Array.isArray(obj)) return obj.map(stableObject);
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.keys(obj).sort().map(k => [k, stableObject(obj[k])]));
}
function stable(obj) { return JSON.stringify(stableObject(obj)); }
function local(node) {
  return stable({role:node.role,name:node.name,description:node.description,value:node.value,textContent:node.textContent||'',states:node.states,relationAnchorOnly:node.relationAnchorOnly});
}
function multiset(items) {
  const m=new Map(); for(const x of items) m.set(x,(m.get(x)||0)+1);
  return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function semanticPathFingerprints(graph) {
  const nodes=Array.isArray(graph)?graph:(graph?.nodes||[]);
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const memo=new Map();
  function path(id,seen=new Set()) {
    if (memo.has(id)) return memo.get(id);
    if (seen.has(id)) return '__CYCLE__';
    const n=byId.get(id); if(!n) return '__MISSING__';
    const next=new Set(seen); next.add(id);
    const p=n.semanticParentId?`${path(n.semanticParentId,next)}>${local(n)}`:`ROOT>${local(n)}`;
    memo.set(id,p); return p;
  }
  const fps=[];
  const rootText=Array.isArray(graph)?'':(graph?.rootTextContent||'');
  if(rootText) fps.push(stable({rootTextContent:rootText}));
  for(const n of nodes) {
    const rel={};
    for(const [key,targets] of Object.entries(n.relations||{})) {
      rel[key]=(targets||[]).map(t=>{
        if (!t.targetNodeId) return `UNRESOLVED:${stable({text:t.relationText||null})}`;
        if (t.targetRetained && byId.has(t.targetNodeId)) return `NODE:${path(t.targetNodeId)}`;
        return `ANCHOR:${stable({text:t.relationText||null,signature:t.targetSignature||null})}`;
      }).sort();
    }
    fps.push(stable({path:path(n.id),relations:rel}));
  }
  return multiset(fps);
}
function compareBySemanticPathMultiset(a,b) {
  const left=semanticPathFingerprints(a),right=semanticPathFingerprints(b);
  return {equivalent:stable(left)===stable(right),left,right,schema:'rpac-ax-sensitivity-path-multiset'};
}
module.exports={semanticPathFingerprints,compareBySemanticPathMultiset};
