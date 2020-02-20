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

let store = {};

// listen for requests :)
const sync = io.sockets.on("connection", function(socket) { 
  let room = socket.handshake.query.room;
  console.log("on connection | user: " + socket.id + " | room: " + room);

  if (!store[room]) {
    store[room] = {
      'count': 0,
      'master': undefined,
      'member': []
    }
  }

  socket.join(room, () => {
    console.log("join room: " + room);

    store[room]['count']++;
    store[room]['member'].push(socket.id);

    if (!store[room]['master']) {
      console.log("you are master: " + socket.id);
      store[room]['master'] = socket.id;
    }

    console.log("emit user count");
    sync.to(room).emit("user count", {id: socket.id, count: store[room]['count']});
  });

  // Event
  socket.on("player ready", function(data) {
    let room = socket.handshake.query.room;
    console.log("on player ready | user: " + socket.id + " | room: " + room);

    if (store[room]['master'] == socket.id) {
      return console.log("skip: you are master.");
    }

    console.log("emmit join");
    sync.to(store[room]['master']).emit("join", socket.id);
  });
  socket.on("now", function(data) {
    let room = socket.handshake.query.room;
    console.log("on now | user: " + socket.id + " | room: " + room);
    console.log("seek: " + data.currentTime + " | rate: " + data.rate);

    console.log("to " + data.toId + " emmit connected");
    sync.to(data.toId).emit("connected", {
      id: socket.id,
      playerState: data.playerState,
      currentTime: data.currentTime,
      rate: data.rate
    });  
  });

  socket.on("playing", function(data) {
    let room = socket.handshake.query.room;
    console.log("on playing | user: " + socket.id + " | room: " + room);

    console.log("emit broadcast playing");
    socket.broadcast.to(room).emit("broadcast playing", {id: socket.id, seek: data.seek});
  });
  socket.on("paused", function(data) {
    let room = socket.handshake.query.room;
    console.log("on paused | user: " + socket.id + " | room: " + room);

    console.log("emit broadcast paused");
    socket.broadcast.to(room).emit("broadcast paused", {id: socket.id, seek: data.seek});
  });
  socket.on("rate change", function(data) {
    let room = socket.handshake.query.room;
    console.log("on rate change | user: " + socket.id + " | room: " + room);

    console.log("emit broadcast rate change");
    socket.broadcast.to(room).emit("broadcast rate change", {id: socket.id, rate: data.rate});
  });

  socket.on("disconnect", function() {
    let room = socket.handshake.query.room;

    console.log("on disconnect | user: " + socket.id + " | room: " + room);

    store[room]['count']--;
    
    let i = store[room]['member'].indexOf(socket.id);
    store[room]['member'].splice(i, 1);

    if (store[room]['master'] == socket.id) {
      console.log("change master: " + store[room]['member'][0]);
      store[room]['master'] = store[room]['member'][0];
    }

    socket.leave(room);

    console.log("emit dis user count");
    sync.to(room).emit("dis user count", {id: socket.id, count: store[room]['count']});
  });
});

