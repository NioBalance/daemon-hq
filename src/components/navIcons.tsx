import type { ReactNode } from 'react'

/* Icone line-art 17px, stroke 1.5, nessun riempimento (handoff §Assets). */
const ic = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
export const ICONS: Record<string, ReactNode> = {
  overview: ic(<><circle cx="12" cy="12" r="8.5" /><path d="M12 12l3.5-3.5" /><path d="M12 6.5v1" /><path d="M17.5 12h-1" /><path d="M6.5 12h1" /></>),
  oggi: ic(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M9 15l2 2 4-4" /></>),
  dropx: ic(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></>),
  chats: ic(<><path d="M20 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 14-5z" /></>),
  design: ic(<><path d="M15.5 4.5l4 4L8 20l-5 1 1-5z" /><path d="M13 7l4 4" /></>),
  techpack: ic(<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h7M9 16h5" /></>),
  samples: ic(<><path d="M12 3l2.1 5.6L20 10.7l-5.9 2.1L12 18.5l-2.1-5.7L4 10.7l5.9-2.1z" /></>),
  catalogo: ic(<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>),
  riunioni: ic(<><circle cx="9" cy="8.5" r="2.5" /><circle cx="16" cy="9.5" r="2" /><path d="M4.5 19c.5-3 2.5-4.5 4.5-4.5s4 1.5 4.5 4.5" /><path d="M15 15.5c1.8.2 3.2 1.4 3.7 3.5" /></>),
  contratti: ic(<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 14c1-1.4 2 .8 3-.6s2 .8 3-.6" /></>),
  notes: ic(<><path d="M5 4h14v13l-4 4H5z" /><path d="M15 21v-4h4" /><path d="M9 9h6M9 13h4" /></>),
  timeline: ic(<><path d="M4 6h9M4 12h13M4 18h7" /><circle cx="16.5" cy="6" r="1.5" /><circle cx="20.5" cy="12" r="1.5" /><circle cx="14.5" cy="18" r="1.5" /></>),
  fornitori: ic(<><path d="M3 20V9l5 3V9l5 3V6h8v14z" /><path d="M17 10v.5M17 14v.5" /></>),
  media: ic(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M3 17l5-5 4 4 3-3 6 6" /></>),
  publish: ic(<><path d="M20 4L4 11l6 2.5L12.5 20 16 12z" /><path d="M20 4l-9.5 9.5" /></>),
  // utility della top-nav (e del menu mobile)
  cal: ic(<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M8 3v4M16 3v4M3.5 10.5h17" /></>),
  links: ic(<><path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.4-2.4a4.5 4.5 0 0 0-6.4-6.4L11 7" /><path d="M14 10a4.5 4.5 0 0 0-6.4-.4L5.2 12a4.5 4.5 0 0 0 6.4 6.4L13 17" /></>),
  inspo: ic(<><path d="M9 18h6M10 21h4" /><path d="M12 3a6.5 6.5 0 0 0-4 11.6c.8.7 1.3 1.5 1.5 2.4h5c.2-.9.7-1.7 1.5-2.4A6.5 6.5 0 0 0 12 3z" /></>),
  lavagna: ic(<><rect x="3.5" y="4.5" width="17" height="13" rx="2"/><path d="M7 20l2-2.5M17 20l-2-2.5M8 8.5h6M8 12h4"/></>),
  hqmap: ic(<><circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="7" r="2.4"/><circle cx="12" cy="17" r="2.4"/><path d="M7.8 7.2l2.6 8M16.6 8.6l-3 6.6M8 6.4h8"/></>),
  menu: ic(<><path d="M4 7h16M4 12h16M4 17h16" /></>),
}
