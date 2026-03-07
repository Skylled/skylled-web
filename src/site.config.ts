export const siteConfig = {
  name: 'Skylled',
  description: "Kyle's personal site and blog.",
  logo: {
    src: '/logo.svg',
    srcDark: '/logo.svg',
    alt: 'Skylled',
    strategy: 'invert' as 'invert' | 'switch' | 'static',
  },
  ogImage: '/og-image.webp',
  primaryColor: '#3f51b5',
  search: {
    enabled: false,
  },
  announcement: {
    enabled: false,
    id: 'launch_v1',
    link: '/blog',
    localizeLink: false,
  },
  blog: {
    postsPerPage: 6,
  },
  contact: {
    email: {
      support: 'kyle@skylled.dev',
      sales: 'kyle@skylled.dev',
    },
    phone: { main: '', label: '' },
    address: { city: '', full: '' },
  },
  analytics: {
    alwaysLoad: false,
    vendors: {
      googleAnalytics: { id: '', enabled: false },
      rybbit: { id: '', src: '', enabled: false },
      umami: { id: '', src: '', enabled: false },
    },
  },
  dateOptions: {
    localeMapping: {
      'en': 'en-US',
    },
  },
};

export const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
];

export const ACTION_LINKS = {
  primary: { label: '', href: '' },
  social: {
    mastodon: 'https://mastodon.social/@Skylled',
    github: 'https://github.com/Skylled',
    linkedin: 'https://linkedin.com/in/skylleddev',
  },
};

export const FOOTER_LINKS = {
  links: {
    title: 'Links',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
    ],
  },
};
