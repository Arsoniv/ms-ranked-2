let canvas = document.getElementById('canvas');
let ctx = canvas.getContext("2d");

let socket;

canvas.width = 1000;
canvas.height = 1000;

ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

let queueId = parseInt(window.location.pathname.split('/')[window.location.pathname.split('/').length - 1]);

const token = localStorage.getItem('token')

const handleMessage = async (message) => {
    const request = JSON.parse(message);

    const type = request.type;

    if (!type) return;

    console.log(`Received message with type ${type}`);

    if (type === 1) {//match info
        const match = request.match;
        console.log(JSON.stringify(match));
    }
}

const connectToWebsocket = () => {
    if (token && queueId) {
        socket = new WebSocket(`ws://localhost:8080?queueId=${queueId}&token=${token}`);

        socket.onopen = () => {
            console.log('Connection opened');
        };

        socket.onmessage = (event) => {
            console.log('Message from server:', event.data);
            handleMessage(event.data)
                .then(() => {console.log('Message handling completed')})
        };

        socket.onclose = () => {
            alert('Connection terminated.')
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
