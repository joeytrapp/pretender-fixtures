module('Agent.Fixture');

test('sets id in data object when does not exist', function() {
  expect(1);
  var fixture = new Agent.Fixture('1234', { first: 'First', last: 'Last' });
  deepEqual(fixture.record(), { id: '1234', first: 'First', last: 'Last' });
});
