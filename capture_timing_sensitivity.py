#!/usr/bin/env python3
import json, sys, os, time, hashlib
from playwright.sync_api import sync_playwright

HERE=os.path.dirname(os.path.abspath(__file__))
cases=json.load(open(os.path.join(HERE,'MICROREPRODUCTIONS.json'), encoding='utf-8'))
if len(sys.argv) != 3:
    raise SystemExit('usage: python capture_timing_sensitivity.py WAIT_MS OUTPUT_JSON')
wait_ms=int(sys.argv[1]); outfile=sys.argv[2]

NATIVE_STATE_PROPERTIES = [
    'value','checked','indeterminate','selected','disabled','readOnly','required',
    'multiple','open','tabIndex','contentEditable','selectedIndex','inert'
]

def wrap(x):
    return "<!doctype html><html lang='en'><head><meta charset='utf-8'></head><body>"+x+"</body></html>"

def cap(page,sess,body):
    page.goto('about:blank')
    page.set_content(wrap(body),wait_until='load')
    page.wait_for_timeout(wait_ms)
    dom=page.evaluate("""(props) => {
      const out=[];
      function n(s){return (s||'').replace(/\\s+/g,' ').trim()}
      function visit(el,p){
        const a={}; for(const x of el.attributes||[]) a[x.name]=x.value;
        const q={};
        for(const k of props){
          try { const z=el[k]; if(z !== undefined && (z === null || ['string','number','boolean'].includes(typeof z))) q[k]=z; } catch(e) {}
        }
        const t=n(Array.from(el.childNodes||[]).filter(x=>x.nodeType===Node.TEXT_NODE).map(x=>x.textContent).join(' '));
        out.push({path:p,tag:el.tagName.toLowerCase(),text:t,attributes:a,properties:q});
        Array.from(el.children||[]).filter(x=>!['script','style'].includes(x.tagName.toLowerCase())).forEach((c,i)=>visit(c,p+'/'+i));
      }
      Array.from(document.body.children).filter(x=>!['script','style'].includes(x.tagName.toLowerCase())).forEach((c,i)=>visit(c,'/'+i));
      return out;
    }""", NATIVE_STATE_PROPERTIES)
    ax=sess.send('Accessibility.getFullAXTree')['nodes']
    aria_snapshot=page.locator('body').aria_snapshot()
    return {'dom':dom,'ax':ax,'playwright_aria_snapshot':aria_snapshot}

data={
  'schema':'rpac-timing-sensitivity-captures',
  'created_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
  'runs_per_case':1,
  'wait_ms':wait_ms,
  'native_state_properties':NATIVE_STATE_PROPERTIES,
  'cases':[]
}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    data['browser']=b.version
    page=b.new_page(viewport={'width':1280,'height':720},locale='en-US')
    sess=page.context.new_cdp_session(page)
    for c in cases:
        rec={k:v for k,v in c.items() if k not in ('pre','hyd','csr')}; rec['runs']=[]
        r=1; f=lambda s:s.replace('__R__',str(r))
        rec['runs'].append({'run':r,'pre':cap(page,sess,f(c['pre'])),'hyd':cap(page,sess,f(c['hyd'])),'csr':cap(page,sess,f(c['csr']))})
        data['cases'].append(rec)
    b.close()
with open(outfile,'w',encoding='utf-8') as f: json.dump(data,f,separators=(',',':'),ensure_ascii=False)
print('sha256',hashlib.sha256(open(outfile,'rb').read()).hexdigest())
