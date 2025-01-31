type Board = {
    boardWidth: number;
    boardHeight: number;
    mineCount: number;
    cells: number[][];
    startX: number;
    startY: number;
};

export function generateBoard(width: number, height: number, mines: number): Board {
    if (mines > width * height - 9) {
        throw new Error("Too many mines for the board size.");
    }

    const board: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

    let placedMines = 0;
    while (placedMines < mines) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);

        if (board[y][x] !== -1) {
            board[y][x] = -1;
            placedMines++;
        }
    }

    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],         [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (board[y][x] === -1) continue;

            let mineCount = 0;
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && board[ny][nx] === -1) {
                    mineCount++;
                }
            }
            board[y][x] = mineCount;
        }
    }

    let startX: number = 0, startY: number = 0;
    let foundSafeZone = false;

    while (!foundSafeZone) {
        startX = Math.floor(Math.random() * (width - 2));
        startY = Math.floor(Math.random() * (height - 2));
        foundSafeZone = true;

        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                if (board[startY + dy][startX + dx] === -1) {
                    foundSafeZone = false;
                    break;
                }
            }
            if (!foundSafeZone) break;
        }
    }

    return {
        boardWidth: width,
        boardHeight: height,
        mineCount: mines,
        cells: board,
        startX: startX + 1,
        startY: startY + 1
    };
}
