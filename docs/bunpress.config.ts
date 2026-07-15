import type { BunPressConfig } from 'bunpress'

const config: BunPressConfig = {
  name: 'ts-ndarray',
  description: 'Multidimensional arrays for JavaScript & TypeScript',
  url: 'https://ts-ndarray.stacksjs.org',

  theme: {
    primaryColor: '#0ea5e9',
  },

  sidebar: [
    {
      text: 'Introduction',
      link: '/',
    },
    {
      text: 'Guide',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Operations', link: '/guide/operations' },
        { text: 'Broadcasting', link: '/guide/broadcasting' },
      ],
    },
    {
      text: 'Features',
      items: [
        { text: 'Array Creation', link: '/features/creation' },
        { text: 'Slicing & Indexing', link: '/features/slicing' },
        { text: 'Mathematical Ops', link: '/features/math' },
        { text: 'Shape Manipulation', link: '/features/shapes' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Memory Layout', link: '/advanced/memory' },
        { text: 'Performance Tips', link: '/advanced/performance' },
        { text: 'Custom dtypes', link: '/advanced/dtypes' },
        { text: 'GPU Acceleration', link: '/advanced/gpu' },
      ],
    },
  ],

  navbar: [
    { text: 'Home', link: '/' },
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'GitHub', link: 'https://github.com/stacksjs/ts-ndarray' },
  ],

  socialLinks: [
    { icon: 'github', link: 'https://github.com/stacksjs/ts-ndarray' },
    { icon: 'discord', link: 'https://discord.gg/stacksjs' },
    { icon: 'twitter', link: 'https://twitter.com/stacksjs' },
  ],
}

export default config
