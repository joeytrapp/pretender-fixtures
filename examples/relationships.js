// test/setup.js
Agent.create();


// test/fixture/posts.js
var postIds = Agent.instance.makeIds('posts', 2);

Agent.instance.group('posts', function() {
  var commentIds = Agent.instance.getIds('comments');

  this.fixture(postIds[1], {
    title: 'Title 1',
    body: 'Body content.',
    comments: [commentIds[1], commentIds[2]]
  });

  this.fixture(postIds[2], {
    title: 'Title 2',
    body: 'Body content.',
    comments: [commentIds[3], commentIds[4]]
  });
});


// test/fixture/comments.js
var commentIds = Agent.instance.makeIds('comments', 4);

Agent.instance.group('comments', function() {
  var postIds = Agent.instance.getIds('posts');

  this.fixture(commentIds[1], {
    body: 'Comment content 1.',
    post: postIds[1]
  });

  this.fixture(commentIds[2], {
    body: 'Comment content 2.',
    post: postIds[1]
  });

  this.fixture(commentIds[3], {
    body: 'Comment content 3.',
    post: postIds[2]
  });

  this.fixture(commentIds[4], {
    body: 'Comment content 4.',
    post: postIds[2]
  });
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
