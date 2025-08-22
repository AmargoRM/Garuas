"""Ensure all HTML pages are listed in sitemap.xml."""

from pathlib import Path
import xml.etree.ElementTree as ET


BASE_URL = "https://garuas.com/"


def _sitemap_paths(root: Path) -> set[str]:
    tree = ET.parse(root / "sitemap.xml")
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [loc.text for loc in tree.findall(".//sm:url/sm:loc", ns)]
    paths: set[str] = set()
    for url in urls:
        if not url.startswith(BASE_URL):
            continue
        rel = url[len(BASE_URL):]
        if rel and not rel.endswith(".html") and not rel.endswith("/"):
            rel += "/"
        paths.add(rel)
    return paths


def _html_paths(root: Path) -> set[str]:
    paths: set[str] = set()
    for file in root.rglob("*.html"):
        rel = file.relative_to(root)
        if rel.name == "index.html":
            parent = "" if rel.parent == Path(".") else f"{rel.parent}/"
            paths.add(parent.replace("\\", "/"))
        else:
            paths.add(str(rel).replace("\\", "/"))
    return paths


def test_all_html_files_included_in_sitemap():
    root = Path(__file__).resolve().parents[1]
    sitemap_paths = _sitemap_paths(root)
    html_paths = _html_paths(root)
    missing = sorted(html_paths - sitemap_paths)
    assert not missing, f"Missing from sitemap.xml: {missing}"


def test_all_urls_have_required_tags():
    root = Path(__file__).resolve().parents[1]
    tree = ET.parse(root / "sitemap.xml")
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    required = ["loc", "lastmod", "changefreq", "priority"]
    for url in tree.findall(".//sm:url", ns):
        missing = [tag for tag in required if url.find(f"sm:{tag}", ns) is None]
        assert not missing, f"Missing tags {missing} in sitemap entry"

