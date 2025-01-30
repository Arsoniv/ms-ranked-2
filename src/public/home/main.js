const nav = document.getElementById('nav');
const body = document.getElementById('body');

let loggedIn = false;
let token = '';
let user = {};

const checkToken = async (token) => {
    const response = await fetch('http://localhost:3000/api/checkToken', {
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

            const nav = document.getElementById('nav'); // Assuming you have a nav element
            nav.innerHTML = '';
            nav.innerText = user.username;
            nav.style.margin = '15px';
        } else {
            localStorage.removeItem('token');
        }
    }
};

checkAndSetUser();


const enterQueue = (id) => {
    if (!loggedIn) {
        alert('Must be logged in to do this!');
        return;
    }

    window.location = '/game/'+id;
}