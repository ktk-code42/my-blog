/**
 * items 배열을 pageSize 단위로 나눈다.
 * 반환값: [{ pageNumber, items, hasPrev, hasNext, prevUrl, nextUrl }]
 * url(n) 은 페이지 번호를 받아 해당 페이지의 경로를 반환하는 함수여야 한다.
 */
function paginate(items, pageSize, url) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pages = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const start = (pageNumber - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    pages.push({
      pageNumber,
      totalPages,
      items: pageItems,
      hasPrev: pageNumber > 1,
      hasNext: pageNumber < totalPages,
      prevUrl: pageNumber > 1 ? url(pageNumber - 1) : null,
      nextUrl: pageNumber < totalPages ? url(pageNumber + 1) : null,
      selfUrl: url(pageNumber),
    });
  }

  return pages;
}

module.exports = { paginate };
