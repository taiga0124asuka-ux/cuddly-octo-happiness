// =================================
// 1. 定数と初期設定
// =================================
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#000', '#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#008000', '#800080', '#FF0000', '#AAAAAA'
]; 
const SHAPES = [
    [], 
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], 
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], 
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], 
    [[4, 4], [4, 4]], 
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], 
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], 
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]] 
];

// ゲーム要素の取得
const boardCanvas = document.getElementById('game-board');
const ctx = boardCanvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const holdCtx = document.getElementById('hold-canvas').getContext('2d');
const nextCtxs = Array(5).fill(0).map((_, i) => document.getElementById(`next-canvas-${i + 1}`).getContext('2d'));

// Canvasサイズの設定
boardCanvas.width = COLS * BLOCK_SIZE;
boardCanvas.height = ROWS * BLOCK_SIZE;

// ゲーム状態変数
let board = [];
let currentPiece;
let nextPieces = [];
let holdPiece = null;
let canHold = true;
let score = 0;
let level = 1;
let linesCleared = 0;
let dropSpeed = 1000;
let lastDropTime = 0;
let isGameOver = false;

// キーマップ
const KEY_MAP = {
    'a': 'moveLeft', 'd': 'moveRight', 's': 'softDrop',
    ' ': 'hardDrop', 'q': 'rotateLeft', 'w': 'rotateRight', 'x': 'hold'
};

// **タッチ操作用の変数**
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50; // スワイプと認識する最小距離 (px)
const TAP_THRESHOLD = 10; // タップと認識する距離 (移動操作に使用)

// =================================
// 2. ユーティリティ関数 (描画、判定)
// =================================

function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawSquare(x, y, colorIndex, context, size = BLOCK_SIZE) {
    if (colorIndex === 0) return;
    context.fillStyle = COLORS[colorIndex];
    context.fillRect(x * size, y * size, size, size);
    context.strokeStyle = '#333';
    context.strokeRect(x * size, y * size, size, size);
}

function draw() {
    // 1. ボード全体をクリア
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

    // 2. 固定されたブロックを描画
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawSquare(c, r, board[r][c], ctx);
        }
    }

    // 3. 落下中のブロックを描画
    if (currentPiece) {
        drawShadow();
        currentPiece.shape.forEach((row, r) => {
            row.forEach((col, c) => {
                if (col) {
                    drawSquare(currentPiece.x + c, currentPiece.y + r, currentPiece.color, ctx);
                }
            });
        });
    }

    // 4. ホールドとネクストを描画
    drawHold();
    drawNext();
}

function drawHold() {
    holdCtx.fillStyle = '#000';
    holdCtx.fillRect(0, 0, holdCtx.canvas.width, holdCtx.canvas.height);
    if (holdPiece) {
        const shape = SHAPES[holdPiece];
        const startX = (holdCtx.canvas.width / BLOCK_SIZE - shape[0].length) / 2;
        const startY = (holdCtx.canvas.height / BLOCK_SIZE - shape.length) / 2;
        shape.forEach((row, r) => {
            row.forEach((col, c) => {
                if (col) {
                    drawSquare(startX + c, startY + r, holdPiece, holdCtx, BLOCK_SIZE);
                }
            });
        });
    }
}

function drawNext() {
    nextCtxs.forEach((nctx, i) => {
        nctx.fillStyle = '#000';
        nctx.fillRect(0, 0, nctx.canvas.width, nctx.canvas.height);
        if (nextPieces[i]) {
            const shape = SHAPES[nextPieces[i]];
            const startX = (nctx.canvas.width / BLOCK_SIZE - shape[0].length) / 2;
            const startY = (nctx.canvas.height / BLOCK_SIZE - shape.length) / 2;
            shape.forEach((row, r) => {
                row.forEach((col, c) => {
                    if (col) {
                        drawSquare(startX + c, startY + r, nextPieces[i], nctx, BLOCK_SIZE);
                    }
                });
            });
        }
    });
}

function isValid(newX, newY, newShape) {
    if (!newShape) newShape = currentPiece.shape;
    if (newX === undefined) newX = currentPiece.x;
    if (newY === undefined) newY = currentPiece.y;

    for (let r = 0; r < newShape.length; r++) {
        for (let c = 0; c < newShape[r].length; c++) {
            if (newShape[r][c]) {
                const boardX = newX + c;
                const boardY = newY + r;

                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                if (boardY >= 0 && board[boardY][boardX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function checkTSpin() {
    if (currentPiece.color !== 6) return 0;
    // ... (T-Spinロジックは簡略化のため省略)
    return 0; 
}

function drawShadow() {
    let shadowY = currentPiece.y;
    while (isValid(currentPiece.x, shadowY + 1)) {
        shadowY++;
    }

    currentPiece.shape.forEach((row, r) => {
        row.forEach((col, c) => {
            if (col) {
                drawSquare(currentPiece.x + c, shadowY + r, 8, ctx); 
            }
        });
    });
}

// =================================
// 3. ゲームロジック
// =================================

function generatePiece() {
    while (nextPieces.length < 5) {
        const allPieces = [1, 2, 3, 4, 5, 6, 7];
        const newPiece = allPieces[Math.floor(Math.random() * allPieces.length)]; 
        nextPieces.push(newPiece);
    }
    
    const colorIndex = nextPieces.shift();
    const shape = SHAPES[colorIndex];

    currentPiece = {
        x: Math.floor((COLS - shape[0].length) / 2),
        y: -shape.length + 1,
        shape: shape,
        color: colorIndex,
        rotation: 0,
        isTPiece: colorIndex === 6
    };
    
    if (!isValid(currentPiece.x, currentPiece.y, currentPiece.shape)) {
        gameOver();
    }
}

function lockPiece() {
    currentPiece.shape.forEach((row, r) => {
        row.forEach((col, c) => {
            if (col) {
                const boardY = currentPiece.y + r;
                const boardX = currentPiece.x + c;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });

    let tSpinStatus = 0;
    if (currentPiece.isTPiece) {
        tSpinStatus = checkTSpin();
    }

    const lines = clearLines();
    updateScore(lines, tSpinStatus);

    canHold = true; 
    generatePiece();
}

function clearLines() {
    let lines = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(col => col !== 0)) {
            lines++;
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            r++;
        }
    }
    linesCleared += lines;
    return lines;
}

function updateScore(lines, tSpinStatus) {
    let points = 0;
    const linePoints = [0, 100, 300, 500, 800];

    // T-Spinロジックは簡略化
    if (tSpinStatus !== 0) {
        points = 800 * lines;
    } else {
        points = linePoints[lines];
    }
    
    score += points * level;
    scoreDisplay.textContent = score;

    const newLevel = Math.floor(linesCleared / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelDisplay.textContent = level;
        dropSpeed = Math.max(100, 1000 - (level - 1) * 70); 
    }
}

// =================================
// 4. 操作系関数
// =================================

function moveLeft() {
    if (isValid(currentPiece.x - 1, currentPiece.y)) {
        currentPiece.x--;
    }
}

function moveRight() {
    if (isValid(currentPiece.x + 1, currentPiece.y)) {
        currentPiece.x++;
    }
}

function moveDown() {
    if (isValid(currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 1;
        return true;
    } else {
        lockPiece();
        return false;
    }
}

function softDrop() {
    moveDown();
}

function hardDrop() {
    let dropCount = 0;
    while (isValid(currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        dropCount++;
    }
    score += dropCount * 2;
    lockPiece();
}

function rotate(isClockwise) {
    const originalShape = currentPiece.shape;
    const N = originalShape.length;
    const newShape = Array.from({ length: N }, () => Array(N).fill(0));

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (isClockwise) {
                newShape[c][N - 1 - r] = originalShape[r][c];
            } else {
                newShape[N - 1 - c][r] = originalShape[r][c];
            }
        }
    }
    
    if (isValid(currentPiece.x, currentPiece.y, newShape)) {
        currentPiece.shape = newShape;
    } 
}

function rotateRight() {
    rotate(true);
}

function rotateLeft() {
    rotate(false);
}

function hold() {
    if (!canHold) return;

    const currentPieceId = currentPiece.color;

    if (holdPiece) {
        const newPieceId = holdPiece;
        const newShape = SHAPES[newPieceId];
        
        holdPiece = currentPieceId;

        currentPiece = {
            x: Math.floor((COLS - newShape[0].length) / 2),
            y: -newShape.length + 1,
            shape: newShape,
            color: newPieceId,
            rotation: 0,
            isTPiece: newPieceId === 6
        };
        
    } else {
        holdPiece = currentPieceId;
        generatePiece();
    }
    
    canHold = false;
    draw(); 
}

// =================================
// 5. メインループとゲーム制御
// =================================

function gameLoop(timestamp) {
    if (isGameOver) return;

    if (timestamp - lastDropTime > dropSpeed) {
        if (!isValid(currentPiece.x, currentPiece.y + 1)) {
            lockPiece();
        } else {
            currentPiece.y++;
        }
        lastDropTime = timestamp;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

window.startGame = function() { // HTMLから呼び出せるように global scope に設定
    isGameOver = false;
    score = 0;
    level = 1;
    linesCleared = 0;
    dropSpeed = 1000;
    holdPiece = null;
    nextPieces = [];
    canHold = true;

    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    document.getElementById('game-over-screen').classList.add('hidden');
    
    initBoard();
    generatePiece();
    
    lastDropTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    isGameOver = true;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
}


// =================================
// 6. イベントリスナー (キーボード + モバイル対応)
// =================================

// キーボードイベントリスナー
document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); 
    }
    
    const action = KEY_MAP[e.key.toLowerCase()];

    if (action) {
        window[action](); 
        draw(); 
    }
});

// **モバイルボタンイベントリスナー**
document.getElementById('btn-hold').addEventListener('click', () => {
    if (!isGameOver) { hold(); draw(); }
});
document.getElementById('btn-rotate-left').addEventListener('click', () => {
    if (!isGameOver) { rotateLeft(); draw(); }
});
document.getElementById('btn-rotate-right').addEventListener('click', () => {
    if (!isGameOver) { rotateRight(); draw(); }
});
document.getElementById('btn-hard-drop').addEventListener('click', () => {
    if (!isGameOver) { hardDrop(); draw(); }
});


// **タッチイベントリスナー (スワイプ/タップ)**
boardCanvas.addEventListener('touchstart', handleTouchStart);
boardCanvas.addEventListener('touchend', handleTouchEnd);

function handleTouchStart(e) {
    if (isGameOver) return;
    e.preventDefault(); 
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}

function handleTouchEnd(e) {
    if (isGameOver) return;
    e.preventDefault(); 

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 1. 縦スワイプ (ソフトドロップ)
    if (absDy > absDx && absDy > SWIPE_THRESHOLD) {
        if (dy > 0) {
            softDrop();
        }
    } 
    // 2. 横スワイプ/フリック (左右移動)
    else if (absDx > SWIPE_THRESHOLD) {
        if (dx < 0) {
            moveLeft();
        } else {
            moveRight();
        }
    } 
    // 3. 短いフリックやタップ (回転)
    else if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
        rotateRight();
    }

    draw();
}

// 初期起動
startGame();