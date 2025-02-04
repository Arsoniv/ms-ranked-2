export default class MinesweeperSolver {
    private board: number[][];
    private rows: number;
    private cols: number;

    constructor(board: number[][]) {
        this.board = board;
        this.rows = board.length;
        this.cols = board[0].length;
    }

    private getNeighbors(x: number, y: number): [number, number][] {
        const neighbors: [number, number][] = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                let nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < this.rows && ny < this.cols) {
                    neighbors.push([nx, ny]);
                }
            }
        }
        return neighbors;
    }

    public isSolvable(): boolean {
        let changed = true;
        const boardCopy = this.board.map(row => [...row]);

        while (changed) {
            changed = false;
            for (let x = 0; x < this.rows; x++) {
                for (let y = 0; y < this.cols; y++) {
                    if (boardCopy[x][y] > 0) {
                        let neighbors = this.getNeighbors(x, y);
                        let hidden = neighbors.filter(([nx, ny]) => boardCopy[nx][ny] === 0);
                        let mines = neighbors.filter(([nx, ny]) => boardCopy[nx][ny] === -1);

                        if (hidden.length + mines.length === boardCopy[x][y]) {

                            hidden.forEach(([hx, hy]) => {
                                boardCopy[hx][hy] = -1;
                                changed = true;
                            });
                        } else if (mines.length === boardCopy[x][y]) {

                            hidden.forEach(([hx, hy]) => {
                                boardCopy[hx][hy] = 1;
                                changed = true;
                            });
                        }
                    }
                }
            }
        }

        for (let x = 0; x < this.rows; x++) {
            for (let y = 0; y < this.cols; y++) {
                if (boardCopy[x][y] === 0) return false;
            }
        }
        return true;
    }
}
