const fs = require('fs');
const path = require('path');

const { parseFrontmatter, markdownToHtml, excerptFrom } = require('./lib/markdown');
const { renderPage, renderPostList, renderPostContent, renderPagination, renderAppSection, slugify } = require('./lib/templates');
const { paginate } = require('./lib/paginate');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ASSETS_SRC_DIR = path.join(ROOT, 'assets');
const PAGE_SIZE = 5;

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = parseFrontmatter(raw);

    const title = data.title || file.replace(/\.md$/, '');
    const date = data.date || '1970-01-01';
    const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];
    const description = data.description || excerptFrom(content);
    const slug = slugify(data.slug || title || file.replace(/\.md$/, ''));
    const html = markdownToHtml(content);

    return {
      title,
      date,
      tags,
      description,
      slug,
      html,
      url: `posts/${slug}/index.html`,
      sourceFile: file,
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function buildPostPages(posts) {
  for (const post of posts) {
    const html = renderPage({
      title: `${post.title} · My Blog`,
      description: post.description,
      content: renderPostContent(post, '../../'),
      rootPath: '../../',
    });
    writeFile(path.join(PUBLIC_DIR, 'posts', post.slug, 'index.html'), html);
  }
}

// 블로그 메인 페이지(1페이지)에만 노출되는 미니 웹앱 목록.
// /app/ktk/ 안에 자체 완결된 앱을 추가할 때마다 여기에 한 줄씩 등록한다.
const APPS = [
  {
    title: '2048',
    description: '방향키·스와이프로 숫자 타일을 밀어 합치는 퍼즐 게임',
    url: '../app/ktk/2048/index.html',
  },
  {
    title: '픽셀 아트 에디터',
    description: '16x16 격자에 도트를 찍어 그림을 그리고 PNG로 저장',
    url: '../app/ktk/pixel-art/index.html',
  },
];

function buildIndexPages(posts) {
  const pages = paginate(posts, PAGE_SIZE, (n) => (n === 1 ? 'index.html' : `page/${n}/index.html`));

  for (const page of pages) {
    const isFirst = page.pageNumber === 1;
    const rootPath = isFirst ? '' : '../../';
    const content = `
${isFirst ? renderAppSection(APPS, rootPath) : ''}
<h1>모든 글</h1>
${renderPostList(page.items, rootPath)}
${renderPagination(page, rootPath)}`;

    const html = renderPage({
      title: isFirst ? 'My Blog' : `My Blog · ${page.pageNumber}페이지`,
      description: '마크다운으로 작성한 블로그 글 목록',
      content,
      rootPath,
    });

    const outPath = isFirst
      ? path.join(PUBLIC_DIR, 'index.html')
      : path.join(PUBLIC_DIR, 'page', String(page.pageNumber), 'index.html');
    writeFile(outPath, html);
  }
}

function buildTagPages(posts) {
  const byTag = new Map();
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = slugify(tag);
      if (!byTag.has(key)) byTag.set(key, { name: tag, posts: [] });
      byTag.get(key).posts.push(post);
    }
  }

  for (const [tagSlug, { name, posts: tagPosts }] of byTag) {
    const content = `
<h1>태그: #${name}</h1>
${renderPostList(tagPosts, '../../')}`;
    const html = renderPage({
      title: `#${name} · My Blog`,
      description: `'${name}' 태그가 달린 글 목록`,
      content,
      rootPath: '../../',
    });
    writeFile(path.join(PUBLIC_DIR, 'tags', tagSlug, 'index.html'), html);
  }
}

function buildRss(posts) {
  const items = posts
    .map(
      (p) => `
  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${SITE_ORIGIN}/${p.url}</link>
    <guid>${SITE_ORIGIN}/${p.url}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${escapeXml(p.description)}</description>
  </item>`
    )
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>My Blog</title>
  <link>${SITE_ORIGIN}/</link>
  <description>마크다운으로 작성한 블로그</description>
  ${items}
</channel>
</rss>`;

  writeFile(path.join(PUBLIC_DIR, 'rss.xml'), rss);
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 배포 주소가 정해지지 않아 상대 경로 기준 플레이스홀더를 사용한다.
// 실제 배포 시 이 값을 실제 도메인으로 바꾸면 RSS 링크가 절대 경로로 완성된다.
const SITE_ORIGIN = '.';

function buildSearchIndex(posts) {
  const index = posts.map((p) => ({
    title: p.title,
    description: p.description,
    url: p.url,
    tags: p.tags,
    date: p.date,
  }));
  writeFile(path.join(PUBLIC_DIR, 'search-index.json'), JSON.stringify(index, null, 2));
}

function copyAssets() {
  const destDir = path.join(PUBLIC_DIR, 'assets');
  fs.mkdirSync(destDir, { recursive: true });
  if (!fs.existsSync(ASSETS_SRC_DIR)) return;
  for (const file of fs.readdirSync(ASSETS_SRC_DIR)) {
    fs.copyFileSync(path.join(ASSETS_SRC_DIR, file), path.join(destDir, file));
  }
}

function main() {
  rmrf(PUBLIC_DIR);
  const posts = loadPosts();

  copyAssets();
  buildPostPages(posts);
  buildIndexPages(posts);
  buildTagPages(posts);
  buildRss(posts);
  buildSearchIndex(posts);

  console.log(`빌드 완료: 글 ${posts.length}개 → public/`);
}

main();
