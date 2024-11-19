const io = require("socket.io-client");
const readline = require("readline");
const crypto = require('crypto');

const socket = io("http://localhost:3000");


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> "
});

let registeredUsername = "";
let username = "";
const users = new Map();

//Generate Public Key and Private Key 
const {publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem', },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem', },
});

socket.on("connect", () => {
    console.log("Connected to the server");

    rl.question("Enter your username: ", (input) => {
        username = input;
        registeredUsername = input;
        console.log(`Welcome, ${username} to the chat`);

        socket.emit("registerPublicKey", {
            username,
            publicKey,
        });
        rl.prompt();

        rl.on("line", (message) => {
            if (message.trim()) {
                if ((match = message.match(/^!impersonate (\w+)$/))) {
                    const targetUser = match[1];
                    if (users.has(targetUser)) {
                        username = targetUser;
                        console.log(`Now impersonating as ${username}`);
                    } else {
                        console.log(`No such user: ${targetUser}`);
                    }
                } else if (message.match(/^!exit$/))  {
                    username = registeredUsername;
                    console.log(`Now you are ${username}`)
                } else {
                    //The message is signed using the sender's private key, creating a signature.
                    const signature = crypto.sign("sha256", Buffer.from(message), privateKey);

                    socket.emit("message", { 
                        username, message, signature: signature.toString("base64"), });
                }
            }
            rl.prompt();
        });
    });
});
//Initial users and keys
socket.on("init", (keys) => {
    keys.forEach(([user, key]) => users.set(user, key));
    console.log(`\nThere are currently ${users.size} users in the chat`);
    rl.prompt();
});
//Initial user join handle
socket.on("newUser", (data) => {
    const { username, publicKey } = data;
    users.set(username, publicKey);
    console.log(`${username} join the chat`);
    rl.prompt();
});

//msg handle
socket.on("message", (data) => {
    const { username: senderUsername, message: senderMessage, signature } = data; //extract payloads
    if (senderUsername !== username) {
        const publicKey = users.get(senderUsername);
            
        if (publicKey) {
            //The receiver uses the public key of the sender to verify the signature. 
            const isVerified = crypto.verify(
                "sha256",
                Buffer.from(senderMessage),
                publicKey,
                Buffer.from(signature, "base64")
            );

            //If the verification succeeds, it confirms the message is authentic and unchanged.
            if (isVerified) {
                console.log(`${senderUsername}: ${senderMessage}`);
            } else {
                console.log(`${senderUsername}: ${senderMessage} (this user is fake)`);
            }
        }
      
      rl.prompt();
    }
});
  

socket.on("disconnect", () => {
    console.log("Server disconnected, Exiting...");
    rl.close();
    process.exit(0);
});

rl.on("SIGINT", () => {
    console.log("\nExiting...");
    socket.disconnect();
    rl.close();
    process.exit(0);
});
