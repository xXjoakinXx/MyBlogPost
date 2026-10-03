import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages serves this repo under /MyBlogPost/. If you move to a custom
// domain or a <user>.github.io repo, update `site` and set `base` to '/'.
const site = 'https://xxjoakinxx.github.io';
const base = '/MyBlogPost';

// Prefix root-relative src/href in Markdown (images, <video>, links) with `base`,
// so posts can keep writing paths like /blog/my-post/image.png.
function rehypeBasePaths() {
  const visit = (node) => {
    for (const attr of ['src', 'href', 'poster']) {
      const value = node.properties?.[attr];
      if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith(base + '/')) {
        node.properties[attr] = base + value;
      }
    }
    // Inline HTML (e.g. <video>) can arrive unparsed as a raw string.
    if (node.type === 'raw') {
      node.value = node.value.replace(new RegExp(`\\b(src|href|poster)="/(?!/|${base.slice(1)}/)`, 'g'), `$1="${base}/`);
    }
    node.children?.forEach(visit);
  };
  return visit;
}

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark' },
    rehypePlugins: [rehypeBasePaths],
  },
});
