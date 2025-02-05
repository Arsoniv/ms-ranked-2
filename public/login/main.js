const button = document.getElementById("button");
const userIn = document.getElementById("userIn");
const passIn = document.getElementById("passIn");

button.addEventListener('click', async (e) => {

    button.disabled = true;
    button.innerText = "Fetching account";

    const response2 = await fetch("/api/getAccountInfo", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userName: userIn.value
        })
    })

    const data2 = (await response2.json());

    if (!data2.user) {
        alert('Could not find account')
        button.disabled = false;
        return;
    }

    console.log(data2)

    button.innerText = "Logging In";

    const response = await fetch("/api/getToken", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: data2.user.id,
            password: passIn.value
        })
    })

    const data = await response.json();

    if (!data.token) {
        alert('Login Failed, check you password')
        button.disabled = false;
        return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data2.user));
    window.location = '/';
})