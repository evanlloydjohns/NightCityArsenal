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
html=html.replace('/*__STYLES__*/',(ROOT/'styles.css').read_text(encoding='utf-8')+'\n'+(ROOT/'expansion.css').read_text(encoding='utf-8'))
html=html.replace('/*__DATA__*/',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'))
html=html.replace('/*__LOGIC__*/',(ROOT/'app.js').read_text(encoding='utf-8'))
mods=json.loads((ROOT/'modifications.json').read_text(encoding='utf-8'))
mod_images=json.loads((ROOT/'modification-images.json').read_text(encoding='utf-8'))
assert set(mod_images['images']) <= {m['id'] for m in mods['modifications']}
for modification in mods['modifications']:
    asset=mod_images['images'].get(modification['id'])
    if asset:
        image_path=(ROOT/asset['file']).resolve()
        assert ROOT.resolve() in image_path.parents
        payload=image_path.read_bytes()
        assert hashlib.sha256(payload).hexdigest()==asset['sha256'], modification['name']
        modification['image']={k:asset[k] for k in ['kind','attribution','sourceUrl','sourcePage','width','height']}
        modification['image']['src']='data:'+asset['mime']+';base64,'+base64.b64encode(payload).decode('ascii')
        modification['imageStatus']='Source-linked in-game item artwork; copyright CD PROJEKT RED. Source: Gamestegy.'
mods['meta']['itemImageCount']=len(mod_images['images'])
mods['meta']['display']=json.loads((ROOT/'modification-display.json').read_text(encoding='utf-8'))
# Presentation rows retain published values; refresh failures must not silently invent scaling.
mod_lookup={m['id']:m for m in mods['modifications']}
for item_id,view in mods['meta']['display']['primaryModFields'].items():
    item=mod_lookup[item_id]
    if view.get('descriptionRows'):
        assert set(view['descriptionRows'])==set(item['tiers']), 'Refresh display tiers: '+item_id
        for tier,rows in view['descriptionRows'].items():
            assert all(row['value'] in item['tierEffects'][tier]['summary'] for row in rows), 'Unsourced display value: '+item_id
    else:
        for effect in item['tierEffects'].values():
            assert set(view['fields']) <= {field['label'] for field in effect['fields']}
            assert all(row['value'] in effect['summary'] for row in view.get('extraRows',[]))
for item_id,notes in mods['meta']['display']['tierNotes'].items():
    assert set(notes) <= set(mod_lookup[item_id]['tiers'])

html=html.replace('/*__MOD_DATA__*/',json.dumps(mods,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'))
html=html.replace('/*__PLANNER_CORE__*/',(ROOT/'planner-core.js').read_text(encoding='utf-8'))
html=html.replace('/*__EXPANSION__*/',(ROOT/'expansion.js').read_text(encoding='utf-8'))
target=ROOT.parent/'index.html'
target.write_text(html,encoding='utf-8')
print(f'Built {target} ({target.stat().st_size:,} bytes)')
release_meta={**data['meta'],'modificationCount':len(mods['modifications']),'equipmentDataVersion':mods['meta']['dataVersion'],'buildSchemaVersion':1,'equipmentImageCount':len(mod_images['images']),'equipmentInventoryRevision':mods['meta'].get('inventoryRevision')}
package_release(target,release_meta)
