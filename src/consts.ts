// Site-wide settings. Edit these first.
export const SITE_TITLE = 'Joaquin García';
export const SITE_DESCRIPTION =
  'Notes from a backend tech lead building an indie game: Go, distributed systems, agentic AI and Godot.';
export const AUTHOR = 'Joaquin García';
export const LINKS = {
  github: 'https://github.com/xXjoakinXx',
  linkedin: 'https://www.linkedin.com/',
};

// Prefix an internal path with the site's base path (e.g. /MyBlogPost).
export const withBase = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + path;
