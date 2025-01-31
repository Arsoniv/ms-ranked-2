let canvas = document.getElementById('canvas');
let ctx = canvas.getContext("2d");
let shouldDisplayDisconnect = true;

const infoBox = document.getElementById('info');

const chInfo = (newInfoText) => {
    infoBox.innerText = newInfoText;
}

let socket;
let gameStarted = false;
let playerIndex = -1;
let oppoIndex = -1;

canvas.height = 480;
canvas.width = 480;

let startX = 0;
let startY = 0;

let cellHeight = 0;
let cellWidth = 0;
let cellsHigh = 0;
let cellsWide = 0;

let fillStyle = "#eeeeee";
let fillStyle2 = "#999999";
let textFillStyle = "#222222";

let board = [];
let visibleBoard = [];

let queueId = parseInt(window.location.pathname.split('/')[window.location.pathname.split('/').length - 1]);

const token = localStorage.getItem('token')

if (!token) {
    window.location = '/'
}


function drawBoard() {
    ctx.fillStyle = fillStyle;

    let xC = 0;
    let yC = 0;

    while (yC < cellsHigh) {
        while (xC < cellsWide) {
            if (visibleBoard[yC][xC] === 10) {
                ctx.fillStyle = fillStyle2;
            }else {
                ctx.fillStyle = fillStyle;
            }
            ctx.fillRect(
                xC * cellWidth,
                yC * cellHeight,
                cellWidth, cellHeight
            );
            if (visibleBoard[yC][xC] !== 10 && visibleBoard[yC][xC] !== 0) {
                ctx.fillStyle = textFillStyle;
                ctx.fillText(visibleBoard[yC][xC], xC * cellWidth + 8, yC * cellHeight + 13);
            }
            xC++;
        }
        xC = 0;
        yC++;
    }
}


const checkForMines = async (cellY, cellX) => {
    socket.send(JSON.stringify({ // tell server we attempted to mine
        type: 0,
        cell: [cellY, cellX]
    }))
}

const initVisibleBoard = (height, width) => {
    let newBoard = [];

    for (let i = 0; i < height; i++) {
        newBoard[i] = []; // Initialize each row
        for (let j = 0; j < width; j++) {
            newBoard[i][j] = 10; // Set each cell to 1
        }
    }
    return newBoard;
}

const mineWithPx = async (y, x) => {
    let cellY = Math.floor(y / cellHeight);
    let cellX = Math.floor(x / cellWidth);
    await mine(cellY, cellX);
}

const mine = async(y, x) => {
    const stack = [[x, y]];
    const visited = new Set();
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    while (stack.length > 0) {
        const [currentX, currentY] = stack.pop();

        if (visited.has(`${currentY},${currentX}`)) continue;
        visited.add(`${currentY},${currentX}`);

        visibleBoard[currentY][currentX] = board[currentY][currentX];

        await checkForMines(currentY, currentX);

        if (board[currentY][currentX] === 0) {
            for (const [dx, dy] of directions) {
                const newX = currentX + dx;
                const newY = currentY + dy;

                if (newX >= 0 && newX < cellsWide && newY >= 0 && newY < cellsHigh
                    && !visited.has(`${newY},${newX}`)){

                    stack.push([newX, newY]);
                }
            }
        }
    }
    drawBoard();
}



const handleMessage = async (message) => {
    const request = JSON.parse(message);

    const type = request.type;

    if (!type) return;

    console.log(`Received message with type ${type}`);

    if (type === 1) {//match info
        const match = request.match;
        console.log(JSON.stringify(match));
        playerIndex = request.index;
        oppoIndex = playerIndex === 0 ? 1 : 0;
        cellsHigh = match.board.boardHeight;
        cellsWide = match.board.boardWidth;
        cellHeight = canvas.height/cellsHigh;
        cellWidth = canvas.width/cellsWide;
        board = match.board.cells;
        startY = match.board.startY;
        startX = match.board.startX;
        visibleBoard = initVisibleBoard(cellsHigh, cellsWide)
        setTimeout(() => {
            gameStarted = true;
            chInfo(`Ranked Mode - ${match.players[oppoIndex].name} [${match.players[oppoIndex].elo}]`)
            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                mineWithPx(y, x);
            })
            mine(startY, startX);
        }, match.startTime -Date.now() )
        chInfo(`Match starting in ${(match.startTime - Date.now())/1000} seconds...`)
    }else if (type === 9) {
        shouldDisplayDisconnect = false;
        if (request.winnerIndex === playerIndex) {
            chInfo('Victory')
        }else if (request.winnerIndex === -1) {
            chInfo('Draw')
        }else {
            chInfo('Defeat')
        }
        setTimeout(()=> {
            window.location = '/';
        },500)
    }
}

const connectToWebsocket = () => {
    if (token && queueId) {
        socket = new WebSocket(`ws://localhost:8080?queueId=${queueId}&token=${token}`);

        socket.onopen = () => {
            chInfo('Connected');
            setTimeout(chInfo('Finding Opponent...'), 1500)
            console.log('Connection opened');
        };

        socket.onmessage = (event) => {
            console.log('Message from server:', event.data);
            handleMessage(event.data)
                .then(() => {console.log('Message handling completed')})
        };

        socket.onclose = () => {
            if (shouldDisplayDisconnect) {
                chInfo('Lost Connection')
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }else {
        console.log('Failed to find token (and or) queueId')
    }
}


if (Number.isInteger(queueId) && token) {
    connectToWebsocket()
}else {
    window.location = '/';
}
