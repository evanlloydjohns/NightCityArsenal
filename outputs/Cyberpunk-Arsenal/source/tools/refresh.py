"""Collect a staged research snapshot. Never overwrites the delivered dataset.

Development dependencies: python -m pip install requests beautifulsoup4
Usage: python refresh.py --cache path/to/cache --staging path/to/staging
Review the current official patch and the resulting diff before rebuilding.
"""
import argparse,hashlib,json,os,re,runpy,time,sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
from concurrent.futures import ThreadPoolExecutor
import requests
from bs4 import BeautifulSoup
import parse_g,parse_nd

TOOLS=Path(__file__).resolve().parent
AGENT='NightCityArsenalResearch/1.0 (personal offline reference; public facts)'
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cache',type=Path,required=True)
    ap.add_argument('--staging',type=Path,required=True)
    ap.add_argument('--force',action='store_true',help='Redownload cached pages; still does not overwrite the app dataset')
    args=ap.parse_args();root=args.cache.resolve();stage=args.staging.resolve()
    production=TOOLS.parent.resolve()
    if stage==production or (stage/'app.js').exists():ap.error('Use a separate staging directory, not the source directory.')
    root.mkdir(parents=True,exist_ok=True);(root/'cache').mkdir(exist_ok=True);stage.mkdir(parents=True,exist_ok=True)
    robots={};ledger=[]
    for origin in ['https://nukesdragons.com','https://cyberpunk.vaexil.tv','https://gamestegy.com']:
        response=requests.get(origin+'/robots.txt',timeout=40,headers={'User-Agent':AGENT});response.raise_for_status()
        rp=RobotFileParser();rp.parse(response.text.splitlines());robots[origin]=rp
    def get(url,file):
        origin=f'{urlparse(url).scheme}://{urlparse(url).netloc}'
        if not robots[origin].can_fetch(AGENT,url):raise RuntimeError('robots.txt disallows '+url)
        if args.force or not file.exists():
            response=requests.get(url,timeout=50,headers={'User-Agent':AGENT});response.raise_for_status()
            if 'Just a moment...' in response.text[:1500]:raise RuntimeError('Access challenge; stop and use another authorized source: '+url)
            file.write_text(response.text,encoding='utf-8');time.sleep(.5)
        ledger.append({'url':url,'cache':str(file.relative_to(root)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
        return file.read_text(encoding='utf-8')
    nd=get('https://nukesdragons.com/cyberpunk-2077/db/weapons',root/'nd.html')
    va=get('https://cyberpunk.vaexil.tv/weapons',root/'vaexil.html')
    get('https://gamestegy.com/cyberpunk-2077/wiki/weapons',root/'gamestegy-weapons.html')
    soup=BeautifulSoup(nd,'html.parser');ndindex=[]
    for section in soup.select('section'):
        h=section.find(['h2','h3']);links=section.select('a[href*="/db/weapons/"]')
        if not h or not links:continue
        category=h.get_text(' ',strip=True)
        for a in links:
            header=a.select_one('.text-center.u-font-d.uppercase.leading-none')
            ndindex.append({'slug':a['href'].split('/')[-1],'name':header.get_text(' ',strip=True) if header else a.get_text(' ',strip=True),'url':'https://nukesdragons.com'+a['href'],'iconic':category.startswith('Iconic'),'category':category})
    soup=BeautifulSoup(va,'html.parser');payload=next(x.text for x in soup.find_all('script') if 'weaponClass' in x.text)
    decoded=json.loads(payload[payload.find('push(')+5:-1])[1]
    start=decoded.find('"weapons":')+10
    vindex=json.JSONDecoder().raw_decode(decoded[start:])[0]
    gdata=parse_g.read(root/'gamestegy-weapons.html')
    category=next(v for k,v in gdata['data'].items() if k.startswith('gameWikiCategory'))['cp2077Group']
    gindex=[x for group in category['current'] for x in group['entries']]
    for name,obj in [('nd-index.json',ndindex),('vaexil.json',vindex),('g-index.json',gindex)]:
        (root/name).write_text(json.dumps(obj,indent=2),encoding='utf-8')
    jobs=[(x['url'],root/'cache'/('nd-'+x['slug']+'.html')) for x in ndindex]
    jobs += [('https://cyberpunk.vaexil.tv/weapons/'+x['slug'],root/'cache'/('v-'+x['slug']+'.html')) for x in vindex]
    jobs += [('https://gamestegy.com/cyberpunk-2077/wiki/'+str(x['id'])+'/'+x['slug'],root/'cache'/('g-'+x['slug']+'.html')) for x in gindex]
    with ThreadPoolExecutor(max_workers=2) as pool:
        for i,_ in enumerate(pool.map(lambda j:get(*j),jobs)):
            if (i+1)%25==0:print(f'{i+1}/{len(jobs)} public pages cached',flush=True)
    parse_nd.ROOT=root
    ndrecords=[parse_nd.parse(x) for x in ndindex]
    grecords=[]
    for x in gindex:
        d=parse_g.read(root/'cache'/('g-'+x['slug']+'.html'))
        grecords.append(next(v for k,v in d['data'].items() if k.startswith('gameWikiEntryPage')))
    (root/'nd-records.json').write_text(json.dumps(ndrecords,indent=2),encoding='utf-8')
    (root/'g-records.json').write_text(json.dumps(grecords,indent=2),encoding='utf-8')
    (root/'effects.json').write_text((TOOLS/'effects.json').read_text(encoding='utf-8'),encoding='utf-8')
    (root/'collection-ledger.json').write_text(json.dumps(ledger,indent=2),encoding='utf-8')
    os.environ['ARSENAL_RESEARCH_CACHE']=str(root);os.environ['ARSENAL_STAGING_DIR']=str(stage)
    # Deliberately fails if a newly added iconic lacks an authored ability summary.
    runpy.run_path(str(TOOLS/'normalize.py'),run_name='__main__')
    old=json.loads((TOOLS.parent/'weapons.json').read_text(encoding='utf-8'))
    new=json.loads((stage/'weapons.json').read_text(encoding='utf-8'))
    oldids={w['id']:w for w in old['weapons']};newids={w['id']:w for w in new['weapons']}
    diff={'added':[newids[i]['name'] for i in newids.keys()-oldids.keys()],'removed':[oldids[i]['name'] for i in oldids.keys()-newids.keys()],'changed':[newids[i]['name'] for i in newids.keys()&oldids.keys() if newids[i]!=oldids[i]],'status':'STAGED ONLY. Check the official current patch, source conventions, abilities and acquisition. Update metadata only after review.'}
    (stage/'diff.json').write_text(json.dumps(diff,indent=2),encoding='utf-8')
    print('Staged snapshot:',stage,'\nProduction files were not changed. Review diff.json and UPDATE-DATA.md.')
if __name__=='__main__':main()
