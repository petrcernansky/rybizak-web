import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
  ],

  // SSR titulky: menu a texty z CRM se načítají z API při každém requestu (ne při buildu).
  output: 'server',
  adapter: vercel(),
});