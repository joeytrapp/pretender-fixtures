(function() {
  var store;

  module('Agent.MemoryStore', {
    setup: function() {
      store = new Agent.MemoryStore();
    },
    teardown: function() {
      store.reset();
    }
  });

  test('get returns all records keyed by id for the given key', function() {
    expect(2);
    store.createRecord('test', 1, { body: 'body 1' });
    store.createRecord('test', '2', { body: 'body 2' });
    store.createRecord('test', '3', { body: 'body 3' });
    store.createRecord('other', 1, { body: 'body 4' });
    store.createRecord('other', '2', { body: 'body 5' });
    deepEqual(Object.keys(store.get('test')), [ '1', '2', '3' ], 'test key does not contain the correct keys');
    deepEqual(Object.keys(store.get('other')), [ '1', '2' ], 'other key does not contain the correct keys');
  });

  test('getRecord return the record in key for id', function() {
    expect(1);
    var record = { content: 'content 1' };
    store.createRecord('test', 1, record);
    deepEqual(store.getRecord('test', 1), record, 'getRecord did not return the expected record');
  });

  test('getRecord returns false for missing key or missing record', function() {
    expect(2);
    equal(store.getRecord('test', 1), false, 'getRecord for a missing id did not return false');
    equal(store.getRecord('missing', 1), false, 'getRecord for a missing key did not return false');
  });

  test('createRecord stores a record by id in memory', function() {
    expect(2);
    var record, response;
    record = { id: '1234', first: 'First', last: 'Last' };
    response = store.createRecord('test', record.id, record);
    deepEqual(response, record, 'The original record and response did not match');
    deepEqual(store.getRecord('test', '1234'), record, 'The original record and getRecord value did not match');
  });

  test('updateRecord updates only the properties that exist in the current record', function() {
    expect(2);
    var record, update, response, expected;
    record = { id: '2345', first: 'John', last: 'Doe' };
    update = { last: 'Smith' };
    expected = { id: '2345', first: 'John', last: 'Smith' };
    store.createRecord('test', record.id, record);
    response = store.updateRecord('test', record.id, update);
    deepEqual(response, expected, 'The updated response did not match expected');
    deepEqual(store.getRecord('test', '2345'), expected, 'The getRecord response did not match expected');
  });

  test('replaceRecord replaces the data for the key and id', function() {
    expect(2);
    var record, replace, response;
    record = { id: '3456', first: 'John', last: 'Smith' };
    replace = { id: '3456', first: 'Jane', last: 'Doe' };
    store.createRecord('test', record.id, record);
    response = store.replaceRecord('test', record.id, replace);
    deepEqual(response, replace, 'The replaceRecord response did not match the expected value');
    deepEqual(store.getRecord('test', '3456'), replace, 'The getRecord response did not match expected value');
  });

  test('deleteRecord removes a record from the store', function() {
    expect(2);
    var record, response;
    record = { id: '4567', first: 'Jane', last: 'Smith' };
    store.createRecord('test', record.id, record);
    response = store.deleteRecord('test', record.id);
    equal(response, true, 'deleteRecord did not return true when deleting record');
    equal(store.getRecord('test', '4567'), false, 'getRecord did not return false for a missing record');
  });

  test('reset removes all records and keys from existing data store', function() {
    expect(2);
    store.createRecord('test', 1, { body: 'body 1' });
    store.createRecord('other', 1, { body: 'body 2' });
    store.reset();
    equal(store.getRecord('test', 1), false, 'The reset store still returned a record');
    equal(store.getRecord('other', 1), false, 'The reset store still returned a record');
  });
}());

