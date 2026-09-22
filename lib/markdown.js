const { marked } = require('marked');

// marked 옵션: 줄바꿈을 <br>로 바꾸지 않고(gfm 기본 동작), 헤더에 id 부여
marked.use({ gfm: true, breaks: false });

/**
 * 아주 단순한 frontmatter 파서.
 * ---\nkey: value\ntags: [a, b, c]\n---\n본문...
 * 를 { data, content } 형태로 분리한다. 외부 YAML 라이브러리에 의존하지 않는다.
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, content: raw };
  }

  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      // 배열: [태그1, 태그2]
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }

    data[key] = value;
  }

  const content = raw.slice(match[0].length);
  return { data, content };
}

function markdownToHtml(markdown) {
  return marked.parse(markdown);
}

/**
 * 본문에서 첫 문단을 뽑아 description이 없을 때 대체 요약으로 사용.
 */
function excerptFrom(markdown, maxLen = 160) {
  const firstParagraph = markdown
    .split(/\r?\n\r?\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#'));
  if (!firstParagraph) return '';
  const plain = firstParagraph.replace(/[#*_`>\[\]!]/g, '').trim();
  return plain.length > maxLen ? plain.slice(0, maxLen).trim() + '…' : plain;
}

module.exports = { parseFrontmatter, markdownToHtml, excerptFrom };
