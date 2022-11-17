"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Parser = void 0;
exports.clearCache = clearCache;
exports.dtsParser = void 0;
exports.getParserAsync = getParserAsync;
exports.getParserSync = getParserSync;
exports.jsParser = void 0;
exports.parseAsync = parseAsync;
exports.parseSync = parseSync;
exports.tsxParser = exports.tsParser = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var t = _interopRequireWildcard(require("@babel/types"));

var Path = _interopRequireWildcard(require("path"));

var _resolve2 = _interopRequireDefault(require("resolve"));

var _util = require("util");

var defaultBabelParser = _interopRequireWildcard(require("@babel/parser"));

var _fs = require("fs");

var _excluded = ["encoding"],
    _excluded2 = ["encoding"];

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var readFile = (0, _util.promisify)(_fs.readFile); // eslint-disable-next-line @typescript-eslint/no-explicit-any

function isEmpty(obj) {
  for (var key in obj) {
    return false;
  }

  return true;
}

function pluginName(p) {
  return typeof p === 'string' ? p : p[0];
}

function pluginOpts(p) {
  return typeof p === 'string' ? {} : p[1];
}

function arePluginsEqual(a, b) {
  return pluginName(a) === pluginName(b) && t.shallowEqual(pluginOpts(a), pluginOpts(b));
}

function _mergePlugins(a, b) {
  if (!b) return a;
  if (!a) return b;
  if (b.every(function (bp) {
    return a.find(function (ap) {
      return arePluginsEqual(ap, bp);
    });
  })) return a; // eslint-disable-next-line @typescript-eslint/no-explicit-any

  var map = new Map( // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a.map(function (p) {
    return Array.isArray(p) ? p : [p, undefined];
  }));

  var _iterator = _createForOfIteratorHelper(b),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var p = _step.value;
      if (Array.isArray(p)) map.set(p[0], _objectSpread(_objectSpread({}, map.get(p[0])), p[1]));else if (!map.has(p)) map.set(p, map.get(p));
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return (0, _toConsumableArray2["default"])(map.entries()).map( // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function (e) {
    return e[1] === undefined ? e[0] : e;
  } // eslint-disable-next-line @typescript-eslint/no-explicit-any
  );
}

function _removePlugins(a, b) {
  if (!b.some(function (plugin) {
    return a === null || a === void 0 ? void 0 : a.some(function (p) {
      return pluginName(p) === plugin;
    });
  })) {
    return a;
  }

  return a === null || a === void 0 ? void 0 : a.filter(function (p) {
    return !b.includes(pluginName(p));
  });
}

var Parser = /*#__PURE__*/function () {
  function Parser(babelParser, parserOpts) {
    (0, _classCallCheck2["default"])(this, Parser);
    (0, _defineProperty2["default"])(this, "babelParser", void 0);
    (0, _defineProperty2["default"])(this, "parserOpts", void 0);
    (0, _defineProperty2["default"])(this, "_forJs", void 0);
    (0, _defineProperty2["default"])(this, "_forTs", void 0);
    (0, _defineProperty2["default"])(this, "_forTsx", void 0);
    (0, _defineProperty2["default"])(this, "_forDts", void 0);
    this.babelParser = babelParser;
    this.parserOpts = parserOpts;
  }

  (0, _createClass2["default"])(Parser, [{
    key: "parse",
    value: function parse(code, parserOpts) {
      return parserOpts ? this.bindParserOpts(parserOpts).parse(code) : this.babelParser.parse(code, this.parserOpts);
    }
  }, {
    key: "parseExpression",
    value: function parseExpression(code, parserOpts) {
      return parserOpts ? this.bindParserOpts(parserOpts).parseExpression(code) : this.babelParser.parseExpression(code, this.parserOpts);
    }
  }, {
    key: "bindParserOpts",
    value: function bindParserOpts(parserOpts) {
      return new Parser(this.babelParser, _objectSpread(_objectSpread(_objectSpread({}, this.parserOpts), parserOpts), {}, {
        plugins: _mergePlugins(this.parserOpts.plugins, parserOpts.plugins)
      }));
    }
  }, {
    key: "mergePlugins",
    value: function mergePlugins() {
      for (var _len = arguments.length, plugins = new Array(_len), _key = 0; _key < _len; _key++) {
        plugins[_key] = arguments[_key];
      }

      var merged = _mergePlugins(this.parserOpts.plugins, plugins);

      return merged === this.parserOpts.plugins ? this : new Parser(this.babelParser, _objectSpread(_objectSpread({}, this.parserOpts), {}, {
        plugins: merged
      }));
    }
  }, {
    key: "removePlugins",
    value: function removePlugins() {
      for (var _len2 = arguments.length, plugins = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        plugins[_key2] = arguments[_key2];
      }

      var removed = _removePlugins(this.parserOpts.plugins, plugins);

      return removed === this.parserOpts.plugins ? this : new Parser(this.babelParser, _objectSpread(_objectSpread({}, this.parserOpts), {}, {
        plugins: removed
      }));
    }
  }, {
    key: "forJs",
    get: function get() {
      var _this = this;

      return this._forJs || (this._forJs = function () {
        var _this$parserOpts$plug;

        if (!((_this$parserOpts$plug = _this.parserOpts.plugins) !== null && _this$parserOpts$plug !== void 0 && _this$parserOpts$plug.some(function (p) {
          return pluginName(p) === 'typescript';
        }))) return _this;
        return _this.removePlugins('typescript', 'decorators-legacy').mergePlugins(['flow', {
          all: true
        }], 'flowComments', 'jsx', ['decorators', {
          decoratorsBeforeExport: false
        }]);
      }());
    }
  }, {
    key: "forTs",
    get: function get() {
      return this._forTs || (this._forTs = this.removePlugins('flow', 'flowComments', 'decorators', 'jsx').mergePlugins(['typescript', {
        dts: false
      }], 'decorators-legacy'));
    }
  }, {
    key: "forTsx",
    get: function get() {
      return this._forTsx || (this._forTsx = this.removePlugins('flow', 'flowComments', 'decorators').mergePlugins(['typescript', {
        disallowAmbiguousJSXLike: true,
        dts: false
      }], 'decorators-legacy', 'jsx'));
    }
  }, {
    key: "forDts",
    get: function get() {
      return this._forDts || (this._forDts = this.removePlugins('flow', 'flowComments', 'decorators', 'jsx').mergePlugins(['typescript', {
        dts: true
      }], 'decorators-legacy'));
    }
  }, {
    key: "forExtension",
    value: function forExtension(e) {
      if (/(\.|^)([cm]?jsx?(\.flow)?)$/i.test(e)) return this.forJs;
      if (/(\.|^)d\.ts$/i.test(e)) return this.forDts;
      if (/(\.|^)[cm]?tsx$/i.test(e)) return this.forTsx;
      if (/(\.|^)[cm]?ts$/i.test(e)) return this.forTs;
      return this;
    }
  }]);
  return Parser;
}();

exports.Parser = Parser;
var jsParser = new Parser(defaultBabelParser, {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  plugins: [['flow', {
    all: true
  }], 'flowComments', 'jsx', 'asyncGenerators', 'bigInt', 'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'classStaticBlock', 'dynamicImport', 'exportNamespaceFrom', 'functionSent', 'importMeta', 'logicalAssignment', 'moduleStringNames', 'nullishCoalescingOperator', 'numericSeparator', 'objectRestSpread', 'optionalCatchBinding', 'optionalChaining', 'privateIn', 'topLevelAwait']
});
exports.jsParser = jsParser;
var tsParser = jsParser.forTs;
exports.tsParser = tsParser;
var tsxParser = jsParser.forTsx;
exports.tsxParser = tsxParser;
var dtsParser = jsParser.forDts;
exports.dtsParser = dtsParser;

function defaultParser(extname) {
  return jsParser.forExtension(extname);
}

var resolve = (0, _util.promisify)(_resolve2["default"]);
var requiredPaths = [];

var Cache = /*#__PURE__*/function () {
  function Cache() {
    (0, _classCallCheck2["default"])(this, Cache);
    (0, _defineProperty2["default"])(this, "syncCache", new Map());
    (0, _defineProperty2["default"])(this, "asyncCache", new Map());
  }

  (0, _createClass2["default"])(Cache, [{
    key: "getSync",
    value: function getSync(key, fetch) {
      var result = this.syncCache.get(key);

      if (!result) {
        result = fetch();
        this.syncCache.set(key, result);
        this.asyncCache.set(key, Promise.resolve(result));
      }

      return result;
    }
  }, {
    key: "getAsync",
    value: function getAsync(key, fetch) {
      var _this2 = this;

      var result = this.asyncCache.get(key);

      if (!result) {
        result = fetch();
        this.asyncCache.set(key, result);
        result.then(function (value) {
          // check if cache was cleared before this point
          if (_this2.asyncCache.get(key) === result) {
            _this2.syncCache.set(key, value);
          }
        });
      }

      return result;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.syncCache.clear();
      this.asyncCache.clear();
    }
  }]);
  return Cache;
}();

var dirParserCache = new Cache();
var babelrcParserCache = new Cache();

function clearCache() {
  dirParserCache.clear();
  babelrcParserCache.clear();

  var _iterator2 = _createForOfIteratorHelper(requiredPaths),
      _step2;

  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var path = _step2.value;
      delete require.cache[path];
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }

  requiredPaths.length = 0;
} // eslint-disable-next-line @typescript-eslint/no-explicit-any


function createParserFromConfig(babelParser, config) {
  var plugins = config.plugins,
      sourceType = config.sourceType;
  var opts = {
    parserOpts: {
      plugins: [],
      sourceType: sourceType
    },
    generatorOpts: {}
  };

  var _iterator3 = _createForOfIteratorHelper(plugins),
      _step3;

  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var manipulateOptions = _step3.value.manipulateOptions;
      manipulateOptions === null || manipulateOptions === void 0 ? void 0 : manipulateOptions(opts, opts.parserOpts);
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }

  return new Parser(babelParser, opts.parserOpts);
}

function getExtname(file) {
  var _exec;

  return ((_exec = /(\.d\.ts|\.js\.flow|\.[^.]+)$/i.exec(file)) === null || _exec === void 0 ? void 0 : _exec[1]) || '';
}

function getParserSync(file, options) {
  var parentDir = Path.dirname(file);
  var extname = getExtname(file);
  var parser = dirParserCache.getSync("".concat(parentDir).concat(Path.delimiter).concat(extname), function () {
    try {
      var babelPath = _resolve2["default"].sync('@babel/core', {
        basedir: parentDir
      }); // eslint-disable-next-line @typescript-eslint/no-var-requires


      var babel = require(babelPath);

      requiredPaths.push(babelPath);

      var parserPath = _resolve2["default"].sync('@babel/parser', {
        basedir: parentDir
      }); // eslint-disable-next-line @typescript-eslint/no-var-requires


      var _parser = require(parserPath);

      requiredPaths.push(parserPath);
      var loadOpts = {
        filename: file,
        cwd: Path.dirname(file),
        rootMode: 'upward-optional'
      };
      var partial = babel.loadPartialConfigSync(loadOpts);
      var babelrc = partial.babelrc || partial.config;

      var getParser = function getParser() {
        var config = babel.loadOptionsSync(loadOpts);
        var result = createParserFromConfig(_parser, config);
        return extname === '.d.ts' ? result.bindParserOpts({
          plugins: [['typescript', {
            dts: true
          }]]
        }) : result;
      };

      return babelrc ? babelrcParserCache.getSync("".concat(babelrc).concat(Path.delimiter).concat(extname), getParser) : getParser();
    } catch (error) {
      return defaultParser(extname);
    }
  });
  return !options || isEmpty(options) ? parser : parser.bindParserOpts(options);
}

function getParserAsync(_x, _x2) {
  return _getParserAsync.apply(this, arguments);
}

function _getParserAsync() {
  _getParserAsync = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(file, options) {
    var parentDir, extname, parser;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            parentDir = Path.dirname(file);
            extname = getExtname(file);
            _context3.next = 4;
            return dirParserCache.getAsync("".concat(parentDir).concat(Path.delimiter).concat(extname), /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
              var babelPath, babel, parserPath, _parser2, loadOpts, partial, babelrc, getParser;

              return _regenerator["default"].wrap(function _callee2$(_context2) {
                while (1) {
                  switch (_context2.prev = _context2.next) {
                    case 0:
                      _context2.prev = 0;
                      _context2.next = 3;
                      return resolve('@babel/core', {
                        basedir: parentDir
                      });

                    case 3:
                      babelPath = _context2.sent;
                      _context2.next = 6;
                      return Promise.resolve("".concat(babelPath)).then(function (s) {
                        return _interopRequireWildcard(require(s));
                      });

                    case 6:
                      babel = _context2.sent;
                      requiredPaths.push(babelPath);
                      _context2.next = 10;
                      return resolve('@babel/parser', {
                        basedir: parentDir
                      });

                    case 10:
                      parserPath = _context2.sent;
                      _context2.next = 13;
                      return Promise.resolve("".concat(parserPath)).then(function (s) {
                        return _interopRequireWildcard(require(s));
                      });

                    case 13:
                      _parser2 = _context2.sent;
                      requiredPaths.push(parserPath);
                      loadOpts = {
                        filename: file,
                        cwd: parentDir,
                        rootMode: 'upward-optional'
                      };
                      _context2.next = 18;
                      return babel.loadPartialConfigAsync(loadOpts);

                    case 18:
                      partial = _context2.sent;
                      babelrc = partial.babelrc || partial.config;

                      getParser = /*#__PURE__*/function () {
                        var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
                          var config, result;
                          return _regenerator["default"].wrap(function _callee$(_context) {
                            while (1) {
                              switch (_context.prev = _context.next) {
                                case 0:
                                  _context.next = 2;
                                  return babel.loadOptionsAsync(loadOpts);

                                case 2:
                                  config = _context.sent;
                                  result = createParserFromConfig(_parser2, config);
                                  return _context.abrupt("return", extname === '.d.ts' ? result.bindParserOpts({
                                    plugins: [['typescript', {
                                      dts: true
                                    }]]
                                  }) : result);

                                case 5:
                                case "end":
                                  return _context.stop();
                              }
                            }
                          }, _callee);
                        }));

                        return function getParser() {
                          return _ref4.apply(this, arguments);
                        };
                      }();

                      if (!babelrc) {
                        _context2.next = 27;
                        break;
                      }

                      _context2.next = 24;
                      return babelrcParserCache.getAsync("".concat(babelrc).concat(Path.delimiter).concat(extname), getParser);

                    case 24:
                      _context2.t0 = _context2.sent;
                      _context2.next = 30;
                      break;

                    case 27:
                      _context2.next = 29;
                      return getParser();

                    case 29:
                      _context2.t0 = _context2.sent;

                    case 30:
                      return _context2.abrupt("return", _context2.t0);

                    case 33:
                      _context2.prev = 33;
                      _context2.t1 = _context2["catch"](0);
                      return _context2.abrupt("return", defaultParser(extname));

                    case 36:
                    case "end":
                      return _context2.stop();
                  }
                }
              }, _callee2, null, [[0, 33]]);
            })));

          case 4:
            parser = _context3.sent;
            return _context3.abrupt("return", !options || isEmpty(options) ? parser : parser.bindParserOpts(options));

          case 6:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _getParserAsync.apply(this, arguments);
}

function parseSync(file) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$encoding = _ref.encoding,
      encoding = _ref$encoding === void 0 ? 'utf8' : _ref$encoding,
      options = (0, _objectWithoutProperties2["default"])(_ref, _excluded);

  var parser = getParserSync(file, options);
  return parser.parse((0, _fs.readFileSync)(file, encoding));
}

function parseAsync(_x3) {
  return _parseAsync.apply(this, arguments);
}

function _parseAsync() {
  _parseAsync = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(file) {
    var _ref2,
        _ref2$encoding,
        encoding,
        options,
        parser,
        _args4 = arguments;

    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _ref2 = _args4.length > 1 && _args4[1] !== undefined ? _args4[1] : {}, _ref2$encoding = _ref2.encoding, encoding = _ref2$encoding === void 0 ? 'utf8' : _ref2$encoding, options = (0, _objectWithoutProperties2["default"])(_ref2, _excluded2);
            _context4.next = 3;
            return getParserAsync(file, options);

          case 3:
            parser = _context4.sent;
            _context4.t0 = parser;
            _context4.next = 7;
            return readFile(file, encoding);

          case 7:
            _context4.t1 = _context4.sent;
            return _context4.abrupt("return", _context4.t0.parse.call(_context4.t0, _context4.t1));

          case 9:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _parseAsync.apply(this, arguments);
}