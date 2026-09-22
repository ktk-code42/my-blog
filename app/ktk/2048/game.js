(function () {
  'use strict';

  const SIZE = 4;
  const BEST_SCORE_KEY = '2048-best-score';
  const SWIPE_THRESHOLD = 30;

  let board = [];
  let score = 0;
  let best = 0;
  let isGameOver = false;
  let isWon = false;
  let keepPlayingAfterWin = false;

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best-score');
  const gridBackgroundEl = document.getElementById('grid-background');
  const tileContainerEl = document.getElementById('tile-container');
  const overlayEl = document.getElementById('overlay');
  const overlayMessageEl = document.getElementById('overlay-message');
  const keepPlayingBtn = document.getElementById('keep-playing-btn');
  const restartBtn = document.getElementById('restart-btn');
  const newGameBtn = document.getElementById('new-game-btn');
  const boardContainerEl = document.getElementById('board-container');

  // ---------- Utilities ----------

  function cloneBoard(b) {
    return b.map((row) => row.slice());
  }

  function arraysEqual(a, b) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function transpose(matrix) {
    const result = [];
    for (let c = 0; c < SIZE; c++) {
      const newRow = [];
      for (let r = 0; r < SIZE; r++) {
        newRow.push(matrix[r][c]);
      }
      result.push(newRow);
    }
    return result;
  }

  // ---------- Core setup ----------

  function createEmptyBoard() {
    const b = [];
    for (let r = 0; r < SIZE; r++) {
      b.push(new Array(SIZE).fill(0));
    }
    return b;
  }

  function initGame() {
    board = createEmptyBoard();
    score = 0;
    isGameOver = false;
    isWon = false;
    keepPlayingAfterWin = false;

    loadBest();
    updateBest();

    spawnRandomTile();
    spawnRandomTile();

    hideOverlay();
    render();
  }

  // ---------- Random tile spawning ----------

  function spawnRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return null;

    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    board[r][c] = value;
    return { r, c, value };
  }

  // ---------- Move / merge logic ----------

  function moveRowLeft(row) {
    const nonZero = row.filter((v) => v !== 0);

    const merged = [];
    const mergedFlags = [];
    let scoreGained = 0;
    let i = 0;
    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        const mergedValue = nonZero[i] * 2;
        merged.push(mergedValue);
        mergedFlags.push(true);
        scoreGained += mergedValue;
        i += 2;
      } else {
        merged.push(nonZero[i]);
        mergedFlags.push(false);
        i += 1;
      }
    }

    while (merged.length < SIZE) {
      merged.push(0);
      mergedFlags.push(false);
    }

    return { row: merged, mergedFlags, scoreGained, moved: !arraysEqual(row, merged) };
  }

  function move(direction) {
    if (isGameOver) return;

    let workingBoard = cloneBoard(board);

    if (direction === 'up' || direction === 'down') {
      workingBoard = transpose(workingBoard);
    }

    let totalScoreGained = 0;
    let anyMoved = false;
    let mergedFlagsBoard = [];

    workingBoard = workingBoard.map((row) => {
      const inputRow =
        direction === 'right' || direction === 'down' ? [...row].reverse() : row;

      const { row: resultRow, mergedFlags, scoreGained, moved } = moveRowLeft(inputRow);

      totalScoreGained += scoreGained;
      if (moved) anyMoved = true;

      const outputFlags =
        direction === 'right' || direction === 'down' ? mergedFlags.reverse() : mergedFlags;
      mergedFlagsBoard.push(outputFlags);

      return direction === 'right' || direction === 'down'
        ? resultRow.reverse()
        : resultRow;
    });

    if (direction === 'up' || direction === 'down') {
      workingBoard = transpose(workingBoard);
      mergedFlagsBoard = transpose(mergedFlagsBoard);
    }

    if (anyMoved) {
      board = workingBoard;
      score += totalScoreGained;
      updateBest();
      const spawned = spawnRandomTile();
      render(spawned, mergedFlagsBoard);
      checkWinCondition();
      checkGameOver();
    }
  }

  // ---------- Game over / win checks ----------

  function isGameOverState(currentBoard) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (currentBoard[r][c] === 0) return false;
      }
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = currentBoard[r][c];
        if (c < SIZE - 1 && currentBoard[r][c + 1] === value) return false;
        if (r < SIZE - 1 && currentBoard[r + 1][c] === value) return false;
      }
    }

    return true;
  }

  function checkGameOver() {
    if (isGameOverState(board)) {
      isGameOver = true;
      showOverlay('gameover');
    }
  }

  function checkWinCondition() {
    if (isWon || keepPlayingAfterWin) return;
    const hasWinningTile = board.some((row) => row.includes(2048));
    if (hasWinningTile) {
      isWon = true;
      showOverlay('win');
    }
  }

  // ---------- Score / best score ----------

  function loadBest() {
    try {
      const stored = localStorage.getItem(BEST_SCORE_KEY);
      best = stored ? parseInt(stored, 10) || 0 : 0;
    } catch (e) {
      best = 0;
    }
  }

  function updateBest() {
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(BEST_SCORE_KEY, String(best));
      } catch (e) {
        /* ignore storage errors (private mode, etc.) */
      }
    }
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  // ---------- Rendering ----------

  function buildGridBackground() {
    gridBackgroundEl.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      gridBackgroundEl.appendChild(cell);
    }
  }

  function tileClassForValue(value) {
    if (value <= 2048) return `tile-${value}`;
    return 'tile-super';
  }

  function render(spawned, mergedFlagsBoard) {
    tileContainerEl.innerHTML = '';

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = board[r][c];
        if (value === 0) continue;

        const tile = document.createElement('div');
        tile.className = `tile ${tileClassForValue(value)}`;
        tile.style.gridRowStart = String(r + 1);
        tile.style.gridColumnStart = String(c + 1);
        tile.textContent = String(value);

        if (spawned && spawned.r === r && spawned.c === c) {
          tile.classList.add('tile-new');
        } else if (mergedFlagsBoard && mergedFlagsBoard[r] && mergedFlagsBoard[r][c]) {
          tile.classList.add('tile-merged');
        }

        tileContainerEl.appendChild(tile);
      }
    }
  }

  // ---------- Overlay ----------

  function showOverlay(type) {
    if (type === 'win') {
      overlayMessageEl.textContent = '2048 달성! 🎉';
      keepPlayingBtn.hidden = false;
    } else {
      overlayMessageEl.textContent = `게임 오버! 최종 점수: ${score}`;
      keepPlayingBtn.hidden = true;
    }
    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
  }

  // ---------- Input handling ----------

  const KEY_MAP = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  };

  document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    const direction = KEY_MAP[e.key];
    if (!direction) return;
    e.preventDefault();
    move(direction);
  });

  let touchStartX = 0;
  let touchStartY = 0;

  boardContainerEl.addEventListener(
    'touchstart',
    (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  boardContainerEl.addEventListener(
    'touchend',
    (e) => {
      if (isGameOver) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    },
    { passive: true }
  );

  newGameBtn.addEventListener('click', () => {
    initGame();
  });

  restartBtn.addEventListener('click', () => {
    initGame();
  });

  keepPlayingBtn.addEventListener('click', () => {
    keepPlayingAfterWin = true;
    hideOverlay();
  });

  // ---------- Boot ----------

  buildGridBackground();
  initGame();
})();
