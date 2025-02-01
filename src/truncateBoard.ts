type Board = {
    boardWidth: number;
    boardHeight: number;
    mineCount: number;
    cells: number[][];
    startX: number;
    startY: number;
}

export function truncateBoard(board: Board): Board {

    const newBoard: Board = JSON.parse(JSON.stringify(board));

    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],         [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    newBoard.cells.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === -1) {
                let mineCount = 0;
                for (const [dx, dy] of directions) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < newBoard.boardWidth && ny >= 0 && ny < newBoard.boardHeight && board.cells[ny][nx] === -1) {
                        mineCount++;
                    }
                }
                if (mineCount === 0) mineCount = 1;
                newBoard.cells[y][x] = mineCount;
            }
        });
    });

    return newBoard;
}