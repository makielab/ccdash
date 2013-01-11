// Usage: node app.js URL [PORT]
//
// E.g. node app.js http://localhost:8080/cc.xml 4444

var http    = require('http'),
    url     = require('url'),
    sax     = require('sax'),
    express = require('express'),
    restler = require('restler');

var ccUrl = process.argv[2] || 'http://localhost:4444/sample.xml',
    port  = parseInt(process.argv[3] || 4444, 10),
    username = process.argv[4] || null,
    password = process.argv[5] || null,
    pollInterval = 3000,
    state = {
      status: 'pending',
      projects: [],
      lastUpdate: null
    },
    app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

io.set('log level', 1); // reduce logging

app.get('/cc.json', function(req, res){
  res.header('Content-Type', 'application/json');
  res.send(JSON.stringify(state));
});

app.use(express['static'](__dirname + '/public'));
app.use(express.errorHandler({showStack: true, dumpExceptions: true}));
server.listen(port);

io.sockets.on('connection', function (socket) {
  socket.emit('ccjson', state);
});

var poll = function(){
  var parser = sax.parser(/* strict = */ true),
      nodes = [];

  parser.onopentag = function(node){
    if (node.name == 'Project') {
      nodes.push(node.attributes);
    }
  };

  var request = restler.get(ccUrl,{username:username,password:password});
  request.on('success', function(data) {
    parser.write(data + '');
    parser.close();
    projects = nodes.map(function(e){
      e.name = e.name.replace(/_/g, ' '); return e;
    });
    if (state.status !== 'success' || JSON.stringify(state.projects) != JSON.stringify(projects)) {
      state.projects = projects;
      state.status = 'success';
      state.lastUpdate = new Date();
      io.sockets.emit('ccjson', state);
    }
    setTimeout(poll, pollInterval);
  });
  request.on('error', function(error){
    if (state.status !== 'error') {
      state.status = 'error';
      io.sockets.emit('ccjson', state);
    }
    setTimeout(poll, pollInterval);
  });
};

poll();
