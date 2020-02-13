
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
})