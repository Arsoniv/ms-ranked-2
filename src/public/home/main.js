const nav = document.getElementById('nav');
const body = document.getElementById('body');
const popUp = document.getElementById('popUp');
const queueIdIn = document.getElementById('queueIdIn');
const userNameDiv = document.getElementById('userNameDiv');
const userNameText = document.getElementById('userNameText');
const loginDiv = document.getElementById('loginDiv');
const signUpDiv = document.getElementById('signUpDiv');

let loggedIn = false;
let token = '';
let user = {};

const showPopUp = () => {
    popUp.style.display = 'flex';
}

const hidePopUp = () => {
    popUp.style.display = 'none';
}


const checkToken = async (token) => {
    const response = await fetch('/api/checkToken', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token: token
        })
    });

    return response.status === 200;
};

const checkAndSetUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
        const isValid = await checkToken(token);
        if (isValid) {
            loggedIn = true;
            user = JSON.parse(localStorage.getItem('user'));

            loginDiv.style.display = 'none';
            signUpDiv.style.display = 'none';

            userNameDiv.style.display = 'flex';
            userNameText.innerText = user.username;

        } else {
            localStorage.removeItem('token');
        }
    }
};

checkAndSetUser();


const enterQueue = (id) => {
    if (!loggedIn) {
        alert('You must be logged in to do this!');
        return;
    }

    window.location = '/game/'+id;
}

const enterCustomQueue = () => {
    const queueId = queueIdIn.value;
    if (queueId) {
        if (loggedIn) {
            hidePopUp();
            enterQueue(queueId);
        }else {
            alert('You must be logged in to do this!');
        }
    }else {
        alert('You must provide a valid queue ID')
    }
}