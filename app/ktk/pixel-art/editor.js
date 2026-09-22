(function () {
  'use strict';

  var GRID_SIZE = 16;
  var EXPORT_SCALE = 16; // 16x16 -> 256x256

  var DEFAULT_PALETTE = [
    '#000000', '#ffffff', '#808080', '#c0c0c0',
    '#ff0000', '#ff8000', '#ffff00', '#80ff00',
    '#00ff00', '#00ff80', '#00ffff', '#0080ff',
    '#0000ff', '#8000ff', '#ff00ff', '#ff0080',
  ];

  var pixels = new Array(GRID_SIZE * GRID_SIZE).fill(null); // null = 투명(빈 칸)
  var cellElements = []; // cellElements[row][col] -> DOM 참조 캐시
  var swatchElements = {}; // color -> swatch DOM 참조

  var currentTool = 'pen'; // 'pen' | 'eraser'
  var currentColor = '#000000';
  var isDrawing = false;

  var gridEl, paletteEl, currentColorSwatchEl, customColorInputEl;
  var penBtn, eraserBtn, clearBtn, exportBtn;

  function indexOf(row, col) {
    return row * GRID_SIZE + col;
  }

  function buildGrid() {
    gridEl.innerHTML = '';
    cellElements = [];
    for (var row = 0; row < GRID_SIZE; row++) {
      var rowArr = [];
      for (var col = 0; col < GRID_SIZE; col++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        gridEl.appendChild(cell);
        rowArr.push(cell);
      }
      cellElements.push(rowArr);
    }
  }

  function paintCell(row, col, color) {
    var idx = indexOf(row, col);
    pixels[idx] = color; // color가 null이면 지우개(투명) 처리
    var cell = cellElements[row][col];
    cell.style.backgroundColor = color || '';
  }

  function getToolColor() {
    return currentTool === 'eraser' ? null : currentColor;
  }

  function handleCellPaint(row, col) {
    paintCell(row, col, getToolColor());
  }

  function cellFromPoint(clientX, clientY) {
    var el = document.elementFromPoint(clientX, clientY);
    return el && el.classList && el.classList.contains('cell') ? el : null;
  }

  function bindGridEvents() {
    gridEl.addEventListener('mousedown', function (e) {
      var cell = e.target.closest ? e.target.closest('.cell') : null;
      if (!cell) return;
      isDrawing = true;
      handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
    });

    gridEl.addEventListener('mousemove', function (e) {
      if (!isDrawing) return;
      var cell = e.target.closest ? e.target.closest('.cell') : null;
      if (!cell) return;
      handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
    });

    window.addEventListener('mouseup', function () {
      isDrawing = false;
    });

    gridEl.addEventListener('mouseleave', function () {
      // 안전하게: 그리드 밖으로 나가도 드래그 상태는 mouseup까지 유지 (스펙 상 window에서 처리)
    });

    gridEl.addEventListener('touchstart', function (e) {
      e.preventDefault();
      isDrawing = true;
      var touch = e.touches[0];
      var cell = cellFromPoint(touch.clientX, touch.clientY);
      if (cell) handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
    }, { passive: false });

    gridEl.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (!isDrawing) return;
      var touch = e.touches[0];
      var cell = cellFromPoint(touch.clientX, touch.clientY);
      if (cell) handleCellPaint(Number(cell.dataset.row), Number(cell.dataset.col));
    }, { passive: false });

    gridEl.addEventListener('touchend', function () {
      isDrawing = false;
    });

    gridEl.addEventListener('touchcancel', function () {
      isDrawing = false;
    });
  }

  function buildPalette() {
    paletteEl.innerHTML = '';
    swatchElements = {};
    DEFAULT_PALETTE.forEach(function (color) {
      var swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.setAttribute('aria-label', '색상 ' + color);
      swatch.addEventListener('click', function () {
        selectColor(color);
      });
      paletteEl.appendChild(swatch);
      swatchElements[color] = swatch;
    });
  }

  function updatePaletteSelectionUI(color) {
    Object.keys(swatchElements).forEach(function (c) {
      swatchElements[c].classList.toggle('selected', c === color);
    });
  }

  function updateToolButtonsUI() {
    penBtn.classList.toggle('active', currentTool === 'pen');
    eraserBtn.classList.toggle('active', currentTool === 'eraser');
  }

  function selectColor(color) {
    currentColor = color;
    currentTool = 'pen';
    updateToolButtonsUI();
    currentColorSwatchEl.style.backgroundColor = color;
    updatePaletteSelectionUI(color);
    customColorInputEl.value = color;
  }

  function clearAll() {
    pixels.fill(null);
    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        paintCell(row, col, null);
      }
    }
  }

  function exportAsPNG() {
    var canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE * EXPORT_SCALE;
    canvas.height = GRID_SIZE * EXPORT_SCALE;
    var ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false;

    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var color = pixels[indexOf(row, col)];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(col * EXPORT_SCALE, row * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
      }
    }

    canvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'pixel-art.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function bindUIEvents() {
    penBtn.addEventListener('click', function () {
      currentTool = 'pen';
      updateToolButtonsUI();
    });

    eraserBtn.addEventListener('click', function () {
      currentTool = 'eraser';
      updateToolButtonsUI();
    });

    clearBtn.addEventListener('click', function () {
      var confirmed = window.confirm('정말 전체 지우기 하시겠습니까?');
      if (confirmed) clearAll();
    });

    exportBtn.addEventListener('click', exportAsPNG);

    customColorInputEl.addEventListener('input', function (e) {
      selectColor(e.target.value);
    });
  }

  function init() {
    gridEl = document.getElementById('grid');
    paletteEl = document.getElementById('palette');
    currentColorSwatchEl = document.getElementById('current-color-swatch');
    customColorInputEl = document.getElementById('custom-color-input');
    penBtn = document.getElementById('pen-btn');
    eraserBtn = document.getElementById('eraser-btn');
    clearBtn = document.getElementById('clear-btn');
    exportBtn = document.getElementById('export-btn');

    buildGrid();
    buildPalette();
    bindGridEvents();
    bindUIEvents();

    selectColor(currentColor);
    updateToolButtonsUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
