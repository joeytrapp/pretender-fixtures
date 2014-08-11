(function(undefined){
/**
 * Minimal Event interface implementation
 *
 * Original implementation by Sven Fuchs: https://gist.github.com/995028
 * Modifications and tests by Christian Johansen.
 *
 * @author Sven Fuchs (svenfuchs@artweb-design.de)
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2011 Sven Fuchs, Christian Johansen
 */

var _Event = function Event(type, bubbles, cancelable, target) {
  this.type = type;
  this.bubbles = bubbles;
  this.cancelable = cancelable;
  this.target = target;
};

_Event.prototype = {
  stopPropagation: function () {},
  preventDefault: function () {
    this.defaultPrevented = true;
  }
};

/*
  Used to set the statusText property of an xhr object
*/
var httpStatusCodes = {
  100: "Continue",
  101: "Switching Protocols",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  300: "Multiple Choice",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Request Entity Too Large",
  414: "Request-URI Too Long",
  415: "Unsupported Media Type",
  416: "Requested Range Not Satisfiable",
  417: "Expectation Failed",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported"
};


/*
  Cross-browser XML parsing. Used to turn
  XML responses into Document objects
  Borrowed from JSpec
*/
function parseXML(text) {
  var xmlDoc;

  if (typeof DOMParser != "undefined") {
    var parser = new DOMParser();
    xmlDoc = parser.parseFromString(text, "text/xml");
  } else {
    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
    xmlDoc.async = "false";
    xmlDoc.loadXML(text);
  }

  return xmlDoc;
}

/*
  Without mocking, the native XMLHttpRequest object will throw
  an error when attempting to set these headers. We match this behavior.
*/
var unsafeHeaders = {
  "Accept-Charset": true,
  "Accept-Encoding": true,
  "Connection": true,
  "Content-Length": true,
  "Cookie": true,
  "Cookie2": true,
  "Content-Transfer-Encoding": true,
  "Date": true,
  "Expect": true,
  "Host": true,
  "Keep-Alive": true,
  "Referer": true,
  "TE": true,
  "Trailer": true,
  "Transfer-Encoding": true,
  "Upgrade": true,
  "User-Agent": true,
  "Via": true
};

/*
  Adds an "event" onto the fake xhr object
  that just calls the same-named method. This is
  in case a library adds callbacks for these events.
*/
function _addEventListener(eventName, xhr){
  xhr.addEventListener(eventName, function (event) {
    var listener = xhr["on" + eventName];

    if (listener && typeof listener == "function") {
      listener(event);
    }
  });
}

/*
  Constructor for a fake window.XMLHttpRequest
*/
function FakeXMLHttpRequest() {
  this.readyState = FakeXMLHttpRequest.UNSENT;
  this.requestHeaders = {};
  this.requestBody = null;
  this.status = 0;
  this.statusText = "";

  this._eventListeners = {};
  var events = ["loadstart", "load", "abort", "loadend"];
  for (var i = events.length - 1; i >= 0; i--) {
    _addEventListener(events[i], this);
  }
}


// These status codes are available on the native XMLHttpRequest
// object, so we match that here in case a library is relying on them.
FakeXMLHttpRequest.UNSENT = 0;
FakeXMLHttpRequest.OPENED = 1;
FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
FakeXMLHttpRequest.LOADING = 3;
FakeXMLHttpRequest.DONE = 4;

FakeXMLHttpRequest.prototype = {
  UNSENT: 0,
  OPENED: 1,
  HEADERS_RECEIVED: 2,
  LOADING: 3,
  DONE: 4,
  async: true,

  /*
    Duplicates the behavior of native XMLHttpRequest's open function
  */
  open: function open(method, url, async, username, password) {
    this.method = method;
    this.url = url;
    this.async = typeof async == "boolean" ? async : true;
    this.username = username;
    this.password = password;
    this.responseText = null;
    this.responseXML = null;
    this.requestHeaders = {};
    this.sendFlag = false;
    this._readyStateChange(FakeXMLHttpRequest.OPENED);
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's addEventListener function
  */
  addEventListener: function addEventListener(event, listener) {
    this._eventListeners[event] = this._eventListeners[event] || [];
    this._eventListeners[event].push(listener);
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's removeEventListener function
  */
  removeEventListener: function removeEventListener(event, listener) {
    var listeners = this._eventListeners[event] || [];

    for (var i = 0, l = listeners.length; i < l; ++i) {
      if (listeners[i] == listener) {
        return listeners.splice(i, 1);
      }
    }
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
  */
  dispatchEvent: function dispatchEvent(event) {
    var type = event.type;
    var listeners = this._eventListeners[type] || [];

    for (var i = 0; i < listeners.length; i++) {
      if (typeof listeners[i] == "function") {
        listeners[i].call(this, event);
      } else {
        listeners[i].handleEvent(event);
      }
    }

    return !!event.defaultPrevented;
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
  */
  setRequestHeader: function setRequestHeader(header, value) {
    verifyState(this);

    if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
      throw new Error("Refused to set unsafe header \"" + header + "\"");
    }

    if (this.requestHeaders[header]) {
      this.requestHeaders[header] += "," + value;
    } else {
      this.requestHeaders[header] = value;
    }
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's send function
  */
  send: function send(data) {
    verifyState(this);

    if (!/^(get|head)$/i.test(this.method)) {
      if (this.requestHeaders["Content-Type"]) {
        var value = this.requestHeaders["Content-Type"].split(";");
        this.requestHeaders["Content-Type"] = value[0] + ";charset=utf-8";
      } else {
        this.requestHeaders["Content-Type"] = "text/plain;charset=utf-8";
      }

      this.requestBody = data;
    }

    this.errorFlag = false;
    this.sendFlag = this.async;
    this._readyStateChange(FakeXMLHttpRequest.OPENED);

    if (typeof this.onSend == "function") {
      this.onSend(this);
    }

    this.dispatchEvent(new _Event("loadstart", false, false, this));
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's abort function
  */
  abort: function abort() {
    this.aborted = true;
    this.responseText = null;
    this.errorFlag = true;
    this.requestHeaders = {};

    if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
      this._readyStateChange(FakeXMLHttpRequest.DONE);
      this.sendFlag = false;
    }

    this.readyState = FakeXMLHttpRequest.UNSENT;

    this.dispatchEvent(new _Event("abort", false, false, this));
    if (typeof this.onerror === "function") {
        this.onerror();
    }
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
  */
  getResponseHeader: function getResponseHeader(header) {
    if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
      return null;
    }

    if (/^Set-Cookie2?$/i.test(header)) {
      return null;
    }

    header = header.toLowerCase();

    for (var h in this.responseHeaders) {
      if (h.toLowerCase() == header) {
        return this.responseHeaders[h];
      }
    }

    return null;
  },

  /*
    Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
  */
  getAllResponseHeaders: function getAllResponseHeaders() {
    if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
      return "";
    }

    var headers = "";

    for (var header in this.responseHeaders) {
      if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
        headers += header + ": " + this.responseHeaders[header] + "\r\n";
      }
    }

    return headers;
  },

  /*
    Places a FakeXMLHttpRequest object into the passed
    state.
  */
  _readyStateChange: function _readyStateChange(state) {
    this.readyState = state;

    if (typeof this.onreadystatechange == "function") {
      this.onreadystatechange();
    }

    this.dispatchEvent(new _Event("readystatechange"));

    if (this.readyState == FakeXMLHttpRequest.DONE) {
      this.dispatchEvent(new _Event("load", false, false, this));
      this.dispatchEvent(new _Event("loadend", false, false, this));
    }
  },


  /*
    Sets the FakeXMLHttpRequest object's response headers and
    places the object into readyState 2
  */
  _setResponseHeaders: function _setResponseHeaders(headers) {
    this.responseHeaders = {};

    for (var header in headers) {
      if (headers.hasOwnProperty(header)) {
          this.responseHeaders[header] = headers[header];
      }
    }

    if (this.async) {
      this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
    } else {
      this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
    }
  },



  /*
    Sets the FakeXMLHttpRequest object's response body and
    if body text is XML, sets responseXML to parsed document
    object
  */
  _setResponseBody: function _setResponseBody(body) {
    verifyRequestSent(this);
    verifyHeadersReceived(this);
    verifyResponseBodyType(body);

    var chunkSize = this.chunkSize || 10;
    var index = 0;
    this.responseText = "";

    do {
      if (this.async) {
        this._readyStateChange(FakeXMLHttpRequest.LOADING);
      }

      this.responseText += body.substring(index, index + chunkSize);
      index += chunkSize;
    } while (index < body.length);

    var type = this.getResponseHeader("Content-Type");

    if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
      try {
        this.responseXML = parseXML(this.responseText);
      } catch (e) {
        // Unable to parse XML - no biggie
      }
    }

    if (this.async) {
      this._readyStateChange(FakeXMLHttpRequest.DONE);
    } else {
      this.readyState = FakeXMLHttpRequest.DONE;
    }
  },

  /*
    Forces a response on to the FakeXMLHttpRequest object.

    This is the public API for faking responses. This function
    takes a number status, headers object, and string body:

    ```
    xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")

    ```
  */
  respond: function respond(status, headers, body) {
    this._setResponseHeaders(headers || {});
    this.status = typeof status == "number" ? status : 200;
    this.statusText = httpStatusCodes[this.status];
    this._setResponseBody(body || "");
    if (typeof this.onload === "function"){
      this.onload();
    }
  }
};

function verifyState(xhr) {
  if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
    throw new Error("INVALID_STATE_ERR");
  }

  if (xhr.sendFlag) {
    throw new Error("INVALID_STATE_ERR");
  }
}


function verifyRequestSent(xhr) {
    if (xhr.readyState == FakeXMLHttpRequest.DONE) {
        throw new Error("Request done");
    }
}

function verifyHeadersReceived(xhr) {
    if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
        throw new Error("No headers received");
    }
}

function verifyResponseBodyType(body) {
    if (typeof body != "string") {
        var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                             body + ", which is not a string.");
        error.name = "InvalidBodyException";
        throw error;
    }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FakeXMLHttpRequest;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return FakeXMLHttpRequest; });
} else if (typeof window !== 'undefined') {
  window.FakeXMLHttpRequest = FakeXMLHttpRequest;
} else if (this) {
  this.FakeXMLHttpRequest = FakeXMLHttpRequest;
}
})();

(function(__exports__) {
  "use strict";
  var specials = [
    '/', '.', '*', '+', '?', '|',
    '(', ')', '[', ']', '{', '}', '\\'
  ];

  var escapeRegex = new RegExp('(\\' + specials.join('|\\') + ')', 'g');

  function isArray(test) {
    return Object.prototype.toString.call(test) === "[object Array]";
  }

  // A Segment represents a segment in the original route description.
  // Each Segment type provides an `eachChar` and `regex` method.
  //
  // The `eachChar` method invokes the callback with one or more character
  // specifications. A character specification consumes one or more input
  // characters.
  //
  // The `regex` method returns a regex fragment for the segment. If the
  // segment is a dynamic of star segment, the regex fragment also includes
  // a capture.
  //
  // A character specification contains:
  //
  // * `validChars`: a String with a list of all valid characters, or
  // * `invalidChars`: a String with a list of all invalid characters
  // * `repeat`: true if the character specification can repeat

  function StaticSegment(string) { this.string = string; }
  StaticSegment.prototype = {
    eachChar: function(callback) {
      var string = this.string, ch;

      for (var i=0, l=string.length; i<l; i++) {
        ch = string.charAt(i);
        callback({ validChars: ch });
      }
    },

    regex: function() {
      return this.string.replace(escapeRegex, '\\$1');
    },

    generate: function() {
      return this.string;
    }
  };

  function DynamicSegment(name) { this.name = name; }
  DynamicSegment.prototype = {
    eachChar: function(callback) {
      callback({ invalidChars: "/", repeat: true });
    },

    regex: function() {
      return "([^/]+)";
    },

    generate: function(params) {
      return params[this.name];
    }
  };

  function StarSegment(name) { this.name = name; }
  StarSegment.prototype = {
    eachChar: function(callback) {
      callback({ invalidChars: "", repeat: true });
    },

    regex: function() {
      return "(.+)";
    },

    generate: function(params) {
      return params[this.name];
    }
  };

  function EpsilonSegment() {}
  EpsilonSegment.prototype = {
    eachChar: function() {},
    regex: function() { return ""; },
    generate: function() { return ""; }
  };

  function parse(route, names, types) {
    // normalize route as not starting with a "/". Recognition will
    // also normalize.
    if (route.charAt(0) === "/") { route = route.substr(1); }

    var segments = route.split("/"), results = [];

    for (var i=0, l=segments.length; i<l; i++) {
      var segment = segments[i], match;

      if (match = segment.match(/^:([^\/]+)$/)) {
        results.push(new DynamicSegment(match[1]));
        names.push(match[1]);
        types.dynamics++;
      } else if (match = segment.match(/^\*([^\/]+)$/)) {
        results.push(new StarSegment(match[1]));
        names.push(match[1]);
        types.stars++;
      } else if(segment === "") {
        results.push(new EpsilonSegment());
      } else {
        results.push(new StaticSegment(segment));
        types.statics++;
      }
    }

    return results;
  }

  // A State has a character specification and (`charSpec`) and a list of possible
  // subsequent states (`nextStates`).
  //
  // If a State is an accepting state, it will also have several additional
  // properties:
  //
  // * `regex`: A regular expression that is used to extract parameters from paths
  //   that reached this accepting state.
  // * `handlers`: Information on how to convert the list of captures into calls
  //   to registered handlers with the specified parameters
  // * `types`: How many static, dynamic or star segments in this route. Used to
  //   decide which route to use if multiple registered routes match a path.
  //
  // Currently, State is implemented naively by looping over `nextStates` and
  // comparing a character specification against a character. A more efficient
  // implementation would use a hash of keys pointing at one or more next states.

  function State(charSpec) {
    this.charSpec = charSpec;
    this.nextStates = [];
  }

  State.prototype = {
    get: function(charSpec) {
      var nextStates = this.nextStates;

      for (var i=0, l=nextStates.length; i<l; i++) {
        var child = nextStates[i];

        var isEqual = child.charSpec.validChars === charSpec.validChars;
        isEqual = isEqual && child.charSpec.invalidChars === charSpec.invalidChars;

        if (isEqual) { return child; }
      }
    },

    put: function(charSpec) {
      var state;

      // If the character specification already exists in a child of the current
      // state, just return that state.
      if (state = this.get(charSpec)) { return state; }

      // Make a new state for the character spec
      state = new State(charSpec);

      // Insert the new state as a child of the current state
      this.nextStates.push(state);

      // If this character specification repeats, insert the new state as a child
      // of itself. Note that this will not trigger an infinite loop because each
      // transition during recognition consumes a character.
      if (charSpec.repeat) {
        state.nextStates.push(state);
      }

      // Return the new state
      return state;
    },

    // Find a list of child states matching the next character
    match: function(ch) {
      // DEBUG "Processing `" + ch + "`:"
      var nextStates = this.nextStates,
          child, charSpec, chars;

      // DEBUG "  " + debugState(this)
      var returned = [];

      for (var i=0, l=nextStates.length; i<l; i++) {
        child = nextStates[i];

        charSpec = child.charSpec;

        if (typeof (chars = charSpec.validChars) !== 'undefined') {
          if (chars.indexOf(ch) !== -1) { returned.push(child); }
        } else if (typeof (chars = charSpec.invalidChars) !== 'undefined') {
          if (chars.indexOf(ch) === -1) { returned.push(child); }
        }
      }

      return returned;
    }

    /** IF DEBUG
    , debug: function() {
      var charSpec = this.charSpec,
          debug = "[",
          chars = charSpec.validChars || charSpec.invalidChars;

      if (charSpec.invalidChars) { debug += "^"; }
      debug += chars;
      debug += "]";

      if (charSpec.repeat) { debug += "+"; }

      return debug;
    }
    END IF **/
  };

  /** IF DEBUG
  function debug(log) {
    console.log(log);
  }

  function debugState(state) {
    return state.nextStates.map(function(n) {
      if (n.nextStates.length === 0) { return "( " + n.debug() + " [accepting] )"; }
      return "( " + n.debug() + " <then> " + n.nextStates.map(function(s) { return s.debug() }).join(" or ") + " )";
    }).join(", ")
  }
  END IF **/

  // This is a somewhat naive strategy, but should work in a lot of cases
  // A better strategy would properly resolve /posts/:id/new and /posts/edit/:id.
  //
  // This strategy generally prefers more static and less dynamic matching.
  // Specifically, it
  //
  //  * prefers fewer stars to more, then
  //  * prefers using stars for less of the match to more, then
  //  * prefers fewer dynamic segments to more, then
  //  * prefers more static segments to more
  function sortSolutions(states) {
    return states.sort(function(a, b) {
      if (a.types.stars !== b.types.stars) { return a.types.stars - b.types.stars; }

      if (a.types.stars) {
        if (a.types.statics !== b.types.statics) { return b.types.statics - a.types.statics; }
        if (a.types.dynamics !== b.types.dynamics) { return b.types.dynamics - a.types.dynamics; }
      }

      if (a.types.dynamics !== b.types.dynamics) { return a.types.dynamics - b.types.dynamics; }
      if (a.types.statics !== b.types.statics) { return b.types.statics - a.types.statics; }

      return 0;
    });
  }

  function recognizeChar(states, ch) {
    var nextStates = [];

    for (var i=0, l=states.length; i<l; i++) {
      var state = states[i];

      nextStates = nextStates.concat(state.match(ch));
    }

    return nextStates;
  }

  var oCreate = Object.create || function(proto) {
    function F() {}
    F.prototype = proto;
    return new F();
  };

  function RecognizeResults(queryParams) {
    this.queryParams = queryParams || {};
  }
  RecognizeResults.prototype = oCreate({
    splice: Array.prototype.splice,
    slice:  Array.prototype.slice,
    push:   Array.prototype.push,
    length: 0,
    queryParams: null
  });

  function findHandler(state, path, queryParams) {
    var handlers = state.handlers, regex = state.regex;
    var captures = path.match(regex), currentCapture = 1;
    var result = new RecognizeResults(queryParams);

    for (var i=0, l=handlers.length; i<l; i++) {
      var handler = handlers[i], names = handler.names, params = {};

      for (var j=0, m=names.length; j<m; j++) {
        params[names[j]] = captures[currentCapture++];
      }

      result.push({ handler: handler.handler, params: params, isDynamic: !!names.length });
    }

    return result;
  }

  function addSegment(currentState, segment) {
    segment.eachChar(function(ch) {
      var state;

      currentState = currentState.put(ch);
    });

    return currentState;
  }

  // The main interface

  var RouteRecognizer = function() {
    this.rootState = new State();
    this.names = {};
  };


  RouteRecognizer.prototype = {
    add: function(routes, options) {
      var currentState = this.rootState, regex = "^",
          types = { statics: 0, dynamics: 0, stars: 0 },
          handlers = [], allSegments = [], name;

      var isEmpty = true;

      for (var i=0, l=routes.length; i<l; i++) {
        var route = routes[i], names = [];

        var segments = parse(route.path, names, types);

        allSegments = allSegments.concat(segments);

        for (var j=0, m=segments.length; j<m; j++) {
          var segment = segments[j];

          if (segment instanceof EpsilonSegment) { continue; }

          isEmpty = false;

          // Add a "/" for the new segment
          currentState = currentState.put({ validChars: "/" });
          regex += "/";

          // Add a representation of the segment to the NFA and regex
          currentState = addSegment(currentState, segment);
          regex += segment.regex();
        }

        var handler = { handler: route.handler, names: names };
        handlers.push(handler);
      }

      if (isEmpty) {
        currentState = currentState.put({ validChars: "/" });
        regex += "/";
      }

      currentState.handlers = handlers;
      currentState.regex = new RegExp(regex + "$");
      currentState.types = types;

      if (name = options && options.as) {
        this.names[name] = {
          segments: allSegments,
          handlers: handlers
        };
      }
    },

    handlersFor: function(name) {
      var route = this.names[name], result = [];
      if (!route) { throw new Error("There is no route named " + name); }

      for (var i=0, l=route.handlers.length; i<l; i++) {
        result.push(route.handlers[i]);
      }

      return result;
    },

    hasRoute: function(name) {
      return !!this.names[name];
    },

    generate: function(name, params) {
      var route = this.names[name], output = "";
      if (!route) { throw new Error("There is no route named " + name); }

      var segments = route.segments;

      for (var i=0, l=segments.length; i<l; i++) {
        var segment = segments[i];

        if (segment instanceof EpsilonSegment) { continue; }

        output += "/";
        output += segment.generate(params);
      }

      if (output.charAt(0) !== '/') { output = '/' + output; }

      if (params && params.queryParams) {
        output += this.generateQueryString(params.queryParams, route.handlers);
      }

      return output;
    },

    generateQueryString: function(params, handlers) {
      var pairs = [];
      var keys = [];
      for(var key in params) {
        if (params.hasOwnProperty(key)) {
          keys.push(key);
        }
      }
      keys.sort();
      for (var i = 0, len = keys.length; i < len; i++) {
        key = keys[i];
        var value = params[key];
        if (value == null) {
          continue;
        }
        var pair = key;
        if (isArray(value)) {
          for (var j = 0, l = value.length; j < l; j++) {
            var arrayPair = key + '[]' + '=' + encodeURIComponent(value[j]);
            pairs.push(arrayPair);
          }
        } else {
          pair += "=" + encodeURIComponent(value);
          pairs.push(pair);
        }
      }

      if (pairs.length === 0) { return ''; }

      return "?" + pairs.join("&");
    },

    parseQueryString: function(queryString) {
      var pairs = queryString.split("&"), queryParams = {};
      for(var i=0; i < pairs.length; i++) {
        var pair      = pairs[i].split('='),
            key       = decodeURIComponent(pair[0]),
            keyLength = key.length,
            isArray = false,
            value;
        if (pair.length === 1) {
          value = 'true';
        } else {
          //Handle arrays
          if (keyLength > 2 && key.slice(keyLength -2) === '[]') {
            isArray = true;
            key = key.slice(0, keyLength - 2);
            if(!queryParams[key]) {
              queryParams[key] = [];
            }
          }
          value = pair[1] ? decodeURIComponent(pair[1]) : '';
        }
        if (isArray) {
          queryParams[key].push(value);
        } else {
          queryParams[key] = decodeURIComponent(value);
        }
      }
      return queryParams;
    },

    recognize: function(path) {
      var states = [ this.rootState ],
          pathLen, i, l, queryStart, queryParams = {},
          isSlashDropped = false;

      path = decodeURI(path);

      queryStart = path.indexOf('?');
      if (queryStart !== -1) {
        var queryString = path.substr(queryStart + 1, path.length);
        path = path.substr(0, queryStart);
        queryParams = this.parseQueryString(queryString);
      }

      // DEBUG GROUP path

      if (path.charAt(0) !== "/") { path = "/" + path; }

      pathLen = path.length;
      if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
        path = path.substr(0, pathLen - 1);
        isSlashDropped = true;
      }

      for (i=0, l=path.length; i<l; i++) {
        states = recognizeChar(states, path.charAt(i));
        if (!states.length) { break; }
      }

      // END DEBUG GROUP

      var solutions = [];
      for (i=0, l=states.length; i<l; i++) {
        if (states[i].handlers) { solutions.push(states[i]); }
      }

      states = sortSolutions(solutions);

      var state = solutions[0];

      if (state && state.handlers) {
        // if a trailing slash was dropped and a star segment is the last segment
        // specified, put the trailing slash back
        if (isSlashDropped && state.regex.source.slice(-5) === "(.+)$") {
          path = path + "/";
        }
        return findHandler(state, path, queryParams);
      }
    }
  };

  __exports__.RouteRecognizer = RouteRecognizer;

  function Target(path, matcher, delegate) {
    this.path = path;
    this.matcher = matcher;
    this.delegate = delegate;
  }

  Target.prototype = {
    to: function(target, callback) {
      var delegate = this.delegate;

      if (delegate && delegate.willAddRoute) {
        target = delegate.willAddRoute(this.matcher.target, target);
      }

      this.matcher.add(this.path, target);

      if (callback) {
        if (callback.length === 0) { throw new Error("You must have an argument in the function passed to `to`"); }
        this.matcher.addChild(this.path, target, callback, this.delegate);
      }
      return this;
    }
  };

  function Matcher(target) {
    this.routes = {};
    this.children = {};
    this.target = target;
  }

  Matcher.prototype = {
    add: function(path, handler) {
      this.routes[path] = handler;
    },

    addChild: function(path, target, callback, delegate) {
      var matcher = new Matcher(target);
      this.children[path] = matcher;

      var match = generateMatch(path, matcher, delegate);

      if (delegate && delegate.contextEntered) {
        delegate.contextEntered(target, match);
      }

      callback(match);
    }
  };

  function generateMatch(startingPath, matcher, delegate) {
    return function(path, nestedCallback) {
      var fullPath = startingPath + path;

      if (nestedCallback) {
        nestedCallback(generateMatch(fullPath, matcher, delegate));
      } else {
        return new Target(startingPath + path, matcher, delegate);
      }
    };
  }

  function addRoute(routeArray, path, handler) {
    var len = 0;
    for (var i=0, l=routeArray.length; i<l; i++) {
      len += routeArray[i].path.length;
    }

    path = path.substr(len);
    var route = { path: path, handler: handler };
    routeArray.push(route);
  }

  function eachRoute(baseRoute, matcher, callback, binding) {
    var routes = matcher.routes;

    for (var path in routes) {
      if (routes.hasOwnProperty(path)) {
        var routeArray = baseRoute.slice();
        addRoute(routeArray, path, routes[path]);

        if (matcher.children[path]) {
          eachRoute(routeArray, matcher.children[path], callback, binding);
        } else {
          callback.call(binding, routeArray);
        }
      }
    }
  }

  RouteRecognizer.prototype.map = function(callback, addRouteCallback) {
    var matcher = new Matcher();

    callback(generateMatch("", matcher, this.delegate));

    eachRoute([], matcher, function(route) {
      if (addRouteCallback) { addRouteCallback(this, route); }
      else { this.add(route); }
    }, this);
  };
})(window);

var isNode = typeof process !== 'undefined' && process.toString() === '[object process]';
var RouteRecognizer = isNode ? require('route-recognizer') : window.RouteRecognizer;
var FakeXMLHttpRequest = isNode ? require('./bower_components/FakeXMLHttpRequest/fake_xml_http_request') : window.FakeXMLHttpRequest;
var forEach = [].forEach;

function Pretender(maps){
  maps = maps || function(){};
  // Herein we keep track of RouteRecognizer instances
  // keyed by HTTP method. Feel free to add more as needed.
  this.registry = {
    GET: new RouteRecognizer(),
    PUT: new RouteRecognizer(),
    POST: new RouteRecognizer(),
    DELETE: new RouteRecognizer(),
    PATCH: new RouteRecognizer(),
    HEAD: new RouteRecognizer()
  };

  this.handlers = [];
  this.handledRequests = [];
  this.unhandledRequests = [];

  // reference the native XMLHttpRequest object so
  // it can be restored later
  this._nativeXMLHttpRequest = window.XMLHttpRequest;

  // capture xhr requests, channeling them into
  // the route map.
  window.XMLHttpRequest = interceptor(this);

  // trigger the route map DSL.
  maps.call(this);
}

function interceptor(pretender) {
  function FakeRequest(){
    // super()
    FakeXMLHttpRequest.call(this);
  }
  // extend
  var proto = new FakeXMLHttpRequest();
  proto.send = function send(){
    FakeXMLHttpRequest.prototype.send.apply(this, arguments);
    pretender.handleRequest(this);
  };

  FakeRequest.prototype = proto;
  return FakeRequest;
}

function verbify(verb){
  return function(path, handler){
    this.register(verb, path, handler);
  };
}

Pretender.prototype = {
  get: verbify('GET'),
  post: verbify('POST'),
  put: verbify('PUT'),
  'delete': verbify('DELETE'),
  patch: verbify('PATCH'),
  head: verbify('HEAD'),
  register: function register(verb, path, handler){
    handler.numberOfCalls = 0;
    this.handlers.push(handler);

    var registry = this.registry[verb];
    registry.add([{path: path, handler: handler}]);
  },
  handleRequest: function handleRequest(request){
    var verb = request.method.toUpperCase();
    var path = request.url;
    var handler = this._handlerFor(verb, path, request);

    if (handler) {
      handler.handler.numberOfCalls++;
      this.handledRequests.push(request);
      this.handledRequest(verb, path, request);


      try {
        var statusHeadersAndBody = handler.handler(request),
            status = statusHeadersAndBody[0],
            headers = statusHeadersAndBody[1],
            body = this.prepareBody(statusHeadersAndBody[2]);

        request.respond(status, headers, body);
      } catch (error) {
        this.erroredRequest(verb, path, request, error);
      }
    } else {
      this.unhandledRequests.push(request);
      this.unhandledRequest(verb, path, request);
    }
  },
  prepareBody: function(body){ return body; },
  handledRequest: function(verb, path, request){/* no-op */},
  unhandledRequest: function(verb, path, request) {
    throw new Error("Pretender intercepted "+verb+" "+path+" but no handler was defined for this type of request");
  },
  erroredRequest: function(verb, path, request, error){
    error.message = "Pretender intercepted "+verb+" "+path+" but encountered an error: " + error.message;
    throw error;
  },
  _handlerFor: function(verb, path, request){
    var registry = this.registry[verb];
    var matches = registry.recognize(path);

    var match = matches ? matches[0] : null;
    if (match) {
      request.params = match.params;
      request.queryParams = matches.queryParams;
    }

    return match;
  },
  shutdown: function shutdown(){
    window.XMLHttpRequest = this._nativeXMLHttpRequest;
  }
};

if (isNode) {
  module.exports = Pretender;
}

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
      id = key;
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
  var server = this.agent.server(), router = this, segment = false, bits;
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
      id = request.params[segment.slice(1)];
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
  var server = this.agent.server(), router = this, segment = false, bits;
  bits = this._parseKey(key, route);
  key = bits[0];
  segment = bits[1];

  server.post(route, function(request) {
    var code = 200,
        headers = { "Content-Type": "application/json" },
        body = {},
        data = agent.get(key),
        id = false;
    if (segment) {
      id = request.params[segment];
    }
    return [code, headers, JSON.stringify(body)];
  });
};
