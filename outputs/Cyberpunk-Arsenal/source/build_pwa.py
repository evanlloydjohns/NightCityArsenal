"""Derive a static hosted PWA from the same self-contained, tested application."""
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def build_pwa(html):
    source = ROOT / 'pwa'
    target = ROOT.parent / 'pwa'
    target.mkdir(exist_ok=True)
    shutil.copytree(source / 'icons', target / 'icons', dirs_exist_ok=True)
    shutil.copyfile(source / 'manifest.webmanifest', target / 'manifest.webmanifest')
    # Keep the file:// version's strict CSP and source shell unchanged.
    old_csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
    new_csp = old_csp.replace('img-src data:', "img-src 'self' data:").replace("connect-src 'none'", "connect-src 'self'; worker-src 'self'; manifest-src 'self'")
    assert old_csp in html
    html = html.replace(old_csp, new_csp)
    html = html.replace('</head>', '''<meta name="theme-color" content="#251019">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" type="image/png" sizes="16x16" href="./icons/nc-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="./icons/nc-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="./icons/nc-48.png">
</head>''')
    footer = '''<span class="pwa-controls"><span id="pwa-status" role="status" aria-live="polite">Preparing offline application…</span> <button id="pwa-restart" class="text-button" hidden>Restart to update</button><button id="pwa-retry" class="text-button" hidden>Retry offline preparation</button></span>'''
    html = html.replace('<footer class="main-footer">', '<footer class="main-footer">' + footer)
    html = html.replace('</body>', '<script>' + (source / 'client.js').read_text(encoding='utf-8') + '</script>\n</body>')
    (target / 'index.html').write_text(html, encoding='utf-8')
    files = [target / 'index.html', target / 'manifest.webmanifest', *sorted((target / 'icons').glob('*'))]
    resources = {p.relative_to(target).as_posix(): digest(p.read_bytes()) for p in files}
    worker = (source / 'sw.js').read_text(encoding='utf-8')
    version = digest((json.dumps(resources, sort_keys=True) + worker).encode())[:20]
    worker = worker.replace('/*__VERSION__*/', json.dumps(version)).replace('/*__RESOURCES__*/', json.dumps(resources, sort_keys=True))
    (target / 'sw.js').write_text(worker, encoding='utf-8')
    archive_path = target.parent.parent / 'Night-City-Arsenal-PWA.zip'
    with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in [*files, target / 'sw.js']:
            archive.write(path, path.relative_to(target))
    print(f'PWA: {target}; cache version {version}; hosting ZIP: {archive_path}')
