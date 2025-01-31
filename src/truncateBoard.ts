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
            if (cell === -1) { // If it's a mine
                let mineCount = 0;
                // Check all 8 directions
                for (const [dx, dy] of directions) {
                    const nx = x + dx;
                    const ny = y + dy;
                    // Check if the neighbor is within bounds and if it is a mine
                    if (nx >= 0 && nx < newBoard.boardWidth && ny >= 0 && ny < newBoard.boardHeight && board.cells[ny][nx] === -1) {
                        mineCount++;
                    }
                }
                // Set the cell to the number of surrounding mines (only for non-mine cells)
                newBoard.cells[y][x] = mineCount;
            }
        });
    });

    return newBoard;
}