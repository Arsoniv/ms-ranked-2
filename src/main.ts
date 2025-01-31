import dotenv from 'dotenv';
import {WebSocket, WebSocketServer} from 'ws';
import express, {Application, Request, Response} from 'express';
import {generateBoard} from './boardCreator';
import {truncateBoard} from './truncateBoard';
import {calculateEloChange} from './eloUtils';
import {Pool} from 'pg';
import {IncomingMessage} from 'http';
import Crypto from 'crypto';
import cors from 'cors'
import path from 'path';

type UserAuthToken = {
    token: string;
    id: number;
}

type Board = {
    boardWidth: number;
    boardHeight: number;
    mineCount: number;
    cells: number[][];
    startX: number;
    startY: number;
}

type User = {
    id: number;
    name: string;
    password: string;
    elo: number;
    ws: WebSocket;
}

type Match = {
    players: User[];
    scores: number[];
    board: Board;
    matchStarted: boolean;
    matchEnded: boolean;
    winnerIndex: number;
    winnerString: string;
    startTime: number;
    ranked: boolean;
    kFactor: number;
    playerBoards: Board[];
}

type Queue = {
    users: User[];
    title: string;
    ranked: boolean;
    mines: number;
    width: number;
    height: number;
    id: number;
    kFactor: number;
}

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

console.log(pool);

let queues: Queue[] = [];

let userTokens: UserAuthToken[] = [];

let matches: Match[] = [];

const app: Application = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/game/:id', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'game', 'index.html'));
})

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'home', 'index.html'));
})

app.get('/login', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
})

app.get('/signup', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'signup', 'index.html'));
})


app.post('/api/createAccount', async (req: Request, res: Response) => {
    const {username, password} = req.body;

    if (!username || !password) {
        res.status(400).send({
            error: "Missing required fields",
            message: "Please provide a valid userName and password."
        });
        return;
    }

    const client = await pool.connect();

    //verify userName not in use
    const queryResponse = await client.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    )

    if (queryResponse.rows.length === 0) {

        await client.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, password]
        )

        res.status(200).send({
            "result": "Account created"
        })

    }else {
        res.status(401).send({
            "error": "UserName is already in use",
            "message": "Please pick another userName."
        })
    }
    client.release();
})

app.post('/api/changePassword', async (req: Request, res: Response) => {
    const {id, currentPassword, newPassword} = req.body;

    // Validate request data
    if (!id || !currentPassword || !newPassword) {
        res.status(400).send({
            error: "Missing required fields",
            message: "Please provide id, currentPassword, and newPassword."
        });
        return;
    }

    const client = await pool.connect();

    //verify account exists (with correct password)
    const queryResponse = await client.query(
        'SELECT * FROM users WHERE id = $1 AND password = $2',
        [id, currentPassword]
    )

    if (queryResponse.rows.length > 0) {

        await client.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [newPassword, id]
        )

        res.status(200).send({
            "result": "Account password updated",
        })

    }else {
        res.status(404).send({
            "error": "Account not found",
            "message": "The account you are looking for does not exist, confirm your id and password."
        })
    }
    client.release();
});

app.post('/api/deleteAccount', async (req: Request, res: Response) => {
    const {id, password} = req.body;

    // Validate request data
    if (!id || !password) {
        res.status(400).send({
            error: "Missing required fields",
            message: "Please provide your id and password."
        });
        return;
    }

    const client = await pool.connect();

    //verify account exists (with correct password)
    const queryResponse = await client.query(
        'SELECT * FROM users WHERE id = $1 AND password = $2',
        [id, password]
    )

    if (queryResponse.rows.length > 0) {

        await client.query(
            'DELETE FROM users WHERE id = $1',
            [id]
        )

        res.status(200).send({
            "result": "Account deleted",
        })

    }else {
        res.status(404).send({
            "error": "Account not found",
            "message": "The account you are looking for does not exist, confirm your username and password."
        })
    }
    client.release();
});

app.post('/api/getAccountInfo', async (req: Request, res: Response) => {
    const {userName} = req.body;

    if (!userName) {
        res.status(400).send({
            error: "Missing required fields",
            message: "Please provide a username."
        });
        return;
    }

    const client = await pool.connect();

    const queryResponse = await client.query(
        'SELECT username, id, created_at, rating, israted, matches, wins, losses, matchcount FROM users WHERE username = $1',
        [userName]
    )

    if (queryResponse.rows.length > 0) {

        res.status(200).send({
            user: queryResponse.rows[0]
        })

    }else {
        res.status(404).send({
            "error": "Account not found",
            "message": "The account you are looking for does not exist, confirm username."
        })
    }
    client.release();
})

app.post('/api/getToken', async (req: Request, res: Response) => {
    const {id, password} = req.body;

    // Validate request data
    if (!id || !password) {
        res.status(400).send({
            error: "Missing required fields",
            message: "Please provide your id and password."
        });
        return;
    }

    const client = await pool.connect();

    //verify account exists (with correct password)
    const queryResponse = await client.query(
        'SELECT * FROM users WHERE id = $1 AND password = $2',
        [id, password]
    )

    if (queryResponse.rows.length > 0) {

        const tokenI = userTokens.findIndex((token) => token.id === id)

        if (tokenI !== -1) userTokens.splice(tokenI, 1)

        const token = Crypto.randomBytes(128).toString("hex");

        const tokenObject: UserAuthToken = {
            token: token,
            id: id,
        }

        userTokens.push(tokenObject);

        res.status(200).send({
            "result": "Token Created",
            "token": token
        })

    }else {
        res.status(404).send({
            "error": "Account not found",
            "message": "The account you are looking for does not exist, confirm your username and password."
        })
    }
    client.release();
});

app.post('/api/checkToken', async (req: Request, res: Response) => {
    const {token} = req.body;

    // Validate request data
    if (!token) {
        res.status(400).send({
            error: "Missing required fields",
            message: "Please provide your id and password."
        });
        return;
    }

    if (userTokens.some((tokenObject) => {
        return tokenObject.token === token;
    })) {

        res.status(200).send({
            "result": "Token valid"
        })

    }else {
        res.status(202).send({
            "error": "Token Invalid",
            "message": "The account you are looking for does not exist, confirm your username and password."
        })
    }
});

app.get('/api/getLB', async (req: Request, res: Response) => {

    const client = await pool.connect();

    const queryResponse = await client.query(
        'SELECT * FROM users ORDER BY rating DESC LIMIT 10;'
    )

    res.status(200).send({lb: queryResponse.rows})
    client.release();

});

const checkPlayerBoard = (playerBoard: Board, realBoard: Board): boolean => {
    console.log('checking players board');
    console.log(JSON.stringify(playerBoard));
    console.log(JSON.stringify(realBoard));
    for (let y = 0; y < playerBoard.cells.length; y++) {
        for (let x = 0; x < playerBoard.cells[y].length; x++) {
            if (playerBoard.cells[y][x] !== 10) {
                if (realBoard.cells[y][x] !== -1) {
                    return false;
                }
            }
        }
    }
    return true;
};



const handleMessage = async (message: string, id: number) => {
    const request: any = await JSON.parse(message);

    const match = matches.find((match) => {
        return match.players.some((user) => user.id === id);
    });

    const matchIndex = matches.findIndex((match) => {
        return match.players.some((user) => user.id === id);
    });

    const playerIndex = match?.players.findIndex((user) => user.id === id);

    if (request.type === 3) { // client forfiet
        if (!match || !playerIndex) return;

        match.matchEnded = true;
        match.winnerIndex = playerIndex === 0 ? 1 : 0;
        match.winnerString = match.players[match.winnerIndex].name;

        const newRatings: {
            newWinnerElo: number,
            newLoserElo: number
        } = calculateEloChange(<number>match.players[match.winnerIndex].elo, <number>match.players[playerIndex].elo, match.kFactor)

        const client = await pool.connect();

        await client.query(
            'INSERT INTO matches (users, scores, boardWidth, boardHeight, mineCount, cells, matchStarted, matchEnded, winnerIndex, winnerString, startTime, ranked, kFactor)' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
            [[match.players[0].id,match.players[1].id], match.scores, match.board.boardWidth, match.board.boardHeight, match.board.mineCount, match.board.cells, match.matchStarted, match.matchEnded, match.winnerIndex, match.winnerString, match.startTime, match.ranked, match.kFactor]
        )

        if (match.ranked) {
            await client.query(
                'UPDATE users SET rating = $1 WHERE id = $2',
                [newRatings.newWinnerElo, match.players[match.winnerIndex].id]
            )

            await client.query(
                'UPDATE users SET rating = $1 WHERE id = $2',
                [newRatings.newLoserElo, match.players[playerIndex].id]
            )
        }

        const sendObject = {
            type: 9,
            winnerIndex: match.winnerIndex,
        }

        match.players.forEach((user) => {
            user.ws.send(JSON.stringify(sendObject))
            user.ws.close()
        });

        matches.splice(matchIndex, 1);
        client.release();
    }

    else if (request.type === 0) {// mine request
        if (!request.cell || !match || playerIndex === undefined) {
            console.log('denied')
            return;
        }

        const reqY: number = request.cell[0]
        const reqX: number = request.cell[1]

        console.log(`sssss      y= ${reqY}, x= ${reqX}`)

        if (match?.matchStarted) {
            if (match.board.cells[reqY][reqX] === -1) { // hit mine, player lose
                console.log('hit mine')

                match.matchEnded = true;
                match.winnerIndex = playerIndex === 0 ? 1 : 0;
                match.winnerString = match.players[match.winnerIndex].name;

                const newRatings: { newWinnerElo: number, newLoserElo: number } = calculateEloChange(<number> match.players[match.winnerIndex].elo, <number> match.players[playerIndex].elo, match.kFactor)

                const client = await pool.connect();

                await client.query(
                    'INSERT INTO matches (users, scores, boardWidth, boardHeight, mineCount, cells, matchStarted, matchEnded, winnerIndex, winnerString, startTime, ranked, kFactor)' +
                    'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
                    [[match.players[0].id,match.players[1].id], match.scores, match.board.boardWidth, match.board.boardHeight, match.board.mineCount, match.board.cells, match.matchStarted, match.matchEnded, match.winnerIndex, match.winnerString, match.startTime, match.ranked, match.kFactor]
                )

                if (match.ranked) {
                    await client.query(
                        'UPDATE users SET rating = $1 WHERE id = $2',
                        [newRatings.newWinnerElo, match.players[match.winnerIndex].id]
                    )

                    await client.query(
                        'UPDATE users SET rating = $1 WHERE id = $2',
                        [newRatings.newLoserElo, match.players[playerIndex].id]
                    )
                }

                const sendObject = {
                    type: 9,
                    winnerIndex: match.winnerIndex,
                }

                match.players.forEach((user) => {
                    user.ws.send(JSON.stringify(sendObject))
                    user.ws.close()
                });

                matches.splice(matchIndex, 1);
                client.release();
            }

            else {
                console.log('not a mine')
                match.playerBoards[playerIndex].cells[reqY][reqX] = 10;
                if (checkPlayerBoard(match.playerBoards[playerIndex], match.board)) {//playerWin
                    console.log('player win')
                    match.matchEnded = true;
                    match.winnerIndex = playerIndex
                    const loserIndex = playerIndex === 0 ? 1 : 0;
                    match.winnerString = match.players[match.winnerIndex].name;

                    const newRatings: { newWinnerElo: number, newLoserElo: number } = calculateEloChange(<number> match.players[match.winnerIndex].elo, <number> match.players[loserIndex].elo, match.kFactor)


                    const client = await pool.connect();

                    await client.query(
                        'INSERT INTO matches (users, scores, boardWidth, boardHeight, mineCount, cells, matchStarted, matchEnded, winnerIndex, winnerString, startTime, ranked, kFactor)' +
                        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
                        [[match.players[0].id,match.players[1].id], match.scores, match.board.boardWidth, match.board.boardHeight, match.board.mineCount, match.board.cells, match.matchStarted, match.matchEnded, match.winnerIndex, match.winnerString, match.startTime, match.ranked, match.kFactor]
                    )

                    if (match.ranked) {
                        await client.query(
                            'UPDATE users SET rating = $1 WHERE id = $2',
                            [newRatings.newWinnerElo, match.players[match.winnerIndex].id]
                        )

                        await client.query(
                            'UPDATE users SET rating = $1 WHERE id = $2',
                            [newRatings.newLoserElo, match.players[loserIndex].id]
                        )
                    }

                    const sendObject = {
                        type: 9,
                        winnerIndex: match.winnerIndex,
                    }

                    match.players.forEach((user) => {
                        user.ws.send(JSON.stringify(sendObject))
                        user.ws.close()
                    });

                    matches.splice(matchIndex, 1);
                    client.release();
                }
            }
        }

    }
}

const checkQueues = ():void => {
    queues.forEach((queue) => {
        if (queue.users.length >= 2) {

            const matchPlayers = [queue.users[0], queue.users[1]];

            queue.users.splice(0, 2);

            console.log(queue.users)

            const newMatchObject: Match = {
                players: matchPlayers,
                scores: [0, 0],
                board: generateBoard(queue.width, queue.height, queue.mines),
                matchStarted: false,
                matchEnded: false,
                winnerIndex: -1,
                winnerString: '',
                startTime: Date.now() + 6000,
                ranked: queue.ranked,
                kFactor: queue.kFactor,
                playerBoards: []
            }

            const clonedMatchObject: Match = JSON.parse(JSON.stringify(newMatchObject));

            clonedMatchObject.players.forEach((player: { password: string; }) => {
                player.password = 'TRUNCATED FOR PRIVACY';
            })

            clonedMatchObject.board = truncateBoard(newMatchObject.board);


            newMatchObject.playerBoards = [
                newMatchObject.board, newMatchObject.board
            ]

            matchPlayers.forEach((user, index) => {

                const data = JSON.stringify({
                    type: 1,
                    match: clonedMatchObject,
                    index: index,
                });

                user.ws.send(data);
            })

            matches.push(newMatchObject);

            setTimeout(() => {
                const i = matches.findIndex((match) => {
                    if (match.startTime === newMatchObject.startTime) {
                        return true;
                    }else {
                        return false;
                    }
                })

                matches[i].matchStarted = true;

            },5000)
        }
    })
}

const addQueue = (id: number, title: string, ranked: boolean, mines: number, width: number, height: number, kFactor: number) => {

    const newQueue: Queue = {
        users: [],
        title: title,
        ranked: ranked,
        mines: mines,
        width: width,
        height: height,
        id: id,
        kFactor: kFactor
    }

    queues.push(newQueue);

    console.log('New queue added: ', newQueue);
}

const handleDisconnect = (id: number): void => {
    queues.forEach((queue) => {
        queue.users.forEach((user, index) => {
            if (user.id === id) {
                queue.users.splice(index, 1);
            }
        })
    })
    matches.forEach((match, index2) => {
        match.players.forEach(async (player, index) => {
            if (player.id === id) {

                match.matchEnded = true;
                match.winnerIndex = index === 0 ? 1 : 0;
                match.winnerString = match.players[match.winnerIndex].name;

                const newRatings: { newWinnerElo: number, newLoserElo: number } = calculateEloChange(<number> match.players[match.winnerIndex].elo, <number> match.players[index].elo, match.kFactor)


                const client = await pool.connect();

                await client.query(
                    'INSERT INTO matches (users, scores, boardWidth, boardHeight, mineCount, cells, matchStarted, matchEnded, winnerIndex, winnerString, startTime, ranked, kFactor)' +
                    'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
                    [[match.players[0].id,match.players[1].id], match.scores, match.board.boardWidth, match.board.boardHeight, match.board.mineCount, match.board.cells, match.matchStarted, match.matchEnded, match.winnerIndex, match.winnerString, match.startTime, match.ranked, match.kFactor]
                )

                if (match.ranked) {
                    await client.query(
                        'UPDATE users SET rating = $1 WHERE id = $2',
                        [newRatings.newWinnerElo, match.players[match.winnerIndex].id]
                    )

                    await client.query(
                        'UPDATE users SET rating = $1 WHERE id = $2',
                        [newRatings.newLoserElo, match.players[index].id]
                    )
                }

                const sendObject = {
                    type: 9,
                    winnerIndex: match.winnerIndex,
                }

                match.players.forEach((user) => {
                    user.ws.send(JSON.stringify(sendObject))
                    user.ws.close()
                });

                matches.splice(index2, 1);
                client.release();
            }
        })
    })
}

app.listen(PORT, () => {
    console.log(`Api is now running on port: ${PORT}`);
});

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const queryString = req.url?.split("?")[1];
    if (!queryString) return ws.close(1008, "Missing query parameters");

    const params = new URLSearchParams(queryString);

    const token = params.get("token") || "";
    const queueId = parseInt(params.get("queueId") || "");

    if (!token || isNaN(queueId)) return ws.close(1008, "Invalid token or queueId");

    if (!userTokens.some((t) => t.token === token)) return ws.close(1008, "Invalid token");

    if (!queues.some((q) => q.id === queueId)) return ws.close(1008, "Queue not found");

    const queue: Queue = <Queue>queues.find((q) => q.id === queueId);

    const id: number = <number>userTokens.find((t) => t.token === token)?.id;

    const client = await pool.connect();

    const queryResponse = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    )

    const newUserObject: User = {
        id: id,
        name: queryResponse.rows[0].username,
        password: queryResponse.rows[0].password,
        ws: ws,
        elo: queryResponse.rows[0].rating,
    }

    queue.users.push(newUserObject)

    ws.on('message', (message : string) => handleMessage(message, id))
    ws.on('close', () => handleDisconnect(id))

    checkQueues();
    client.release();
});


addQueue(1, 'Easy Ranked', true, 13, 10, 10, 12);
addQueue(2, 'Medium Ranked', true, 25, 15, 15, 16);
addQueue(3, 'Hard Ranked', true, 55, 20, 20, 20);
addQueue(4, 'Extreme Ranked', true, 125, 25, 25, 26);

addQueue(11, 'Easy Unranked', false, 13, 10, 10, 12);
addQueue(12, 'Medium Unranked', false, 25, 15, 15, 16);
addQueue(13, 'Hard Unranked', false, 55, 20, 20, 20);
addQueue(14, 'Extreme Unranked', false, 125, 25, 25, 26);

