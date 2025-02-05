
const audio = new Audio("beep.mp3");
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext("2d");
let shouldDisplayDisconnect = true;

const popUp = document.getElementById('popUp');
const infoBox = document.getElementById('info');
const muteButton = document.getElementById('muteButton');
const audioToggle = document.getElementById('audioToggle');
const drawButton = document.getElementById('drawButton');

const chInfo = (newInfoText) => {
    infoBox.innerText = newInfoText;
}

let socket;
let gameStarted = false;
let gameEnded = false;
let playerIndex = -1;
let oppoIndex = -1;
let oppoMuted = false;
let audioMuted = false;
let secToMatchStart = 0;
let user = {};
let oppoUser = {};
let drawVoteInProgress = false;
let selfDrawVoteInProgress = false;
let matchStartTime = -1;

canvas.height = 480;
canvas.width = 480;

let startX = 0;
let startY = 0;

let cellHeight = 0;
let cellWidth = 0;
let cellsHigh = 0;
let cellsWide = 0;

let fillStyle = "#272727";
let fillStyle2 = "#1f1f1f";
let textFillStyle = "#c8c8c8";

let board = [];
let visibleBoard = [];

let queueId = parseInt(window.location.pathname.split('/')[window.location.pathname.split('/').length - 1]);

const token = localStorage.getItem('token')

if (!token) {
    window.location = '/'
}

let popUpOpen = false;

function log(messageText) {
    const chatBox = document.getElementById("chatBox");

    const message = document.createElement("div");
    message.style.padding = "8px";
    message.style.margin = "5px 0";
    message.style.background = "#1f1f1f";
    message.style.borderRadius = "5px";
    message.style.textAlign = "center";
    message.textContent = messageText;

    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

const exitPopUp = () => {
    popUpOpen = false;
    popUp.style.display= 'none';
}
const openPopUp = () => {
    popUpOpen = true;
    popUp.style.display= 'flex';
}

const forfiet = async () => {
    if (gameStarted && !gameEnded) {
        socket.send(JSON.stringify({
            type: 3
        }));
    }
}

const drawVote = async () => {
    if (gameStarted && !gameEnded && !selfDrawVoteInProgress) {
        selfDrawVoteInProgress = true;
        if (!drawVoteInProgress) {
            log(`You sent a draw request, if ${oppoUser.name} agrees to a draw within 10 seconds the match will end.`)
        }
        socket.send(JSON.stringify({
            type: 4
        }));
        console.log('sent draw vote');
        drawButton.style.backgroundColor = '#496043'
        setTimeout(() => {
            selfDrawVoteInProgress = false;
            drawButton.style.backgroundColor = '#272727'
        }, 10000)
    }
}

const muteOpponent = () => {
    oppoMuted = true;
    muteButton.style.backgroundColor = '#496043'
}
const unMuteOpponent = () => {
    oppoMuted = false;
    muteButton.style.backgroundColor = '#272727'
}
const toggleMute = () => {
    if (oppoMuted) {
        unMuteOpponent();
    }else {
        muteOpponent();
    }
}


const toggleAudioMute = () => {
    if (audioMuted) {
        audioMuted = false;
        audioToggle.style.backgroundColor = '#272727'
    }else {
        audioMuted = true;
        audioToggle.style.backgroundColor = '#496043'
    }
}

async function sendMessage() {
    const input = document.getElementById("chatInput");
    const messageText = input.value;
    const chatBox = document.getElementById("chatBox");

    if (messageText.trim() !== "") {
        const message = document.createElement("div");
        message.style.padding = "8px";
        message.style.margin = "5px 0";
        message.style.background = "#3a3a3a";
        message.style.borderRadius = "5px";
        message.textContent = messageText;

        chatBox.appendChild(message);
        chatBox.scrollTop = chatBox.scrollHeight;

        socket.send(JSON.stringify({
            type: 12,
            messageText: messageText,
            matchStartTime: matchStartTime
        }));

        input.value = "";
    }
}

function receiveMessage(messageText) {
    const chatBox = document.getElementById("chatBox");

    if (messageText.trim() !== "" && !oppoMuted) {
        const message = document.createElement("div");
        message.style.padding = "8px";
        message.style.margin = "5px 0";
        message.style.background = "#496043";
        message.style.borderRadius = "5px";
        message.style.textAlign = "right";
        message.textContent = messageText;

        chatBox.appendChild(message);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function drawBoard() {
    ctx.fillStyle = fillStyle;
    ctx.font = (cellHeight - cellHeight * 0.4)+'px Arial'

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

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

            ctx.fillStyle = textFillStyle;
            ctx.strokeRect(
                xC * cellWidth,
                yC * cellHeight,
                cellWidth, cellHeight
            )
            if (visibleBoard[yC][xC] !== 10 && visibleBoard[yC][xC] !== 0){
                ctx.fillText(visibleBoard[yC][xC], xC * cellWidth + cellHeight*0.5 , yC * cellHeight + cellHeight*0.5);
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
        user = match.players[playerIndex];
        oppoUser = match.players[oppoIndex];
        matchStartTime = match.startTime;
        if (!audioMuted) {
            await audio.play()
        }
        if (Notification.permission === "granted") {
            new Notification("Opponent Found", {
                body: "Your minesweeper match will begin in 6 seconds..."
            });
        }
        log(`${match.players[playerIndex].name} [${match.players[playerIndex].elo}] vs ${match.players[oppoIndex].name} [${match.players[oppoIndex].elo}]`)
        log(`${match.board.boardWidth} x ${match.board.boardHeight}, ${match.board.mineCount} mines`)
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
        chInfo(`Match starting in 6 seconds...`)

    }

    else if (type === 9) {
        gameEnded = true;
        shouldDisplayDisconnect = false;
        if (request.winnerIndex === playerIndex) {
            chInfo('Victory')
            log(`${user.name} has won.`)
        }else if (request.winnerIndex === -1) {
            chInfo('Draw')
            log(`Match ended | Draw by vote`)
        }else {
            chInfo('Defeat')
            log(`${oppoUser.name} has won.`)
        }
    }

    else if (type === 13) { //message
        receiveMessage(request.message);
    }

    else if (type === 16) {
        drawVoteInProgress = true;
        log(`${oppoUser.name} has offered a draw, if you accept within 10 seconds, the match will end.`)
        setTimeout(() => {
            log(`${oppoUser.name}'s draw vote has expired.`)
            drawVoteInProgress = false;
        }, 10000)
    }
}

const connectToWebsocket = (id) => {
    if (token && queueId) {
        socket = new WebSocket(`ws://34.27.94.66:4000?queueId=${id}&token=${token}`);

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
    if (queueId === 4) {
        connectToWebsocket(1);
        connectToWebsocket(2);
        connectToWebsocket(3);
    }else if (queueId === 14) {
        connectToWebsocket(11);
        connectToWebsocket(12);
        connectToWebsocket(13);
    }else {
        connectToWebsocket(queueId);
    }
}else {
    window.location = '/';
}

log('Searching for an opponent, enable notifications to avoid missing your match');

if (Notification.permission !== "granted") {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            console.log("Notification permission granted.");
        }
    });
}