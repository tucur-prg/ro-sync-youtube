const querystring = require('querystring');

const express = require("express");
const app = express();
const server = app.listen(process.env.PORT, () => console.log("app listening on port " + process.env.PORT));

const io = require("socket.io")(server);

app.set("views", process.cwd() + "/views");
app.set("view engine", "ejs");

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});
app.get("/redirect", function(req, res) {
  let id;

  console.log(req.query.q);
  if (req.query.q.indexOf("https://www.youtube.com/") !== -1) {
    let q = req.query.q.split("?");
    let parse = querystring.parse(q[1]);
    id = parse.v;
  } else if (req.query.q.indexOf("https://youtu.be/") !== -1) {
    let parse = req.query.q.split("/");
    id = parse[3];
  } else {
    id = req.query.q;
  }

  if (!id) {
    res.sendFile(__dirname + "/views/notfound.html");    
  }

  res.redirect("/sync/" + id);
});
app.get("/sync/:videoId", function(req, res) {
  res.render("sync", {
    videoId: req.params.videoId
  });
});

///// Socket.io

let counter = {};
let store = {};

// listen for requests :)
const sync = io.sockets.on("connection", function(socket) { 
  let room = socket.handshake.query.room;
  console.log("on connection | user: " + socket.id + " | room: " + room);

  if (!counter[room]) {
    counter[room] = 0;
  }

  socket.join(room, () => {
    console.log("join room: " + room);

    counter[room]++;

    if (!store[room]) {
      console.log("your are master: " + socket.id);
      store[room] = socket.id;
    }

    console.log("emit user counter");
    sync.to(room).emit("user counter", counter[room]);
  });
  
  // Event
  socket.on("player ready", function(data) {
    let room = socket.handshake.query.room;
    console.log("on player ready | user: " + socket.id + " | room: " + room);
    if (store[room] == socket.id) {
      return console.log("skip: your are master.");
    }

    console.log("emmit join");
    sync.to(store[room]).emit("join", socket.id);
  });
  socket.on("now", function(data) {
    let room = socket.handshake.query.room;
    console.log("on now | user: " + socket.id + " | room: " + room);
    console.log("seek: " + data.currentTime);

    console.log("to " + data.toId + " emmit connected");
    sync.to(data.toId).emit("connected", {
      playerState: data.playerState,
      currentTime: data.currentTime
    });  
  });

  socket.on("playing", function(data) {
    let room = socket.handshake.query.room;
    console.log("on playing | user: " + socket.id + " | room: " + room);

    console.log("emit broadcast playing");
    socket.broadcast.to(room).emit("broadcast playing", data.seek);
  });
  socket.on("paused", function(data) {
    let room = socket.handshake.query.room;
    console.log("on paused | user: " + socket.id + " | room: " + room);

    console.log("emit broadcast paused");
    socket.broadcast.to(room).emit("broadcast paused", data.seek);
  });

  socket.on("disconnect", function() {
    let room = socket.handshake.query.room;

    console.log("on disconnect | user: " + socket.id + " | room: " + room);

    counter[room]--;
    if (store[room] == socket.id) {
      delete store[room];
    }

    socket.leave(room);

    console.log("emit user counter");
    sync.to(room).emit("user counter", counter[room]);
  });
});

