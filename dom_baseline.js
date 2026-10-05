/*
 * DOM-only surrogate comparators used in the empirical study.
 *
 * Primary confirmatory surrogate: relation-normalized final-DOM projection.
 * Raw generated identifier strings are deliberately NOT allowed to create a
 * primary D+ verdict when the same DOM relation resolves to the same target
 * path. A literal/raw comparator is retained as a sensitivity baseline.
 *
 * Neither comparator computes accessible names, browser accessibility-tree
 * exposure, CSS-derived visibility, or platform mappings; those belong to
 * RPAC. This separation makes the surrogate test conservative rather than
 * baking RPAC semantics into the DOM proxy.
 */
const ATTR_PREFIXES=['aria-'];
const ATTR_NAMES=new Set([
  'role','id','for','alt','title','tabindex','href','hidden','inert','disabled','required','readonly','multiple',
  'checked','selected','open','value','placeholder','lang','contenteditable','type','autocomplete','scope','headers',
  'rowspan','colspan','usemap','ismap','accesskey'
]);
const PROP_NAMES=new Set(['value','checked','indeterminate','selected','disabled','readOnly','required','multiple','open','tabIndex','contentEditable','selectedIndex','inert']);
const LEGACY_PROP_NAMES=new Set(['value','checked','selected','disabled','readOnly','multiple','open','tabIndex','contentEditable']);
const IDREF_ATTRS=new Set([
  'for','aria-labelledby','aria-describedby','aria-controls','aria-owns','aria-activedescendant',
  'aria-details','aria-errormessage','aria-flowto','headers'
]);
function normText(x){return x==null?'':String(x).replace(/\s+/g,' ').trim();}
function keepAttr(name,extra=[]){const k=String(name||'').toLowerCase();return ATTR_NAMES.has(k)||ATTR_PREFIXES.some(p=>k.startsWith(p))||extra.map(x=>x.toLowerCase()).includes(k);}
function stableAttrs(attrs){return Object.fromEntries(Object.keys(attrs).sort().map(k=>[k,attrs[k]]));}
function stableProps(props){return Object.fromEntries(Object.keys(props).sort().map(k=>[k,props[k]]));}
function canonicalDomProjectionRaw(nodes,{extraAttributes=[]}={}){
  return (nodes||[]).map((n,i)=>{
    const attrs={};
    for(const [k,v] of Object.entries(n.attributes||{})) if(keepAttr(k,extraAttributes)) attrs[String(k).toLowerCase()]=normText(v);
    const props={};
    for(const [k,v] of Object.entries(n.properties||{})) if(PROP_NAMES.has(k)) props[k]=typeof v==='boolean'?v:normText(v);
    return {path:n.path??String(i),tag:String(n.tag||'').toLowerCase(),text:normText(n.text||''),attributes:stableAttrs(attrs),properties:stableProps(props)};
  }).sort((a,b)=>a.path.localeCompare(b.path));
}
function buildIdMap(nodes){
  const out=new Map();
  for(let i=0;i<(nodes||[]).length;i++){
    const n=nodes[i]||{},id=normText(n.attributes?.id);
    if(id&&!out.has(id))out.set(id,n.path??String(i));
  }
  return out;
}
function normalizeIdrefs(value,idMap){
  const toks=normText(value).split(/\s+/).filter(Boolean);
  return toks.map(x=>idMap.has(x)?`@path:${idMap.get(x)}`:`@unresolved:${x}`).join(' ');
}
function normalizeRelationValue(name,value,idMap){
  const k=String(name||'').toLowerCase(),raw=normText(value);
  if(IDREF_ATTRS.has(k))return normalizeIdrefs(raw,idMap);
  if((k==='href'||k==='usemap')&&raw.startsWith('#')){
    const id=raw.slice(1);return idMap.has(id)?`#@path:${idMap.get(id)}`:`#@unresolved:${id}`;
  }
  return raw;
}
function canonicalDomProjectionRelationNormalizedWithProps(nodes,propNames,{extraAttributes=[]}={}){
  const idMap=buildIdMap(nodes);
  return (nodes||[]).map((n,i)=>{
    const attrs={};
    for(const [k0,v] of Object.entries(n.attributes||{})){
      const k=String(k0).toLowerCase();
      if(!keepAttr(k,extraAttributes)||k==='id')continue; // raw identity is diagnostic only
      attrs[k]=normalizeRelationValue(k,v,idMap);
    }
    const props={};
    for(const [k,v] of Object.entries(n.properties||{})) if(propNames.has(k)) props[k]=typeof v==='boolean'||typeof v==='number'?v:normText(v);
    return {path:n.path??String(i),tag:String(n.tag||'').toLowerCase(),text:normText(n.text||''),attributes:stableAttrs(attrs),properties:stableProps(props)};
  }).sort((a,b)=>a.path.localeCompare(b.path));
}
function canonicalDomProjectionRelationNormalized(nodes,options={}){return canonicalDomProjectionRelationNormalizedWithProps(nodes,PROP_NAMES,options);}
function compareDomProjectionRelationNormalizedWithProps(a,b,propNames,options={}){return compareProjection(a,b,(nodes,opts)=>canonicalDomProjectionRelationNormalizedWithProps(nodes,propNames,opts),'accessibility-sensitive-dom-relation-normalized-custom-native-state',options);}
function canonicalDomProjectionRelationNormalizedLegacy(nodes,options={}){return canonicalDomProjectionRelationNormalizedWithProps(nodes,LEGACY_PROP_NAMES,options);}
function compareProjection(a,b,project,version,options={}){
  const A=project(a,options),B=project(b,options);
  return {positive:JSON.stringify(A)!==JSON.stringify(B),left:A,right:B,baselineVersion:version,extraAttributes:[...(options.extraAttributes||[])].sort()};
}
function compareDomProjectionRaw(a,b,options={}){return compareProjection(a,b,canonicalDomProjectionRaw,'accessibility-sensitive-dom-raw',options);}
function compareDomProjectionRelationNormalized(a,b,options={}){return compareProjection(a,b,canonicalDomProjectionRelationNormalized,'accessibility-sensitive-dom-relation-normalized-native-state',options);}
function compareDomProjectionRelationNormalizedLegacy(a,b,options={}){return compareProjection(a,b,canonicalDomProjectionRelationNormalizedLegacy,'accessibility-sensitive-dom-relation-normalized-legacy',options);}
/* Backward-compatible exported name now denotes the stronger PRIMARY surrogate. */
function compareDomProjection(a,b,options={}){return compareDomProjectionRelationNormalized(a,b,options);}
module.exports={
  canonicalDomProjection:canonicalDomProjectionRelationNormalized,
  canonicalDomProjectionRaw,canonicalDomProjectionRelationNormalized,canonicalDomProjectionRelationNormalizedWithProps,
  compareDomProjection,compareDomProjectionRaw,compareDomProjectionRelationNormalized,compareDomProjectionRelationNormalizedLegacy,compareDomProjectionRelationNormalizedWithProps,
  normalizeIdrefs,normalizeRelationValue,buildIdMap,keepAttr,ATTR_NAMES,PROP_NAMES,LEGACY_PROP_NAMES,IDREF_ATTRS
};
