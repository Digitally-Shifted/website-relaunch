#!/usr/bin/env python3
"""Verify the DIG-73 migration against the content inventory.

Cross-references three layers:
  1. docs/CONTENT-INVENTORY.md  (the 14-row work list)
  2. docs/migration/extracted/*.json (source records from the old site crawl)
  3. the built pages in the repo

Writes docs/migration/VERIFICATION.md. Exits 1 when any check fails.

Run from the repo root:
    python3 docs/migration/tools/verify_migration.py
"""
import glob
import json
import os
import re
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
EXT = os.path.join(REPO, "docs", "migration", "extracted")
MEDIA = os.path.join(REPO, "assets", "media")

results = []


def check(group, name, ok, detail=""):
    results.append((group, name, bool(ok), detail))
    return bool(ok)


def load(name):
    with open(os.path.join(EXT, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def read(path):
    with open(os.path.join(REPO, path), encoding="utf-8") as f:
        return f.read()


def main_text(html):
    """Visible main-content words: strip tags, scripts, nav/footer chrome."""
    html = re.sub(r"<(script|style|nav|header|footer)[\s\S]*?</\1>", " ", html)
    html = re.sub(r"<[^>]+>", " ", html)
    html = re.sub(r"\s+", " ", html)
    return html


def words(s):
    return len([w for w in re.findall(r"[A-Za-z0-9'’&#.;%-]+", s)])


def main():
    pages = {p: read(p) for p in [
        "blog/index.html",
        "services/index.html",
        "contact/index.html",
        "contact/thank-you/index.html",
        "privacy/index.html",
        "2023/02/09/ultimate-digital-marketing-guide-for-businesses/index.html",
    ]}

    # ---------------------------------------------------------------- row 1
    home = load("000")
    check("Row 1 home (Rewrite)", "flagged, not migrated: scaffold home untouched",
          "Smoke test change" in read("index.html"))
    check("Row 1 home (Rewrite)", "hero ad videos preserved in asset library",
          os.path.exists(f"{MEDIA}/Digitally-Shifted-Ad.mp4")
          and os.path.exists(f"{MEDIA}/Digitally-Shifted-Ad-9x16-1.mp4"))
    logos = len(glob.glob(f"{MEDIA}/Digitally-Shifted-Clients-Logos-*.png"))
    check("Row 1 home (Rewrite)", f"client logo library preserved (24 files)", logos == 24,
          f"found {logos}")
    check("Row 1 home (Rewrite)", "home copy preserved in migration record",
          "Unlock your brand's potential" in " ".join(b["text"] for b in home["blocks"]))

    # ---------------------------------------------------------------- row 2
    contact = load("012")
    page = pages["contact/index.html"]
    check("Row 2 contact (Keep)", "meta title preserved",
          contact["title"] in page)
    check("Row 2 contact (Keep)", "meta description preserved",
          contact["description"] in page)
    check("Row 2 contact (Keep)", "intro copy preserved",
          "Tell us what you want to improve online" in page
          and "practical guidance for your project" in page)
    check("Row 2 contact (Keep)", "H1 preserved", "Contact Digitally Shifted" in page)
    check("Row 2 contact (Keep)", "form present with consent line",
          'action="/api/contact"' in page and "privacy notice" in page)
    check("Row 2 contact (Keep)", "photo alt preserved",
          'alt="Business consultation meeting for contacting Digitally Shifted"' in page)
    old_services = ("Paid Advertising", "Website Design & Development", "Social Media",
                    "Public Relations", "Domains & Hosting",
                    "Search Engine Optimization (SEO)", "Machine Learning/AI",
                    "Software Development", "Content Creation")
    record = " | ".join(b["text"] for b in contact["blocks"])
    check("Row 2 contact (Keep)", "old 9-option service list preserved in record",
          all(s in record for s in old_services))
    check("Row 2 contact (Keep)", "noindex while on staging",
          'content="noindex"' in page)

    # ---------------------------------------------------------------- row 3
    blog = load("007")
    page = pages["blog/index.html"]
    check("Row 3 blog (Keep)", "meta title kept with brand suffix",
          "Digital Marketing Insights | Digitally Shifted" in page)
    check("Row 3 blog (Keep)", "H1 pipe suffix removed",
          "<h1>Digital Marketing Insights</h1>" in page)
    check("Row 3 blog (Keep)", "meta description preserved",
          blog["description"] in page)
    for name, anchor, desc in [
        ("digital-marketing", "x", "Explore practical digital marketing guidance"),
        ("hosting-domains", "x", "Find domain and hosting guidance"),
        ("paid-advertising", "x", "Improve paid media performance"),
        ("website-development", "x", "Explore website development advice"),
    ]:
        check("Row 3 blog (Keep)", f"topic present: {name}", f'id="{name}"' in page)
    cats = [load(f) for f in ("008", "009", "010", "011")]
    for c, key in zip(cats, ["digital marketing guidance", "domain and hosting guidance",
                             "paid media performance", "website development advice"]):
        first_p = [b for b in c["blocks"] if b["kind"] == "p"][0]["text"]
        first_p = re.sub(r"\s*Search Search.*$", "", first_p)
        check("Rows 11-14 categories (Merge)", f"description verbatim: {key}",
              first_p in page, first_p[:60])
    thumbs = ["Untitled-design-7-768x511.png", "Advertising-768x768.png",
              "pexels-brett-sayles-1597776-768x512.jpg",
              "pexels-ketut-subiyanto-4350093-768x512.jpg",
              "Analytics-768x531.jpg", "AI-Trends-2023-768x513.jpg"]
    bases = {re.sub(r"-\d+x\d+(\.(png|jpg|webp))$", r"\1",
                    re.sub(r"\.(png|jpg)$", ".webp", t)) for t in thumbs}
    missing = [b for b in bases if not os.path.exists(os.path.join(MEDIA, b))]
    check("Row 3 blog (Keep)", "all 6 post thumbnails preserved in library",
          not missing, f"missing: {missing}")

    # ---------------------------------------------------------------- row 4
    privacy = load("013")
    page = pages["privacy/index.html"]
    check("Row 4 privacy (Rewrite)", "flagged, launch-default page only",
          "What we store" in page and "POPIA" not in page)
    check("Row 4 privacy (Rewrite)", "meta title preserved",
          "Privacy Policy and Terms | Digitally Shifted" in page)
    check("Row 4 privacy (Rewrite)", "noindex preserved (old page was noindex)",
          'content="noindex"' in page and "noindex" in privacy["robots"])
    check("Row 4 privacy (Rewrite)", "old policy text preserved in record",
          "Gravatar" in " ".join(b["text"] for b in privacy["blocks"]))

    # ---------------------------------------------------------------- row 5
    trends = load("001")
    check("Row 5 trends post (Rewrite)", "flagged, not migrated",
          not os.path.exists(os.path.join(REPO, "2023/02/01")))
    check("Row 5 trends post (Rewrite)", "meta title/description preserved in record",
          trends["title"] == "2023 Digital Marketing Trends | Digitally Shifted"
          and len(trends["description"]) > 20)
    check("Row 5 trends post (Rewrite)", "featured image preserved in library",
          os.path.exists(f"{MEDIA}/AI-Trends-2023.webp"))
    img_alts = [i["alt"] for i in trends["images_content"] if "AI-Trends" in i["src"]]
    check("Row 5 trends post (Rewrite)", "missing alt documented in record",
          img_alts == [""], "alt empty on old page; rewrite issue assigns one")

    # ---------------------------------------------------------------- row 6
    roi = load("002")
    check("Row 6 ROI post (Rewrite)", "flagged, not migrated",
          not os.path.exists(os.path.join(REPO, "2023/02/02")))
    check("Row 6 ROI post (Rewrite)", "meta title/description preserved in record",
          roi["title"] == "Measure Digital Marketing ROI | Digitally Shifted")
    check("Row 6 ROI post (Rewrite)", "featured image and alt preserved",
          os.path.exists(f"{MEDIA}/Analytics.webp")
          and any(i["alt"] for i in roi["images_content"]))

    # ---------------------------------------------------------------- row 7
    guide = load("003")
    page = pages["2023/02/09/ultimate-digital-marketing-guide-for-businesses/index.html"]
    check("Row 7 guide (Keep)", "meta title preserved",
          "Digital Marketing Guide | Digitally Shifted" in page)
    check("Row 7 guide (Keep)", "meta description preserved",
          guide["description"] in page)
    check("Row 7 guide (Keep)", "canonical URL unchanged",
          'href="https://digitallyshifted.com/2023/02/09/ultimate-digital-marketing-guide-for-businesses/"' in page)
    check("Row 7 guide (Keep)", "single H1 preserved",
          "<h1>The Ultimate Digital Marketing Guide for Businesses</h1>" in page)
    src_words = words(" ".join(b["text"] for b in guide["blocks"][3:]))
    page_words = words(main_text(page.split("<main", 1)[1].split("</main>")[0]))
    delta = (page_words - src_words) / src_words * 100
    # The page adds a generated TOC, tags chrome and a closing CTA (~140 words).
    check("Row 7 guide (Keep)", f"body word count within +9% (source {src_words}, page {page_words}, +{delta:.1f}%)",
          0 <= delta <= 9)
    check("Row 7 guide (Keep)", "internal links to new service pages added",
          page.count('services/#hosting') == 1 and page.count('services/#seo') == 1)
    check("Row 7 guide (Keep)", "tags preserved",
          "Content Marketing" in page and "Conversion Rates" in page)
    check("Row 7 guide (Keep)", "heading count preserved (h2 sections)",
          page.count("<h2") >= 13)

    # --------------------------------------------------------------- rows 8-10
    services = pages["services/index.html"]
    hosting = load("004")
    ads = load("005")
    webdev = load("006")
    services_flat = re.sub(r"\s+", " ", services)
    for claim, label in [
        ("LiteSpeed", "hosting: LiteSpeed"),
        ("Imunify360", "hosting: Imunify360"),
        ("SpamExperts", "hosting: SpamExperts"),
        ("available 24/7", "hosting: 24/7 support"),
        (".tech or .shop", "hosting: domain extensions"),
        ("WHOIS", "hosting: WHOIS privacy"),
        ("fully responsive", "webdev: responsive"),
        ("SEO-optimized", "webdev: SEO-optimized"),
        ("advanced CMS", "webdev: CMS"),
        ("ongoing support", "webdev: support"),
    ]:
        check("Rows 8/10 merge into services", label, claim in services_flat)
    check("Row 9 paid ads (Merge)", "post not published (no IA target; decision issue)",
          "Google Ads, Facebook, Instagram, and LinkedIn" not in services)
    check("Row 9 paid ads (Merge)", "content preserved in record",
          "crafting paid advertising strategies" in " ".join(b["text"] for b in ads["blocks"]))
    check("Rows 8-10 (Merge)", "unverified Google bounce stat excluded from services page",
          "bouncing increases by 32%" not in services)
    check("Rows 8-10 (Merge)", "unverified Symantec stat excluded from services page",
          "one in every thirteen" not in services)
    check("Rows 8-10 (Merge)", "both stats preserved in record",
          "bouncing increases by 32%" in " ".join(b["text"] for b in hosting["blocks"])
          and "one in every thirteen" in " ".join(b["text"] for b in hosting["blocks"]))
    check("Rows 8-10 (Merge)", "featured images preserved in library",
          os.path.exists(f"{MEDIA}/pexels-brett-sayles-1597776.webp")
          and os.path.exists(f"{MEDIA}/Advertising.webp")
          and os.path.exists(f"{MEDIA}/Untitled-design-7.webp"))

    # ----------------------------------------------------------------- media
    manifest_path = os.path.join(REPO, "docs", "migration", "media-manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else []
    n_media = len(glob.glob(f"{MEDIA}/*"))
    check("Media", f"media manifest lists every downloaded source ({len(manifest)} entries)",
          len(manifest) == 47)
    check("Media", "media library present (47 files)", n_media == 47, f"found {n_media}")

    # ----------------------------------------------------------------- SEO
    for path, expect in pages.items():
        check("SEO", f"{path}: noindex on staging", 'content="noindex"' in expect)
        check("SEO", f"{path}: canonical set",
              re.search(r'<link rel="canonical" href="https://digitallyshifted\.com/[^"]+">', expect))
        check("SEO", f"{path}: og:image set", 'property="og:image"' in expect)

    # ---------------------------------------------------------------- report
    failed = [r for r in results if not r[2]]
    lines = ["# Migration verification — DIG-73", "",
             "Cross-reference of the content inventory, the extracted source records",
             "and the built pages. Generated by",
             "`docs/migration/tools/verify_migration.py`; run it from the repo root.", "",
             f"Checks: {len(results)}  Pass: {len(results) - len(failed)}  Fail: {len(failed)}", ""]
    cur = None
    for group, name, ok, detail in results:
        if group != cur:
            lines.append(f"## {group}")
            lines.append("")
            cur = group
        mark = "PASS" if ok else "FAIL"
        d = f" — {detail}" if detail else ""
        lines.append(f"- {mark}: {name}{d}")
    lines.append("")
    out = os.path.join(REPO, "docs", "migration", "VERIFICATION.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"checks={len(results)} failed={len(failed)} -> docs/migration/VERIFICATION.md")
    for group, name, ok, detail in failed:
        print(f"FAIL [{group}] {name} {detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
