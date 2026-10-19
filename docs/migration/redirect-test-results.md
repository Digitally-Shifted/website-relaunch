# Redirect map test report — DIG-89

- Run: 2026-10-19T22:51:24Z
- Build: production semantics (`BUILD_ENV=production`), commit marker `dig89-local-test`
- Method: `scripts/build-site.sh` output served through a local engine that executes
  the generated `.htaccess` (mod_rewrite subset: R=301/G/L/QSA/NC; HTTPS, HTTP_HOST,
  QUERY_STRING, REQUEST_FILENAME conditions). Plain `http.server` underneath.
- Re-run: `python3 docs/migration/tools/test_redirects.py`

## Results: 115/115 request cases pass

Generator checks:

- PASS: staging has prefixed ErrorDocument
- PASS: staging omits host canonicalization
- PASS: production has host canonicalization

| # | Request | Expected | Actual | Result |
|---|---------|----------|--------|--------|
| 1 | `/contact-us/` | 301 /contact/ | 301 /contact/ | PASS |
| 2 | `/contact-us` | 301 /contact/ | 301 /contact/ | PASS |
| 3 | `/privacy-policy/` | 301 /privacy/ | 301 /privacy/ | PASS |
| 4 | `/privacy-policy` | 301 /privacy/ | 301 /privacy/ | PASS |
| 5 | `/2024/07/04/unlock-your-online-potential-with-digitally-shifted-expert-domain-and-hosting-services/` | 301 /services/domains-hosting/ | 301 /services/domains-hosting/ | PASS |
| 6 | `/2024/07/04/unlock-your-online-potential-with-digitally-shifted-expert-domain-and-hosting-services` | 301 /services/domains-hosting/ | 301 /services/domains-hosting/ | PASS |
| 7 | `/2024/07/15/maximizing-roi-with-precision-explore-paid-advertising-with-digitally-shifted/` | 301 /services/ | 301 /services/ | PASS |
| 8 | `/2024/07/15/maximizing-roi-with-precision-explore-paid-advertising-with-digitally-shifted` | 301 /services/ | 301 /services/ | PASS |
| 9 | `/2024/08/12/elevate-your-online-presence-professional-website-development-at-digitally-shifted/` | 301 /services/website-development/ | 301 /services/website-development/ | PASS |
| 10 | `/2024/08/12/elevate-your-online-presence-professional-website-development-at-digitally-shifted` | 301 /services/website-development/ | 301 /services/website-development/ | PASS |
| 11 | `/category/digital-marketing/` | 301 /blog/digital-marketing/ | 301 /blog/digital-marketing/ | PASS |
| 12 | `/category/digital-marketing` | 301 /blog/digital-marketing/ | 301 /blog/digital-marketing/ | PASS |
| 13 | `/category/hosting-domains/` | 301 /blog/hosting-domains/ | 301 /blog/hosting-domains/ | PASS |
| 14 | `/category/hosting-domains` | 301 /blog/hosting-domains/ | 301 /blog/hosting-domains/ | PASS |
| 15 | `/category/paid-advertising/` | 301 /blog/paid-advertising/ | 301 /blog/paid-advertising/ | PASS |
| 16 | `/category/paid-advertising` | 301 /blog/paid-advertising/ | 301 /blog/paid-advertising/ | PASS |
| 17 | `/category/website-development/` | 301 /blog/website-development/ | 301 /blog/website-development/ | PASS |
| 18 | `/category/website-development` | 301 /blog/website-development/ | 301 /blog/website-development/ | PASS |
| 19 | `/contact-us/?need=quote` | 301 /contact/?need=quote | 301 /contact/?need=quote | PASS |
| 20 | `/` | 200 | 200 | PASS |
| 21 | `/blog/` | 200 | 200 | PASS |
| 22 | `/2023/02/09/ultimate-digital-marketing-guide-for-businesses/` | 200 | 200 | PASS |
| 23 | `/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/` | 200 | 200 | PASS |
| 24 | `/2023/02/02/how-to-evaluate-the-effectiveness-of-your-digital-marketing-efforts/` | 200 | 200 | PASS |
| 25 | `/2023/02/09/ultimate-digital-marketing-guide-for-businesses` | 200 | 200 | PASS |
| 26 | `/feed/` | 410 | 410 | PASS |
| 27 | `/comments/feed/` | 410 | 410 | PASS |
| 28 | `/wp-login.php` | 410 | 410 | PASS |
| 29 | `/xmlrpc.php` | 410 | 410 | PASS |
| 30 | `/wp-admin/` | 410 | 410 | PASS |
| 31 | `/wp-json/` | 410 | 410 | PASS |
| 32 | `/wp-cron.php` | 410 | 410 | PASS |
| 33 | `/readme.html` | 410 | 410 | PASS |
| 34 | `/wp-includes/` | 410 | 410 | PASS |
| 35 | `/wp-content/plugins/` | 410 | 410 | PASS |
| 36 | `/wp-content/themes/` | 410 | 410 | PASS |
| 37 | `/wp-content/litespeed/` | 410 | 410 | PASS |
| 38 | `/wp-content/cache/` | 410 | 410 | PASS |
| 39 | `/wp-content/upgrade/` | 410 | 410 | PASS |
| 40 | `/wp-json/wp/v2/users` | 410 | 410 | PASS |
| 41 | `/wp-includes/js/jquery/jquery.min.js` | 410 | 410 | PASS |
| 42 | `/wp-content/plugins/x/y.js` | 410 | 410 | PASS |
| 43 | `/wp-content/themes/t/style.css` | 410 | 410 | PASS |
| 44 | `/wp-content/litespeed/js/abc.js` | 410 | 410 | PASS |
| 45 | `/wp-content/cache/all/x.html` | 410 | 410 | PASS |
| 46 | `/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/feed/` | 410 | 410 | PASS |
| 47 | `/author/admin/` | 410 | 410 | PASS |
| 48 | `/category/unknown-topic/` | 301 /blog/ | 301 /blog/ | PASS |
| 49 | `/tag/google-ads/` | 301 /blog/ | 301 /blog/ | PASS |
| 50 | `/2023/` | 410 | 410 | PASS |
| 51 | `/2023/02/` | 410 | 410 | PASS |
| 52 | `/2023/06/01/a-post-we-never-saw/` | 410 | 410 | PASS |
| 53 | `/page/2/` | 410 | 410 | PASS |
| 54 | `/wp-content/uploads/some-other-file.jpg` | 410 | 410 | PASS |
| 55 | `/?p=8` | 301 /blog/ | 301 /blog/ | PASS |
| 56 | `/?page_id=2` | 301 /blog/ | 301 /blog/ | PASS |
| 57 | `/?cat=3` | 301 /blog/ | 301 /blog/ | PASS |
| 58 | `/?s=hosting` | 301 /blog/ | 301 /blog/ | PASS |
| 59 | `/?attachment_id=12` | 301 /blog/ | 301 /blog/ | PASS |
| 60 | `/wp-content/uploads/AI-Trends-2023.jpg` | 301 /assets/media/AI-Trends-2023.webp | 301 /assets/media/AI-Trends-2023.webp | PASS |
| 61 | `/wp-content/uploads/Advertising.png` | 410 | 410 | PASS |
| 62 | `/wp-content/uploads/Analytics.jpg` | 301 /assets/media/Analytics.webp | 301 /assets/media/Analytics.webp | PASS |
| 63 | `/wp-content/uploads/2022/07/Artboard-10.jpg` | 301 /assets/media/Artboard-10.webp | 301 /assets/media/Artboard-10.webp | PASS |
| 64 | `/wp-content/uploads/Digitally-Shifted-Ad-9x16-1.mp4` | 410 | 410 | PASS |
| 65 | `/wp-content/uploads/Digitally-Shifted-Ad.mp4` | 410 | 410 | PASS |
| 66 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-01.png` | 410 | 410 | PASS |
| 67 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-02.png` | 410 | 410 | PASS |
| 68 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-03.png` | 410 | 410 | PASS |
| 69 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-04.png` | 410 | 410 | PASS |
| 70 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-05.png` | 410 | 410 | PASS |
| 71 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-06.png` | 410 | 410 | PASS |
| 72 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-07.png` | 410 | 410 | PASS |
| 73 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-08.png` | 410 | 410 | PASS |
| 74 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-09.png` | 410 | 410 | PASS |
| 75 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-10.png` | 410 | 410 | PASS |
| 76 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-11.png` | 410 | 410 | PASS |
| 77 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-12.png` | 410 | 410 | PASS |
| 78 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-13.png` | 410 | 410 | PASS |
| 79 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-14.png` | 410 | 410 | PASS |
| 80 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-15.png` | 410 | 410 | PASS |
| 81 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-16.png` | 410 | 410 | PASS |
| 82 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-17.png` | 410 | 410 | PASS |
| 83 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-18.png` | 410 | 410 | PASS |
| 84 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-19.png` | 410 | 410 | PASS |
| 85 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-20.png` | 410 | 410 | PASS |
| 86 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-21.png` | 410 | 410 | PASS |
| 87 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-22.png` | 410 | 410 | PASS |
| 88 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-23.png` | 410 | 410 | PASS |
| 89 | `/wp-content/uploads/Digitally-Shifted-Clients-Logos-24.png` | 410 | 410 | PASS |
| 90 | `/wp-content/uploads/Digitally-Shifted-Logo-White.png` | 410 | 410 | PASS |
| 91 | `/wp-content/uploads/Facebook-Banner.jpg` | 410 | 410 | PASS |
| 92 | `/wp-content/uploads/Home-page-banner.jpg` | 410 | 410 | PASS |
| 93 | `/wp-content/uploads/Phonebanner.jpg` | 410 | 410 | PASS |
| 94 | `/wp-content/uploads/Untitled-design-7.png` | 410 | 410 | PASS |
| 95 | `/wp-content/uploads/Video-Banner.jpg` | 410 | 410 | PASS |
| 96 | `/wp-content/uploads/digital.webp` | 410 | 410 | PASS |
| 97 | `/wp-content/uploads/hosting.webp` | 410 | 410 | PASS |
| 98 | `/wp-content/uploads/logo-e1659285869632.png` | 410 | 410 | PASS |
| 99 | `/wp-content/uploads/marketing.webp` | 410 | 410 | PASS |
| 100 | `/wp-content/uploads/ml.webp` | 410 | 410 | PASS |
| 101 | `/wp-content/uploads/pexels-brett-sayles-1597776-scaled.jpg` | 410 | 410 | PASS |
| 102 | `/wp-content/uploads/pexels-ketut-subiyanto-4350093.jpg` | 301 /assets/media/pexels-ketut-subiyanto-4350093.webp | 301 /assets/media/pexels-ketut-subiyanto-4350093.webp | PASS |
| 103 | `/wp-content/uploads/pexels-magnus-mueller-2818118-2048x2048.jpg` | 410 | 410 | PASS |
| 104 | `/wp-content/uploads/scroll.png` | 410 | 410 | PASS |
| 105 | `/wp-content/uploads/software.webp` | 410 | 410 | PASS |
| 106 | `/wp-content/uploads/websites.webp` | 410 | 410 | PASS |
| 107 | `digitallyshifted.com:/` | 301 https://digitallyshifted.com/ | 301 https://digitallyshifted.com/ | PASS |
| 108 | `www.digitallyshifted.com:/about/` | 301 https://digitallyshifted.com/about/ | 301 https://digitallyshifted.com/about/ | PASS |
| 109 | `www.digitallyshifted.com:/contact/` | 301 https://digitallyshifted.com/contact/ | 301 https://digitallyshifted.com/contact/ | PASS |
| 110 | `/definitely-not-here-xyz/` | 404 | 404 | PASS |
| 111 | `/definitely-not-here-xyz/` | html | html | PASS |
| 112 | `/website-relaunch/contact-us/` | 301 /website-relaunch/contact/ | 301 /website-relaunch/contact/ | PASS |
| 113 | `/website-relaunch/tag/seo/` | 301 /website-relaunch/blog/ | 301 /website-relaunch/blog/ | PASS |
| 114 | `/website-relaunch/wp-login.php` | 410 | 410 | PASS |
| 115 | `/website-relaunch/` | 200 | 200 | PASS |

## 301 targets in build output

- All 301 targets exist in the build: YES
- Migrated media: 4 exact 301 rules verified; 43 pruned-by-DIG-90 URLs correctly return 410

## Old-URL coverage (orphan check)

- Distinct recorded old URLs checked: 145
- 301: 82
- 410: 58
- served (same URL): 5
- Orphans (old URLs that would 404): 0

## Failures

- none
