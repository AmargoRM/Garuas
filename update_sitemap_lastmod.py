#!/usr/bin/env python3
"""Update sitemap.xml <lastmod> dates based on file modification times."""
from __future__ import annotations

import datetime as _dt
import subprocess
from pathlib import Path
import xml.etree.ElementTree as ET

ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")

BASE_URL = "https://garuas.com/"
ROOT = Path(__file__).resolve().parent


def _file_from_url(url: str) -> Path | None:
    if not url.startswith(BASE_URL):
        return None
    rel = url[len(BASE_URL):]
    if not rel or rel == "/":
        return ROOT / "index.html"
    if rel.endswith("/"):
        rel += "index.html"
    return ROOT / rel


def _last_commit_date(path: Path) -> str:
    try:
        out = subprocess.check_output([
            "git",
            "log",
            "-1",
            "--format=%cs",
            "--",
            str(path.relative_to(ROOT)),
        ], text=True).strip()
        if out:
            return out
    except subprocess.CalledProcessError:
        pass
    mtime = path.stat().st_mtime
    return _dt.datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")


def main() -> None:
    tree = ET.parse(ROOT / "sitemap.xml")
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for url in tree.findall(".//sm:url", ns):
        loc = url.find("sm:loc", ns)
        if loc is None or loc.text is None:
            continue
        path = _file_from_url(loc.text)
        if path is None or not path.exists():
            continue
        lastmod = url.find("sm:lastmod", ns)
        date = _last_commit_date(path)
        if lastmod is None:
            lastmod = ET.SubElement(url, "lastmod")
        lastmod.text = date
    ET.indent(tree, space="  ")
    outfile = ROOT / "sitemap.xml"
    tree.write(outfile, encoding="UTF-8", xml_declaration=True)
    with outfile.open("a", encoding="utf-8") as f:
        f.write("\n")


if __name__ == "__main__":
    main()
