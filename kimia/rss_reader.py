#!/usr/bin/env python3
"""Convert an RSS/Atom feed to the articles attributes expected by RSS News Card.

Standard-library only: runs inside Home Assistant Core, not in an add-on.
Usage: python3 /config/kimia/rss_reader.py https://site.example/feed/
"""

import json
import re
import sys
from datetime import timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree

MAX_ARTICLES = 5
MAX_BYTES = 3_000_000


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.first_image = ""

    def handle_data(self, data):
        self.parts.append(data)

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "img" and not self.first_image:
            self.first_image = dict(attrs).get("src", "")
        if tag.lower() in {"p", "br", "div", "li"}:
            self.parts.append(" ")


def strip_ns(tag):
    return tag.rsplit("}", 1)[-1].rsplit(":", 1)[-1].lower()


def child(node, *names):
    names = {name.lower() for name in names}
    return next((item for item in node if strip_ns(item.tag) in names), None)


def text(node, *names):
    result = child(node, *names)
    return "" if result is None else "".join(result.itertext()).strip()


def plain(raw):
    parser = PlainText()
    parser.feed(unescape(raw or ""))
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip(), parser.first_image


def http_url(url, base):
    resolved = urljoin(base, unescape(url or "").strip())
    return resolved if urlparse(resolved).scheme in {"http", "https"} else ""


def iso_date(raw):
    if not raw:
        return ""
    try:
        date = parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        from datetime import datetime
        try:
            date = datetime.fromisoformat(raw.strip().replace("Z", "+00:00"))
        except ValueError:
            return ""
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return date.astimezone(timezone.utc).isoformat(timespec="seconds")


def parse(xml_data, base_url):
    root = ElementTree.fromstring(xml_data)
    kind = strip_ns(root.tag)
    if kind in {"rss", "rdf"}:
        channel = child(root, "channel")
        nodes = [n for n in channel if strip_ns(n.tag) == "item"] if channel is not None else []
        if not nodes:
            nodes = [n for n in root if strip_ns(n.tag) == "item"]
    elif kind == "feed":
        nodes = [n for n in root if strip_ns(n.tag) == "entry"]
    else:
        raise ValueError("Format RSS/Atom non reconnu")

    output = []
    for node in nodes[:MAX_ARTICLES]:
        title, _ = plain(text(node, "title"))
        if not title:
            continue
        raw_link = text(node, "link")
        if kind == "feed":
            # In Atom, the URL is held in a link element's href attribute.
            links = [n for n in node if strip_ns(n.tag) == "link"]
            best = next((n for n in links if n.attrib.get("rel", "alternate") == "alternate"), None)
            best = best if best is not None else (links[0] if links else None)
            raw_link = best.attrib.get("href", "") if best is not None else raw_link
        summary_raw = text(node, "description", "summary", "content", "encoded")
        description, desc_image = plain(summary_raw)
        image = ""
        for n in node:
            t = strip_ns(n.tag)
            if t in {"enclosure", "thumbnail", "content"} and (n.attrib.get("url") or n.attrib.get("href")):
                mime = n.attrib.get("type", "")
                if t == "thumbnail" or mime.startswith("image/") or not mime:
                    image = n.attrib.get("url") or n.attrib.get("href")
                    break
        output.append({
            "title": title[:220],
            "link": http_url(raw_link, base_url),
            "description": description[:300],
            "pubDate": iso_date(text(node, "pubDate", "published", "updated", "date")),
            "image": http_url(image or desc_image, base_url),
        })
    return {"articles": output}


def main():
    if len(sys.argv) != 2 or urlparse(sys.argv[1]).scheme != "https":
        print("Usage: rss_reader.py https://example.org/feed/", file=sys.stderr)
        return 2
    url = sys.argv[1]
    try:
        request = Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; KIMIA-Smart-RSS/1.0)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        })
        with urlopen(request, timeout=12) as response:
            data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Flux RSS trop volumineux")
        result = parse(data, url)
        if not result["articles"]:
            raise ValueError("Aucun article dans le flux")
    except Exception as exc:
        print(f"KIMIA RSS: {url}: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
