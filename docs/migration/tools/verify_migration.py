#!/usr/bin/env python3
"""Verify the DIG-73 migration against the content inventory.

Cross-references three layers:
  1. docs/CONTENT-INVENTORY.md  (the 14-row work list)
  2. docs/migration/extracted/*.json (source records from the old site crawl)
  3. the pages in the repo. Legacy pages live in legacy-static/; the
     pre-port reference copies of Astro-ported pages live in
     docs/migration/generated/ (DIG-71); ported routes are checked at
     their Astro sources (DIG-72 port workflow).

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
LEGACY = os.path.join(REPO, "legacy-static")
MEDIA = os.path.join(LEGACY, "assets", "media")

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
        "docs/migration/generated/services-index.html",
        "docs/migration/generated/contact-index.html",
        "docs/migration/generated/contact-thank-you-index.html",
        "docs/migration/generated/privacy-index.html",
        "legacy-static/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/index.html",
        "legacy-static/2023/02/09/ultimate-digital-marketing-guide-for-businesses/index.html",
        "legacy-static/2023/02/02/how-to-evaluate-the-effectiveness-of-your-digital-marketing-efforts/index.html",
    ]}

    # ---------------------------------------------------------------- row 1
    home = load("000")
    check("Row 1 home (Rewrite)", "flagged, not migrated: Astro home serves (scaffold home removed, DIG-71)",
          'title="Websites that work as hard as you do"' in read("src/pages/index.astro"))
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
    page = pages["docs/migration/generated/contact-index.html"]
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
    # The legacy blog page retired when the Astro route took over /blog
    # (DIG-72 port workflow). The record keeps the old page; the live checks
    # run against the Astro sources that serve the route now.
    blog = load("007")
    blog_src = read("src/pages/blog.astro")
    topic_srcs = {name: read(f"src/pages/blog/{name}.astro") for name in
                  ("digital-marketing", "hosting-domains", "paid-advertising",
                   "website-development")}
    check("Row 3 blog (Keep)", "legacy blog record preserved (page retired; Astro route serves /blog)",
          blog["title"] == "Digital Marketing Insights | Digitally Shifted"
          and len(blog["description"]) > 20)
    for name, anchor, desc in [
        ("digital-marketing", "x", "Explore practical digital marketing guidance"),
        ("hosting-domains", "x", "Find domain and hosting guidance"),
        ("paid-advertising", "x", "Improve paid media performance"),
        ("website-development", "x", "Explore website development advice"),
    ]:
        check("Row 3 blog (Keep)", f"topic present: {name}",
              f"slug: '{name}'" in blog_src and desc in topic_srcs[name])
    cats = [load(f) for f in ("008", "009", "010", "011")]
    for c, name, key in zip(cats,
                            ["digital-marketing", "hosting-domains",
                             "paid-advertising", "website-development"],
                            ["digital marketing guidance", "domain and hosting guidance",
                             "paid media performance", "website development advice"]):
        first_p = [b for b in c["blocks"] if b["kind"] == "p"][0]["text"]
        first_p = re.sub(r"\s*Search Search.*$", "", first_p)
        check("Rows 11-14 categories (Merge)", f"description verbatim: {key}",
              first_p in topic_srcs[name], first_p[:60])
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
    page = pages["docs/migration/generated/privacy-index.html"]
    check("Row 4 privacy (Rewrite)", "flagged, launch-default page only",
          "What we store" in page and "POPIA" not in page)
    check("Row 4 privacy (Rewrite)", "meta title preserved",
          "Privacy Policy and Terms | Digitally Shifted" in page)
    check("Row 4 privacy (Rewrite)", "noindex preserved (old page was noindex)",
          'content="noindex"' in page and "noindex" in privacy["robots"])
    check("Row 4 privacy (Rewrite)", "old policy text preserved in record",
          "Gravatar" in " ".join(b["text"] for b in privacy["blocks"]))

    # ---------------------------------------------------------------- row 5
    # The year refresh is published at the exact old URL (DIG-107); the
    # interim 301 row left the redirect map on publish.
    trends = load("001")
    page = pages["legacy-static/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/index.html"]
    check("Row 5 trends post (Rewrite published)", "old meta title/description preserved in record",
          trends["title"] == "2023 Digital Marketing Trends | Digitally Shifted"
          and len(trends["description"]) > 20)
    check("Row 5 trends post (Rewrite published)", "refreshed meta title on the published page",
          "<title>Digital Marketing Trends 2027 SA | Digitally Shifted</title>" in page)
    check("Row 5 trends post (Rewrite published)", "canonical keeps the exact old URL",
          'rel="canonical" href="https://digitallyshifted.com/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/"' in page)
    check("Row 5 trends post (Rewrite published)", "featured image present",
          'src="../../../../assets/media/AI-Trends-2023.webp"' in page
          and os.path.exists(f"{MEDIA}/AI-Trends-2023.webp"))
    check("Row 5 trends post (Rewrite published)", "assigned alt on the published page (old page had none)",
          'alt="Black and white photo of a robotic arm handing a coffee cup to a bearded businessman reading a report, showing AI at work."' in page)

    # ---------------------------------------------------------------- row 6
    # The approved light rewrite (DIG-108 copy) is published at the original
    # URL; the interim 301 row left the redirect map on publish (DIG-117).
    roi = load("002")
    page = pages["legacy-static/2023/02/02/how-to-evaluate-the-effectiveness-of-your-digital-marketing-efforts/index.html"]
    check("Row 6 ROI post (Rewrite published)", "meta title preserved",
          roi["title"] == "Measure Digital Marketing ROI | Digitally Shifted"
          and "<title>Measure Digital Marketing ROI | Digitally Shifted</title>" in page)
    check("Row 6 ROI post (Rewrite published)", "H1 preserved",
          roi["h1"].startswith("How to Evaluate the Effectiveness of Your Digital Marketing Efforts")
          and "<h1>How to Evaluate the Effectiveness of Your Digital Marketing Efforts</h1>" in page)
    check("Row 6 ROI post (Rewrite published)", "featured image present",
          'src="../../../../assets/media/Analytics.webp"' in page
          and os.path.exists(f"{MEDIA}/Analytics.webp"))
    check("Row 6 ROI post (Rewrite published)", "alt preserved",
          'alt="Analytics dashboard representing digital marketing insights"' in page
          and roi["images_content"][0]["alt"] == "Analytics dashboard representing digital marketing insights")
    check("Row 6 ROI post (Rewrite published)", "internal links present",
          'href="../../../../blog/digital-marketing/"' in page
          and 'href="../../../../2023/02/09/ultimate-digital-marketing-guide-for-businesses/#analytics-and-tracking"' in page
          # DIG-83 retired /services/paid-advertising/ from the launch build;
          # its URL 301s to the services hub, so the copy anchor targets the
          # hub too (DIG-83 review retarget, applied before the DIG-117 commit).
          and 'href="../../../../services/">paid advertising on Google</a>' in page
          and 'href="../../../../services/">our website and marketing services</a>' in page)
    check("Row 6 ROI post (Rewrite published)", "illustrative label present on the published page",
          "Example numbers are illustrative." in page)

    # ---------------------------------------------------------------- row 7
    guide = load("003")
    page = pages["legacy-static/2023/02/09/ultimate-digital-marketing-guide-for-businesses/index.html"]
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
    services = pages["docs/migration/generated/services-index.html"]
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
