# Keyboard pass — 2026-10-18T19:35:55.801Z

Widths: 375 px focus pass · Pages: 4 · Checks: 25 · Failures: 10

- **Fail** — home — S3 skip link first and reaches main: skip link focused, Enter lands in main: false
- **Fail** — home — K5 focus not obscured (2.4.11): mobile action bar covers focused a "Call"
- **Fail** — home — K5 focus not obscured (2.4.11): mobile action bar covers focused a "WhatsApp us"
- Pass — home — A10 menu opens with expanded state: aria-expanded=true, focus in menu: true
- Pass — home — K6 focus stays inside open menu: after 2 tabs focus in menu: true
- Pass — home — K7 Escape closes menu and returns focus: hidden=true, focus on trigger=true, aria-expanded=false
- **Fail** — services-hub — S3 skip link first and reaches main: skip link focused, Enter lands in main: false
- **Fail** — services-hub — K5 focus not obscured (2.4.11): mobile action bar covers focused a "Call"
- **Fail** — services-hub — K5 focus not obscured (2.4.11): mobile action bar covers focused a "WhatsApp us"
- Pass — services-hub — A10 menu opens with expanded state: aria-expanded=true, focus in menu: true
- Pass — services-hub — K6 focus stays inside open menu: after 2 tabs focus in menu: true
- Pass — services-hub — K7 Escape closes menu and returns focus: hidden=true, focus on trigger=true, aria-expanded=false
- Pass — services-hub — K1 dialog opens from keyboard: open=true, focus inside=true
- Pass — services-hub — K6 focus stays inside dialog: after 6 tabs focus in dialog: true
- Pass — services-hub — K7 Escape closes dialog and returns focus: closed=true, focus on trigger=true
- **Fail** — faq — S3 skip link first and reaches main: skip link focused, Enter lands in main: false
- **Fail** — faq — K5 focus not obscured (2.4.11): mobile action bar covers focused a "Call"
- **Fail** — faq — K5 focus not obscured (2.4.11): mobile action bar covers focused a "WhatsApp us"
- Pass — faq — A10 menu opens with expanded state: aria-expanded=true, focus in menu: true
- Pass — faq — K6 focus stays inside open menu: after 2 tabs focus in menu: true
- Pass — faq — K7 Escape closes menu and returns focus: hidden=true, focus on trigger=true, aria-expanded=false
- **Fail** — contact — S3 skip link first and reaches main: skip link focused, Enter lands in main: false
- Pass — contact — A10 menu opens with expanded state: aria-expanded=true, focus in menu: true
- Pass — contact — K6 focus stays inside open menu: after 2 tabs focus in menu: true
- Pass — contact — K7 Escape closes menu and returns focus: hidden=true, focus on trigger=true, aria-expanded=false

Tab-order transcripts per page are in keyboard-pass.json.
