import MinesweeperSolver from './solver';

type Board = {
    boardWidth: number;
    boardHeight: number;
    mineCount: number;
    cells: number[][];
    startX: number;
    startY: number;
};

export function generateBoard(width: number, height: number, mines: number): Board | undefined{
    if (mines > width * height - 9) {
        throw new Error("Too many mines for the board size.");
    }

    let solveAble = false;

    while (!solveAble) {
        const board: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

        let startX = Math.floor(Math.random() * (width - 2)) + 1;
        let startY = Math.floor(Math.random() * (height - 2)) + 1;

        let placedMines = 0;

        while (placedMines < mines) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);

            if (
                Math.abs(x - startX) <= 1 &&
                Math.abs(y - startY) <= 1
            ) {
                continue;
            }

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
        let hiddenBoard = board;

        hiddenBoard.forEach(row)

        const solver = new MinesweeperSolver(board)
        solveAble = solver.isSolvable();

        console.log(board);

        if (solveAble) {
            return {
                boardWidth: width,
                boardHeight: height,
                mineCount: mines,
                cells: board,
                startX: startX,
                startY: startY,
            };
        }
    }
}
