import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { InformationPage, pages } from '../src/pages';
import { loadEnv } from 'vite';
import { siteMetadata } from './seo';
const template = readFileSync('dist/index.html', 'utf8');
let html = template.replace('<!--app-html-->', renderToString(<App />));
const site = process.env.SITE_URL || loadEnv('production', process.cwd(), '').SITE_URL;
const metadata = siteMetadata(site);
html = html.replace('</head>', metadata.head + '</head>');
if (metadata.sitemap) writeFileSync('dist/sitemap.xml', metadata.sitemap);
else console.warn('SITE_URL is unset: canonical, absolute share URLs and sitemap await the production domain.');
writeFileSync('dist/robots.txt', metadata.robots);
writeFileSync('dist/index.html', html);
for (const page of pages) {
  const metadata = siteMetadata(site, page.path, page.title);
  let pageHtml = template.replace('<!--app-html-->', renderToString(<InformationPage path={page.path} />));
  pageHtml = pageHtml.replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/(<meta (?:name="(?:description|twitter:description)"|property="og:description") content=")[^"]*/g, '$1' + page.description)
    .replace(/(<meta (?:name="twitter:title"|property="og:title") content=")[^"]*/g, '$1' + page.title)
    .replace('</head>', metadata.head + '</head>');
  const directory = 'dist' + page.path;
  mkdirSync(directory, { recursive: true });
  writeFileSync(directory + 'index.html', pageHtml);
}
console.log('Japanese homepage prerendered for crawlers.');
