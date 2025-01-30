const button = document.getElementById("button");
const userIn = document.getElementById("userIn");
const passIn = document.getElementById("passIn");

button.addEventListener('click', async (e) => {


    const response2 = await fetch("http://localhost:3000/api/getAccountInfo", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userName: userIn.value
        })
    })

    const data2 = (await response2.json()).response;

    const response = await fetch("http://localhost:3000/api/getToken", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: data2.user.id,
            password: passIn.value
        })
    })
})