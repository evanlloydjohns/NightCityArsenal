import sys,json,re
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'pylibs'))
from bs4 import BeautifulSoup
ROOT=Path(__file__).parent
def hydrate(text):
    a=json.loads(text);memo={}
    def at(i):
        if i<0:return None
        if i in memo:return memo[i]
        v=a[i]
        if isinstance(v,dict):
            out={};memo[i]=out
            for k,x in v.items():out[k]=at(x)
            return out
        if isinstance(v,list):
            if v and isinstance(v[0],str) and v[0] in ['ShallowReactive','Reactive','Ref','ShallowRef']:return at(v[1])
            if v and isinstance(v[0],str):return None
            out=[];memo[i]=out;out.extend(at(x) for x in v);return out
        return v
    return at(0)
def read(p):
    s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
    return hydrate(s.select_one('#__NUXT_DATA__').text)
if __name__=='__main__':
    d=read(ROOT/'gamestegy-weapons.html')
    cat=next(v for k,v in d['data'].items() if k.startswith('gameWikiCategory'))['cp2077Group']
    rows=[x for g in cat['current'] for x in g['entries']]
    (ROOT/'g-index.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
    print('G total',len(rows),'iconic',sum(x['is_iconic'] for x in rows));print('iconics',[x['title'] for x in rows if x['is_iconic']])
    for slug in ['coronation','sihil','gwynbleidd']:
        data=read(ROOT/('g-'+slug+'.html'));entry=next(v for k,v in data['data'].items() if k.startswith('gameWikiEntryPage'))
        (ROOT/('g-'+slug+'.json')).write_text(json.dumps(entry,indent=2),encoding='utf-8')
    print(json.dumps(entry['cp2077_equipment_data'],indent=2)[-7000:])
