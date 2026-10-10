/*
 * The web fonts, imported as modules rather than from index.css.
 *
 * Tailwind's PostCSS plugin inlines a CSS `@import` without rebasing the
 * `url(./files/...)` inside it, so the production stylesheet asked for
 * /assets/files/karla-latin-400-normal.woff2 — a file Vite never emitted —
 * and every page fell back to a system font with a console full of 404s.
 * Imported here, each fontsource stylesheet goes through Vite's own CSS
 * pipeline, which resolves those urls and emits the font files beside it.
 *
 * The royal design template's pairing: Plus Jakarta Sans carries the body text,
 * Cormorant Garamond the display and section headings. Only the weights the
 * template sets are loaded.
 */
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/karla/300.css';
import '@fontsource/karla/400.css';
import '@fontsource/karla/500.css';
import '@fontsource/karla/600.css';
