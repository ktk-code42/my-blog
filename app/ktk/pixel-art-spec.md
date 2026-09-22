# 픽셀 아트 에디터 구현 계획 (spec.md)

## 1. 앱 개요

- 16x16 격자(그리드) 위에 클릭/드래그(데스크톱) 또는 터치/드래그(모바일)로 도트를 찍어 픽셀 아트를 그리는 에디터.
- 색상 팔레트에서 색을 선택해 칠하고, 지우개로 되돌릴 수 있다.
- 완성한 그림을 PNG 파일로 다운로드할 수 있다(고해상도로 확대 저장).
- 전체 지우기(Clear) 기능 제공.
- 로그인/서버 없이 순수 프론트엔드로만 동작하며, 새로고침 시 그림은 초기화된다(저장/불러오기는 이번 범위에 포함하지 않음).

## 2. 파일 구조

`/app/ktk/pixel-art/` 폴더 안에 다음 파일들을 자체 완결형으로 구성한다. 블로그의 다른 파일(assets, templates, public 등)은 전혀 건드리지 않는다.

```
/app/ktk/pixel-art/
  index.html      # 화면 마크업 (헤더, 격자, 팔레트, 도구 버튼, 저장/지우기 버튼)
  style.css       # 전체 스타일 (격자, 팔레트, 반응형, 다크/라이트 대응)
  editor.js       # 에디터 로직 전체 (상태, 칠하기/지우기, 팔레트, PNG 내보내기, 입력 처리)
```

- 외부 라이브러리/프레임워크는 사용하지 않는다(요청 규모상 순수 HTML/CSS/JS로 충분). CDN 의존성 없음.
- `index.html`은 `style.css`, `editor.js`만 상대경로로 로드하며, 블로그 본체의 `assets/style.css` 등은 참조하지 않는다(완전 독립).
- 폰트는 시스템 폰트 스택 사용(웹폰트 CDN 불필요).

## 3. 핵심 로직 설계 (editor.js)

### 3.1 격자 상태 표현

- `GRID_SIZE = 16` 상수로 격자 크기를 정의한다.
- `pixels`: 길이 256(16*16)인 1차원 배열로 표현하고, 각 칸에는 CSS 색상 문자열 또는 `null`(투명)을 저장한다.
  ```js
  const GRID_SIZE = 16;
  let pixels = new Array(GRID_SIZE * GRID_SIZE).fill(null); // null = 투명(빈 칸)

  function indexOf(row, col) {
    return row * GRID_SIZE + col;
  }
  ```
- 초기값은 전부 `null`(투명)로 시작하고, 화면상 빈 칸은 흰색 배경으로 시각화한다(최소 구현).

### 3.2 격자 DOM 렌더링

- 초기 렌더링 시 256개의 `<div class="cell">` 요소를 `#grid` 컨테이너에 생성하고, 각 셀에 `data-row`, `data-col` 속성을 부여한다. CSS Grid(`display: grid; grid-template-columns: repeat(16, 1fr);`)로 배치한다.
  ```js
  function buildGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        grid.appendChild(cell);
      }
    }
  }
  ```
- 픽셀 값이 바뀔 때마다 전체를 다시 그리지 않고, 해당 셀의 `backgroundColor`만 직접 갱신한다.
  ```js
  function paintCell(row, col, color) {
    const idx = indexOf(row, col);
    pixels[idx] = color; // color가 null이면 지우개(투명) 처리
    const cell = document.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.style.backgroundColor = color || ''; // null이면 CSS 기본(빈 칸) 배경으로 복귀
  }
  ```
  - `buildGrid()` 시점에 `cellElements[row][col]` 2차원 배열에 DOM 참조를 캐싱해두고 `paintCell`에서 바로 참조하는 방식을 권장한다(querySelector 반복 호출 대신 성능/가독성 개선).

### 3.3 클릭 및 드래그로 연속 칠하기

- 전역 상태: `currentTool`(`'pen'` 또는 `'eraser'`), `currentColor`(선택된 색상, 기본값 예: `#000000`), `isDrawing`(마우스/터치가 눌린 상태인지).
- 마우스 이벤트: `mousedown` → 그리기 시작 + 해당 칸 즉시 칠하기, `mousemove` → `isDrawing`이 true일 때 지나가는 칸을 칠하기, `mouseup`(및 `mouseleave` 시 안전하게) → 그리기 종료.
  ```js
  let isDrawing = false;

  function getToolColor() {
    return currentTool === 'eraser' ? null : currentColor;
  }

  function handleCellPaint(row, col) {
    paintCell(row, col, getToolColor());
  }

  gridEl.addEventListener('mousedown', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    isDrawing = true;
    handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
  });

  gridEl.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
  });

  window.addEventListener('mouseup', () => { isDrawing = false; });
  ```
- 터치 이벤트: `touchstart`/`touchmove`/`touchend`를 동일한 방식으로 처리하되, `touchmove`에서 `e.touches[0].clientX/clientY`로 좌표를 구한 뒤 `document.elementFromPoint(x, y)`를 사용해 어떤 셀 위에 있는지 판별한다(터치 이벤트의 `target`은 `touchstart` 시점 요소로 고정되어 `touchmove` 중에도 바뀌지 않기 때문).
  ```js
  function cellFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    return el && el.classList.contains('cell') ? el : null;
  }

  gridEl.addEventListener('touchstart', (e) => {
    e.preventDefault(); // 스크롤/확대 방지
    isDrawing = true;
    const touch = e.touches[0];
    const cell = cellFromPoint(touch.clientX, touch.clientY);
    if (cell) handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
  }, { passive: false });

  gridEl.addEventListener('touchmove', (e) => {
    e.preventDefault(); // 드래그 중 페이지 스크롤 방지 (핵심)
    if (!isDrawing) return;
    const touch = e.touches[0];
    const cell = cellFromPoint(touch.clientX, touch.clientY);
    if (cell) handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
  }, { passive: false });

  gridEl.addEventListener('touchend', () => { isDrawing = false; });
  ```
  - 터치 이벤트는 반드시 `{ passive: false }`로 등록하고 `e.preventDefault()`를 호출해야 드래그 중 페이지가 스크롤되지 않는다.
  - 격자 컨테이너에 CSS `touch-action: none;`을 추가로 적용해 브라우저 기본 제스처(핀치 줌, 스크롤)를 이중으로 방지한다.

### 3.4 지우개 기능

- `currentTool = 'eraser'`일 때 `getToolColor()`가 `null`을 반환하므로, 칠하기 로직(`paintCell`)을 그대로 재사용해 해당 칸을 투명(빈 칸)으로 되돌린다. 별도의 지우개 전용 함수는 불필요하다.
- 펜/지우개 전환 버튼(`#pen-btn`, `#eraser-btn`)에 각각 클릭 이벤트를 달아 `currentTool` 값을 바꾸고, 현재 선택된 도구에 `active` 클래스를 토글해 시각적으로 구분한다.

### 3.5 PNG 내보내기 (핵심 설계)

**해상도 결정: 16x16 원본이 아니라 16배 확대한 256x256으로 저장한다.**

- 이유:
  1. 16x16 원본 그대로 저장하면 대부분의 이미지 뷰어/OS 미리보기에서 이미지가 지나치게 작게 보이거나, 뷰어가 자동으로 부드럽게(블러) 확대해 픽셀 아트 특유의 각진 도트 느낌이 사라진다.
  2. 16배(256x256)로 확대해 저장하면 각 원본 도트가 16x16px 정사각형 블록으로 저장되어, 어떤 뷰어에서 열어도 픽셀 아트의 각진 형태가 그대로 유지된다.
  3. 256x256은 SNS 공유, 프로필 이미지 등 실용적으로 쓰기에도 적당한 크기다.
  4. 배율은 상수(`EXPORT_SCALE = 16`)로 분리해두어, 추후 32배(512x512) 등으로 쉽게 조정 가능하게 한다.
- 배경 처리: 투명 칸(`null`)은 PNG의 알파 채널로 투명하게 저장한다(캔버스를 미리 비워두면 기본이 투명이므로 별도 배경색을 칠하지 않으면 됨). 최소 구현에서는 투명 배경 PNG로 통일한다.
- 구현 방식: 화면에는 보이지 않는 오프스크린 `<canvas>`에 `pixels` 배열을 16배로 확대해 그린 뒤, `canvas.toBlob()`으로 PNG Blob을 만들고, `URL.createObjectURL(blob)`로 임시 URL을 생성해 `<a download>` 링크를 통해 다운로드를 트리거한다.
  ```js
  const EXPORT_SCALE = 16; // 16x16 -> 256x256

  function exportAsPNG() {
    const canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE * EXPORT_SCALE;   // 256
    canvas.height = GRID_SIZE * EXPORT_SCALE;  // 256
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false; // 각진 픽셀 그대로 확대

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const color = pixels[indexOf(row, col)];
        if (!color) continue; // 투명 칸은 그리지 않음 (알파 유지)
        ctx.fillStyle = color;
        ctx.fillRect(col * EXPORT_SCALE, row * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
      }
    }

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pixel-art.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // 메모리 정리
    }, 'image/png');
  }
  ```
  - `toBlob` + `URL.createObjectURL` 방식이 `toDataURL`보다 메모리 효율이 좋아 이를 기본으로 채택한다.
  - 이 앱은 배포 후 사용자의 실제 브라우저에서 사용하는 것을 전제로 하므로, 표준적인 `<a download>` + Blob URL 방식을 그대로 사용하면 실제 파일 다운로드가 정상 동작한다.

### 3.6 전체 지우기(Clear) 기능

```js
function clearAll() {
  pixels.fill(null);
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      paintCell(row, col, null); // 각 셀을 투명(빈 칸)으로 되돌림
    }
  }
}
```

- `#clear-btn` 클릭 시 `confirm('정말 전체 지우기 하시겠습니까?')` 확인창을 거치는 것을 권장한다(실수로 전체 삭제 방지).

## 4. UI/인터랙션 설계 (index.html + style.css)

### 4.1 레이아웃 구조 (index.html)

```html
<body>
  <div class="app-wrap">
    <header class="editor-header">
      <h1>픽셀 아트 에디터</h1>
      <p class="instructions">격자를 클릭하거나 드래그해서 그림을 그려보세요.</p>
    </header>

    <div class="toolbar">
      <div class="tool-buttons">
        <button id="pen-btn" class="tool-btn active" type="button" aria-label="펜">✏️ 펜</button>
        <button id="eraser-btn" class="tool-btn" type="button" aria-label="지우개">🧹 지우개</button>
      </div>
      <div class="current-color-display">
        <span>현재 색상</span>
        <span id="current-color-swatch" class="color-swatch-preview"></span>
      </div>
    </div>

    <div class="editor-main">
      <div id="grid" class="grid" role="grid" aria-label="16x16 픽셀 그리드"></div>

      <div class="palette-panel">
        <div id="palette" class="palette"><!-- JS가 색상 스와치를 렌더링 --></div>
        <label class="custom-color-label">
          커스텀 색상
          <input type="color" id="custom-color-input" value="#000000">
        </label>
      </div>
    </div>

    <div class="actions-row">
      <button id="clear-btn" class="action-btn secondary" type="button">전체 지우기</button>
      <button id="export-btn" class="action-btn primary" type="button">PNG로 저장</button>
    </div>

    <a class="back-link" href="../../../public/index.html">← 블로그로 돌아가기</a>
  </div>

  <script src="editor.js"></script>
</body>
```

- `back-link`는 `/app/ktk/pixel-art/index.html`에서 `/public/index.html`로 가는 상대경로이므로 `../../../public/index.html`(pixel-art → ktk → app → my-blog, 세 단계 상위 후 public/index.html)로 설정한다. (2048 앱 Review 단계에서 두 단계로 잘못 설정했다가 수정한 전례가 있으니, Build 단계에서 반드시 세 단계로 정확히 할 것.)

### 4.2 색상 팔레트

- 기본 제공 색상 배열을 JS에 정의하고, `#palette` 컨테이너에 스와치 버튼(`<button class="swatch">`)으로 렌더링한다. 팔레트는 16색 정도로, 검정/흰색/회색 계열 + 기본 무지개색 + 파스텔톤 일부를 포함해 픽셀 아트에 실용적인 구성으로 한다.
  ```js
  const DEFAULT_PALETTE = [
    '#000000', '#ffffff', '#808080', '#c0c0c0',
    '#ff0000', '#ff8000', '#ffff00', '#80ff00',
    '#00ff00', '#00ff80', '#00ffff', '#0080ff',
    '#0000ff', '#8000ff', '#ff00ff', '#ff0080',
  ];

  function buildPalette() {
    const paletteEl = document.getElementById('palette');
    DEFAULT_PALETTE.forEach((color) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.setAttribute('aria-label', `색상 ${color}`);
      swatch.addEventListener('click', () => selectColor(color));
      paletteEl.appendChild(swatch);
    });
  }
  ```
- 현재 선택된 색상은 `#current-color-swatch`의 배경색으로 표시하고, 선택된 스와치 버튼에는 `selected` 클래스(테두리 강조)를 부여한다.
- 색상을 선택하면(스와치 클릭 또는 커스텀 색상 변경) 자동으로 `currentTool = 'pen'`으로 전환한다.
  ```js
  function selectColor(color) {
    currentColor = color;
    currentTool = 'pen';
    updateToolButtonsUI();
    document.getElementById('current-color-swatch').style.backgroundColor = color;
    updatePaletteSelectionUI(color);
  }
  ```
- **커스텀 색상**: `<input type="color" id="custom-color-input">`을 팔레트 하단에 배치해 기본 팔레트에 없는 색도 자유롭게 선택할 수 있게 한다. `input`(또는 `change`) 이벤트에서 `selectColor(e.target.value)`를 호출한다.

### 4.3 도구 버튼 (펜/지우개)

```js
function updateToolButtonsUI() {
  document.getElementById('pen-btn').classList.toggle('active', currentTool === 'pen');
  document.getElementById('eraser-btn').classList.toggle('active', currentTool === 'eraser');
}

document.getElementById('pen-btn').addEventListener('click', () => {
  currentTool = 'pen';
  updateToolButtonsUI();
});

document.getElementById('eraser-btn').addEventListener('click', () => {
  currentTool = 'eraser';
  updateToolButtonsUI();
});
```

### 4.4 격자 반응형 크기

- `.grid`는 CSS Grid로 16x16을 구성하고, 전체 너비를 `min(90vw, 480px)`로 제한해 모바일에서도 화면에 다 들어오도록 한다.
  ```css
  .grid {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    grid-template-rows: repeat(16, 1fr);
    width: min(90vw, 480px);
    aspect-ratio: 1 / 1;
    border: 1px solid #ccc;
    touch-action: none; /* 드래그 중 스크롤/줌 방지 */
  }

  .cell {
    border: 1px solid #eee; /* 격자선, 너무 진하지 않게 */
    box-sizing: border-box;
  }
  ```

### 4.5 다크/라이트 대응 (선택 사항)

- 2048 앱과 마찬가지로 `prefers-color-scheme: dark` 미디어쿼리를 이용해 배경/텍스트/버튼 색상을 다크 모드에 맞게 조정하는 것을 권장한다.
  ```css
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #eee; }
    .grid { border-color: #444; }
    .cell { border-color: #333; }
    .action-btn.secondary { background: #333; color: #eee; }
  }
  ```
- 격자 자체(빈 칸)의 배경은 다크 모드에서도 흰색(또는 옅은 회색)으로 유지하는 것을 권장한다(도화지 느낌 유지, 밝은 색 도트와의 대비 확보).

## 5. 디자인 방향

- 블로그 전체의 미니멀한 톤에 맞춰 과도한 그림자/그라디언트를 지양하고, 여백을 넉넉히 확보한다.
- 버튼과 스와치는 border-radius를 블로그와 비슷한 수준(예: 6~10px)으로 통일한다.
- 팔레트 스와치는 정사각형(예: 32x32px)에 살짝 둥근 모서리, 선택된 스와치는 테두리(예: 2~3px)로 강조한다.
- 폰트는 시스템 폰트 스택(`-apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif`) 사용.

## 6. 모바일 대응 요약

- 격자 크기를 `min(90vw, 480px)`로 반응형 처리.
- `.grid`와 격자를 감싸는 컨테이너에 `touch-action: none;`을 적용해 드래그 중 페이지 스크롤/확대가 발생하지 않도록 한다.
- `touchstart`/`touchmove`에 `{ passive: false }` + `e.preventDefault()`를 반드시 적용. 누락 시 모바일에서 드래그가 페이지 스크롤로 해석되어 치명적인 UX 문제가 발생한다.
- 팔레트 스와치, 도구 버튼, 저장/지우기 버튼은 최소 44x44px 터치 영역을 확보한다.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`를 포함한다.
- `<input type="color">`는 모바일에서도 네이티브 색상 선택기가 뜨므로 별도 대응 불필요.

## 7. 검증 계획 (Review 단계 체크리스트)

- [ ] 격자의 한 칸을 클릭하면 현재 선택된 색으로 정확히 칠해지는가
- [ ] 마우스를 누른 채 드래그하면(mousedown → mousemove → mouseup) 지나가는 여러 칸이 연속으로 칠해지는가
- [ ] 지우개 도구로 전환 후 칠해진 칸을 클릭/드래그하면 투명(빈 칸)으로 정확히 되돌아가는가
- [ ] 팔레트에서 다른 색상을 클릭하면 현재 색상이 바뀌고, 도구가 자동으로 펜으로 전환되는가
- [ ] `<input type="color">`로 커스텀 색상을 선택하면 해당 색으로 정상적으로 칠해지는가
- [ ] "전체 지우기" 버튼 클릭 시 모든 칸이 초기 상태(투명)로 돌아가는가
- [ ] "PNG로 저장" 버튼 클릭 시 실제로 PNG 파일이 다운로드되는가
- [ ] 다운로드된 PNG가 256x256(16배 확대) 해상도이고 각 도트가 16x16px 정사각형 블록으로 각지게 표현되는가(블러 없이)
- [ ] 그리다가 비워둔 칸(투명)이 PNG에서 실제로 투명하게(알파 채널) 저장되는가
- [ ] 모바일(또는 브라우저 개발자도구 터치 시뮬레이션)에서 터치 드래그로 연속 칠하기가 정상 동작하는가
- [ ] 모바일에서 격자 위 드래그 시 페이지 스크롤/확대가 발생하지 않는가
- [ ] 작은 화면(예: 360px 너비)에서도 격자 전체와 팔레트/버튼이 화면 밖으로 잘리지 않고 잘 보이는가
- [ ] 펜/지우개 버튼의 활성 상태(active 클래스)가 현재 도구와 항상 일치하는가
- [ ] 블로그 본체의 다른 파일(assets, templates, public/index.html 등)이 전혀 수정되지 않았는가
- [ ] 콘솔에 JS 에러가 없는가

## 8. Build 단계 참고 사항

- 블로그 index.html 실제 배포 경로 확인 후 `back-link`의 href를 정확히 연결할 것 (`../../../public/index.html`).
- 빌드 시스템(`build.js`)이 `/app/ktk/` 폴더를 건드리거나 무시하는지 확인 필요 없음 — 독립 폴더이므로 blog 빌드 파이프라인과 무관하게 정적 파일로 그대로 서빙 가능해야 함.
- 터치 드래그 시 `preventDefault`로 인한 스크롤 방지 처리를 반드시 구현하고, `{ passive: false }` 옵션을 빠뜨리지 않도록 주의할 것.
