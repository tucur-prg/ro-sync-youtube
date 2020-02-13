
const express = require("express");
const app = express();
const server = app.listen(process.env.PORT);

const io = require('socket.io')(server);

app.use(express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});
app.get("/sync/", function(req, res) {
  res.sendFile(__dirname + "/views/sync.html");
});

var counter = 0;
var master;

// listen for requests :)
io.sockets.on("connection", function(socket) { 
  if (!master) {
    master = socket.id;
  }
  console.log(master + ":" + socket.id);

  counter++;

  socket.emit("user counter", counter);

  if (master != socket.id) {
    console.log("join: " + master);
    io.to(master).emit("join", socket.id);
  }

  // Event
  socket.on("now", function(data) {
    console.log("now");
    console.log(data);

    io.to(data.id).emit("connected", {"playerState": data.playerState, "currentTime": data.currentTime});  
  });
  socket.on("playing", function(seek) {
    socket.broadcast.emit("all playing", seek);
  });
  socket.on("paused", function(seek) {
    socket.broadcast.emit("all paused", seek);
  });
  socket.on("disconnect", function() {
    counter--;
    socket.emit("user counter", counter);
  });
});

