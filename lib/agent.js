/**
 * Agent
 *
 * Library for building fixture data to be returned by a
 * Pretender server running in the client.
 */
Agent = function(defaults) {
  var d = defaults || {}, storeConst, i;
  this.fixtureIds = {};
  this.groups = [];
  this.useUUID = true;
  this.router = new Agent.Router(this);
  this._server = null;
  if (d.store) {
    if (typeof d.store === 'function') {
      this.store = new d.store();
    } else if (typeof d.store === 'string' && Agent[d.store]) {
      this.store = new Agent[d.store]();
    } else {
      this.store = new Agent.MemoryStore();
    }
    delete d.store;
  } else {
    this.store = new Agent.MemoryStore();
  }
  if (typeof d=== 'object') {
    for (i in d) {
      if (d.hasOwnProperty(i)) {
        this[i] = d[i];
      }
    }
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
  if (!this._server) {
    if (typeof cb === 'function') {
      this._server = new Pretender(function() {
        cb.call(this, agent);
      });
    } else {
      this._server = new Pretender();
    }
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
  return obj;
};

Agent.prototype.getIds = function(key) {
  return this.fixtureIds[Agent.nk(key)] || {};
};

Agent.prototype.group = function(key, callback) {
  this.groups.push(new Agent.FixtureGroup(Agent.nk(key), callback));
  return this;
};

Agent.prototype.build = function() {
  var i, j, len, key, records;
  for (i = 0, len = this.groups.length; i < len; i++) {
    key = Agent.nk(this.groups[i].key);
    records = this.groups[i].records();
    for (j in records) {
      if (records.hasOwnProperty(j)) {
        this.store.createRecord(key, j, records[j]);
      }
    }
  }
  return this;
};

Agent.prototype.reset = function() {
  this.groups.forEach(function(g) { return g.reset(); });
  this.store.reset();
};

Agent.prototype.rebuild = function() {
  this.reset();
  this.build();
};

Agent.prototype.fixtures = Agent.prototype.get = function(key) {
  return this.store.get(Agent.nk(key));
};

Agent.prototype.getRecord = function(key, id) {
  return this.store.getRecord(key, id);
};

Agent.prototype.createRecord = function(key, data) {
  var records = this.store.get(key), id;
  if (data.id) {
    id = data.id;
  } else {
    if (this.useUUID) {
      id = this.uuid();
    } else {
      id = Object.keys(data).length;
    }
  }
  data.id = id;
  return this.store.createRecord(key, id, data);
};

Agent.prototype.updateRecord = function(key, id, data) {
  return this.store.updateRecord(key, id, data);
};

Agent.prototype.replaceRecord = function(key, id, data) {
  return this.store.replaceRecord(key, id, data);
};

Agent.prototype.deleteRecord = function(key, id) {
  return this.store.deleteRecord(key, id);
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


/**
 * Agent.Store
 *
 * Base of any store adapter. Stores hold the fixture data, and
 * should be capable of adding, editing, removing records and
 * also resetting to empty.
 */
Agent.Store = function() {};

Agent.Store.prototype._get = function() {
  throw new Error('Implement _get method');
};

Agent.Store.prototype._set = function() {
  throw new Error('Implement _set method');
};

Agent.Store.prototype.get = function(key) {
  throw new Error('Implement get method');
};

Agent.Store.prototype.getRecord = function(key, id) {
  throw new Error('Implement getRecord method');
};

Agent.Store.prototype.createRecord = function(key, id, record) {
  throw new Error('Implement createRecord method');
};

Agent.Store.prototype.updateRecord = function(key, id, data) {
  throw new Error('Implement updateRecord method');
};

Agent.Store.prototype.replaceRecord = function(key, id, record) {
  throw new Error('Implement replaceRecord method');
};

Agent.Store.prototype.deleteRecord = function(key, id) {
  throw new Error('Implement deleteRecord method');
};

Agent.Store.prototype.reset = function() {
  throw new Error('Implement reset method');
};


/**
 * Agent.MemoryStore
 *
 * A store adapter that saves data in memory.
 * Data is not saved between reloads
 */
Agent.MemoryStore = function() {
  this._data = {};
};

Agent.MemoryStore.prototype = Object.create(Agent.Store.prototype);
Agent.MemoryStore.prototype.constructor = Agent.MemoryStore;

Agent.MemoryStore.prototype._get = function() {
  return this._data;
};

Agent.MemoryStore.prototype._set = function(data) {
  this._data = data;
};

Agent.MemoryStore.prototype.get = function(key) {
  var k = Agent.nk(key), data = this._get();
  return data[k] || false;
};

Agent.MemoryStore.prototype.getRecord = function(key, id) {
  var data = this.get(key), ret = false;
  if (data) {
    ret = data['' + id] || false;
  }
  return ret;
};

Agent.MemoryStore.prototype.createRecord = function(key, id, record) {
  if (this.getRecord(key, id)) {
    return false;
  }
  return this.replaceRecord(key, id, record);
};

Agent.MemoryStore.prototype.updateRecord = function(key, id, record) {
  var data = this._get(), k = Agent.nk(key), i, r;
  if (!this.get(key)) {
    return false;
  }
  data[k] = data[k] || {};
  if (!data[k]['' + id]) {
    return false;
  }
  r = data[k]['' + id];
  for (i in record) {
    if (r.hasOwnProperty(i) && record.hasOwnProperty(i)) {
      r[i] = record[i];
    }
  }
  this._set(data);
  return this.getRecord(key, id);
};

Agent.MemoryStore.prototype.replaceRecord = function(key, id, record) {
  var data = this._get(), k = Agent.nk(key);
  data[k] = data[k] || {};
  data[k]['' + id] = record;
  this._set(data);
  return this.getRecord(key, id);
};

Agent.MemoryStore.prototype.deleteRecord = function(key, id) {
  var data = this._get(), k = Agent.nk(key);
  data[k] = data[k] || {};
  if (data[k]['' + id]) {
    delete data[k]['' + id];
  } else {
    return false;
  }
  this._set(data);
  return true;
};

Agent.MemoryStore.prototype.reset = function() {
  this._set({});
};


/**
 * Agent.LocalStorageStore
 *
 * Store adapter that will save data to the browser's localStorage.
 * This data should persist between browser reloads.
 */
Agent.LocalStorageStore = function() {
  if (!window.localStorage) {
    throw new Error('This browser does not support localStorage');
  }
};

Agent.LocalStorageStore.prototype = Object.create(Agent.MemoryStore.prototype);
Agent.LocalStorageStore.prototype.constructor = Agent.LocalStorageStore;

Agent.LocalStorageStore.prototype._get = function() {
  return JSON.parse(localStorage.getItem('Agent.LocalStorageStore')) || {};
};

Agent.LocalStorageStore.prototype._set = function(data) {
  localStorage.setItem('Agent.LocalStorageStore', JSON.stringify(data));
};


/**
 * Agent.Router
 *
 * An instance of this will live on the agent instances. It exposes
 * convenience methods for making conventional rest endpoints with
 * Pretender and will use the agent.store to get and save records.
 */
Agent.Router = function(agent) {
  this.agent = agent;
};

Agent.Router.prototype._parseKey = function(key, route) {
  var bits, id;
  if (!key) {
    bits = route.split('/');
    key = bits[bits.length - 1];
    if (key[0] === ':') {
      id = key.slice(1);
      key = bits[bits.length - 2];
    }
  }
  return [key, id];
};

Agent.Router.prototype._toArray = function(obj) {
  var i, arr = [];
  for (i in obj) {
    if (obj.hasOwnProperty(i)) { arr.push(obj[i]); }
  }
  return arr;
};

Agent.Router.prototype.get = function(route, key) {
  var agent = this.agent,
      server = agent.server(),
      router = this,
      segment = false,
      bits;
  bits = this._parseKey(key, route);
  key = bits[0];
  segment = bits[1];

  server.get(route, function(request) {
    var code = 200,
        headers = { "Content-Type": "application/json" },
        body = {},
        data = agent.get(key),
        id = false;
    if (segment) {
      id = request.params[segment];
    }
    if (!data) {
      code = 404;
    } else {
      if (id !== false) {
        data = agent.getRecord(key, id);
        if (!data) {
          code = 404;
        } else {
          body[key] = [data];
        }
      } else {
        body[key] = router._toArray(data);
      }
    }
    return [code, headers, JSON.stringify(body)];
  });
};

Agent.Router.prototype.post = function(route, key) {
  var agent = this.agent,
      server = agent.server(),
      router = this,
      segment = false,
      bits;
  bits = this._parseKey(key, route);
  key = bits[0];
  segment = bits[1];

  server.post(route, function(request) {
    var code = 200,
        headers = { "Content-Type": "application/json" },
        body = {},
        data = agent.get(key),
        id = false,
        params = {};
    if (segment) {
      id = request.params[segment];
    }
    params = qs.parse(request.requestBody)[key];
    if (!params) {
      code = 400;
    }
    if (data && id) {
      if (agent.getRecord(key, id)) {
        body[key] = agent.updateRecord(key, id, params);
      } else {
        code = 404;
      }
    } else {
      body[key] = agent.createRecord(key, params);
      code = 201;
    }
    return [code, headers, JSON.stringify(body)];
  });
};

Agent.Router.prototype.put = function(route, key) {
  var agent = this.agent,
      server = agent.server(),
      router = this,
      segment = false,
      bits;
  bits = this._parseKey(key, route);
  key = bits[0];
  segment = bits[1];

  server.put(route, function(request) {
    var code = 200,
        headers = { "Content-Type": "application/json" },
        body = {},
        id = false,
        params = {},
        data;
    if (segment) {
      id = request.params[segment];
    }
    params = qs.parse(request.requestBody)[key];
    if (!id || !params) {
      code = 400;
    }
    data = agent.getRecord(key, id);
    if (!data) {
      code = 404;
    }
    if (data && id && params) {
      body[key] = agent.updateRecord(key, id, params);
    }
    return [code, headers, JSON.stringify(body)];
  });
};

Agent.Router.prototype['delete'] = function(route, key) {
  var agent = this.agent,
      server = agent.server(),
      router = this,
      segment = false,
      bits;
  bits = this._parseKey(key, route);
  key = bits[0];
  segment = bits[1];

  server.delete(route, function(request) {
    var code = 200,
        headers = { "Content-Type": "application/json" },
        id = false,
        data;
    if (segment) {
      id = request.params[segment];
    }
    data = agent.getRecord(key, id);
    if (!data) {
      code = 404;
    } else {
      agent.deleteRecord(key, id);
    }
    return [code, headers, '{}'];
  });
};

Agent.Router.prototype.resource = function(key, options) {
  var only, router, routes;
  router = this;
  only = ['index', 'view', 'add', 'edit', 'delete'];
  if (!options) { options = {}; }
  if (options.only) { only = options.only; }
  routes = function(type) {
    switch (type) {
      case 'index':
        router.get('/' + key);
        break;
      case 'view':
        router.get('/' + key + '/:id');
        break;
      case 'add':
        router.post('/' + key);
        break;
      case 'edit':
        router.put('/' + key + '/:id');
        break;
      case 'delete':
        router.delete('/' + key + '/:id');
        break;
    }
  };
  only.forEach(function(o) { routes(o); });
};
