import type { CSSProperties, ReactNode } from 'react'

/**
 * The icon set.
 *
 * One inline-SVG component, no icon font and no network request — which is what
 * makes the app work offline and keeps the bundle self-contained. Every glyph is
 * drawn on a 24×24 grid with a 1.8px round-capped stroke in `currentColor`, so
 * an icon inherits the colour of whatever it sits inside.
 *
 * The names used by `data/achievements.ts` and `data/unlocks.ts` are covered by
 * `tests/data-integrity.test.ts`, which fails if a new icon string is added to
 * the data without a matching glyph here.
 */

const P = (d: string, key?: string) => <path key={key} d={d} />

const GLYPHS: Record<string, ReactNode> = {
  /* ---- navigation & actions ---- */
  home: P('M3 10.6 12 3l9 7.6M5.5 9.4V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.4'),
  search: (<><circle cx="11" cy="11" r="7" />{P('m20.5 20.5-4.2-4.2')}</>),
  plus: P('M12 5v14M5 12h14'),
  minus: P('M5 12h14'),
  check: P('m20 6.5-11 11-5-5'),
  x: P('M18 6 6 18M6 6l12 12'),
  'chevron-left': P('m15 18-6-6 6-6'),
  'chevron-right': P('m9 18 6-6-6-6'),
  'chevron-down': P('m6 9 6 6 6-6'),
  'chevron-up': P('m18 15-6-6-6 6'),
  'arrow-up': P('M12 19V5m-7 7 7-7 7 7'),
  'arrow-down': P('M12 5v14m7-7-7 7-7-7'),
  'arrow-right': P('M4 12h15m-6-7 7 7-7 7'),
  'arrow-left': P('M20 12H5m6 7-7-7 7-7'),
  'arrow-up-right': P('M7 17 17 7M8 7h9v9'),
  menu: P('M3 6h18M3 12h18M3 18h18'),
  'more-h': (<><circle cx="5" cy="12" r="1.4" />{<circle key="b" cx="12" cy="12" r="1.4" />}<circle key="c" cx="19" cy="12" r="1.4" /></>),
  'more-v': (<><circle cx="12" cy="5" r="1.4" />{<circle key="b" cx="12" cy="12" r="1.4" />}<circle key="c" cx="12" cy="19" r="1.4" /></>),
  'external-link': P('M14 4h6v6M20 4 11 13M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'),
  filter: P('M3 5h18l-7 8.2V20l-4-2.2v-4.6z'),
  sort: P('M4 7h10M4 12h7M4 17h4M17 8v10m0 0 3-3m-3 3-3-3'),
  refresh: P('M20.5 12a8.5 8.5 0 1 1-2.6-6.1M20.5 4v5h-5'),
  'rotate-ccw': P('M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v5h5'),
  copy: (<><rect x="9" y="9" width="12" height="12" rx="2" />{P('M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1')}</>),
  trash: P('M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 13.1a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 7M10.5 11v6M13.5 11v6'),
  edit: P('M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3zM14.5 6.5l3 3'),
  save: P('M5 3h11l3 3v15H5zM8 3v6h7V3M8 13h8v8H8z'),
  download: P('M12 3v12m-5-4 5 5 5-5M4 20h16'),
  upload: P('M12 20V8m-5 4 5-5 5 5M4 4h16'),
  share: (<><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" />{P('m8.4 10.8 7.2-4.2M8.4 13.2l7.2 4.2')}</>),
  settings: (<><circle cx="12" cy="12" r="3.2" />{P('M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z')}</>),
  sliders: P('M4 7h9M17 7h3M4 17h3M11 17h9M15 4.6v4.8M8 14.6v4.8'),
  eye: (<><path d="M2 12s3.7-6.6 10-6.6S22 12 22 12s-3.7 6.6-10 6.6S2 12 2 12z" /><circle cx="12" cy="12" r="2.8" /></>),
  'eye-off': P('M3 3l18 18M10.6 6.3A9.9 9.9 0 0 1 12 6.2c6.3 0 10 5.8 10 5.8a17.6 17.6 0 0 1-3.2 3.9M6.7 7.9A16.6 16.6 0 0 0 2 12s3.7 5.8 10 5.8a10 10 0 0 0 3.6-.7M9.9 9.9a3 3 0 0 0 4.2 4.2'),
  lock: (<><rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />{P('M8 10.5V7a4 4 0 0 1 8 0v3.5M12 14.5v3')}</>),
  unlock: (<><rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />{P('M8 10.5V7a4 4 0 0 1 7.6-1.7M12 14.5v3')}</>),
  'log-out': P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
  grid: (<><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>),
  list: P('M8.5 6H21M8.5 12H21M8.5 18H21M3.5 6h.01M3.5 12h.01M3.5 18h.01'),
  layers: P('m12 3 9 4.8-9 4.8-9-4.8zM3 12.6l9 4.8 9-4.8M3 17l9 4.8 9-4.8'),
  sidebar: (<><rect x="3" y="4" width="18" height="16" rx="2" />{P('M9.5 4v16')}</>),
  maximize: P('M4 9V4.5h5M20 9V4.5h-5M4 15v4.5h5M20 15v4.5h-5'),

  /* ---- status & information ---- */
  info: (<><circle cx="12" cy="12" r="9" />{P('M12 11.2v5M12 7.9h.01')}</>),
  'alert-triangle': P('M12 3.6 2.4 20.4h19.2zM12 9.6v4.6M12 17.4h.01'),
  'alert-circle': (<><circle cx="12" cy="12" r="9" />{P('M12 7.8v5M12 16.2h.01')}</>),
  'help-circle': (<><circle cx="12" cy="12" r="9" />{P('M9.4 9.3a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .9-1 1.7v.4M12 17.2h.01')}</>),
  'check-circle': (<><circle cx="12" cy="12" r="9" />{P('m8.2 12.3 2.6 2.6 5-5.4')}</>),
  'x-circle': (<><circle cx="12" cy="12" r="9" />{P('m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6')}</>),
  bell: P('M18 8.6a6 6 0 1 0-12 0c0 6-2.4 7.4-2.4 7.4h16.8S18 14.6 18 8.6M13.7 20a2 2 0 0 1-3.4 0'),
  database: (<><ellipse cx="12" cy="5.8" rx="8" ry="2.8" />{P('M4 5.8v12.4c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8V5.8M4 12c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8')}</>),
  'wifi-off': P('M2 2l20 20M8.6 15.6a4.8 4.8 0 0 1 6.8 0M5.2 12.2a9.6 9.6 0 0 1 3.4-2.1M18.8 12.2a9.6 9.6 0 0 0-5.2-2.6M2.2 8.9a14.6 14.6 0 0 1 4.2-2.6M21.8 8.9a14.6 14.6 0 0 0-8.6-3.2M12 19.2h.01'),
  contrast: (<><circle cx="12" cy="12" r="9" />{P('M12 3a9 9 0 0 1 0 18z', 'fill')}</>),
  keyboard: (<><rect x="2.5" y="6" width="19" height="12" rx="2" />{P('M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M8 14h8')}</>),
  type: P('M4 7V4.5h16V7M12 4.5v15M9 19.5h6'),
  'move-right': P('M3 12h14m-5-5 5 5-5 5M19 5v14'),

  /* ---- time ---- */
  clock: (<><circle cx="12" cy="12" r="9" />{P('M12 7.2V12l3.2 2')}</>),
  timer: (<><circle cx="12" cy="13.5" r="7.5" />{P('M12 13.5V9.8M9.5 2.5h5M18.6 7.4l1.4-1.4')}</>),
  calendar: (<><rect x="3.5" y="5" width="17" height="16" rx="2.4" />{P('M8 3v4M16 3v4M3.5 10.2h17')}</>),
  'calendar-check': (<><rect x="3.5" y="5" width="17" height="16" rx="2.4" />{P('M8 3v4M16 3v4M3.5 10.2h17m3.7 4.4 2.3 2.3 4.3-4.6')}</>),
  'calendar-plus': (<><rect x="3.5" y="5" width="17" height="16" rx="2.4" />{P('M8 3v4M16 3v4M3.5 10.2h17M12 13.4v5M9.5 15.9h5')}</>),
  history: P('M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v5h5M12 8.2V12l3 1.8'),
  hourglass: P('M6 3h12M6 21h12M7.5 3v3.6L12 11l4.5-4.4V3M7.5 21v-3.6L12 13l4.5 4.4V21'),

  /* ---- training ---- */
  dumbbell: P('M6.6 6.4v11.2M3.4 9.2v5.6M17.4 6.4v11.2M20.6 9.2v5.6M6.6 12h10.8'),
  weight: (<><rect x="2.5" y="8.5" width="3.4" height="7" rx="1" /><rect x="18.1" y="8.5" width="3.4" height="7" rx="1" /><rect x="6.6" y="6.5" width="3" height="11" rx="1" /><rect x="14.4" y="6.5" width="3" height="11" rx="1" />{P('M9.6 12h4.8')}</>),
  barbell: P('M4 8v8M7 6v12M17 6v12M20 8v8M7 12h10'),
  kettlebell: (<><circle cx="12" cy="15" r="5.6" />{P('M9 9.6V7.4A2.4 2.4 0 0 1 11.4 5h1.2A2.4 2.4 0 0 1 15 7.4v2.2')}</>),
  running: (<><circle cx="14.5" cy="4.6" r="1.9" />{P('M6 21l3.4-5.2-2.6-3 .8-4.6 4 2 2.6 1.4 2.4 3M10.8 8.2 7 9.6 5 13')}</>),
  stretch: P('M4 20c3-1 4.5-3.5 5-7 .4-2.8 1.6-5 4-6.5M20 4c-3 1-4.5 3.5-5 7-.4 2.8-1.6 5-4 6.5M8 8l4 4'),
  ruler: (<><rect x="2.6" y="8.6" width="18.8" height="6.8" rx="1.6" transform="rotate(-45 12 12)" />{P('M8.4 8.4l1.6 1.6M11.2 5.6l1.6 1.6M14 12.4l1.6 1.6')}</>),
  scale: (<><path d="M12 3.2a2.8 2.8 0 0 1 2.7 2.2h3.1A2.2 2.2 0 0 1 20 7.6v11.2a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 18.8V7.6a2.2 2.2 0 0 1 2.2-2.2h3.1A2.8 2.8 0 0 1 12 3.2z" /><path d="M8.6 12a3.4 3.4 0 0 1 6.8 0" /></>),
  clipboard: (<><rect x="5.5" y="4.5" width="13" height="16.5" rx="2" />{P('M9 4.5V3.2h6v1.3M9 10h6M9 14h6M9 17.5h3.5')}</>),
  target: (<><circle cx="12" cy="12" r="8.8" /><circle cx="12" cy="12" r="4.8" /><circle cx="12" cy="12" r="1.1" /></>),
  crosshair: (<><circle cx="12" cy="12" r="8" />{P('M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22')}</>),
  flag: P('M5 21V3.8M5 4.6h11.5l-2 3.6 2 3.6H5'),
  repeat: P('M17 2.5 20.5 6 17 9.5M3.5 12V9a3 3 0 0 1 3-3h14M7 21.5 3.5 18 7 14.5M20.5 12v3a3 3 0 0 1-3 3h-14'),
  zap: P('M13.2 2.5 4.4 14.2h6.6L10 21.5l9.2-12h-6.8z'),
  bolt: P('M13.2 2.5 4.4 14.2h6.6L10 21.5l9.2-12h-6.8z'),
  spark: P('m12 2.8 2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2zM18.6 16.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM5.4 14.6l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z'),
  flame: P('M12 21.5c3.9 0 6.8-2.6 6.8-6.2 0-4.4-4.3-5.8-5.3-11.8-2.4 2-4.8 4.1-4.8 6.9 0 1.4.5 2.4.5 2.4s-1.9-.9-2.8.5c-.6 1-1 2-1 3 0 3.6 2.7 5.2 6.6 5.2z'),
  fire: P('M12 21.5c3.9 0 6.8-2.6 6.8-6.2 0-4.4-4.3-5.8-5.3-11.8-2.4 2-4.8 4.1-4.8 6.9 0 1.4.5 2.4.5 2.4s-1.9-.9-2.8.5c-.6 1-1 2-1 3 0 3.6 2.7 5.2 6.6 5.2z'),
  heart: P('M12 20.4S3.8 15.6 3.8 9.9a4.3 4.3 0 0 1 8.2-1.8 4.3 4.3 0 0 1 8.2 1.8c0 5.7-8.2 10.5-8.2 10.5z'),
  pulse: P('M2.8 12.4h4l2.6 7 4.4-15 2.6 8h4.8'),
  activity: P('M2.8 12.4h4l2.6 7 4.4-15 2.6 8h4.8'),
  battery: (<><rect x="2.5" y="7.5" width="17" height="9" rx="2.2" />{P('M21.6 11v2M6 11v2M9.5 11v2')}</>),

  /* ---- rewards ---- */
  trophy: P('M8 3.6h8v5.2a4 4 0 0 1-8 0zM8 5.4H5.2a2.8 2.8 0 0 0 2.8 3.4M16 5.4h2.8a2.8 2.8 0 0 1-2.8 3.4M10 17.4h4M9 21h6M12 12.8v4.6'),
  medal: (<><circle cx="12" cy="15" r="5.8" />{P('M8.6 9.6 6 2.8h12l-2.6 6.8M12 12.6l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z')}</>),
  crown: P('m3 7.4 4.2 4L12 4.6l4.8 6.8L21 7.4v10.2H3z'),
  award: (<><circle cx="12" cy="9" r="5.8" />{P('m8.4 13.9-1.2 7.3 4.8-2.7 4.8 2.7-1.2-7.3')}</>),
  star: P('m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z'),
  shield: P('M12 2.8 20 5.6v6.1c0 4.9-3.4 7.9-8 9.5-4.6-1.6-8-4.6-8-9.5V5.6z'),
  'shield-check': P('M12 2.8 20 5.6v6.1c0 4.9-3.4 7.9-8 9.5-4.6-1.6-8-4.6-8-9.5V5.6zm-3.4 9 2.4 2.4 4.6-4.8'),
  gem: P('m12 2.8 4.6 5.4L12 21.2 7.4 8.2zM2.8 8.2h18.4M7.4 8.2 12 2.8l4.6 5.4'),
  gift: (<><rect x="3" y="8.5" width="18" height="4.2" rx="1" /><rect x="4.6" y="12.7" width="14.8" height="8.3" rx="1.4" />{P('M12 8.5v12.5M12 8.5S10.6 4 8.4 4a2.2 2.2 0 0 0 0 4.5zM12 8.5S13.4 4 15.6 4a2.2 2.2 0 0 1 0 4.5z')}</>),

  /* ---- data & charts ---- */
  chart: P('M3.2 3.2v17.6h17.6M7.4 16.4l3.8-5 3 2.8 4.8-6.4'),
  'bar-chart': P('M4 20.5V11M9.4 20.5V4.5M14.8 20.5v-6.6M20.2 20.5v-11M2.5 20.5h19'),
  'pie-chart': P('M12 3.2a8.8 8.8 0 1 0 8.8 8.8H12zM15.2 3.9A8.8 8.8 0 0 1 20.1 8.8h-4.9z'),
  'trending-up': P('M3.2 17.2 9.4 11l3.8 3.8L20.8 7M15.2 7h5.6v5.6'),
  'trending-down': P('M3.2 7 9.4 13.2l3.8-3.8 7.6 7.8M15.2 17.2h5.6v-5.6'),
  gauge: (<><path d="M4 18a9 9 0 1 1 16 0" />{P('M12 14.4 15.6 9.8M12 18.2h.01')}</>),
  sigma: P('M18 5.4H6.6l5.6 6.6-5.6 6.6H18'),
  percent: (<><circle cx="7.6" cy="7.6" r="2.6" /><circle cx="16.4" cy="16.4" r="2.6" />{P('m19 5-14 14')}</>),
  infinity: P('M7.4 8.6a3.4 3.4 0 1 0 0 6.8c3.6 0 5.6-6.8 9.2-6.8a3.4 3.4 0 1 1 0 6.8c-3.6 0-5.6-6.8-9.2-6.8z'),

  /* ---- content & docs ---- */
  book: P('M4 4.4h6.4A2.6 2.6 0 0 1 13 7v13.2a2.4 2.4 0 0 0-2.4-2.2H4zM20 4.4h-6.4A2.6 2.6 0 0 0 11 7v13.2a2.4 2.4 0 0 1 2.4-2.2H20z'),
  'book-open': P('M12 6.6C10.4 5.2 8.2 4.6 3.4 4.6v13.2c4.8 0 7 .6 8.6 2 1.6-1.4 3.8-2 8.6-2V4.6c-4.8 0-7 .6-8.6 2zM12 6.6v13.2'),
  note: P('M6.4 3.2h8.2L19.6 8v12.8H6.4zM14.4 3.2V8h5.2M9.2 12.6h6.4M9.2 16.4h4.4'),
  file: P('M6.4 3.2h8.2L19.6 8v12.8H6.4zM14.4 3.2V8h5.2'),
  compass: (<><circle cx="12" cy="12" r="9" />{P('m15.6 8.4-2 5.2-5.2 2 2-5.2z')}</>),
  map: P('m9.2 3.2-6 2.8v14.8l6-2.8 5.6 2.8 6-2.8V3.2l-6 2.8zM9.2 3.2v14.8M14.8 6v14.8'),
  mountain: P('m2.8 20.4 6.4-11.6 3.6 5.6 2-3 6.4 9zM8 5.4a1.8 1.8 0 1 0 0-.1z'),
  sunrise: P('M12 2.8v3.4M5.4 6.6 7.8 9M2.8 14.2h3.2M18 14.2h3.2M16.2 9l2.4-2.4M6.4 18a5.6 5.6 0 0 1 11.2 0M2.8 21.2h18.4'),
  sunset: P('M12 9.2V5.8M5.4 6.6 7.8 9M2.8 14.2h3.2M18 14.2h3.2M16.2 9l2.4-2.4M6.4 18a5.6 5.6 0 0 1 11.2 0M2.8 21.2h18.4'),
  sun: (<><circle cx="12" cy="12" r="4.2" />{P('M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6')}</>),
  moon: P('M20.4 14.6A8.6 8.6 0 1 1 9.4 3.6a6.9 6.9 0 0 0 11 11z'),
  palette: (<><path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.3 0 2-.9 2-1.9s-.7-1.5-.7-2.2c0-.7.6-1.2 1.3-1.2h1.6a4 4 0 0 0 4-4c0-4.6-4-8.3-8.2-8.3z" /><circle cx="7.8" cy="11.4" r="1.1" /><circle cx="10.6" cy="7.4" r="1.1" /><circle cx="15.2" cy="8.4" r="1.1" /></>),
  brush: P('M4 20.4s1.6.4 2.8-.8c1-1 .6-2.4.6-2.4S9.6 19 12 17.2M14.4 3.6 20.4 9.6 10.8 19.2 4.8 13.2z'),
  pen: P('M4 20.4h4L19.6 8.8a2.1 2.1 0 0 0-3-3L5 17.4v3zM14.6 6.8l3 3'),
  quote: P('M9.4 6.4C6.6 7.6 5 10 5 12.8c0 2.6 1.4 4.4 3.6 4.4 1.8 0 3.2-1.3 3.2-3.1 0-1.7-1.2-3-2.8-3-.4 0-.7 0-1 .2.3-1.6 1.4-3 3-3.8zM19.4 6.4c-2.8 1.2-4.4 3.6-4.4 6.4 0 2.6 1.4 4.4 3.6 4.4 1.8 0 3.2-1.3 3.2-3.1 0-1.7-1.2-3-2.8-3-.4 0-.7 0-1 .2.3-1.6 1.4-3 3-3.8z'),
  link: P('M10.2 13.8a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.4 1.4M13.8 10.2a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.4-1.4'),

  /* ---- people ---- */
  user: (<><circle cx="12" cy="8" r="3.8" />{P('M4.6 20.4a7.4 7.4 0 0 1 14.8 0')}</>),
  users: (<><circle cx="9.4" cy="8" r="3.4" />{P('M3 20.2a6.4 6.4 0 0 1 12.8 0M16.4 5a3.4 3.4 0 0 1 0 6.6M18 14.4a6.4 6.4 0 0 1 3 5.8')}</>),

  /* ---- media / timer transport ---- */
  play: P('M7.4 4.8 19 12 7.4 19.2z'),
  pause: P('M8.4 4.8v14.4M15.6 4.8v14.4'),
  stop: (<><rect x="6" y="6" width="12" height="12" rx="2" /></>),
  'skip-forward': P('M5.4 4.8 15 12l-9.6 7.2zM18.6 4.8v14.4'),
  'skip-back': P('M18.6 4.8 9 12l9.6 7.2zM5.4 4.8v14.4'),
  'fast-forward': P('M3 5.4 11 12 3 18.6zM13 5.4 21 12l-8 6.6z'),

  /* ---- workout-session specifics ---- */
  'list-checks': P('M3.4 6.4 5 8l3-3.2M3.4 12.4 5 14l3-3.2M3.4 18.4 5 20l3-3.2M10.4 7h10M10.4 13h10M10.4 19h10'),
  'check-square': (<><rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />{P('m7.8 12.2 2.8 2.8 5.6-6')}</>),
  'square': (<><rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" /></>),
  'circle-check': (<><circle cx="12" cy="12" r="8.8" />{P('m8.2 12.3 2.6 2.6 5-5.4')}</>),
  'skip-set': P('M6 5.4 12 12l-6 6.6zM14 5.4 20 12l-6 6.6z'),
  rest: (<><circle cx="12" cy="12" r="8.8" />{P('M12 7.6V12l3.4 2')}</>),
  'personal-best': P('m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z'),
  muscle: P('M6.4 20.4c-2-2.4-2.4-6-1-9.2 1.4-3.2 4.4-5.6 7.6-6 1.4-.2 2.6.4 3 1.6.4 1.2-.2 2.2-1.2 2.8-1.8 1-3.2 2.6-3.8 4.6-.4 1.4-.2 3 .6 4.2M14.4 4.4c2.6.6 5 2.6 6.2 5.4 1.4 3.4.4 7.2-2.4 9.6-1 .8-2.4.6-3.2-.4'),
  bone: P('M6.6 17.4 17.4 6.6M5 15.8a2.2 2.2 0 1 0-1.6 3.8 2.2 2.2 0 1 0 3.8-1.6M19 8.2a2.2 2.2 0 1 0 1.6-3.8 2.2 2.2 0 1 0-3.8 1.6'),
}

export type IconName = keyof typeof GLYPHS | string

export interface IconProps {
  name: IconName
  /** px — width and height are always equal. */
  size?: number
  strokeWidth?: number
  /** Set for glyphs that read better filled (play, bolt, star). */
  filled?: boolean
  className?: string
  title?: string
  style?: CSSProperties
}

/** Icons that are legible as solid shapes rather than outlines. */
const SOLID = new Set(['play', 'pause', 'stop', 'bolt', 'zap', 'spark', 'star', 'flame', 'fire', 'heart', 'crown', 'gem', 'skip-forward', 'skip-back', 'fast-forward', 'skip-set'])

export function Icon({ name, size = 18, strokeWidth = 1.8, filled, className, title, style }: IconProps) {
  const glyph = GLYPHS[name] ?? GLYPHS.info
  const solid = filled ?? SOLID.has(name)
  const labelled = Boolean(title)

  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      focusable="false"
    >
      {labelled ? <title>{title}</title> : null}
      {glyph}
    </svg>
  )
}

/** Every glyph name, for the icon gallery in Settings → About. */
export const ICON_NAMES = Object.keys(GLYPHS).sort()

export default Icon
