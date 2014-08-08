// test/setup.js
Agent.create();


// test/fixture/users.js
var userIds = Agent.instance.makeIds('users', 2);

Agent.instance.group('users', function() {
  this.fixture(userIds[1], { first: 'John', last: 'Smith' });
  this.fixture(userIds[2], { first: 'Jane', last: 'Doe' });
});


// test/server.js
function jsonResponse(str) {
  return [200, { "Content-Type": "application/json" }, str];
}

function toArray(obj) {
  var arr = [], i;
  for i in obj {
    if (obj.hasOwnProperty(i)) { arr.push(obj[i]); }
  }
}

Agent.instance.build();
Agent.instance.server(function(agent) {
  this.get('/users', function() {
    var obj = { users: toArray(agent.fixtures('users')) };
    return jsonResponse(JSON.stringify(obj));
  });

  this.get('/users/:id', function() {
    var obj = { users: [agent.fixtures('users')[this.params.id]] };
    return jsonResponse(JSON.stringify(obj));
  });
});

