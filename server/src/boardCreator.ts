
type Board = {
    boardWidth: number;
    boardHeight: number;
    mineCount: number;
    cells: number[][];
};

export function generateBoard(width: number, height: number, mines: number): Board {
    if (mines > width * height) {
        throw new Error("Too many mines for the board size.");
    }

    // Initialize board with zeros
    const board: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

    // Place mines randomly
    let placedMines = 0;
    while (placedMines < mines) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);

        if (board[y][x] !== -1) { // -1 represents a mine
            board[y][x] = -1;
            placedMines++;
        }
    }

    // Calculate adjacent mine counts
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

    return {
        boardWidth: width,
        boardHeight: height,
        mineCount: mines,
        cells: board
    };
}
