/**
 * Agent
 *
 * Library for building fixture data to be returned by a
 * Pretender server running in the client.
 */
Agent = function(defaults) {
  this.fixtures = {};
  this.fixtureIds = {};
  this.groups = [];
  this.useUUID = true;
  this._server = null;
  if (typeof defaults === 'object') {
    Object.keys(defaults).forEach(function(key) {
      this[key] = defaults[key];
    }.bind(this));
  }
  // Setting current instance to the global object so it can
  // be accessed globally to change values that the tests might
  // rely on. See examples.
  Agent.instance = this;
};

Agent.instance = null;

Agent.nk = function(key) { return ('' + key).toUpperCase(); };

Agent.create = function(defaults) {
  return new Agent(defaults);
};

Agent.uuid = Agent.prototype.uuid = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

Agent.prototype.server = function(cb) {
  var agent = this;
  if (!this._server && typeof cb === 'function') {
    this._server = new Pretender(function() {
      cb.call(this, agent);
    });
  }
  return this._server;
};

Agent.prototype.makeIds = function(key, length) {
  var i, obj = {}, id;
  key = Agent.nk(key);
  if (this.fixtureIds[key] === undefined) {
    this.fixtureIds[key] = obj;
  } else {
    obj = this.fixtureIds[key];
  }
  for (i = 0; i < length; i++) {
    id = i + 1;
    if (this.useUUID) {
      id = this.uuid();
    }
    obj[i + 1] = id;
  }
  return this;
};

Agent.prototype.getIds = function(key) {
  return this.fixtureIds[Agent.nk(key)] || {};
};

Agent.prototype.group = function(key, callback) {
  this.groups.push(new Agent.FixtureGroup(Agent.nk(key), callback));
  return this;
};

Agent.prototype.fixtures = function(key) {
  return this.fixtures[Agent.nk(key)] || {};
};

Agent.prototype.build = function() {
  this.groups.forEach(function(group) {
    this.fixtures[Agent.nk(group.key)] = group.records();
  }.bind(this));
  return this;
};

Agent.prototype.rebuild = function() {
  this.fixtures = {};
  this.build();
};

Agent.prototype.addRecord = function(data) {

};

Agent.prototype.updateRecord = function(data) {

};

Agent.prototype.replaceRecord = function(data) {

};

Agent.prototype.deleteRecord = function(data) {

};

/**
 * Agent.FixtureGroup
 *
 * A fixture group is indentified by a key (typically the
 * resource type) holds the callback that will eventually
 * be called to generate fixture records. After building
 * (calling the callback) the records method will return
 * and object keyed by record id of all the fixtures.
 */
Agent.FixtureGroup = function(key, callback) {
  this.key = Agent.nk(key);
  this.callback = callback;
  this.isBuilt = false;
  this.fixtures = [];
};

Agent.FixtureGroup.prototype.fixture = function(id, data) {
};

Agent.FixtureGroup.prototype.build = function() {
  var self = this, obj = {
    fixture: function(id, data) {
      self.fixtures.push(new Agent.Fixture(id, data));
    }
  };
  if (typeof this.callback === 'function') {
    this.callback.call(obj, this);
  }
  this.isBuilt = true;
};

Agent.FixtureGroup.prototype.records = function() {
  if (!this.isBuilt) { this.build(); }
  return this.fixtures.reduce(function(accum, fixture) {
    accum[fixture.id] = fixture.record();
    return accum;
  }, {});
};

Agent.FixtureGroup.prototype.reset = function() {
  this.isBuilt = false;
  this.fixtures = [];
};

/**
 * Agent.Fixture
 *
 * An object of data identified by an id. When generating
 * the final object that represents the fixture, the id
 * is injected in if the data does not include the id key
 */
Agent.Fixture = function(id, data) {
  this.id = id;
  this.data = data;
};

Agent.Fixture.prototype.record = function() {
  var data = this.data, id = this.id;
  if (data.id === undefined) {
    data.id = id;
  }
  return data;
};
