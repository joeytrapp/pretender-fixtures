module('Agent.FixtureGroup');

test('new fixture group normalizes key', function() {
  expect(1);
  var group = new Agent.FixtureGroup('keyname', function() {});
  equal(group.key, 'KEYNAME', 'group key was not normalized to all caps');
});

test('new fixture group does not use callback until build', function() {
  expect(2);
  var triggered = false, group;
  group = new Agent.FixtureGroup('key', function() {
    triggered = true;
  });
  ok(!triggered, 'callback was triggered too soon');
  group.build();
  ok(triggered, 'callback was not triggered properly');
});

test('build creates fixture records', function() {
  expect(4);
  var group = new Agent.FixtureGroup('key', function() {
    this.fixture('123', { name: 'John' });
    this.fixture('234', { name: 'Kate' });
    this.fixture('345', { name: 'Beth' });
  });
  ok(!group.isBuilt);
  group.build();
  ok(group.isBuilt);
  equal(group.fixtures.length, 3, 'An incorrect number of fixtures were generated');
  ok(group.fixtures[0] instanceof Agent.Fixture);
});

test('records builds fixtures if they have not been build and returns hash of objects', function() {
  expect(5);
  var group = new Agent.FixtureGroup('key', function() {
    this.fixture('123', { name: 'John' });
    this.fixture('234', { name: 'Kate' });
    this.fixture('345', { name: 'Beth' });
  });
  ok(!group.isBuilt);
  fixtures = group.records();
  ok(group.isBuilt);
  deepEqual(fixtures['123'], { id: '123', name: 'John' });
  deepEqual(fixtures['234'], { id: '234', name: 'Kate' });
  deepEqual(fixtures['345'], { id: '345', name: 'Beth' });
});

test('reset removes existing fixtures and resets isBuilt', function() {
  expect(4);
  var group = new Agent.FixtureGroup('key', function() {
    this.fixture('123', { name: 'John' });
    this.fixture('234', { name: 'Kate' });
    this.fixture('345', { name: 'Beth' });
  });
  ok(!group.isBuilt);
  group.build();
  ok(group.isBuilt);
  group.reset();
  ok(!group.isBuilt);
  deepEqual(group.fixtures, []);
});

