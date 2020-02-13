
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

// listen for requests :)
io.sockets.on("connection", function(socket) { 
  counter++;
  console.log(counter);
  io.emit("user counter", counter);

  socket.on("playing", function() {
    socket.broadcast.emit("all playing");
  })
  socket.on("paused", function() {
    socket.broadcast.emit("all paused");
  })
  
  socket.on("disconnect", function() {
    counter--;
    io.emit("user counter", counter);
  });
});

