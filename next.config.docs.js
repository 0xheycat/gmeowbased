import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  flexsearch: {
    codeblocks: true
  },
  latex: true
})

export default withNextra({
  // Existing Next.js config
  reactStrictMode: true,
  swcMinify: true,
  
  // Ensure docs are served
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['nextra-theme-docs']
  },
  
  // Redirect root /docs to documentation site
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/docs/index',
        permanent: false
      }
    ]
  }
})
