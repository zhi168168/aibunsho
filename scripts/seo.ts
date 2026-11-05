import { pages } from '../src/pages';

export function siteMetadata(site?: string, path = '/', title = 'AIチェッカー｜日本語の文章を無料・登録不要でチェック') {
  if (!site) return { head: '', sitemap: null, robots: 'User-agent: *\nAllow: /\nDisallow: /api/\n' };
  const url = new URL(site);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_URL must be an HTTPS origin without path, credentials, or query.');
  const canonical = url.origin + path;
  const home = url.origin + '/';
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const image = url.origin + '/ai-checker-og.png';
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', '@id': home + '#website', url: home, name: 'AIチェッカー', inLanguage: 'ja' },
    { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, inLanguage: 'ja', isPartOf: { '@id': home + '#website' }, primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630 } },
  ] };
  const head = `<link rel="canonical" href="${escape(canonical)}" />
<meta property="og:url" content="${escape(canonical)}" />
<meta property="og:image" content="${escape(image)}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="AIチェッカー：日本語の文体・規則性・繰り返しを無料分析" />
<meta name="twitter:image" content="${escape(image)}" />
<meta name="twitter:image:alt" content="AIチェッカー：日本語の文章を無料分析" />
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
  return {
    head,
    sitemap: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...pages.map(page => page.path)].map(path => `<url><loc>${escape(url.origin + path)}</loc></url>`).join('')}</urlset>`,
    robots: `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`,
  };
}
