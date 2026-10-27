"""Generate the stable friend-facing files and complete source archive after a build."""
import hashlib,json,zipfile
from datetime import datetime,timezone
from pathlib import Path

APP_FILENAME='Night-City-Arsenal.html'
ZIP_FILENAME='Night-City-Arsenal.zip'

def digest(payload):return hashlib.sha256(payload).hexdigest()

def package_release(application,meta):
    application=Path(application).resolve()
    project=application.parent
    output=project.parent
    shared=output/'Share-with-friends'
    shared.mkdir(parents=True,exist_ok=True)
    html=application.read_bytes()
    app_hash=digest(html)
    if any(marker in html for marker in [b'/*__STYLES__*/',b'/*__DATA__*/',b'/*__LOGIC__*/']):
        raise ValueError('Refusing to package an unbuilt template.')
    (shared/APP_FILENAME).write_bytes(html)
    readme=f'''NIGHT CITY ARSENAL — OFFLINE WEAPON REFERENCE

OPEN: Double-click {APP_FILENAME} after saving it to your computer.
No installer, server, account, Node.js or Python is needed. All data and images
are inside the HTML file. Use a current desktop browser such as Edge, Chrome
or Firefox. If Windows opens it in an editor, use Open with > your browser.

If received as a ZIP: extract the ZIP first, then open {APP_FILENAME}.
If Discord shows a preview or source text, download the file before opening it.

{meta['iconicCount']} iconic weapons / {meta['totalCount']} total weapons.
Inventory target: Cyberpunk 2077 patch {meta['targetPatch']}.
Data snapshot: {meta['datasetVersion']}.
Equipment: {meta.get('modificationCount',0)} modifications and attachments.
Equipment snapshot: {meta.get('equipmentDataVersion','Not bundled')}.
Application fingerprint: {app_hash[:12]}.

Search, multi-select filters, comparisons, favorites and slot icons work offline.
Mods: browse equipment effects, tiers, compatibility and acquisition.
Builds: plan supported weapon slots, save names/notes/tags, duplicate and compare.
Planning never recalculates base damage, DPS or other weapon statistics.
Each person's favorites and preferences stay in their own browser; they are not
included when this file is sent to another person. There is no tracking or sync.
Saved builds are also personal browser data and are not included in this HTML.

UPDATES: Replace the old HTML in the same folder with the same filename.
Browser file-storage behavior varies. Before moving the file or changing browser,
use Data notes > Export preferences; import that backup in the updated copy.
Back up builds separately with Builds > Export JSON, then Builds > Import JSON.
Updates arrive as a new file from the person sharing it; there is no auto-updater.

WINDOWS APP OPTION: A separate hosted PWA supports Edge installation and cached
offline launches. This downloaded HTML remains the self-contained file version.
See PWA.md for installation, updates and exporting/importing between origins.

DATA: Community-sourced weapon stats are not individually measured in patch 2.5.
Unknown values, tier gaps and source differences are explained under Data notes.
The included DATA-SOURCES.md and VALIDATION-REPORT.md provide more detail.

UNOFFICIAL FAN WORK: Not approved or endorsed by CD PROJEKT RED.
Game artwork belongs to CD PROJEKT RED. Image credits and source links remain
inside the app. Shared free of charge for noncommercial fan use.
'''
    (shared/'START-HERE.txt').write_text(readme,encoding='utf-8')
    friends_zip=shared/ZIP_FILENAME
    with zipfile.ZipFile(friends_zip,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        # No source template or developer dependencies in the friend-facing ZIP.
        archive.writestr('Night-City-Arsenal/'+APP_FILENAME,html)
        archive.writestr('Night-City-Arsenal/START-HERE.txt',readme.encode('utf-8'))
        for name in ['DATA-SOURCES.md','VALIDATION-REPORT.md','PERFORMANCE-REPORT.md','VISUAL-BASELINE.md','MODIFICATIONS-DATA.md','PWA.md']:
            archive.write(project/name,'Night-City-Arsenal/'+name)
    with zipfile.ZipFile(friends_zip) as archive:
        if archive.testzip() is not None:raise ValueError('Friend ZIP integrity check failed.')
        if digest(archive.read('Night-City-Arsenal/'+APP_FILENAME))!=app_hash:
            raise ValueError('Friend ZIP contains a different application.')
    release={'application':'Night City Arsenal','builtAtUtc':datetime.now(timezone.utc).isoformat(timespec='seconds'),'applicationFingerprint':app_hash[:12],'dataVersion':meta['datasetVersion'],'targetPatch':meta['targetPatch'],'iconicCount':meta['iconicCount'],'totalWeapons':meta['totalCount'],'delivery':'Self-contained offline HTML; ZIP contains the same application and instructions','files':{APP_FILENAME:{'bytes':len(html),'sha256':app_hash},ZIP_FILENAME:{'bytes':friends_zip.stat().st_size,'sha256':digest(friends_zip.read_bytes())}}}
    release.update(modificationCount=meta.get('modificationCount',0),equipmentDataVersion=meta.get('equipmentDataVersion'),buildSchemaVersion=meta.get('buildSchemaVersion'),equipmentImageCount=meta.get('equipmentImageCount'),equipmentInventoryRevision=meta.get('equipmentInventoryRevision'))
    (shared/'release.json').write_text(json.dumps(release,indent=2),encoding='utf-8')
    tracked=sorted(p for p in project.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt' and '__pycache__' not in p.parts and p.suffix!='.pyc')
    (project/'SHA256SUMS.txt').write_text('\n'.join(digest(p.read_bytes())+'  '+p.relative_to(project).as_posix() for p in tracked)+'\n',encoding='utf-8')
    source_zip=output/'Cyberpunk-Arsenal.zip'
    with zipfile.ZipFile(source_zip,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for file in [*tracked,project/'SHA256SUMS.txt']:
            archive.write(file,Path(project.name)/file.relative_to(project))
    with zipfile.ZipFile(source_zip) as archive:
        if archive.testzip() is not None:raise ValueError('Complete project ZIP integrity check failed.')
    print(f'Share HTML: {shared/APP_FILENAME} ({len(html):,} bytes)')
    print(f'Share ZIP: {friends_zip} ({friends_zip.stat().st_size:,} bytes)')
    print(f'Application fingerprint: {app_hash[:12]}; full source archive refreshed.')
    return release
