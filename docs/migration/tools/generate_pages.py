#!/usr/bin/env python3
"""Generate the migrated content pages for the new Digitally Shifted site.

Source of truth: docs/migration/extracted/*.json (structured records extracted
from the DIG-54 crawl of digitallyshifted.com, 2026-10-18).

Run from the repo root:
    python3 docs/migration/tools/generate_pages.py

Writes:
    blog/index.html
    services/index.html
    contact/index.html
    contact/thank-you/index.html
    privacy/index.html
    2023/02/09/ultimate-digital-marketing-guide-for-businesses/index.html

SEO-critical content (titles, meta descriptions, canonical URLs, headings,
image alt text) is carried over from the old pages. The staging pages are
served with `noindex`; the production launch (DIG-20) removes it.

Internal-link insertions into the pillar guide are exact-match replacements
and hard-fail when the target phrase is not found exactly once.
"""
import json
import os
import re
import sys
import uuid

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
EXT = os.path.join(REPO, "docs", "migration", "extracted")
OUT = REPO

SITE = "https://digitallyshifted.com"
PHONE = "+27 63 171 8750"
PHONE_TEL = "tel:+27631718750"
WHATSAPP = "https://wa.me/27631718750"
EMAIL = "baruch@digitallyshifted.com"

PROD_DOMAIN = "https://digitallyshifted.com"


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def load(name):
    with open(os.path.join(EXT, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "section"


def media(name):
    """Web asset filename for an old upload filename."""
    return re.sub(r"\.(jpe?g|png)$", ".webp", name)


def page(root, path, title, description, h1_og, og_image, og_image_alt, body,
         head_extra="", no_action_bar=False, hide_header_cta=False,
         og_type="website", body_class=""):
    canonical = SITE + path
    action_bar = "" if no_action_bar else (
        f'  <div class="action-bar">\n'
        f'    <a class="button button-secondary" href="{PHONE_TEL}">Call</a>\n'
        f'    <a class="button button-primary" href="{WHATSAPP}">WhatsApp us</a>\n'
        f'  </div>\n')
    header_cta = "" if hide_header_cta else (
        f'      <a class="button button-primary button-compact header-cta" '
        f'href="{root}contact/?need=quote">Get a quote</a>\n')
    classes = "no-action-bar " if no_action_bar else "has-action-bar "
    if hide_header_cta:
        classes += "no-header-cta "
    if body_class:
        classes += body_class
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <meta name="robots" content="noindex">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="Digitally Shifted">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:alt" content="{esc(og_image_alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/jpeg" href="{root}assets/media/{media('Artboard-10.jpg')}">
  <link rel="stylesheet" href="{root}assets/content.css">
  {head_extra}
</head>
<body class="{classes.strip()}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="{root}"><span class="brand-bold">Digitally</span> <span class="brand-light">Shifted</span></a>
      <nav class="site-nav" aria-label="Primary">
        <ul>
          <li><a class="nav-link" href="{root}services/">Services</a></li>
          <li><a class="nav-link" href="{root}blog/">Blog</a></li>
          <li><a class="nav-link" href="{root}contact/">Contact</a></li>
        </ul>
      </nav>
{header_cta}    </div>
  </header>
  <main id="main">
{body}
  </main>
  <footer class="site-footer ground-ink">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="brand" href="{root}"><span class="brand-bold">Digitally</span> <span class="brand-light">Shifted</span></a>
          <ul class="footer-contact">
            <li><span class="label">Phone</span><a href="{PHONE_TEL}">{PHONE}</a></li>
            <li><span class="label">WhatsApp</span><a href="{WHATSAPP}">{PHONE}</a></li>
            <li><span class="label">Email</span><a href="mailto:{EMAIL}">{EMAIL}</a></li>
            <li><span class="label">Domain</span><a href="{SITE}">digitallyshifted.com</a></li>
          </ul>
        </div>
        <nav aria-label="Footer">
          <ul class="footer-nav">
            <li><a href="{root}services/">Services</a></li>
            <li><a href="{root}blog/">Blog</a></li>
            <li><a href="{root}contact/">Contact</a></li>
          </ul>
        </nav>
      </div>
      <div class="footer-legal">&copy; 2026 Digitally Shifted. All rights Reserved.</div>
    </div>
  </footer>
{action_bar}</body>
</html>
"""


def write_page(rel_path, html):
    full = os.path.join(OUT, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {rel_path} ({len(html)} bytes)")


# ---------------------------------------------------------------------------
# Blog index (old /blog/, status KEEP; title kept, H1 pipe suffix removed)
# ---------------------------------------------------------------------------

CATEGORY_DESCRIPTIONS = [
    ("Digital Marketing", "digital-marketing",
     "Explore practical digital marketing guidance from Digitally Shifted for South African "
     "businesses that want stronger online visibility, better leads and clearer reporting. "
     "This section covers strategy, SEO, analytics, campaign planning and the digital "
     "foundations that help marketing activity connect to measurable business growth."),
    ("Hosting &amp; Domains", "hosting-domains",
     "Find domain and hosting guidance for building a stable, secure and fast online "
     "presence. Digitally Shifted helps South African businesses understand domain "
     "registration, WordPress hosting, website speed, email protection and the technical "
     "hosting choices that support reliable digital growth."),
    ("Paid Advertising", "paid-advertising",
     "Improve paid media performance with practical insights into Google Ads, Meta "
     "campaigns, targeting, budget control and ROI measurement. Digitally Shifted shares "
     "paid advertising guidance for South African businesses that need clearer leads, "
     "smarter spend and campaigns connected to real commercial outcomes."),
    ("Website Development", "website-development",
     "Explore website development advice for planning, building and improving "
     "conversion-focused business websites. Digitally Shifted covers WordPress development, "
     "responsive design, website performance, user experience and content structure for "
     "South African businesses that need a stronger digital foundation."),
]


def build_blog():
    root = "../"
    guide = load("003")
    excerpt = ("As a business owner, you need to be able to reach your target audience "
               "effectively and stand out in a crowded marketplace. That\u2019s where digital "
               "marketing &amp; digital marketing agencies like Digitally Shifted comes in. "
               "By utilizing various online platforms and strategies, you can promote your "
               "business and grow your customer base. This guide will provide you with a "
               "comprehensive understanding of digital marketing strategies that can help "
               "your small business succeed.")
    topics = "\n".join(
        f"""        <article class="topic" id="{anchor}">
          <h3>{name}</h3>
          <p>{desc}</p>
        </article>"""
        for name, anchor, desc in CATEGORY_DESCRIPTIONS)
    body = f"""    <section class="hero">
      <div class="container">
        <span class="eyebrow">Blog</span>
        <h1>Digital Marketing Insights</h1>
        <p class="lead">Read practical digital marketing insights from Digitally Shifted on
        SEO, website development, paid advertising, hosting, analytics and online growth
        for South African businesses.</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="section-header">
          <hr class="rule">
          <h2>Latest articles</h2>
        </div>
        <div class="grid grid-2">
          <article class="card post-card">
            <img src="{root}assets/media/{media('pexels-ketut-subiyanto-4350093.jpg')}"
                 alt="Business consultation meeting for contacting Digitally Shifted"
                 width="1162" height="775" loading="lazy">
            <div class="post-meta">
              <span class="tag"><span class="dot"></span>Featured guide</span>
              <span>Digital Marketing</span>
              <span>February 9, 2023</span>
            </div>
            <h3><a href="{root}2023/02/09/ultimate-digital-marketing-guide-for-businesses/">The Ultimate Digital Marketing Guide for Businesses</a></h3>
            <p>{excerpt}</p>
          </article>
        </div>
      </div>
    </section>
    <section class="section ground-grey">
      <div class="container">
        <div class="section-header">
          <hr class="rule">
          <h2>Browse by topic</h2>
          <p class="lead">Topic guides for the four practice areas.</p>
        </div>
        <div class="grid grid-2">
{topics}
        </div>
      </div>
    </section>
"""
    html = page(
        root, "/blog/",
        title="Digital Marketing Insights | Digitally Shifted",
        description=("Read practical digital marketing insights on SEO, web development, "
                     "paid advertising, hosting, analytics and online growth in South Africa."),
        h1_og="Digital Marketing Insights",
        og_image=f"{PROD_DOMAIN}/assets/media/{media('Analytics.jpg')}",
        og_image_alt="Analytics dashboard representing digital marketing insights",
        body=body)
    write_page("blog/index.html", html)


# ---------------------------------------------------------------------------
# Pillar guide post (status KEEP; stats refresh + author follow-up tracked)
# ---------------------------------------------------------------------------

# Exact-match internal-link insertions (inventory: add internal links to new
# service pages). Each phrase must occur exactly once in the extracted body.
GUIDE_LINKS = [
    ("a domain name (the web address for your site) and hosting (the space on a server where your site is stored)",
     '<a href="{root}services/#hosting">a domain name (the web address for your site) and hosting (the space on a server where your site is stored)</a>'),
    ("Search engine optimization (SEO) is the process of improving the visibility and ranking of your website",
     '<a href="{root}services/#seo">Search engine optimization (SEO)</a> is the process of improving the visibility and ranking of your website'),
]

DROP_EXACT = {"Share Article", "Prev Previous", "Next", "No Comments", "1 Comment"}


def render_blocks(blocks, root):
    """Render extracted blocks to HTML, returning (html, dropped_notes)."""
    out = []
    dropped = []
    used = {}
    for b in blocks:
        text = b["text"].strip()
        kind, level = b["kind"], b["level"]
        if text in DROP_EXACT or re.match(r"^(Share Article|Prev Previous|Next Prev|Prev Next)\b", text):
            dropped.append(text[:60])
            continue
        if kind == "h":
            base = slugify(re.sub(r"<[^>]+>", "", text))
            n = used.get(base, 0)
            used[base] = n + 1
            anchor = base if n == 0 else f"{base}-{n + 1}"
            lvl = max(2, min(6, level))
            out.append(f'      <h{lvl} id="{anchor}">{text}</h{lvl}>')
        elif kind == "li":
            out.append(f"      <li>{text}</li>")
        elif kind == "cell":
            continue  # table fragments are rendered with their row text in p blocks
        else:
            # apply exact-match link insertions
            for phrase, repl in GUIDE_LINKS:
                if phrase in text:
                    repl = repl.replace("{root}", root)
                    if text.count(phrase) != 1:
                        raise SystemExit(f"phrase not unique: {phrase[:60]}")
                    text = text.replace(phrase, repl)
            out.append(f"      <p>{text}</p>")
    return "\n".join(out), dropped


def build_guide():
    rec = load("003")
    root = "../../../../"
    blocks = rec["blocks"]
    first = blocks[0]
    assert first["kind"] == "h" and first["level"] == 1, first["kind"]
    title = "The Ultimate Digital Marketing Guide for Businesses"
    assert first["text"].startswith(title)
    lead = first["text"][len(title):].strip()
    date_li = blocks[1]
    assert date_li["text"].startswith("February 9, 2023")
    tags = [t.strip() for t in blocks[2]["text"].split(",") if t.strip()]
    assert blocks[3]["text"] == "Table of Contents"
    body_blocks = blocks[4:]

    # Build TOC from h2/h3 headings.
    toc_items = []
    for b in body_blocks:
        if b["kind"] == "h" and b["level"] in (2, 3):
            toc_items.append((b["level"], b["text"]))
    used = {}
    toc_html = []
    open_sub = False
    for lvl, text in toc_items:
        base = slugify(text)
        n = used.get(base, 0)
        used[base] = n + 1
        anchor = base if n == 0 else f"{base}-{n + 1}"
        if lvl == 2:
            if open_sub:
                toc_html.append("          </ul></li>")
                open_sub = False
            toc_html.append(f'          <li><a href="#{anchor}">{text}</a>')
        else:
            if not open_sub:
                toc_html.append('          <ul>')
                open_sub = True
            toc_html.append(f'          <li><a href="#{anchor}">{text}</a></li>')
    if open_sub:
        toc_html.append("          </ul></li>")
    toc = "\n".join(toc_html)

    body_html, dropped = render_blocks(body_blocks, root)
    tag_html = "\n".join(f'        <span class="tag">{t}</span>' for t in tags)
    body = f"""    <article>
      <div class="container">
        <div class="post-header">
          <div class="post-meta">
            <a class="tag nav-link" href="{root}blog/#digital-marketing"><span class="dot"></span>Digital Marketing</a>
            <span>February 9, 2023</span>
          </div>
          <h1>{title}</h1>
          <p class="lead">{lead}</p>
        </div>
        <img class="post-image" src="{root}assets/media/{media('pexels-ketut-subiyanto-4350093.jpg')}"
             alt="Business consultation meeting for contacting Digitally Shifted"
             width="1162" height="775">
        <details class="toc">
          <summary>Table of Contents</summary>
          <ul>
{toc}
          </ul>
        </details>
        <div class="post-body">
{body_html}
        </div>
        <div class="post-tags">
          <span class="post-meta-label">Tags</span>
{tag_html}
        </div>
        <aside class="feature-panel post-closer">
          <h2>Ready to put this into practice?</h2>
          <p>Digitally Shifted builds, hosts and grows South African business websites.
          See the services or ask for a quote.</p>
          <div class="actions">
            <a class="button button-primary" href="{root}contact/?need=quote">Get a quote</a>
            <a class="button button-secondary" href="{root}services/">See our services</a>
          </div>
        </aside>
      </div>
    </article>
"""
    html = page(
        root, "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
        title="Digital Marketing Guide | Digitally Shifted",
        description=("Plan better campaigns with this digital marketing guide covering SEO, "
                     "paid ads, social media, email, analytics and website optimization."),
        h1_og=title,
        og_image=f"{PROD_DOMAIN}/assets/media/{media('pexels-ketut-subiyanto-4350093.jpg')}",
        og_image_alt="Business consultation meeting for contacting Digitally Shifted",
        og_type="article",
        body=body)
    write_page("2023/02/09/ultimate-digital-marketing-guide-for-businesses/index.html", html)
    return dropped


# ---------------------------------------------------------------------------
# Services (new page; merge target for rows 8 and 10; spec section order)
# ---------------------------------------------------------------------------

def build_services():
    root = "../"
    body = f"""    <section class="hero">
      <div class="container">
        <span class="eyebrow">Services</span>
        <h1>Our services</h1>
        <p class="lead">Digitally Shifted builds, hosts and grows South African business
        websites. One team covers website design and development, hosting and management,
        Website-as-a-Service, and SEO.</p>
        <div class="actions">
          <a class="button button-primary" href="{root}contact/?need=quote">Get a quote</a>
          <a class="button-ghost" href="#website">See what is included</a>
        </div>
      </div>
    </section>
    <section class="section" id="website">
      <div class="container service">
        <div class="service-copy">
          <span class="eyebrow">01</span>
          <h2>Website design and development</h2>
          <p>In today&rsquo;s digital world, your website is more than just a part of your
          online presence&mdash;it&rsquo;s a pivotal platform that drives customer interaction,
          sales, and business growth. At Digitally Shifted, we recognize that a compelling
          website is crucial for capturing and converting your audience. Our bespoke website
          development services are designed not only to meet your unique needs but to propel
          your business forward.</p>
          <h3>Why choose Digitally Shifted for your website development?</h3>
          <h4>Customized solutions that drive business</h4>
          <p>Every business has unique challenges and goals. At Digitally Shifted, we
          don&rsquo;t just build websites; we create customized online solutions that resonate
          with your target audience and support your specific business objectives. Whether
          you&rsquo;re looking to increase product sales, enhance service offerings, or
          streamline user interactions, we tailor your site to provide tangible business
          results.</p>
          <h4>Maximizing conversions with responsive design</h4>
          <p>The majority of consumers now access the internet via mobile devices. We ensure
          your site is fully responsive, providing an optimal browsing experience on any
          device. This responsiveness not only enhances user satisfaction but significantly
          boosts the likelihood of conversions and repeated business.</p>
          <h4>SEO-optimized to outperform competitors</h4>
          <p>Visibility is key in a crowded marketplace. Our SEO-optimized website designs
          increase your search engine rankings, ensuring you reach potential customers before
          your competitors. We focus on strategic keyword placement, high-quality content,
          and optimized metadata to draw more targeted traffic to your site.</p>
          <h4>Advanced technology for enhanced performance</h4>
          <p>Leveraging cutting-edge technologies, we build websites that are both innovative
          and reliable. Our use of advanced CMS, sophisticated web frameworks, and robust
          security measures ensure that your website is fast, secure, and scalable. These
          technologies are crucial for maintaining the efficiency and integrity of your
          digital presence, giving you the edge in a competitive landscape.</p>
          <h4>Dedicated support for continued success</h4>
          <p>Our commitment to your success extends beyond the launch of your website. With
          ongoing support and maintenance, we ensure your platform remains relevant and
          effective. Regular updates, security checks, and feature enhancements are all part
          of our dedication to your business&rsquo;s continued growth and online relevance.</p>
          <div class="actions">
            <a class="button button-primary" href="{root}contact/?need=new-website">Get a quote</a>
          </div>
        </div>
        <figure class="service-media">
          <img src="{root}assets/media/websites.webp" alt="websites" width="660" height="600" loading="lazy">
        </figure>
      </div>
    </section>
    <section class="section ground-grey" id="hosting">
      <div class="container service service-flip">
        <div class="service-copy">
          <span class="eyebrow">02</span>
          <h2>Hosting and management</h2>
          <p>In the digital age, having a robust online presence is crucial for success. At
          Digitally Shifted, we understand this better than anyone. That&rsquo;s why we offer
          top-tier domain registration and hosting services designed to empower your digital
          aspirations&mdash;whether you&rsquo;re a budding entrepreneur, a growing business,
          or an established brand looking to enhance your online footprint.</p>
          <h3>Domains</h3>
          <h4>A name you can trust</h4>
          <p>Finding the perfect domain name is the first step in establishing a strong
          online identity. Our domain service provides you with access to a wide range of
          domain extensions (from classic .com and .net to niche-specific like .tech or
          .shop), ensuring that you can find the domain that best fits your business&rsquo;s
          personality and mission.</p>
          <h4>Protection and privacy</h4>
          <p>We prioritize your privacy with features designed to protect your personal
          information from being exposed in the WHOIS database. Our domain privacy options
          shield your data, reducing the risk of spam and identity theft.</p>
          <h3>Hosting</h3>
          <h4>Fast and reliable dedicated servers</h4>
          <p>Our hosting is powered by dedicated servers optimized for speed and reliability,
          not using the traditional slow Apache setup but the cutting-edge LiteSpeed
          technology. This ensures exceptionally low Time to First Byte (TTFB) and
          lightning-fast page loading times, thanks to advanced caching mechanisms inherent
          to LiteSpeed.</p>
          <h4>Scalable solutions</h4>
          <p>Whether you&rsquo;re just starting out or need to handle increasing traffic, our
          hosting plans grow with your business. Upgrade your resources with just a few
          clicks to ensure that your website maintains peak performance during critical
          times.</p>
          <h4>Enhanced security</h4>
          <p>Your site&rsquo;s security is paramount. Our servers are fortified with
          Imunify360, providing a robust security framework against digital threats. This
          high-security setup actively protects your website from malware, unauthorized
          access, and other vulnerabilities.</p>
          <h4>SpamExperts for email security</h4>
          <p>We use SpamExperts to ensure that your emails remain clear of spam and phishing
          attacks. This top-of-the-line solution filters out harmful and unwanted content
          before it reaches your inbox, enhancing communication security and efficiency.</p>
          <h4>Expert support</h4>
          <p>Our experienced support team is here to help you every step of the way. Whether
          you need assistance with setting up your domain, managing your hosting environment,
          or troubleshooting, we&rsquo;re just a message away, available 24/7.</p>
          <div class="actions">
            <a class="button button-primary" href="{root}contact/?need=hosting">Get a quote</a>
          </div>
        </div>
        <figure class="service-media">
          <img src="{root}assets/media/{media('pexels-brett-sayles-1597776.jpg')}"
               alt="Network server cables representing domain and hosting infrastructure"
               width="1600" height="1067" loading="lazy">
        </figure>
      </div>
    </section>
    <section class="section" id="waas">
      <div class="container service">
        <div class="service-copy">
          <span class="eyebrow">03</span>
          <h2>Website-as-a-Service (WaaS)</h2>
          <p>Website-as-a-Service bundles the work above into one monthly plan. One monthly
          fee covers the design, hosting, management, and SEO of your website, so your site
          stays current, secure and findable while we run the technical side.</p>
          <div class="actions">
            <a class="button button-primary" href="{root}contact/?need=waas">Get a quote</a>
          </div>
        </div>
        <figure class="service-media">
          <img src="{root}assets/media/digital.webp"
               alt="Digital services illustration for Digitally Shifted service hub"
               width="660" height="600" loading="lazy">
        </figure>
      </div>
    </section>
    <section class="section ground-grey" id="seo">
      <div class="container service service-flip">
        <div class="service-copy">
          <span class="eyebrow">04</span>
          <h2>SEO</h2>
          <p>Search engine optimization (SEO) is the process of improving the visibility and
          ranking of your website in search engine results pages, so the right people find
          your business when they search.</p>
          <p>Our SEO work covers on-page SEO (page titles, meta descriptions, headings and
          content), off-page SEO (backlinks and social profiles) and local SEO (your Google
          My Business listing and local citations), following the practices set out in our
          <a href="{root}2023/02/09/ultimate-digital-marketing-guide-for-businesses/">ultimate
          digital marketing guide</a>.</p>
          <div class="actions">
            <a class="button button-primary" href="{root}contact/?need=seo">Get a quote</a>
          </div>
        </div>
        <figure class="service-media">
          <img src="{root}assets/media/marketing.webp" alt="Marketing planning and brand content illustration" width="660" height="600" loading="lazy">
        </figure>
      </div>
    </section>
"""
    html = page(
        root, "/services/",
        title="Services | Digitally Shifted",
        description=("Website design and development, hosting and management, "
                     "Website-as-a-Service and SEO from Digitally Shifted for South "
                     "African businesses."),
        h1_og="Our services",
        og_image=f"{PROD_DOMAIN}/assets/media/websites.webp",
        og_image_alt="websites",
        body=body)
    write_page("services/index.html", html)


# ---------------------------------------------------------------------------
# Contact (old /contact-us/, status KEEP; form per conversion spec section 4)
# ---------------------------------------------------------------------------

NEED_OPTIONS = [
    ("general", "General enquiry"),
    ("new-website", "A new website"),
    ("redesign", "A redesign or upgrade"),
    ("waas", "Website-as-a-Service (monthly plan)"),
    ("seo", "SEO"),
    ("hosting", "Hosting or management"),
    ("quote", "Not sure &mdash; I want prices"),
]


def build_contact():
    root = "../"
    options = "\n".join(
        f'              <option value="{value}"{" selected" if value == "general" else ""}>{label}</option>'
        for value, label in NEED_OPTIONS)
    sub_id = str(uuid.uuid4())
    body = f"""    <section class="hero">
      <div class="container">
        <span class="eyebrow">Contact</span>
        <h1>Contact Digitally Shifted</h1>
        <p class="lead">Tell us what you want to improve online and the Digitally Shifted
        team will guide the next step. We help South African businesses with SEO, website
        development, Google Ads, social media, hosting and digital strategy.</p>
      </div>
    </section>
    <section class="section">
      <div class="container contact-layout">
        <div class="contact-intro">
          <p>Send a service request, call, WhatsApp or email us. We will review your goals
          and respond with practical guidance for your project, including the most relevant
          next step for your budget, timeline and growth targets.</p>
          <img src="{root}assets/media/{media('pexels-ketut-subiyanto-4350093.jpg')}"
               alt="Business consultation meeting for contacting Digitally Shifted"
               width="1162" height="775" loading="lazy">
          <ul class="contact-routes">
            <li><span class="label">Location</span>South Africa</li>
            <li><span class="label">Calls &amp; WhatsApp</span><a href="{PHONE_TEL}">{PHONE}</a></li>
            <li><span class="label">Email</span><a href="mailto:{EMAIL}">{EMAIL}</a></li>
          </ul>
        </div>
        <form class="form" action="/api/contact" method="post" novalidate>
          <div class="error-summary" id="error-summary" tabindex="-1">
            <h2>Fix the errors below and send again.</h2>
            <ul></ul>
          </div>
          <div class="field">
            <label for="f-name">Your name (required)</label>
            <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="100">
          </div>
          <div class="field">
            <label for="f-email">Email (required)</label>
            <input id="f-email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="field">
            <label for="f-phone">Phone (optional)</label>
            <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel">
          </div>
          <div class="field">
            <label for="f-business">Business name (optional)</label>
            <input id="f-business" name="business" type="text" autocomplete="organization" maxlength="120">
          </div>
          <div class="field">
            <label for="f-need">What do you need? (required)</label>
            <select id="f-need" name="need" required>
{options}
            </select>
          </div>
          <div class="field">
            <label for="f-message">Tell us about your project (required)</label>
            <textarea id="f-message" name="message" rows="5" required maxlength="5000"></textarea>
          </div>
          <div class="hp-field" aria-hidden="true">
            <label for="f-company-website">Company website</label>
            <input id="f-company-website" name="company_website" type="text" tabindex="-1" autocomplete="off">
          </div>
          <input type="hidden" name="form_location" value="/contact/">
          <input type="hidden" name="submission_id" value="{sub_id}">
          <input type="hidden" name="form_started_at" value="">
          <input type="hidden" name="utm_source" value="">
          <input type="hidden" name="utm_medium" value="">
          <input type="hidden" name="utm_campaign" value="">
          <p class="consent-line">We use your details to reply to this enquiry. We do not
          sell them. See our <a href="{root}privacy/">privacy notice</a>.</p>
          <div class="form-actions">
            <button class="button button-primary" type="submit" id="f-submit">Send enquiry</button>
          </div>
        </form>
      </div>
    </section>
"""
    html = page(
        root, "/contact/",
        title="Contact Digitally Shifted | Digital Marketing Agency SA",
        description=("Speak to Digitally Shifted about SEO, web design, Google Ads, social "
                     "media or automation for your South African business. Call or WhatsApp us."),
        h1_og="Contact Digitally Shifted",
        og_image=f"{PROD_DOMAIN}/assets/media/{media('pexels-ketut-subiyanto-4350093.jpg')}",
        og_image_alt="Business consultation meeting for contacting Digitally Shifted",
        body=body,
        no_action_bar=True,
        hide_header_cta=True,
        head_extra="""  <script>
    // Minimal render-time form state (full validation and submit handling land
    // with the form backend at go-live; see docs/conversion-spec.md section 4).
    (function () {
      function ready(fn) {
        if (document.readyState !== "loading") { fn(); }
        else { document.addEventListener("DOMContentLoaded", fn); }
      }
      ready(function () {
        var form = document.querySelector("form.form");
        if (!form) { return; }
        form.querySelector('[name="form_started_at"]').value = String(Date.now());
        var params = new URLSearchParams(window.location.search);
        ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
          var value = params.get(key);
          if (value) { form.querySelector('[name="' + key + '"]').value = value; }
        });
        var need = params.get("need");
        var select = form.querySelector('[name="need"]');
        var submit = document.getElementById("f-submit");
        function label() {
          var quote = ["new-website", "redesign", "waas", "quote"].indexOf(select.value) !== -1;
          submit.textContent = quote ? "Request quote" : "Send enquiry";
        }
        if (need) {
          for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value === need) { select.value = need; break; }
          }
        }
        label();
        select.addEventListener("change", label);
      });
    })();
  </script>""")
    write_page("contact/index.html", html)


# ---------------------------------------------------------------------------
# Thank-you (conversion spec 3.5) and privacy (spec 3.6 launch default)
# ---------------------------------------------------------------------------

def build_thank_you():
    root = "../../"
    body = f"""    <section class="hero">
      <div class="container">
        <h1 id="thank-you-heading">Thank you. We have your message.</h1>
        <p class="lead">We aim to reply within one business day.</p>
        <div class="actions">
          <a class="button button-secondary" href="{PHONE_TEL}">Call</a>
          <a class="button button-primary" href="{WHATSAPP}">WhatsApp us</a>
        </div>
        <p><a href="{root}services/">See what we do</a></p>
      </div>
    </section>
"""
    html = page(
        root, "/contact/thank-you/",
        title="Thank you | Digitally Shifted",
        description="Your enquiry reached Digitally Shifted. We aim to reply within one business day.",
        h1_og="Thank you. We have your message.",
        og_image=f"{PROD_DOMAIN}/assets/media/{media('Home-page-banner.jpg')}",
        og_image_alt="Digitally Shifted digital marketing agency hero banner",
        body=body,
        no_action_bar=True,
        hide_header_cta=True,
        head_extra="""  <script>
    document.addEventListener("DOMContentLoaded", function () {
      var h = document.getElementById("thank-you-heading");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
    });
  </script>""")
    write_page("contact/thank-you/index.html", html)


def build_privacy():
    root = "../"
    body = f"""    <section class="hero">
      <div class="container">
        <h1>Privacy Policy and Terms</h1>
        <p class="lead">How Digitally Shifted handles the details you send us.</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="post-body">
          <h2>What we store</h2>
          <p>The details you send through our forms, with the date.</p>
          <h2>Why we store them</h2>
          <p>To reply to your enquiry.</p>
          <h2>What we do not do</h2>
          <p>We do not sell your details.</p>
          <h2>How to remove them</h2>
          <p>Email <a href="mailto:{EMAIL}">{EMAIL}</a> and we will delete your details.</p>
        </div>
      </div>
    </section>
"""
    html = page(
        root, "/privacy/",
        title="Privacy Policy and Terms | Digitally Shifted",
        description=("Read Digitally Shifted privacy policy and terms for how information, "
                     "website usage and digital service enquiries are handled."),
        h1_og="Privacy Policy and Terms",
        og_image=f"{PROD_DOMAIN}/assets/media/{media('logo-e1659285869632.png')}",
        og_image_alt="Digitally Shifted logo for privacy policy and terms",
        body=body,
        no_action_bar=True)
    write_page("privacy/index.html", html)


def main():
    build_blog()
    dropped = build_guide()
    build_services()
    build_contact()
    build_thank_you()
    build_privacy()
    if dropped:
        print("guide dropped blocks:", dropped)


if __name__ == "__main__":
    main()
