"""Optional developer tool: bundle the reviewed source-sized artwork cache.

python source/tools/bundle_modification_images.py work/modification-image-cache
Source mappings and attribution remain in modification-images.json. Review new
item/page mappings before running the downloader. No runtime download is used.
"""
import hashlib,json,sys
from pathlib import Path
from bundle_images import image_info

root=Path(__file__).resolve().parents[1]
cache=Path(sys.argv[1]).resolve()
manifest_path=root/'modification-images.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
for item_id,asset in manifest['images'].items():
    payload=(cache/(item_id+'.bin')).read_bytes()
    mime,width,height=image_info(payload)
    assert mime=='image/webp' and max(width,height)<=256
    target=(root/asset['file']).resolve()
    assert root in target.parents
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(payload)
    asset.update(mime=mime,width=width,height=height,
                 bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest())
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Updated',len(manifest['images']),'reviewed equipment image assets.')
