const button = document.getElementById("button");
const passIn = document.getElementById("passIn");
const passIn2 = document.getElementById("passIn2");
const userIn = document.getElementById("userIn");

button.addEventListener("click", async (e) => {

    button.disabled = true;

    if (!(passIn.value === passIn2.value)){
        alert("Passwords must match");
        button.disabled = false;
        return;
    }

    if (passIn.value < 8){
        alert("Password length must be 8 characters or more");
        button.disabled = false;
        return;
    }

    if (userIn.value < 5){
        alert("Username length must be 5 characters or more");
        button.disabled = false;
        return;
    }

    button.innerText = 'Requesting Account'

    const response = await fetch("http://localhost:3000/api/createAccount", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: userIn.value,
            password: passIn.value
        })
    })

    if (response.status === 200) {
        button.innerText = 'Complete, you will now be redirected'
        setTimeout(() => {
            window.location = '/login'
        }, 700)
    }
    if (response.status === 401) {
        alert('username in use :( \n please pick another username or log in')
        button.disabled = false;
    }
    if (response.status === 400) {
        alert('data invalid')
        button.disabled = false;
    }



})