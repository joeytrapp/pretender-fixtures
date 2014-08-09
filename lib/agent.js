/**
 * Agent
 *
 * Library for building fixture data to be returned by a
 * Pretender server running in the client.
 */
Agent = function(defaults) {
  this._fixtures = {};
  this._fixtureIds = {};
  this._groups = [];
  this._server = null;
  this.useUUID = true;
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
  if (this._fixtureIds[key] === undefined) {
    this._fixtureIds[key] = obj;
  } else {
    obj = this._fixtureIds[key];
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
  return this._fixtureIds[Agent.nk(key)] || {};
};

Agent.prototype.group = function(key, callback) {
  this.groups.push(new Agent.FixtureGroup(Agent.nk(key), callback));
  return this;
};

Agent.prototype.fixtures = function(key) {
  return this._fixtures[Agent.nk(key)] || {};
};

Agent.prototype.build = function() {
  this._groups.forEach(function(group) {
    this._fixtures[Agent.nk(group.key)] = group.records();
  }.bind(this));
  return this;
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
  this._callback = callback;
  this._isBuilt = false;
  this._fixtures = [];
};

Agent.FixtureGroup.prototype.fixture = function(id, data) {
  this._fixtures.push(new Agent.Fixture(id, data));
};

Agent.FixtureGroup.prototype.build = function() {
  if (typeof this.callback === 'function') {
    this._callback.call(this, this);
  }
};

Agent.FixtureGroup.prototype.records = function() {
  if (!this._isBuilt) { this.build(); }
  return this._fixtures.reduce(function(accum, fixture) {
    accum[fixture.id] = fixture.record();
  }, {});
};

Agent.FixtureGroup.prototype.reset = function() {
  this._isBuilt = false;
  this._fixtures = [];
};

/**
 * Agent.Fixture
 *
 * An object of data identified by an id. When generating
 * the final object that represents the fixture, the id
 * is injected in if the data does not include the id key
 */
Agent.Fixture = function(id, record) {
  this.id = id;
  this.record = record;
};

Agent.Fixture.prototype.record = function() {
  var data = this.data, id = this.id;
  if (data.id === undefined) {
    data.id = id;
  }
  return data;
};
