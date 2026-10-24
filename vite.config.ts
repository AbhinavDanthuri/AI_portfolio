import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * Social previews need absolute URLs. Set SITE_URL (e.g. in Vercel/Netlify env vars or .env)
 * to your deployed origin and this rewrites og:image / twitter:image and adds a canonical link.
 */
function absoluteSocialUrls(siteUrl: string): Plugin {
  return {
    name: 'absolute-social-urls',
    transformIndexHtml(html) {
      if (!siteUrl) return html;
      const origin = siteUrl.replace(/\/$/, '');
      return html
        .replaceAll('content="./og.png"', `content="${origin}/og.png"`)
        .replace('</head>', `  <link rel="canonical" href="${origin}/" />\n    <meta property="og:url" content="${origin}/" />\n  </head>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/',
    plugins: [react(), absoluteSocialUrls(env.SITE_URL ?? '')],
    build: {
      target: 'es2020',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          notFound: resolve(__dirname, '404.html'),
        },
        output: {
          // three.js gets its own chunk; it only loads once the hero scene starts.
          manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
        },
      },
    },
  };
});
