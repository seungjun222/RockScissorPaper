const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const templatesPath = __dirname + '/templates';

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(templatesPath + '/index.html');
});



let count = 10;
let interval;
let restartInterval;
let submit = [];


function reset() {
    // 게임을 초기화합니다.
    clearInterval(interval);
    clearInterval(restartInterval);
    interval = undefined;
    count = 10;
    submit = [];
}

function stop() {
    // 게임을 종료합니다.
    io.emit("stop");
    reset();
}

function start() {
    // 게임 시작합니다.
    reset();
    // 모든 유저에게 게임 시작을 알립니다.
    io.emit("start")
    // 모든 유저에게 countdown 메시지를 보냅니다.
    if (!interval) {
        count = 10;
        interval = setInterval(() => {
            // 10초간 카운트 다운을 합니다.
            console.log("countdown: ", count);
            if (count >= 0) {
                io.emit("countdown", count--);
            }
            // 두 유저가 결과를 냈다면
            if (submit.length >= 2) {
                // 카운트 다운을 멈추고 결과를 전송합니다.
                clearInterval(interval);
                console.log("제출된 아이템들: ", submit);
                if (submit[0].message == submit[1].message) {
                    io.to(submit[0].user).emit("result", { result: "무", you: submit[1].message })
                    io.to(submit[1].user).emit("result", { result: "무", you: submit[0].message })
                } else if ((submit[0].message + 1) % 3 == submit[1].message) {
                    io.to(submit[0].user).emit("result", { result: "패", you: submit[1].message })
                    io.to(submit[1].user).emit("result", { result: "승", you: submit[0].message })
                }
                else {
                    io.to(submit[0].user).emit("result", { result: "승", you: submit[1].message })
                    io.to(submit[1].user).emit("result", { result: "패", you: submit[0].message })
                }

                count = 5;
                restartInterval = setInterval(() => {
                    console.log("restart countdown: ", count);
                    if (count >= 0) {
                        io.emit("restart", count--);
                    } else {
                        start();
                    }
                }, 1000);
            }
        }, 1000);
    }
}

io.on('connection', (socket) => {
    console.log('[유저 접속] 접속한 유저의 id: ', socket.id);
    console.log('현재 접속한 유저 수는 ', socket.client.conn.server.clientsCount, ' 명입니다.');

    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (socket.client.conn.server.clientsCount < 2) {
            console.log('유저가 2명보다 적습니다. 중지합니다.');
            stop();
        }
    });

    socket.on('submit', (rps) => {
        console.log('submit: ' + JSON.stringify(rps));
        submit.push(rps);
    });

    if (socket.client.conn.server.clientsCount >= 2) {
        console.log('2명의 유저가 접속했습니다. 게임을 시작합니다.');
        start();
    } else {
        console.log('아직 2명의 유저가 접속하지 않았습니다.');
        stop();
    }
});

server.listen(3000, () => {
    console.log('listening on *:3000')
});