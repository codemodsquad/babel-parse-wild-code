"use strict";

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

var t = _interopRequireWildcard(require("@babel/types"));

var Path = _interopRequireWildcard(require("path"));

var _resolve2 = _interopRequireDefault(require("resolve"));

var _util = require("util");

var defaultBabelParser = _interopRequireWildcard(require("@babel/parser"));

var _fs = require("fs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const readFile = (0, _util.promisify)(_fs.readFile); // eslint-disable-next-line @typescript-eslint/no-explicit-any

function isEmpty(obj) {
  for (const key in obj) return false;

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

function mergePlugins(a, b) {
  if (!b) return a;
  if (!a) return b;
  if (b.every(bp => a.find(ap => arePluginsEqual(ap, bp)))) return a; // eslint-disable-next-line @typescript-eslint/no-explicit-any

  const map = new Map( // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a.map(p => Array.isArray(p) ? p : [p, undefined]));

  for (const p of b) {
    if (Array.isArray(p)) map.set(p[0], { ...map.get(p[0]),
      ...p[1]
    });else if (!map.has(p)) map.set(p, map.get(p));
  }

  return [...map.entries()].map( // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e => e[1] === undefined ? e[0] : e // eslint-disable-next-line @typescript-eslint/no-explicit-any
  );
}

function removePlugins(a, b) {
  if (!b.some(plugin => a === null || a === void 0 ? void 0 : a.some(p => pluginName(p) === plugin))) {
    return a;
  }

  return a === null || a === void 0 ? void 0 : a.filter(p => !b.includes(pluginName(p)));
}

class Parser {
  constructor(babelParser, parserOpts) {
    _defineProperty(this, "babelParser", void 0);

    _defineProperty(this, "parserOpts", void 0);

    _defineProperty(this, "_forJs", void 0);

    _defineProperty(this, "_forTs", void 0);

    _defineProperty(this, "_forTsx", void 0);

    _defineProperty(this, "_forDts", void 0);

    this.babelParser = babelParser;
    this.parserOpts = parserOpts;
  }

  parse(code, parserOpts) {
    return parserOpts ? this.bindParserOpts(parserOpts).parse(code) : this.babelParser.parse(code, this.parserOpts);
  }

  parseExpression(code, parserOpts) {
    return parserOpts ? this.bindParserOpts(parserOpts).parseExpression(code) : this.babelParser.parseExpression(code, this.parserOpts);
  }

  bindParserOpts(parserOpts) {
    return new Parser(this.babelParser, { ...this.parserOpts,
      ...parserOpts,
      plugins: mergePlugins(this.parserOpts.plugins, parserOpts.plugins)
    });
  }

  mergePlugins(...plugins) {
    const merged = mergePlugins(this.parserOpts.plugins, plugins);
    return merged === this.parserOpts.plugins ? this : new Parser(this.babelParser, { ...this.parserOpts,
      plugins: merged
    });
  }

  removePlugins(...plugins) {
    const removed = removePlugins(this.parserOpts.plugins, plugins);
    return removed === this.parserOpts.plugins ? this : new Parser(this.babelParser, { ...this.parserOpts,
      plugins: removed
    });
  }

  get forJs() {
    return this._forJs || (this._forJs = (() => {
      var _this$parserOpts$plug;

      if (!((_this$parserOpts$plug = this.parserOpts.plugins) !== null && _this$parserOpts$plug !== void 0 && _this$parserOpts$plug.some(p => pluginName(p) === 'typescript'))) return this;
      return this.removePlugins('typescript', 'decorators-legacy').mergePlugins(['flow', {
        all: true
      }], 'flowComments', 'jsx', ['decorators', {
        decoratorsBeforeExport: false
      }]);
    })());
  }

  get forTs() {
    return this._forTs || (this._forTs = this.removePlugins('flow', 'flowComments', 'decorators', 'jsx').mergePlugins(['typescript', {
      dts: false
    }], 'decorators-legacy'));
  }

  get forTsx() {
    return this._forTsx || (this._forTsx = this.removePlugins('flow', 'flowComments', 'decorators').mergePlugins(['typescript', {
      disallowAmbiguousJSXLike: true,
      dts: false
    }], 'decorators-legacy', 'jsx'));
  }

  get forDts() {
    return this._forDts || (this._forDts = this.removePlugins('flow', 'flowComments', 'decorators', 'jsx').mergePlugins(['typescript', {
      dts: true
    }], 'decorators-legacy'));
  }

  forExtension(e) {
    if (/(\.|^)([cm]?jsx?(\.flow)?)$/i.test(e)) return this.forJs;
    if (/(\.|^)d\.ts$/i.test(e)) return this.forDts;
    if (/(\.|^)[cm]?tsx$/i.test(e)) return this.forTsx;
    if (/(\.|^)[cm]?ts$/i.test(e)) return this.forTs;
    return this;
  }

}

exports.Parser = Parser;
const jsParser = new Parser(defaultBabelParser, {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  plugins: [['flow', {
    all: true
  }], 'flowComments', 'jsx', 'asyncGenerators', 'bigInt', 'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'classStaticBlock', 'dynamicImport', 'exportNamespaceFrom', 'functionSent', 'importMeta', 'logicalAssignment', 'moduleStringNames', 'nullishCoalescingOperator', 'numericSeparator', 'objectRestSpread', 'optionalCatchBinding', 'optionalChaining', 'privateIn', 'topLevelAwait']
});
exports.jsParser = jsParser;
const tsParser = jsParser.forTs;
exports.tsParser = tsParser;
const tsxParser = jsParser.forTsx;
exports.tsxParser = tsxParser;
const dtsParser = jsParser.forDts;
exports.dtsParser = dtsParser;

function defaultParser(extname) {
  return jsParser.forExtension(extname);
}

const resolve = (0, _util.promisify)(_resolve2.default);
const requiredPaths = [];

class Cache {
  constructor() {
    _defineProperty(this, "syncCache", new Map());

    _defineProperty(this, "asyncCache", new Map());
  }

  getSync(key, fetch) {
    let result = this.syncCache.get(key);

    if (!result) {
      result = fetch();
      this.syncCache.set(key, result);
      this.asyncCache.set(key, Promise.resolve(result));
    }

    return result;
  }

  getAsync(key, fetch) {
    let result = this.asyncCache.get(key);

    if (!result) {
      result = fetch();
      this.asyncCache.set(key, result);
      result.then(value => {
        // check if cache was cleared before this point
        if (this.asyncCache.get(key) === result) {
          this.syncCache.set(key, value);
        }
      });
    }

    return result;
  }

  clear() {
    this.syncCache.clear();
    this.asyncCache.clear();
  }

}

const dirParserCache = new Cache();
const babelrcParserCache = new Cache();

function clearCache() {
  dirParserCache.clear();
  babelrcParserCache.clear();

  for (const path of requiredPaths) {
    delete require.cache[path];
  }

  requiredPaths.length = 0;
} // eslint-disable-next-line @typescript-eslint/no-explicit-any


function createParserFromConfig(babelParser, config) {
  const {
    plugins,
    sourceType
  } = config;
  const opts = {
    parserOpts: {
      plugins: [],
      sourceType
    },
    generatorOpts: {}
  };

  for (const {
    manipulateOptions
  } of plugins) {
    manipulateOptions === null || manipulateOptions === void 0 ? void 0 : manipulateOptions(opts, opts.parserOpts);
  }

  return new Parser(babelParser, opts.parserOpts);
}

function getExtname(file) {
  var _exec;

  return ((_exec = /(\.d\.ts|\.js\.flow|\.[^.]+)$/i.exec(file)) === null || _exec === void 0 ? void 0 : _exec[1]) || '';
}

function getParserSync(file, options) {
  const parentDir = Path.dirname(file);
  const extname = getExtname(file);
  const parser = dirParserCache.getSync(`${parentDir}${Path.delimiter}${extname}`, () => {
    try {
      const babelPath = _resolve2.default.sync('@babel/core', {
        basedir: parentDir
      }); // eslint-disable-next-line @typescript-eslint/no-var-requires


      const babel = require(
      /* webpackIgnore: true */
      babelPath);

      requiredPaths.push(babelPath);
      let parser;

      try {
        const parserPath = _resolve2.default.sync('@babel/parser', {
          basedir: parentDir
        }); // eslint-disable-next-line @typescript-eslint/no-var-requires


        parser = require(
        /* webpackIgnore: true */
        parserPath);
        requiredPaths.push(parserPath);
      } catch (error) {
        parser = defaultBabelParser;
      }

      const loadOpts = {
        filename: file,
        cwd: Path.dirname(file),
        rootMode: 'upward-optional'
      };
      const partial = babel.loadPartialConfigSync(loadOpts);
      const babelrc = partial.babelrc || partial.config;

      const getParser = () => {
        const config = babel.loadOptionsSync(loadOpts);
        const result = createParserFromConfig(parser, config);
        return extname === '.d.ts' ? result.bindParserOpts({
          plugins: [['typescript', {
            dts: true
          }]]
        }) : result;
      };

      return babelrc ? babelrcParserCache.getSync(`${babelrc}${Path.delimiter}${extname}`, getParser) : getParser();
    } catch (error) {
      return defaultParser(extname);
    }
  });
  return !options || isEmpty(options) ? parser : parser.bindParserOpts(options);
}

async function getParserAsync(file, options) {
  const parentDir = Path.dirname(file);
  const extname = getExtname(file);
  const parser = await dirParserCache.getAsync(`${parentDir}${Path.delimiter}${extname}`, async () => {
    try {
      const babelPath = await resolve('@babel/core', {
        basedir: parentDir
      });
      const babel = await Promise.resolve(`${
      /* webpackIgnore: true */
      babelPath}`).then(s => _interopRequireWildcard(require(s)));
      requiredPaths.push(babelPath);
      let parser;

      try {
        const parserPath = await resolve('@babel/parser', {
          basedir: parentDir
        });
        parser = await Promise.resolve(`${
        /* webpackIgnore: true */
        parserPath}`).then(s => _interopRequireWildcard(require(s)));
        requiredPaths.push(parserPath);
      } catch (error) {
        parser = defaultBabelParser;
      }

      const loadOpts = {
        filename: file,
        cwd: parentDir,
        rootMode: 'upward-optional'
      };
      const partial = await babel.loadPartialConfigAsync(loadOpts);
      const babelrc = partial.babelrc || partial.config;

      const getParser = async () => {
        const config = await babel.loadOptionsAsync(loadOpts);
        const result = createParserFromConfig(parser, config);
        return extname === '.d.ts' ? result.bindParserOpts({
          plugins: [['typescript', {
            dts: true
          }]]
        }) : result;
      };

      return babelrc ? await babelrcParserCache.getAsync(`${babelrc}${Path.delimiter}${extname}`, getParser) : await getParser();
    } catch (error) {
      return defaultParser(extname);
    }
  });
  return !options || isEmpty(options) ? parser : parser.bindParserOpts(options);
}

function parseSync(file, {
  encoding = 'utf8',
  ...options
} = {}) {
  const parser = getParserSync(file, options);
  return parser.parse((0, _fs.readFileSync)(file, encoding));
}

async function parseAsync(file, {
  encoding = 'utf8',
  ...options
} = {}) {
  const parser = await getParserAsync(file, options);
  return parser.parse(await readFile(file, encoding));
}