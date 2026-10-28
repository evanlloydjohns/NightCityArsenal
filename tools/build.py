"""Build both self-contained distributions and deterministic sharing ZIPs.

Python's standard library is the only build dependency. Run from any directory.
"""
import argparse
import base64
from datetime import date
import hashlib
from html import escape
import json
from pathlib import Path
import re
import shutil
import textwrap
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src"
NAME = "Night-City-Arsenal"


def read(path):
    return path.read_text(encoding="utf-8")


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def block(path):
    return "\n" + read(path).removesuffix("\n") + "\n    "


def write_html(path, text):
    # Stable bytes on every platform, retaining the existing Windows product format.
    path.write_bytes(text.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8"))


def embedded_data(filename, collection, manifest_name):
    text = read(SOURCE / "data" / filename)
    database = json.loads(text)
    manifest = json.loads(read(SOURCE / "data" / manifest_name))["images"]
    records = database[collection]
    ids = [item["id"] for item in records]
    if len(ids) != len(set(ids)) or set(ids) != set(manifest):
        raise ValueError(f"Duplicate IDs or incomplete artwork mapping: {filename}")
    for item in records:
        image = item["image"]
        relative = image["src"]
        asset = (SOURCE / relative).resolve()
        if not asset.is_relative_to((SOURCE / "assets").resolve()):
            raise ValueError(f"Artwork must stay inside src/assets: {relative}")
        payload = asset.read_bytes()
        record = manifest[item["id"]]
        if relative != record["file"] or digest(payload) != record["sha256"]:
            raise ValueError(f"Artwork checksum mismatch: {item['name']}")
        uri = "data:" + record["mime"] + ";base64," + base64.b64encode(payload).decode("ascii")
        # Preserve the reviewed JSON formatting; replace only local artwork references.
        pattern = r'("src"\s*:\s*)' + re.escape(json.dumps(relative))
        text, count = re.subn(pattern, lambda match: match[1] + json.dumps(uri), text)
        if count < 1:
            raise ValueError(f"Missing artwork reference: {relative}")
    text = text.replace("<", "\\u003c")
    return "\n" + textwrap.indent(text.rstrip("\n"), "      ") + "\n    "


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f"Expected exactly one template marker: {old[:70]}")
    return text.replace(old, new, 1)


def archive(path, entries):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, payload in sorted(entries.items()):
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            bundle.writestr(entry, payload, compresslevel=9)
    with zipfile.ZipFile(path) as bundle:
        if bundle.testzip() is not None:
            raise ValueError(f"Archive integrity check failed: {path}")


def build(output):
    output = output.resolve()
    if output == ROOT or output.is_relative_to(SOURCE) or output in SOURCE.parents:
        raise ValueError("Build output must be separate from maintained source")
    output.mkdir(parents=True, exist_ok=True)
    metadata = json.loads(read(SOURCE / "data/weapons.json"))["meta"]
    parts = {
        "STYLES": block(SOURCE / "styles.css"),
        "DATA": embedded_data("weapons.json", "weapons", "weapon-images.json"),
        "MOD_DATA": embedded_data("modifications.json", "modifications", "modification-images.json"),
        "PRESENTATION": block(SOURCE / "presentation.js"),
        "CATALOG": block(SOURCE / "catalog.js"),
        "LOGIC": block(SOURCE / "app.js"),
        "STORAGE": block(SOURCE / "storage.js"),
        "PLANNER_CORE": block(SOURCE / "planner-core.js"),
        "BUILD_LIBRARY": block(SOURCE / "build-library.js"),
        "EXPANSION": block(SOURCE / "expansion.js"),
    }
    html = read(SOURCE / "template.html")
    for name, content in parts.items():
        html = replace_once(html, "/*__" + name + "__*/", content)
    html = html.replace("/*__TARGET_PATCH__*/", escape(metadata["targetPatch"]))
    html = html.replace("/*__SNAPSHOT_DATE__*/", date.fromisoformat(metadata["researchedOn"]).strftime("%d %b %Y").upper())
    if re.search(r"/\*__[A-Z_]+__\*/", html):
        raise ValueError("Unresolved application template marker")
    offline = output / (NAME + ".html")
    write_html(offline, html)

    pwa_source = SOURCE / "pwa"
    target = output / "pwa"
    target.mkdir(exist_ok=True)
    file_csp = "img-src data:; connect-src 'none'"
    hosted_csp = "img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'"
    hosted = replace_once(html, file_csp, hosted_csp)
    hosted = replace_once(hosted, "  </head>", read(pwa_source / "head.html") + "  </head>")
    hosted = replace_once(hosted, "          <span>Unofficial fan work", read(pwa_source / "footer.html") + "<span>Unofficial fan work")
    hosted = replace_once(hosted, "  </body>", "    <script>" + block(pwa_source / "client.js") + "</script>\n  </body>")
    write_html(target / "index.html", hosted)
    assets = [pwa_source / "manifest.webmanifest", *sorted((pwa_source / "icons").iterdir())]
    # Only this generated directory is replaced; never inventory old output files.
    if (target / "icons").exists():
        if not (target / "icons").resolve().is_relative_to(output):
            raise ValueError("Generated icons must stay inside the output folder")
        shutil.rmtree(target / "icons")
    for asset in assets:
        destination = target / asset.relative_to(pwa_source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(asset.read_bytes())
    resources = {
        file.relative_to(target).as_posix(): digest(file.read_bytes())
        for file in [target / "index.html", *(target / asset.relative_to(pwa_source) for asset in assets)]
    }
    worker = read(pwa_source / "sw.js")
    version = digest((json.dumps(resources, sort_keys=True) + worker).encode("utf-8"))[:20]
    worker = replace_once(worker, "/*__VERSION__*/", json.dumps(version))
    worker = replace_once(worker, "/*__RESOURCES__*/", json.dumps(resources, sort_keys=True))
    write_html(target / "sw.js", worker)
    archive(output / (NAME + ".zip"), {NAME + "/" + offline.name: offline.read_bytes()})
    pwa_entries = {name: (target / name).read_bytes() for name in resources}
    pwa_entries["sw.js"] = (target / "sw.js").read_bytes()
    archive(output / (NAME + "-PWA.zip"), pwa_entries)
    print(f"Offline: {offline} ({digest(offline.read_bytes())[:12]})")
    print(f"PWA: {target} (cache {version})")
    print("Sharing ZIPs refreshed; no research, reports or development files packaged.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist", help="Output folder (default: dist/)")
    build(parser.parse_args().output)
