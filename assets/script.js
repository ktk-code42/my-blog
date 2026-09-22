(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * 다크 모드 토글
   * ------------------------------------------------------------------ */
  function initThemeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function currentTheme() {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function updateIcon() {
      btn.textContent = currentTheme() === 'dark' ? '☀️' : '🌙';
    }

    updateIcon();

    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {
        /* localStorage를 쓸 수 없는 환경(프라이빗 모드 등)이면 조용히 무시 */
      }
      updateIcon();
    });
  }

  /* ------------------------------------------------------------------
   * 클라이언트 검색
   * search-index.json을 fetch해 제목/설명/태그에서 부분 일치를 찾는다.
   * ------------------------------------------------------------------ */
  function initSearch() {
    var input = document.getElementById('search-input');
    var resultsEl = document.getElementById('search-results');
    if (!input || !resultsEl) return;

    var rootPath = input.getAttribute('data-root') || '';
    var indexPromise = null;
    var debounceTimer = null;

    function loadIndex() {
      if (!indexPromise) {
        indexPromise = fetch(rootPath + 'search-index.json')
          .then(function (res) {
            if (!res.ok) throw new Error('검색 인덱스를 불러오지 못했습니다.');
            return res.json();
          })
          .catch(function () {
            return [];
          });
      }
      return indexPromise;
    }

    function renderResults(items, query) {
      resultsEl.innerHTML = '';

      if (!query) {
        resultsEl.hidden = true;
        return;
      }

      if (items.length === 0) {
        var empty = document.createElement('li');
        empty.className = 'search-empty';
        empty.textContent = '검색 결과가 없습니다.';
        resultsEl.appendChild(empty);
        resultsEl.hidden = false;
        return;
      }

      items.slice(0, 10).forEach(function (item) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = rootPath + item.url;
        a.textContent = item.title;
        li.appendChild(a);
        resultsEl.appendChild(li);
      });
      resultsEl.hidden = false;
    }

    function search(query) {
      var q = query.trim().toLowerCase();
      if (!q) {
        renderResults([], '');
        return;
      }
      loadIndex().then(function (items) {
        var matched = items.filter(function (item) {
          var haystack = [item.title, item.description, (item.tags || []).join(' ')]
            .join(' ')
            .toLowerCase();
          return haystack.indexOf(q) !== -1;
        });
        renderResults(matched, q);
      });
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var value = input.value;
      debounceTimer = setTimeout(function () {
        search(value);
      }, 150);
    });

    document.addEventListener('click', function (e) {
      if (!resultsEl.contains(e.target) && e.target !== input) {
        resultsEl.hidden = true;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    initSearch();
  });
})();
