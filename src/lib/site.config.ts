/*
 * All site-level facts in one file (architecture standard: hard-code no
 * client text in components). Contact details are the verified values from
 * the brand book and docs/conversion-spec.md section 2.2.
 */

export const site = {
  name: 'Digitally Shifted',
  tagline: 'DIGITAL AGENCY',
  domain: 'digitallyshifted.com',
  url: 'https://digitallyshifted.com',
  phoneDisplay: '+27 63 171 8750',
  phoneHref: 'tel:+27631718750',
  whatsappHref: 'https://wa.me/27631718750',
  email: 'baruch@digitallyshifted.com',
} as const;

/*
 * Legal identity facts (DIG-80). Sources: the owner's answers on the
 * DIG-80 question card (2026-10-20) and the CIPC disclosure certificate
 * for registration number 2022/305680/07 (issued 9 March 2023), taken
 * from the owner's company documents folder at the owner's direction.
 */
export const legal = {
  legalName: 'Digitallyshifted (Pty) Ltd',
  registrationNumber: '2022/305680/07',
  registeredOffice:
    'Mall Mews 5, 55 Mountain Mill Drive, Hospital Hill, Worcester, Western Cape, 6850, South Africa',
  director: 'Baruch Truter',
  informationOfficer: 'Baruch Truter (Owner)',
} as const;

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
] as const;

/** The one primary CTA label and target (conversion spec 2.1, 2.5). */
export const primaryCta = {
  label: 'Get a quote',
  href: '/contact?need=quote',
} as const;

/** Form select options (conversion spec 4.2). */
export const needOptions = [
  { value: 'general', label: 'General enquiry', quoteIntent: false },
  { value: 'new-website', label: 'A new website', quoteIntent: true },
  { value: 'redesign', label: 'A redesign or upgrade', quoteIntent: true },
  { value: 'waas', label: 'Website-as-a-Service (monthly plan)', quoteIntent: true },
  { value: 'seo', label: 'SEO', quoteIntent: false },
  { value: 'hosting', label: 'Hosting or management', quoteIntent: false },
  { value: 'quote', label: 'Not sure — I want prices', quoteIntent: true },
] as const;
