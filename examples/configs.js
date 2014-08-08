// test/setup.js
Agent.create({
  failLogin: false
});


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
  this.post('/authorize', function() {
    if (agent.failLogin) {
      return [
        400,
        { "Content-Type": "application/json" },
        '{ "errors": "Invalid Login Credentials" }'
      ];
    }
    return jsonResponse('{}');
  });

  this.get('/users', function() {
    var obj = { users: toArray(agent.fixtures('users')) };
    return jsonResponse(JSON.stringify(obj));
  });

  this.get('/users/:id', function() {
    var obj = { users: [agent.fixtures('users')[this.params.id]] };
    return jsonResponse(JSON.stringify(obj));
  });
});


// test/integration/authorize_test.js

module('Authorize');

test('when authorize fails', function() {
  // Change the config value for just this test.
  Agent.instance.failLogin = true;

  // Do all the things that cause a check of authorization.

  // Be sure to reset the config value after running the test
  // May have to put this line in the promise callback
  Agent.instance.failLogin = false;
});

