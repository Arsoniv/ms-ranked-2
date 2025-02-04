
const token = localStorage.getItem('token');

const minesIn = document.getElementById('minesIn')
const widthIn = document.getElementById('widthIn')

if (!token) window.location = '/'

const createCustomQueue = async () => {
    const mineCount = minesIn.value;
    const boardWidth = widthIn.value;

    if (token && (boardWidth*boardWidth) > mineCount) {
        const response = await fetch('/api/createQueue', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: token,
                mines: mineCount,
                width: boardWidth,
            })
        });

        const data = await response.json();

        if (response.status === 200) {
            alert(`Queue created successfully, your join id is: ${data.queueId} (scroll down on homepage)`)
        }else {
            alert(`Failed: ${response.status}`)
        }
    }else {
        alert('Failed, please confirm you are logged in and that that your mine count is less that your width squared');
    }


}