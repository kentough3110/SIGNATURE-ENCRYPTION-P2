const http = require("http");
const socketIo = require("socket.io")

const server = http.createServer();
const io = socketIo(server);

const users = new Map();


io.on("connection", (socket) => {
    console.log(`Client ${socket.id} connected`);

    socket.emit("init", Array.from(users.entries())); // to send the current user list to the newly connected client

    socket.on("registerPublicKey", (data) => {
        const { username, publicKey } = data; //extract payloads
        users.set(username, publicKey); //Stored the payload in users
        console.log(`${username} registered with public key`); //show in terminal
        io.emit("newUser", { username, publicKey }); // broadcast by sending username and public key through event newUser
    })
    //disconnect handle
    socket.on("disconnect", () => {
        console.log(`Client ${socket.id} disconnected`)
    });
    //msg handle
    socket.on("message", (data) => {
        let { username, message, signature } = data; //extract payloads
        console.log(`Receiving message from ${username}: ${message}`); //show in terminal

        io.emit("message", { username, message, signature }); //broadcast --
    });
});

const port = 3000;
server.listen(port, ()=> {
    console.log(`Server running on port ${port}`);
});

