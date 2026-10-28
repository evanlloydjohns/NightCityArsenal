"""Verify clean builds from another working directory and exact packaged bytes."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class BuildTest(unittest.TestCase):
    def test_clean_build_matches_checked_in_products_and_packages(self):
        scratch = ROOT / ".tmp/tests"
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="build-", dir=scratch) as directory:
            output = Path(directory) / "dist"
            subprocess.run([sys.executable, str(ROOT / "tools/build.py"), "--output", str(output)], cwd=directory, check=True)
            actual = {p.relative_to(output).as_posix(): p.read_bytes() for p in output.rglob("*") if p.is_file()}
            expected = {p.relative_to(ROOT / "dist").as_posix(): p.read_bytes() for p in (ROOT / "dist").rglob("*") if p.is_file()}
            self.assertEqual(actual.keys(), expected.keys())
            for name, payload in actual.items():
                self.assertEqual(hashlib.sha256(payload).digest(), hashlib.sha256(expected[name]).digest(), name)
            for archive in output.glob("*.zip"):
                with zipfile.ZipFile(archive) as bundle:
                    self.assertIsNone(bundle.testzip())
                    for member in bundle.namelist():
                        relative = member.removeprefix("Night-City-Arsenal/") if "-PWA" not in archive.name else "pwa/" + member
                        self.assertEqual(bundle.read(member), actual[relative])
            worker = (output / "pwa/sw.js").read_text()
            resources = json.loads(re.search(r"const RESOURCES = (.*);", worker)[1])
            for name, checksum in resources.items():
                self.assertEqual(hashlib.sha256(actual["pwa/" + name]).hexdigest(), checksum)
            # A previous build (or removed source icon) must not expand the product.
            stale = output / "pwa/icons/obsolete/nested"
            stale.mkdir(parents=True)
            (stale / "old.png").write_bytes(b"not maintained source")
            (output / "pwa/icons/stale.png").write_bytes(b"old icon")
            subprocess.run([sys.executable, str(ROOT / "tools/build.py"), "--output", str(output)], cwd=directory, check=True)
            repeated = {p.relative_to(output).as_posix(): p.read_bytes() for p in output.rglob("*") if p.is_file()}
            self.assertEqual(actual, repeated)


if __name__ == "__main__":
    unittest.main()
