const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const qstns = [{
    "question": "test0",
    "ways": ["0: 0", "0: 1"]
}, {
    "question": "test1",
    "ways": ["1: 0", "1: 1"]
}, {
    "question": "test2",
    "ways": ["2: 0", "2: 1"]
}, {
    "question": "test3",
    "ways": ["3: 0", "3: 1"]
}, {
    "question": "test4",
    "ways": ["4: 0", "4: 1"]
}, {
    "question": "test5",
    "ways": ["5: 0", "5: 1"]
}, {
    "question": "test6",
    "ways": ["6: 0", "6: 1"]
}, {
    "question": "test7",
    "ways": ["7: 0", "7: 1"]
}, {
    "question": "test8",
    "ways": ["8: 0", "8: 1"]
}, {
    "question": "test9",
    "ways": ["9: 0", "9: 1"]
}];

let rooms = [];

function randomStr(len) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let str = "";
    for(let i = 0; i < len; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

function genCode() {
    let code = "";
    let overlap = false;
    do {
        overlap = false;
        code = randomStr(6);
        for(let i = 0; i < rooms.length; i++) {
            if(code == rooms[i].code) overlap = true;
        }
    } while(overlap);
    return code;
}

function shuffle(array, len) {
    let random = array.map(Math.random);
    array.sort(function(a, b) {
      return random[a] - random[b];
    });
    return array.slice(0, len);
}

app.use('/', express.static("server"));

io.on("connection", socket => {
    let room = [null, null]; //room, host

    console.log("user connected: " + socket.id);
    socket.on("host", () => {
        let code = genCode();
        socket.emit("code", code);
        room[0] = rooms.length;
        room[1] = true;
        rooms.push({
            host: [socket.id, null],
            memb: [null, null],
            code: code,
            questions: [],
            sync: [null, null],
            index: -1,
            disconnected: false
        });
    });

    socket.on("join", data => {
        data = data.trim();
        for(let i = 0; i < rooms.length; i++) {
            if(rooms[i].code == data) {
                rooms[i].memb[0] = socket.id;
                room[0] = i;
                room[1] = false;
                room.questions = shuffle(qstns, 10);
                socket.emit("joinCheck", { bool: true, que: room.questions });
                io.to(rooms[room[0]].host[0]).emit("start", room.questions);
                return;
            }
        }
        socket.emit("joinCheck", { bool: false });
    });

    socket.on("ready", i => {
        if(room[0] != null) {
            if(room[1]) rooms[room[0]].sync[0] = true;
            else rooms[room[0]].sync[1] = true;

            if(rooms[room[0]].sync[0] && rooms[room[0]].sync[1]) {
                rooms[room[0]].index = i;
                rooms[room[0]].sync = [null, null];
                io.to(rooms[room[0]].host[0]).emit("play", { match: null, index: rooms[room[0]].index });
                io.to(rooms[room[0]].memb[0]).emit("play", { match: null, index: rooms[room[0]].index });
            }
        }
    });

    socket.on("select", num => {
        if(rooms[room[0]].sync[0] !== null) {
            rooms[room[0]].index++;
            if(num === false) {
                io.to(rooms[room[0]].host[0]).emit("play", { match: 0, index: rooms[room[0]].index });
                io.to(rooms[room[0]].memb[0]).emit("play", { match: 0, index: rooms[room[0]].index });
            }
            else if(rooms[room[0]].sync[0] == num) {
                io.to(rooms[room[0]].host[0]).emit("play", { match: true, index: rooms[room[0]].index });
                io.to(rooms[room[0]].memb[0]).emit("play", { match: true, index: rooms[room[0]].index });
            }
            else {
                io.to(rooms[room[0]].host[0]).emit("play", { match: false, index: rooms[room[0]].index });
                io.to(rooms[room[0]].memb[0]).emit("play", { match: false, index: rooms[room[0]].index });
            }
            rooms[room[0]].sync = [null, null];
        }
        else {
            rooms[room[0]].sync[0] = num;
        }
    });

    socket.on("disconnect", () => {
        if(room[0] != null) {
            if(rooms[room[0]].index == -1)
                rooms.splice(room[0], 1);
            else if(!rooms[room[0]].disconnected) {
                rooms[room[0]].disconnected = true;
                if(room[1]) io.to(rooms[room[0]].memb[0]).emit("dscnct");
                else io.to(rooms[room[0]].host[0]).emit("dscnct");
            }
            else 
                rooms.splice(room[0], 1);
        }
    });
});

server.listen(80, () => {
    console.log("server is running on port 80");
});