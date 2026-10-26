import json,re,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'pylibs'))
from bs4 import BeautifulSoup
ROOT=Path(__file__).parent
def num(t):
    m=re.search(r'[-+]?\d+(?:\.\d+)?',t.replace(',',''))
    return float(m.group()) if m else None
def parse(row):
    s=BeautifulSoup((ROOT/'cache'/('nd-'+row['slug']+'.html')).read_text(encoding='utf-8'),'html.parser')
    sec=s.select_one('#stats') or s.select_one('#mods')
    if sec is None:raise ValueError('Missing stat panel: '+row['name'])
    tiers={}
    for tile in sec.select('[data-test-id="action:tier"]'):
        tier=tile['title'].replace('Tier ',''); vals={}
        if tier in tiers:continue
        for k,selector in [('damage','value:tier-damage'),('dps','value:tier-dps')]:
            el=tile.select_one('[data-test-id="'+selector+'"]')
            if el: vals[k]=num(el.get_text(' ',strip=True))
        if vals:tiers[tier]=vals
    stats={}
    for x in sec.select('.flex.items-baseline.justify-between'):
        spans=x.find_all('span',recursive=False)
        if len(spans)==2:stats[spans[0].get_text(' ',strip=True)]=num(spans[1].get_text(' ',strip=True))
    h=s.find('h1');hero=h.parent.parent
    effect=hero.select_one('.text-xl.text-yellow')
    desc=hero.get_text(' ',strip=True)
    typ=sec.select_one('.uppercase.px-2')
    return dict(**row,tiers=tiers,stats=stats,effect=effect.get_text(' ',strip=True) if effect else '',classification=typ.get_text(' ',strip=True) if typ else None,dualWieldEvidence=bool(s.select_one('[data-testid="row:perk:double-trouble"]')))
if __name__=='__main__':
    rows=json.loads((ROOT/'nd-index.json').read_text());out=[parse(x) for x in rows]
    (ROOT/'nd-records.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
    print('Parsed',len(out),'tier grids',sum(len(x['tiers'])==11 for x in out));print([(x['name'],x['classification'],x['stats']) for x in out if x['name'] in ['Malorian Arms 3516','Guts','Satori','Nehan']])
