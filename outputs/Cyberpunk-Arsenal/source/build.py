"""Build the single-file offline app. Python is needed only for development."""
import base64,hashlib,json,re,sys
from pathlib import Path
sys.dont_write_bytecode=True
from package_release import package_release
ROOT = Path(__file__).resolve().parent
data=json.loads((ROOT/'weapons.json').read_text(encoding='utf-8'))
images=json.loads((ROOT/'weapon-images.json').read_text(encoding='utf-8'))
iconics={w['id'] for w in data['weapons'] if w['iconic']}
assert set(images['images'])=={w['id'] for w in data['weapons']}, 'Every weapon must have its own mapped inventory image'
for weapon in data['weapons']:
    image=images['images'].get(weapon['id'])
    if image:
        path=(ROOT/image['file']).resolve()
        assert ROOT.resolve() in path.parents, 'Image path must stay inside source project'
        payload=path.read_bytes()
        assert hashlib.sha256(payload).hexdigest()==image['sha256'], 'Image checksum mismatch: '+weapon['name']
        weapon['image']={k:image[k] for k in ['kind','attribution','sourceUrl','sourcePage','width','height']}
        if image.get('sharedWith'):weapon['image']['sharedWith']=image['sharedWith']
        weapon['image']['src']='data:'+image['mime']+';base64,'+base64.b64encode(payload).decode('ascii')
data['meta']['iconicImageCount']=len(iconics)
data['meta']['nonIconicImageCount']=len(data['weapons'])-len(iconics)
data['meta']['weaponImageCount']=len(data['weapons'])
html=(ROOT/'template.html').read_text(encoding='utf-8')
html=re.sub(r'<!--__SOURCE_ENTRY_START__-->.*?<!--__SOURCE_ENTRY_END__-->\n?', '', html, flags=re.S)
html=html.replace('/*__STYLES__*/',(ROOT/'styles.css').read_text(encoding='utf-8'))
html=html.replace('/*__DATA__*/',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'))
html=html.replace('/*__LOGIC__*/',(ROOT/'app.js').read_text(encoding='utf-8'))
target=ROOT.parent/'index.html'
target.write_text(html,encoding='utf-8')
print(f'Built {target} ({target.stat().st_size:,} bytes)')
package_release(target,data['meta'])
