"""Bundle source-listed weapon inventory artwork without altering the images.

Development only: python tools/bundle_images.py --records RESEARCH_CACHE/g-records.json
The application itself never downloads images. Game art remains CDPR property.
"""
import argparse,hashlib,json,struct,time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request,urlopen

SOURCE=Path(__file__).resolve().parents[1]
def image_info(payload):
    if payload[:8]==b'\x89PNG\r\n\x1a\n':return 'image/png',*struct.unpack('>II',payload[16:24])
    if payload[:4]==b'RIFF' and payload[8:12]==b'WEBP':
        chunk=payload[12:16]
        if chunk==b'VP8X':return 'image/webp',int.from_bytes(payload[24:27],'little')+1,int.from_bytes(payload[27:30],'little')+1
        if chunk==b'VP8L':
            bits=int.from_bytes(payload[21:25],'little');return 'image/webp',(bits&0x3fff)+1,((bits>>14)&0x3fff)+1
        if chunk==b'VP8 ':
            i=payload.index(b'\x9d\x01\x2a',20)+3;width,height=struct.unpack('<HH',payload[i:i+4]);return 'image/webp',width&0x3fff,height&0x3fff
    raise ValueError('Unrecognized source image encoding')
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--records',required=True,type=Path)
    args=ap.parse_args()
    data=json.loads((SOURCE/'weapons.json').read_text(encoding='utf-8'))
    records={r['cp2077_equipment_game_entity_id']:r for r in json.loads(args.records.read_text(encoding='utf-8')) if r.get('cp2077_equipment_game_entity_id')}
    overrides=json.loads((SOURCE/'tools'/'image-overrides.json').read_text(encoding='utf-8'))
    weapons=data['weapons']
    def download(w):
        r=records[w['id']];override=overrides.get(w['id'],{});url=override.get('sourceUrl') or r.get('cp2077_equipment_icon')
        if not url or urlparse(url).netloc not in ['cdn.gamestegy.com','cyberpunk.gameslantern.com','www.gamesatlas.com']:raise ValueError('Unrecognized image source for '+w['name'])
        destination=SOURCE/'assets'/('iconics' if w['iconic'] else 'non-iconics');destination.mkdir(parents=True,exist_ok=True)
        extension='.webp' if urlparse(url).path.endswith('.webp') else '.png'
        file=destination/(w['slug']+extension)
        if not file.exists():
            request=Request(url,headers={'User-Agent':'NightCityArsenalResearch/1.0 (personal offline fan reference)'})
            with urlopen(request,timeout=45) as response:payload=response.read()
            image_info(payload)
            file.write_bytes(payload);time.sleep(.2)
        payload=file.read_bytes()
        mime,width,height=image_info(payload)
        if min(width,height)<16:raise ValueError('Empty or unusably small image: '+w['name'])
        provider=override.get('provider','Gamestegy')
        return w['id'],{'name':w['name'],'iconic':w['iconic'],'file':file.relative_to(SOURCE).as_posix(),'mime':mime,'sourceUrl':url,'sourcePage':override.get('sourcePage') or next(s['url'] for s in w['sources'] if s['name'].startswith('Gamestegy')),'kind':'In-game inventory artwork','attribution':'Cyberpunk 2077 game artwork © CD PROJEKT RED; source: '+provider,'rights':'Game artwork; used in this unofficial, noncommercial fan reference. Not licensed as application code.','width':width,'height':height,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()}
    with ThreadPoolExecutor(max_workers=2) as pool:
        entries=dict(pool.map(download,weapons))
    for image in entries.values():
        shared=[other['name'] for other in entries.values() if other['name']!=image['name'] and other['sha256']==image['sha256']]
        if shared:image['sharedWith']=shared
    manifest={'version':2,'retrievedOn':'2026-10-25','count':len(entries),'iconicCount':sum(w['iconic'] for w in weapons),'nonIconicCount':sum(not w['iconic'] for w in weapons),'rightsUrl':'https://www.cdprojektred.com/en/fan-content','images':entries}
    (SOURCE/'weapon-images.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Bundled {len(entries)} weapon images, {sum(x["bytes"] for x in entries.values()):,} bytes; source manifest written.')
if __name__=='__main__':main()
