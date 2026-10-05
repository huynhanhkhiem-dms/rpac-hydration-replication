/*
 * Rendering-Path Accessibility Consistency (RPAC) semantic oracle.
 * The canonical representation retains semantic parent edges and resolved
 * relation endpoints while treating raw browser/DOM identifiers as diagnostic.
 */

const STATE_PROPS = [
  'busy','disabled','editable','focusable','focused','hidden','invalid',
  'roledescription','live','atomic','relevant','autocomplete','hasPopup',
  'level','multiselectable','orientation','multiline','readonly','required',
  'valuemin','valuemax','valuetext','checked','expanded','modal','pressed','selected',
  'keyshortcuts','posinset','setsize','url'
];

const RELATION_PROPS = [
  'activedescendant','controls','describedby','details','errormessage',
  'flowto','labelledby','owns'
];

const NON_SEMANTIC_ROLES = new Set(['RootWebArea','none','InlineTextBox']);
const TEXT_FRAGMENT_ROLES = new Set(['StaticText','LineBreak']);
const SOFT_ROLES = new Set(['generic']);
const GAP_COST = 2.0;

function primitive(v) {
  if (v == null) return null;
  if (typeof v !== 'object') return v;
  if ('value' in v && (typeof v.value !== 'object' || v.value == null)) return v.value;
  return v.value ?? null;
}

function stableObject(obj) {
  if (Array.isArray(obj)) return obj.map(stableObject);
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.keys(obj).sort().map(k => [k, stableObject(obj[k])]));
}
function stableString(obj) { return JSON.stringify(stableObject(obj)); }

function propertyMap(node) {
  const out = new Map();
  for (const p of node.properties || []) out.set(p.name, p.value);
  return out;
}

function nodeCore(node) {
  return {
    role: primitive(node.role) || '',
    name: primitive(node.name) || '',
    description: primitive(node.description) || '',
    value: primitive(node.value) ?? null,
  };
}

function buildPreorder(nodes) {
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  const roots = nodes.filter(n => !n.parentId || !byId.has(n.parentId));
  const order = [];
  const path = new Map();
  const seen = new Set();
  function visit(node, p) {
    if (!node || seen.has(node.nodeId)) return;
    seen.add(node.nodeId);
    path.set(node.nodeId, p);
    order.push(node.nodeId);
    const kids = (node.childIds || []).map(id => byId.get(id)).filter(Boolean);
    kids.forEach((child, i) => visit(child, `${p}/${i}`));
  }
  roots.forEach((root, i) => visit(root, `/${i}`));
  nodes.forEach((node, i) => { if (!seen.has(node.nodeId)) visit(node, `/orphan/${i}`); });
  return {byId, order, path};
}

function normalizeRenderedText(x) {
  return String(x ?? '').replace(/\s+/g, ' ').trim();
}

function semanticDescendantText(node, byId) {
  if (!node) return '';
  let raw = '';
  const seen = new Set();
  function visit(n) {
    if (!n || seen.has(n.nodeId)) return;
    seen.add(n.nodeId);
    const core = nodeCore(n);
    if (TEXT_FRAGMENT_ROLES.has(core.role)) raw += core.name || '';
    for (const id of n.childIds || []) visit(byId.get(id));
  }
  visit(node);
  return normalizeRenderedText(raw);
}

function relationTargetSignature(target, byId) {
  if (!target) return null;
  const core = nodeCore(target);
  const pm = propertyMap(target);
  const states = {};
  for (const k of STATE_PROPS) if (pm.has(k)) states[k] = primitive(pm.get(k));
  const role = (target.ignored || NON_SEMANTIC_ROLES.has(core.role) || SOFT_ROLES.has(core.role)) ? null : core.role;
  return {
    exposed: !target.ignored,
    role,
    name: core.name || '',
    description: core.description || '',
    value: core.value ?? null,
    states,
    textContent: semanticDescendantText(target, byId),
  };
}

function extractRelations(node, backendMap, byId) {
  const pm = propertyMap(node);
  const relations = {};
  for (const rel of RELATION_PROPS) {
    if (!pm.has(rel)) continue;
    const value = pm.get(rel);
    const related = Array.isArray(value?.relatedNodes) ? value.relatedNodes : [];
    relations[rel] = related.map(r => {
      const target = r.backendDOMNodeId != null ? backendMap.get(r.backendDOMNodeId) : null;
      return {
        targetNodeId: target?.nodeId || null,
        targetSignature: relationTargetSignature(target, byId),
        diagnosticIdref: r.idref || null,
        relationText: r.text || null,
      };
    });
  }
  return relations;
}

function meaningfulSoftRoleState(pm) {
  for (const k of STATE_PROPS) {
    if (!pm.has(k)) continue;
    const x = primitive(pm.get(k));
    if (k === 'focusable' || k === 'focused' || k === 'hidden') {
      if (x === true) return true;
      continue;
    }
    if (k === 'live') {
      if (x != null && String(x).toLowerCase() !== 'off' && String(x) !== '') return true;
      continue;
    }
    // For ARIA/state properties such as expanded=false or checked=false,
    // presence itself carries semantics and must not be discarded.
    if (x !== null && x !== undefined) return true;
  }
  return false;
}

function retainSoftRole(node, core, pm, rels, referenced) {
  if (referenced) return true;
  if (core.name || core.description || core.value != null) return true;
  if (meaningfulSoftRoleState(pm)) return true;
  if (rels && Object.keys(rels).length > 0) return true;
  return false;
}

function canonicalizeAX(rawNodes) {
  const nodes = rawNodes || [];
  const {byId, order, path} = buildPreorder(nodes);
  const backendMap = new Map();
  for (const n of nodes) if (n.backendDOMNodeId != null) backendMap.set(n.backendDOMNodeId, n);

  const relationTargetIds = new Set();
  const relationsByNode = new Map();
  for (const n of nodes) {
    const rels = extractRelations(n, backendMap, byId);
    relationsByNode.set(n.nodeId, rels);
    for (const targets of Object.values(rels)) {
      for (const t of targets) if (t.targetNodeId) relationTargetIds.add(t.targetNodeId);
    }
  }

  const keep = new Set();
  for (const rawId of order) {
    const node = byId.get(rawId);
    if (!node || node.ignored) continue;
    const core = nodeCore(node);
    if (NON_SEMANTIC_ROLES.has(core.role) || TEXT_FRAGMENT_ROLES.has(core.role)) continue;
    const referenced = relationTargetIds.has(node.nodeId);
    if (SOFT_ROLES.has(core.role)) {
      const pm = propertyMap(node);
      const rels = relationsByNode.get(node.nodeId) || {};
      if (!retainSoftRole(node, core, pm, rels, referenced)) continue;
    }
    keep.add(node.nodeId);
  }

  function semanticParentId(rawId) {
    let current = byId.get(rawId)?.parentId || null;
    const guard = new Set();
    while (current && !guard.has(current)) {
      guard.add(current);
      if (keep.has(current)) return current;
      current = byId.get(current)?.parentId || null;
    }
    return null;
  }

  // AX StaticText/LineBreak node boundaries are rendering artifacts and can
  // change when equivalent DOM text is split across spans. Coalesce fragments
  // under their nearest retained semantic ancestor while preserving rendered
  // text (including line-break whitespace) as one semantic field.
  const textBySemanticParent = new Map();
  let rootTextRaw = '';
  for (const rawId of order) {
    const raw = byId.get(rawId);
    if (!raw || raw.ignored) continue;
    const core = nodeCore(raw);
    if (!TEXT_FRAGMENT_ROLES.has(core.role)) continue;
    let current = raw.parentId || null;
    const guard = new Set();
    while (current && !guard.has(current) && !keep.has(current)) {
      guard.add(current);
      current = byId.get(current)?.parentId || null;
    }
    const text = core.name || '';
    if (current && keep.has(current)) textBySemanticParent.set(current, (textBySemanticParent.get(current) || '') + text);
    else rootTextRaw += text;
  }

  const canonicalNodes = [];
  for (const rawId of order) {
    if (!keep.has(rawId)) continue;
    const node = byId.get(rawId);
    const core = nodeCore(node);
    const pm = propertyMap(node);
    const states = {};
    for (const k of STATE_PROPS) if (pm.has(k)) states[k] = primitive(pm.get(k));
    canonicalNodes.push({
      id: node.nodeId,
      diagnosticPath: path.get(node.nodeId) || null,
      semanticParentId: semanticParentId(node.nodeId),
      ...core,
      textContent: normalizeRenderedText(textBySemanticParent.get(node.nodeId) || ''),
      states,
      relations: Object.fromEntries(Object.entries(relationsByNode.get(node.nodeId) || {}).map(([k,targets]) => [k, targets.map(t => ({...t, targetRetained: Boolean(t.targetNodeId && keep.has(t.targetNodeId))}))])),
      relationAnchorOnly: SOFT_ROLES.has(core.role) && relationTargetIds.has(node.nodeId),
      softRoleSemanticRetention: SOFT_ROLES.has(core.role),
    });
  }

  return { schema:'rpac-ax-registered', nodes:canonicalNodes, rootTextContent: normalizeRenderedText(rootTextRaw) };
}

function stateDistance(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  if (!keys.size) return 0;
  let different = 0;
  for (const k of keys) if (stableString(a?.[k] ?? null) !== stableString(b?.[k] ?? null)) different++;
  return different / keys.size;
}

function substitutionCost(a, b) {
  let c = 0;
  if (a.role !== b.role) c += 1.1;
  if (a.name !== b.name) c += 0.8;
  if (a.description !== b.description) c += 0.6;
  if (stableString(a.value) !== stableString(b.value)) c += 0.5;
  if ((a.textContent || '') !== (b.textContent || '')) c += 0.6;
  c += 0.9 * stateDistance(a.states, b.states);
  if (a.relationAnchorOnly !== b.relationAnchorOnly) c += 0.3;
  return Math.min(c, 3.5);
}

function alignNodes(nodesA, nodesB) {
  const n = nodesA.length, m = nodesB.length;
  const dp = Array.from({length:n+1}, () => Array(m+1).fill(0));
  const op = Array.from({length:n+1}, () => Array(m+1).fill(null));
  for (let i=1;i<=n;i++) { dp[i][0] = i*GAP_COST; op[i][0] = 'del'; }
  for (let j=1;j<=m;j++) { dp[0][j] = j*GAP_COST; op[0][j] = 'ins'; }
  for (let i=1;i<=n;i++) for (let j=1;j<=m;j++) {
    const sub = dp[i-1][j-1] + substitutionCost(nodesA[i-1], nodesB[j-1]);
    const del = dp[i-1][j] + GAP_COST;
    const ins = dp[i][j-1] + GAP_COST;
    const best = Math.min(sub, del, ins);
    dp[i][j] = best;
    op[i][j] = best === sub ? 'sub' : (best === del ? 'del' : 'ins');
  }
  const aligned = [];
  let i=n, j=m;
  while (i>0 || j>0) {
    const action = op[i][j];
    if (action === 'sub') { aligned.push({a:nodesA[i-1], b:nodesB[j-1]}); i--; j--; }
    else if (action === 'del') { aligned.push({a:nodesA[i-1], b:null}); i--; }
    else { aligned.push({a:null, b:nodesB[j-1]}); j--; }
  }
  aligned.reverse();
  return aligned;
}

function coreDiffClasses(a, b) {
  const classes = new Set();
  if (!a || !b) { classes.add('structure'); return [...classes]; }
  if (a.role !== b.role) classes.add('role');
  if (a.name !== b.name) classes.add('name');
  if (a.description !== b.description) classes.add('description');
  if (stableString(a.value) !== stableString(b.value)) classes.add('value');
  if ((a.textContent || '') !== (b.textContent || '')) classes.add('text');
  if (stableString(a.states) !== stableString(b.states)) classes.add('state');
  return [...classes];
}

function relationTokenLeft(t, mapAtoB) {
  if (!t.targetNodeId) return `UNRESOLVED:${stableString({text:t.relationText || null})}`;
  if (t.targetRetained) {
    const mapped = mapAtoB.get(t.targetNodeId);
    if (mapped) return `NODE:${mapped}`;
    return `UNMATCHED_RETAINED:${stableString({text:t.relationText || null,signature:t.targetSignature || null})}`;
  }
  return `ANCHOR:${stableString({text:t.relationText || null,signature:t.targetSignature || null})}`;
}

function relationTokenRight(t) {
  if (!t.targetNodeId) return `UNRESOLVED:${stableString({text:t.relationText || null})}`;
  if (t.targetRetained) return `NODE:${t.targetNodeId}`;
  return `ANCHOR:${stableString({text:t.relationText || null,signature:t.targetSignature || null})}`;
}

function compareRelations(a, b, mapAtoB) {
  const diffs = [];
  const keys = new Set([...Object.keys(a.relations || {}), ...Object.keys(b.relations || {})]);
  for (const key of keys) {
    const left = a.relations?.[key] || [];
    const right = b.relations?.[key] || [];
    if (left.length !== right.length) {
      diffs.push({relation:key, reason:'cardinality', leftCount:left.length, rightCount:right.length});
      continue;
    }
    const leftResolved = left.map(t => Boolean(t.targetNodeId));
    const rightResolved = right.map(t => Boolean(t.targetNodeId));
    if (stableString(leftResolved) !== stableString(rightResolved)) {
      diffs.push({relation:key, reason:'resolution-status', leftResolved, rightResolved});
      continue;
    }
    const expected = left.map(t => relationTokenLeft(t,mapAtoB)).sort();
    const observed = right.map(relationTokenRight).sort();
    if (stableString(expected) !== stableString(observed)) {
      const reason = expected.some(x => x.startsWith('UNMATCHED_RETAINED:')) ? 'unmatched-resolved-target' : 'target-semantics';
      diffs.push({relation:key, reason: reason, expectedTargets:expected, observedTargets:observed});
    }
  }
  return diffs;
}

function compareCanonicalTrees(graphA, graphB) {
  const aNodes = Array.isArray(graphA) ? graphA : (graphA?.nodes || []);
  const bNodes = Array.isArray(graphB) ? graphB : (graphB?.nodes || []);
  const aRootText = Array.isArray(graphA) ? '' : (graphA?.rootTextContent || '');
  const bRootText = Array.isArray(graphB) ? '' : (graphB?.rootTextContent || '');
  const aligned = alignNodes(aNodes, bNodes);
  const mapAtoB = new Map();
  for (const pair of aligned) if (pair.a && pair.b) mapAtoB.set(pair.a.id, pair.b.id);

  const diffs = [];
  if (aRootText !== bRootText) diffs.push({alignmentIndex:-1, classes:['text'], ssr:{rootTextContent:aRootText}, csr:{rootTextContent:bRootText}, relationDetails:[], topologyDetails:null});
  for (let k=0;k<aligned.length;k+) {
    const {a,b} = aligned[k];
    const classes = coreDiffClasses(a,b);
    const relationDetails = a && b ? compareRelations(a,b,mapAtoB) : [];
    if (relationDetails.length) classes.push('relation');

    let topologyDetails = null;
    if (a && b) {
      const expectedParent = a.semanticParentId ? (mapAtoB.get(a.semanticParentId) || '__UNMATCHED_PARENT__') : null;
      const observedParent = b.semanticParentId || null;
      if (expectedParent !== observedParent) {
        classes.push('topology');
        topologyDetails = {expectedParent, observedParent};
      }
    }

    if (classes.length) diffs.push({
      alignmentIndex:k,
      classes:[...new Set(classes)],
      ssr:a || null,
      csr:b || null,
      relationDetails,
      topologyDetails,
    });
  }

  return {
    equivalent: diffs.length === 0,
    diffs,
    diagnostics:{leftNodes:aNodes.length,rightNodes:bNodes.length,alignedPairs:aligned.length,leftRootText:aRootText,rightRootText:bRootText,schema:'rpac-ax-registered'}
  };
}

module.exports = { canonicalizeAX, compareCanonicalTrees, alignNodes, STATE_PROPS, RELATION_PROPS, relationTargetSignature, TEXT_FRAGMENT_ROLES, normalizeRenderedText };
