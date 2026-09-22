const fs = require('fs');
const path = require('path');

const layoutSrc = fs.readFileSync(path.join(__dirname, '..', 'templates', 'layout.html'), 'utf8');

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 공통 레이아웃에 content를 채워 완성된 HTML 문서를 반환한다.
 * rootPath: 이 페이지에서 루트(public/)까지의 상대 경로. 예) '', '../', '../../'
 */
function renderPage({ title, description = '', content, rootPath = '' }) {
  return layoutSrc
    .replace(/{{title}}/g, escapeHtml(title))
    .replace(/{{description}}/g, escapeHtml(description))
    .replace(/{{rootPath}}/g, rootPath)
    .replace(/{{year}}/g, String(new Date().getFullYear()))
    .replace('{{content}}', content);
}

function renderTags(tags = [], rootPath = '') {
  if (!tags.length) return '';
  return `<ul class="tag-list">${tags
    .map((t) => `<li><a class="tag" href="${rootPath}tags/${slugify(t)}/index.html">#${escapeHtml(t)}</a></li>`)
    .join('')}</ul>`;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || '';
  return d.toISOString().slice(0, 10);
}

function renderPostCard(post, rootPath = '') {
  return `
<article class="post-card">
  <h2><a href="${rootPath}${post.url}">${escapeHtml(post.title)}</a></h2>
  <p class="post-meta"><time datetime="${formatDate(post.date)}">${formatDate(post.date)}</time></p>
  <p class="post-excerpt">${escapeHtml(post.description)}</p>
  ${renderTags(post.tags, rootPath)}
</article>`;
}

function renderPostList(posts, rootPath = '') {
  if (!posts.length) {
    return `<p class="empty">아직 글이 없습니다.</p>`;
  }
  return `<div class="post-list">${posts.map((p) => renderPostCard(p, rootPath)).join('\n')}</div>`;
}

function renderPagination(page, rootPath = '') {
  if (page.totalPages <= 1) return '';
  const prev = page.hasPrev
    ? `<a class="page-link" href="${rootPath}${page.prevUrl}">&larr; 이전</a>`
    : `<span class="page-link disabled">&larr; 이전</span>`;
  const next = page.hasNext
    ? `<a class="page-link" href="${rootPath}${page.nextUrl}">다음 &rarr;</a>`
    : `<span class="page-link disabled">다음 &rarr;</span>`;
  return `
<nav class="pagination" aria-label="페이지 이동">
  ${prev}
  <span class="page-status">${page.pageNumber} / ${page.totalPages}</span>
  ${next}
</nav>`;
}

function renderPostContent(post, rootPath = '') {
  return `
<article class="post">
  <h1>${escapeHtml(post.title)}</h1>
  <p class="post-meta"><time datetime="${formatDate(post.date)}">${formatDate(post.date)}</time></p>
  ${renderTags(post.tags, rootPath)}
  <div class="post-body">
    ${post.html}
  </div>
  <p class="post-back"><a href="${rootPath}index.html">&larr; 목록으로</a></p>
</article>`;
}

function renderAppSection(apps, rootPath = '') {
  if (!apps || !apps.length) return '';
  const cards = apps
    .map(
      (app) => `
<a class="app-card" href="${rootPath}${app.url}">
  <span class="app-card-title">${escapeHtml(app.title)}</span>
  <span class="app-card-desc">${escapeHtml(app.description)}</span>
</a>`
    )
    .join('');
  return `
<section class="app-section">
  <h2 class="app-section-title">미니 웹앱</h2>
  <div class="app-grid">${cards}</div>
</section>`;
}

module.exports = {
  renderPage,
  renderPostList,
  renderPostContent,
  renderPagination,
  renderTags,
  renderAppSection,
  slugify,
  escapeHtml,
  formatDate,
};
