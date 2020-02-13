const querystring = require('querystring');

const express = require("express");
const app = express();
const server = app.listen(process.env.PORT);

const io = require('socket.io')(server);

app.use(express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});
app.get("/redirect", function(req, res) {
  var id;

  console.log(req.query.q);
  if (req.query.q.indexOf("https://www.youtube.com/") !== -1) {
    var q = req.query.q.split("?");
    var parse = querystring.parse(q[1]);
    id = parse.v;
  } else if (req.query.q.indexOf("https://youtu.be/") !== -1) {
    var parse = req.query.q.split("/");
    id = parse[3];
  } else {
    id = req.query.q;
  }

  if (!id) {
    res.sendFile(__dirname + "/views/notfound.html");    
  }

  res.redirect('/sync/' + id)
});
app.get("/sync/:id", function(req, res) {

  res.sendFile(__dirname + "/views/sync.html", {"id": req.id});
});

///// Socket.io

var counter = 0;
var master;

// listen for requests :)
io.sockets.on("connection", function(socket) { 
  counter++;

  if (counter == 1) {
    console.log("master: " + socket.id);
    master = socket.id;
  }

  socket.emit("user counter", counter);

  // Event
  socket.on("to_master", function() {
    console.log("join: " + socket.id);
    io.to(master).emit("join", socket.id);
  });
  socket.on("now", function(data) {
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

