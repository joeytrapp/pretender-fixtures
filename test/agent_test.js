(function() {
  var agent;

  module('Agent', {
    setup: function() {
      agent = new Agent;
    }
  });

  test('Agent.nk normalizes keys', function() {
    equal('TEST', Agent.nk('test'), 'Key not normalized');
  });

  test('makeIds generates the specified number of ids', function() {
    expect(1);
    var builtIds = agent.makeIds('test', 3);
    equal(Object.keys(builtIds).length, 3, 'Three ids were not generated');
  });

  test('getIds returns ids generated by makeIds', function() {
    expect(1);
    var builtIds = agent.makeIds('test', 5);
    deepEqual(builtIds, agent.getIds('test'), 'getIds did not return the same as the makeIds response');
  });

  test('setIds places user supplied keys into fixture ids cache', function() {
    expect(1);
    var buildIds = agent.setIds('test', [4, 5, 6]);
    deepEqual(buildIds, { 1: 4, 2: 5, 3: 6 }, 'setIds did not add the supplied ids properly');
  });

  test('group builds a new Agent.Group', function() {
    expect(2);
    equal(agent.groups.length, 0, 'A group existed before it should');
    agent.group('test', function() {});
    equal(agent.groups.length, 1, 'A new group was not created');
  });

  test('build runs all the groups that were generated', function() {
    expect(1);
    var builtIds = agent.makeIds('test', 1),
        expected = { id: '123', body: 'body1' };
    agent.group('test', function() {
      this.fixture('123', { body: 'body1' });
    });
    agent.build();
    deepEqual(agent.fixtures('test')['123'], expected, 'Generated fixture did not match expected record');
  });

  test('reset removes all fixture data', function() {
    expect(1);
    var builtIds = agent.makeIds('test', 1),
        expected = { id: '123', body: 'body1' };
    agent.group('test', function() {
      this.fixture('123', { body: 'body1' });
    });
    agent.build();
    agent.reset();
    equal(agent.fixtures('test'), false, 'The fixtures were not removed');
  });

  test('rebuild removes all fixtures and rebuilds them from group callbacks', function() {
    expect(2);
    var builtIds = agent.makeIds('test', 1),
        expected = { id: '123', body: 'body1' };
    agent.group('test', function() {
      this.fixture('123', { body: 'body1' });
    });
    agent.build();
    agent.store.createRecord('test', '234', { body: 'body2' });
    equal(Object.keys(agent.fixtures('test')).length, 2, 'The fixtures were not removed');
    agent.rebuild();
    equal(Object.keys(agent.fixtures('test')).length, 1, 'The fixtures were not removed');
  });

  test('uuid generates a uuid', function() {
    ok(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/i.test(agent.uuid()));
  });
}());
