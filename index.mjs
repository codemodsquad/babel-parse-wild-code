function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import * as t from '@babel/types';
import * as Path from 'path';
import _resolve from 'resolve';
import { promisify } from 'util';
import * as defaultBabelParser from '@babel/parser';
import { readFile as _readFile, readFileSync } from 'fs';
const readFile = promisify(_readFile); // eslint-disable-next-line @typescript-eslint/no-explicit-any

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

export class Parser {
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
export const jsParser = new Parser(defaultBabelParser, {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  plugins: [['flow', {
    all: true
  }], 'flowComments', 'jsx', 'asyncGenerators', 'bigInt', 'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'classStaticBlock', 'dynamicImport', 'exportNamespaceFrom', 'functionSent', 'importMeta', 'logicalAssignment', 'moduleStringNames', 'nullishCoalescingOperator', 'numericSeparator', 'objectRestSpread', 'optionalCatchBinding', 'optionalChaining', 'privateIn', 'topLevelAwait']
});
export const tsParser = jsParser.forTs;
export const tsxParser = jsParser.forTsx;
export const dtsParser = jsParser.forDts;

function defaultParser(extname) {
  return jsParser.forExtension(extname);
}

const resolve = promisify(_resolve);
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
export function clearCache() {
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

export function getParserSync(file, options) {
  const parentDir = Path.dirname(file);
  const extname = getExtname(file);
  const parser = dirParserCache.getSync(`${parentDir}${Path.delimiter}${extname}`, () => {
    try {
      const babelPath = _resolve.sync('@babel/core', {
        basedir: parentDir
      }); // eslint-disable-next-line @typescript-eslint/no-var-requires


      const babel = require(
      /* webpackIgnore: true */
      babelPath);

      requiredPaths.push(babelPath);
      let parser;

      try {
        const parserPath = _resolve.sync('@babel/parser', {
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
export async function getParserAsync(file, options) {
  const parentDir = Path.dirname(file);
  const extname = getExtname(file);
  const parser = await dirParserCache.getAsync(`${parentDir}${Path.delimiter}${extname}`, async () => {
    try {
      const babelPath = await resolve('@babel/core', {
        basedir: parentDir
      });
      const babel = await import(
      /* webpackIgnore: true */
      babelPath);
      requiredPaths.push(babelPath);
      let parser;

      try {
        const parserPath = await resolve('@babel/parser', {
          basedir: parentDir
        });
        parser = await import(
        /* webpackIgnore: true */
        parserPath);
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
export function parseSync(file, {
  encoding = 'utf8',
  ...options
} = {}) {
  const parser = getParserSync(file, options);
  return parser.parse(readFileSync(file, encoding));
}
export async function parseAsync(file, {
  encoding = 'utf8',
  ...options
} = {}) {
  const parser = await getParserAsync(file, options);
  return parser.parse(await readFile(file, encoding));
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJ0IiwiUGF0aCIsIl9yZXNvbHZlIiwicHJvbWlzaWZ5IiwiZGVmYXVsdEJhYmVsUGFyc2VyIiwicmVhZEZpbGUiLCJfcmVhZEZpbGUiLCJyZWFkRmlsZVN5bmMiLCJpc0VtcHR5Iiwib2JqIiwia2V5IiwicGx1Z2luTmFtZSIsInAiLCJwbHVnaW5PcHRzIiwiYXJlUGx1Z2luc0VxdWFsIiwiYSIsImIiLCJzaGFsbG93RXF1YWwiLCJtZXJnZVBsdWdpbnMiLCJldmVyeSIsImJwIiwiZmluZCIsImFwIiwibWFwIiwiTWFwIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwic2V0IiwiZ2V0IiwiaGFzIiwiZW50cmllcyIsImUiLCJyZW1vdmVQbHVnaW5zIiwic29tZSIsInBsdWdpbiIsImZpbHRlciIsImluY2x1ZGVzIiwiUGFyc2VyIiwiY29uc3RydWN0b3IiLCJiYWJlbFBhcnNlciIsInBhcnNlck9wdHMiLCJwYXJzZSIsImNvZGUiLCJiaW5kUGFyc2VyT3B0cyIsInBhcnNlRXhwcmVzc2lvbiIsInBsdWdpbnMiLCJtZXJnZWQiLCJyZW1vdmVkIiwiZm9ySnMiLCJfZm9ySnMiLCJhbGwiLCJkZWNvcmF0b3JzQmVmb3JlRXhwb3J0IiwiZm9yVHMiLCJfZm9yVHMiLCJkdHMiLCJmb3JUc3giLCJfZm9yVHN4IiwiZGlzYWxsb3dBbWJpZ3VvdXNKU1hMaWtlIiwiZm9yRHRzIiwiX2ZvckR0cyIsImZvckV4dGVuc2lvbiIsInRlc3QiLCJqc1BhcnNlciIsInNvdXJjZVR5cGUiLCJhbGxvd0ltcG9ydEV4cG9ydEV2ZXJ5d2hlcmUiLCJhbGxvd1JldHVybk91dHNpZGVGdW5jdGlvbiIsInN0YXJ0TGluZSIsInRzUGFyc2VyIiwidHN4UGFyc2VyIiwiZHRzUGFyc2VyIiwiZGVmYXVsdFBhcnNlciIsImV4dG5hbWUiLCJyZXNvbHZlIiwicmVxdWlyZWRQYXRocyIsIkNhY2hlIiwiZ2V0U3luYyIsImZldGNoIiwicmVzdWx0Iiwic3luY0NhY2hlIiwiYXN5bmNDYWNoZSIsIlByb21pc2UiLCJnZXRBc3luYyIsInRoZW4iLCJ2YWx1ZSIsImNsZWFyIiwiZGlyUGFyc2VyQ2FjaGUiLCJiYWJlbHJjUGFyc2VyQ2FjaGUiLCJjbGVhckNhY2hlIiwicGF0aCIsInJlcXVpcmUiLCJjYWNoZSIsImxlbmd0aCIsImNyZWF0ZVBhcnNlckZyb21Db25maWciLCJjb25maWciLCJvcHRzIiwiZ2VuZXJhdG9yT3B0cyIsIm1hbmlwdWxhdGVPcHRpb25zIiwiZ2V0RXh0bmFtZSIsImZpbGUiLCJleGVjIiwiZ2V0UGFyc2VyU3luYyIsIm9wdGlvbnMiLCJwYXJlbnREaXIiLCJkaXJuYW1lIiwicGFyc2VyIiwiZGVsaW1pdGVyIiwiYmFiZWxQYXRoIiwic3luYyIsImJhc2VkaXIiLCJiYWJlbCIsInB1c2giLCJwYXJzZXJQYXRoIiwiZXJyb3IiLCJsb2FkT3B0cyIsImZpbGVuYW1lIiwiY3dkIiwicm9vdE1vZGUiLCJwYXJ0aWFsIiwibG9hZFBhcnRpYWxDb25maWdTeW5jIiwiYmFiZWxyYyIsImdldFBhcnNlciIsImxvYWRPcHRpb25zU3luYyIsImdldFBhcnNlckFzeW5jIiwibG9hZFBhcnRpYWxDb25maWdBc3luYyIsImxvYWRPcHRpb25zQXN5bmMiLCJwYXJzZVN5bmMiLCJlbmNvZGluZyIsInBhcnNlQXN5bmMiXSwic291cmNlcyI6WyJzcmMvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdCBmcm9tICdAYmFiZWwvdHlwZXMnXG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgX3Jlc29sdmUgZnJvbSAncmVzb2x2ZSdcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ3V0aWwnXG5pbXBvcnQgKiBhcyBkZWZhdWx0QmFiZWxQYXJzZXIgZnJvbSAnQGJhYmVsL3BhcnNlcidcbmltcG9ydCB7IFBhcnNlck9wdGlvbnMsIFBhcnNlclBsdWdpbiB9IGZyb20gJ0BiYWJlbC9wYXJzZXInXG5pbXBvcnQgeyByZWFkRmlsZSBhcyBfcmVhZEZpbGUsIHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJ1xuY29uc3QgcmVhZEZpbGUgPSBwcm9taXNpZnkoX3JlYWRGaWxlKVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZnVuY3Rpb24gaXNFbXB0eShvYmo6IGFueSk6IGJvb2xlYW4ge1xuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHJldHVybiBmYWxzZVxuICByZXR1cm4gdHJ1ZVxufVxuXG50eXBlIEJhYmVsUGFyc2VyID0gUGljazx0eXBlb2YgZGVmYXVsdEJhYmVsUGFyc2VyLCAncGFyc2UnIHwgJ3BhcnNlRXhwcmVzc2lvbic+XG5cbmZ1bmN0aW9uIHBsdWdpbk5hbWUocDogUGFyc2VyUGx1Z2luKTogc3RyaW5nIHtcbiAgcmV0dXJuIHR5cGVvZiBwID09PSAnc3RyaW5nJyA/IHAgOiBwWzBdXG59XG5cbmZ1bmN0aW9uIHBsdWdpbk9wdHMocDogUGFyc2VyUGx1Z2luKTogYW55IHtcbiAgcmV0dXJuIHR5cGVvZiBwID09PSAnc3RyaW5nJyA/IHt9IDogcFsxXVxufVxuXG5mdW5jdGlvbiBhcmVQbHVnaW5zRXF1YWwoYTogUGFyc2VyUGx1Z2luLCBiOiBQYXJzZXJQbHVnaW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBwbHVnaW5OYW1lKGEpID09PSBwbHVnaW5OYW1lKGIpICYmXG4gICAgdC5zaGFsbG93RXF1YWwocGx1Z2luT3B0cyhhKSwgcGx1Z2luT3B0cyhiKSlcbiAgKVxufVxuXG5mdW5jdGlvbiBtZXJnZVBsdWdpbnMoXG4gIGE6IFBhcnNlclBsdWdpbltdIHwgdW5kZWZpbmVkLFxuICBiOiBQYXJzZXJQbHVnaW5bXSB8IHVuZGVmaW5lZFxuKTogUGFyc2VyUGx1Z2luW10gfCB1bmRlZmluZWQge1xuICBpZiAoIWIpIHJldHVybiBhXG4gIGlmICghYSkgcmV0dXJuIGJcblxuICBpZiAoYi5ldmVyeSgoYnApID0+IGEuZmluZCgoYXApID0+IGFyZVBsdWdpbnNFcXVhbChhcCwgYnApKSkpIHJldHVybiBhXG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgY29uc3QgbWFwOiBNYXA8c3RyaW5nLCBhbnk+ID0gbmV3IE1hcChcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGEubWFwKChwOiBQYXJzZXJQbHVnaW4pOiBbc3RyaW5nLCBhbnldID0+XG4gICAgICBBcnJheS5pc0FycmF5KHApID8gcCA6IFtwLCB1bmRlZmluZWRdXG4gICAgKVxuICApXG4gIGZvciAoY29uc3QgcCBvZiBiKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocCkpIG1hcC5zZXQocFswXSwgeyAuLi5tYXAuZ2V0KHBbMF0pLCAuLi5wWzFdIH0pXG4gICAgZWxzZSBpZiAoIW1hcC5oYXMocCkpIG1hcC5zZXQocCwgbWFwLmdldChwKSlcbiAgfVxuICByZXR1cm4gWy4uLm1hcC5lbnRyaWVzKCldLm1hcChcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChlOiBbc3RyaW5nLCBhbnldKSA9PiAoZVsxXSA9PT0gdW5kZWZpbmVkID8gZVswXSA6IGUpXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgKSBhcyBhbnlcbn1cblxuZnVuY3Rpb24gcmVtb3ZlUGx1Z2lucyhcbiAgYTogUGFyc2VyUGx1Z2luW10gfCB1bmRlZmluZWQsXG4gIGI6IHN0cmluZ1tdXG4pOiBQYXJzZXJQbHVnaW5bXSB8IHVuZGVmaW5lZCB7XG4gIGlmICghYi5zb21lKChwbHVnaW4pID0+IGE/LnNvbWUoKHApID0+IHBsdWdpbk5hbWUocCkgPT09IHBsdWdpbikpKSB7XG4gICAgcmV0dXJuIGFcbiAgfVxuICByZXR1cm4gYT8uZmlsdGVyKChwKSA9PiAhYi5pbmNsdWRlcyhwbHVnaW5OYW1lKHApKSlcbn1cblxuZXhwb3J0IGNsYXNzIFBhcnNlciB7XG4gIHJlYWRvbmx5IGJhYmVsUGFyc2VyOiBCYWJlbFBhcnNlclxuICByZWFkb25seSBwYXJzZXJPcHRzOiBQYXJzZXJPcHRpb25zXG5cbiAgX2ZvckpzOiBQYXJzZXIgfCB1bmRlZmluZWRcbiAgX2ZvclRzOiBQYXJzZXIgfCB1bmRlZmluZWRcbiAgX2ZvclRzeDogUGFyc2VyIHwgdW5kZWZpbmVkXG4gIF9mb3JEdHM6IFBhcnNlciB8IHVuZGVmaW5lZFxuXG4gIGNvbnN0cnVjdG9yKGJhYmVsUGFyc2VyOiBCYWJlbFBhcnNlciwgcGFyc2VyT3B0czogUGFyc2VyT3B0aW9ucykge1xuICAgIHRoaXMuYmFiZWxQYXJzZXIgPSBiYWJlbFBhcnNlclxuICAgIHRoaXMucGFyc2VyT3B0cyA9IHBhcnNlck9wdHNcbiAgfVxuXG4gIHBhcnNlKGNvZGU6IHN0cmluZywgcGFyc2VyT3B0cz86IFBhcnNlck9wdGlvbnMpOiB0LkZpbGUge1xuICAgIHJldHVybiBwYXJzZXJPcHRzXG4gICAgICA/IHRoaXMuYmluZFBhcnNlck9wdHMocGFyc2VyT3B0cykucGFyc2UoY29kZSlcbiAgICAgIDogdGhpcy5iYWJlbFBhcnNlci5wYXJzZShjb2RlLCB0aGlzLnBhcnNlck9wdHMpXG4gIH1cblxuICBwYXJzZUV4cHJlc3Npb24oY29kZTogc3RyaW5nLCBwYXJzZXJPcHRzPzogUGFyc2VyT3B0aW9ucyk6IHQuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHBhcnNlck9wdHNcbiAgICAgID8gdGhpcy5iaW5kUGFyc2VyT3B0cyhwYXJzZXJPcHRzKS5wYXJzZUV4cHJlc3Npb24oY29kZSlcbiAgICAgIDogdGhpcy5iYWJlbFBhcnNlci5wYXJzZUV4cHJlc3Npb24oY29kZSwgdGhpcy5wYXJzZXJPcHRzKVxuICB9XG5cbiAgYmluZFBhcnNlck9wdHMocGFyc2VyT3B0czogUGFyc2VyT3B0aW9ucyk6IFBhcnNlciB7XG4gICAgcmV0dXJuIG5ldyBQYXJzZXIodGhpcy5iYWJlbFBhcnNlciwge1xuICAgICAgLi4udGhpcy5wYXJzZXJPcHRzLFxuICAgICAgLi4ucGFyc2VyT3B0cyxcbiAgICAgIHBsdWdpbnM6IG1lcmdlUGx1Z2lucyh0aGlzLnBhcnNlck9wdHMucGx1Z2lucywgcGFyc2VyT3B0cy5wbHVnaW5zKSxcbiAgICB9KVxuICB9XG5cbiAgbWVyZ2VQbHVnaW5zKC4uLnBsdWdpbnM6IFBhcnNlclBsdWdpbltdKTogUGFyc2VyIHtcbiAgICBjb25zdCBtZXJnZWQgPSBtZXJnZVBsdWdpbnModGhpcy5wYXJzZXJPcHRzLnBsdWdpbnMsIHBsdWdpbnMpXG4gICAgcmV0dXJuIG1lcmdlZCA9PT0gdGhpcy5wYXJzZXJPcHRzLnBsdWdpbnNcbiAgICAgID8gdGhpc1xuICAgICAgOiBuZXcgUGFyc2VyKHRoaXMuYmFiZWxQYXJzZXIsIHtcbiAgICAgICAgICAuLi50aGlzLnBhcnNlck9wdHMsXG4gICAgICAgICAgcGx1Z2luczogbWVyZ2VkLFxuICAgICAgICB9KVxuICB9XG5cbiAgcmVtb3ZlUGx1Z2lucyguLi5wbHVnaW5zOiBzdHJpbmdbXSk6IFBhcnNlciB7XG4gICAgY29uc3QgcmVtb3ZlZCA9IHJlbW92ZVBsdWdpbnModGhpcy5wYXJzZXJPcHRzLnBsdWdpbnMsIHBsdWdpbnMpXG4gICAgcmV0dXJuIHJlbW92ZWQgPT09IHRoaXMucGFyc2VyT3B0cy5wbHVnaW5zXG4gICAgICA/IHRoaXNcbiAgICAgIDogbmV3IFBhcnNlcih0aGlzLmJhYmVsUGFyc2VyLCB7XG4gICAgICAgICAgLi4udGhpcy5wYXJzZXJPcHRzLFxuICAgICAgICAgIHBsdWdpbnM6IHJlbW92ZWQsXG4gICAgICAgIH0pXG4gIH1cblxuICBnZXQgZm9ySnMoKTogUGFyc2VyIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5fZm9ySnMgfHxcbiAgICAgICh0aGlzLl9mb3JKcyA9ICgoKSA9PiB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAhdGhpcy5wYXJzZXJPcHRzLnBsdWdpbnM/LnNvbWUoKHApID0+IHBsdWdpbk5hbWUocCkgPT09ICd0eXBlc2NyaXB0JylcbiAgICAgICAgKVxuICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZVBsdWdpbnMoXG4gICAgICAgICAgJ3R5cGVzY3JpcHQnLFxuICAgICAgICAgICdkZWNvcmF0b3JzLWxlZ2FjeSdcbiAgICAgICAgKS5tZXJnZVBsdWdpbnMoWydmbG93JywgeyBhbGw6IHRydWUgfV0sICdmbG93Q29tbWVudHMnLCAnanN4JywgW1xuICAgICAgICAgICdkZWNvcmF0b3JzJyxcbiAgICAgICAgICB7IGRlY29yYXRvcnNCZWZvcmVFeHBvcnQ6IGZhbHNlIH0sXG4gICAgICAgIF0pXG4gICAgICB9KSgpKVxuICAgIClcbiAgfVxuXG4gIGdldCBmb3JUcygpOiBQYXJzZXIge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzLl9mb3JUcyB8fFxuICAgICAgKHRoaXMuX2ZvclRzID0gdGhpcy5yZW1vdmVQbHVnaW5zKFxuICAgICAgICAnZmxvdycsXG4gICAgICAgICdmbG93Q29tbWVudHMnLFxuICAgICAgICAnZGVjb3JhdG9ycycsXG4gICAgICAgICdqc3gnXG4gICAgICApLm1lcmdlUGx1Z2lucyhbJ3R5cGVzY3JpcHQnLCB7IGR0czogZmFsc2UgfV0sICdkZWNvcmF0b3JzLWxlZ2FjeScpKVxuICAgIClcbiAgfVxuXG4gIGdldCBmb3JUc3goKTogUGFyc2VyIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5fZm9yVHN4IHx8XG4gICAgICAodGhpcy5fZm9yVHN4ID0gdGhpcy5yZW1vdmVQbHVnaW5zKFxuICAgICAgICAnZmxvdycsXG4gICAgICAgICdmbG93Q29tbWVudHMnLFxuICAgICAgICAnZGVjb3JhdG9ycydcbiAgICAgICkubWVyZ2VQbHVnaW5zKFxuICAgICAgICBbJ3R5cGVzY3JpcHQnLCB7IGRpc2FsbG93QW1iaWd1b3VzSlNYTGlrZTogdHJ1ZSwgZHRzOiBmYWxzZSB9XSxcbiAgICAgICAgJ2RlY29yYXRvcnMtbGVnYWN5JyxcbiAgICAgICAgJ2pzeCdcbiAgICAgICkpXG4gICAgKVxuICB9XG5cbiAgZ2V0IGZvckR0cygpOiBQYXJzZXIge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzLl9mb3JEdHMgfHxcbiAgICAgICh0aGlzLl9mb3JEdHMgPSB0aGlzLnJlbW92ZVBsdWdpbnMoXG4gICAgICAgICdmbG93JyxcbiAgICAgICAgJ2Zsb3dDb21tZW50cycsXG4gICAgICAgICdkZWNvcmF0b3JzJyxcbiAgICAgICAgJ2pzeCdcbiAgICAgICkubWVyZ2VQbHVnaW5zKFsndHlwZXNjcmlwdCcsIHsgZHRzOiB0cnVlIH1dLCAnZGVjb3JhdG9ycy1sZWdhY3knKSlcbiAgICApXG4gIH1cblxuICBmb3JFeHRlbnNpb24oZTogc3RyaW5nKTogUGFyc2VyIHtcbiAgICBpZiAoLyhcXC58XikoW2NtXT9qc3g/KFxcLmZsb3cpPykkL2kudGVzdChlKSkgcmV0dXJuIHRoaXMuZm9ySnNcbiAgICBpZiAoLyhcXC58XilkXFwudHMkL2kudGVzdChlKSkgcmV0dXJuIHRoaXMuZm9yRHRzXG4gICAgaWYgKC8oXFwufF4pW2NtXT90c3gkL2kudGVzdChlKSkgcmV0dXJuIHRoaXMuZm9yVHN4XG4gICAgaWYgKC8oXFwufF4pW2NtXT90cyQvaS50ZXN0KGUpKSByZXR1cm4gdGhpcy5mb3JUc1xuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGpzUGFyc2VyOiBQYXJzZXIgPSBuZXcgUGFyc2VyKGRlZmF1bHRCYWJlbFBhcnNlciwge1xuICBzb3VyY2VUeXBlOiAnbW9kdWxlJyxcbiAgYWxsb3dJbXBvcnRFeHBvcnRFdmVyeXdoZXJlOiB0cnVlLFxuICBhbGxvd1JldHVybk91dHNpZGVGdW5jdGlvbjogdHJ1ZSxcbiAgc3RhcnRMaW5lOiAxLFxuICBwbHVnaW5zOiBbXG4gICAgWydmbG93JywgeyBhbGw6IHRydWUgfV0sXG4gICAgJ2Zsb3dDb21tZW50cycsXG4gICAgJ2pzeCcsXG4gICAgJ2FzeW5jR2VuZXJhdG9ycycsXG4gICAgJ2JpZ0ludCcsXG4gICAgJ2NsYXNzUHJvcGVydGllcycsXG4gICAgJ2NsYXNzUHJpdmF0ZVByb3BlcnRpZXMnLFxuICAgICdjbGFzc1ByaXZhdGVNZXRob2RzJyxcbiAgICAnY2xhc3NTdGF0aWNCbG9jaycsXG4gICAgJ2R5bmFtaWNJbXBvcnQnLFxuICAgICdleHBvcnROYW1lc3BhY2VGcm9tJyxcbiAgICAnZnVuY3Rpb25TZW50JyxcbiAgICAnaW1wb3J0TWV0YScsXG4gICAgJ2xvZ2ljYWxBc3NpZ25tZW50JyxcbiAgICAnbW9kdWxlU3RyaW5nTmFtZXMnLFxuICAgICdudWxsaXNoQ29hbGVzY2luZ09wZXJhdG9yJyxcbiAgICAnbnVtZXJpY1NlcGFyYXRvcicsXG4gICAgJ29iamVjdFJlc3RTcHJlYWQnLFxuICAgICdvcHRpb25hbENhdGNoQmluZGluZycsXG4gICAgJ29wdGlvbmFsQ2hhaW5pbmcnLFxuICAgICdwcml2YXRlSW4nLFxuICAgICd0b3BMZXZlbEF3YWl0JyxcbiAgXSxcbn0pXG5cbmV4cG9ydCBjb25zdCB0c1BhcnNlcjogUGFyc2VyID0ganNQYXJzZXIuZm9yVHNcbmV4cG9ydCBjb25zdCB0c3hQYXJzZXI6IFBhcnNlciA9IGpzUGFyc2VyLmZvclRzeFxuZXhwb3J0IGNvbnN0IGR0c1BhcnNlcjogUGFyc2VyID0ganNQYXJzZXIuZm9yRHRzXG5cbmZ1bmN0aW9uIGRlZmF1bHRQYXJzZXIoZXh0bmFtZTogc3RyaW5nKTogUGFyc2VyIHtcbiAgcmV0dXJuIGpzUGFyc2VyLmZvckV4dGVuc2lvbihleHRuYW1lKVxufVxuXG5jb25zdCByZXNvbHZlOiAoXG4gIGlkOiBzdHJpbmcsXG4gIG9wdHM6IF9yZXNvbHZlLkFzeW5jT3B0c1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuKSA9PiBQcm9taXNlPHN0cmluZz4gPSBwcm9taXNpZnkoX3Jlc29sdmUgYXMgYW55KVxuXG5jb25zdCByZXF1aXJlZFBhdGhzOiBzdHJpbmdbXSA9IFtdXG5cbmNsYXNzIENhY2hlPEssIFY+IHtcbiAgc3luY0NhY2hlOiBNYXA8SywgVj4gPSBuZXcgTWFwKClcbiAgYXN5bmNDYWNoZTogTWFwPEssIFByb21pc2U8Vj4+ID0gbmV3IE1hcCgpXG5cbiAgZ2V0U3luYyhrZXk6IEssIGZldGNoOiAoKSA9PiBWKTogViB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMuc3luY0NhY2hlLmdldChrZXkpXG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIHJlc3VsdCA9IGZldGNoKClcbiAgICAgIHRoaXMuc3luY0NhY2hlLnNldChrZXksIHJlc3VsdClcbiAgICAgIHRoaXMuYXN5bmNDYWNoZS5zZXQoa2V5LCBQcm9taXNlLnJlc29sdmUocmVzdWx0KSlcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgZ2V0QXN5bmMoa2V5OiBLLCBmZXRjaDogKCkgPT4gUHJvbWlzZTxWPik6IFByb21pc2U8Vj4ge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLmFzeW5jQ2FjaGUuZ2V0KGtleSlcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gZmV0Y2goKVxuICAgICAgdGhpcy5hc3luY0NhY2hlLnNldChrZXksIHJlc3VsdClcbiAgICAgIHJlc3VsdC50aGVuKCh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBjaGVjayBpZiBjYWNoZSB3YXMgY2xlYXJlZCBiZWZvcmUgdGhpcyBwb2ludFxuICAgICAgICBpZiAodGhpcy5hc3luY0NhY2hlLmdldChrZXkpID09PSByZXN1bHQpIHtcbiAgICAgICAgICB0aGlzLnN5bmNDYWNoZS5zZXQoa2V5LCB2YWx1ZSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5zeW5jQ2FjaGUuY2xlYXIoKVxuICAgIHRoaXMuYXN5bmNDYWNoZS5jbGVhcigpXG4gIH1cbn1cblxuY29uc3QgZGlyUGFyc2VyQ2FjaGUgPSBuZXcgQ2FjaGU8c3RyaW5nLCBQYXJzZXI+KClcbmNvbnN0IGJhYmVscmNQYXJzZXJDYWNoZSA9IG5ldyBDYWNoZTxzdHJpbmcsIFBhcnNlcj4oKVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJDYWNoZSgpOiB2b2lkIHtcbiAgZGlyUGFyc2VyQ2FjaGUuY2xlYXIoKVxuICBiYWJlbHJjUGFyc2VyQ2FjaGUuY2xlYXIoKVxuICBmb3IgKGNvbnN0IHBhdGggb2YgcmVxdWlyZWRQYXRocykge1xuICAgIGRlbGV0ZSByZXF1aXJlLmNhY2hlW3BhdGhdXG4gIH1cbiAgcmVxdWlyZWRQYXRocy5sZW5ndGggPSAwXG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5mdW5jdGlvbiBjcmVhdGVQYXJzZXJGcm9tQ29uZmlnKGJhYmVsUGFyc2VyOiBCYWJlbFBhcnNlciwgY29uZmlnOiBhbnkpOiBQYXJzZXIge1xuICBjb25zdCB7IHBsdWdpbnMsIHNvdXJjZVR5cGUgfSA9IGNvbmZpZ1xuICBjb25zdCBvcHRzID0ge1xuICAgIHBhcnNlck9wdHM6IHsgcGx1Z2luczogW10sIHNvdXJjZVR5cGUgfSxcbiAgICBnZW5lcmF0b3JPcHRzOiB7fSxcbiAgfVxuICBmb3IgKGNvbnN0IHsgbWFuaXB1bGF0ZU9wdGlvbnMgfSBvZiBwbHVnaW5zKSB7XG4gICAgbWFuaXB1bGF0ZU9wdGlvbnM/LihvcHRzLCBvcHRzLnBhcnNlck9wdHMpXG4gIH1cbiAgcmV0dXJuIG5ldyBQYXJzZXIoYmFiZWxQYXJzZXIsIG9wdHMucGFyc2VyT3B0cylcbn1cblxuZnVuY3Rpb24gZ2V0RXh0bmFtZShmaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gLyhcXC5kXFwudHN8XFwuanNcXC5mbG93fFxcLlteLl0rKSQvaS5leGVjKGZpbGUpPy5bMV0gfHwgJydcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhcnNlclN5bmMoZmlsZTogc3RyaW5nLCBvcHRpb25zPzogUGFyc2VyT3B0aW9ucyk6IFBhcnNlciB7XG4gIGNvbnN0IHBhcmVudERpciA9IFBhdGguZGlybmFtZShmaWxlKVxuICBjb25zdCBleHRuYW1lID0gZ2V0RXh0bmFtZShmaWxlKVxuICBjb25zdCBwYXJzZXIgPSBkaXJQYXJzZXJDYWNoZS5nZXRTeW5jKFxuICAgIGAke3BhcmVudERpcn0ke1BhdGguZGVsaW1pdGVyfSR7ZXh0bmFtZX1gLFxuICAgICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJhYmVsUGF0aCA9IF9yZXNvbHZlLnN5bmMoJ0BiYWJlbC9jb3JlJywge1xuICAgICAgICAgIGJhc2VkaXI6IHBhcmVudERpcixcbiAgICAgICAgfSlcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXNcbiAgICAgICAgY29uc3QgYmFiZWwgPSByZXF1aXJlKC8qIHdlYnBhY2tJZ25vcmU6IHRydWUgKi8gYmFiZWxQYXRoKVxuICAgICAgICByZXF1aXJlZFBhdGhzLnB1c2goYmFiZWxQYXRoKVxuXG4gICAgICAgIGxldCBwYXJzZXI6IHR5cGVvZiBkZWZhdWx0QmFiZWxQYXJzZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBwYXJzZXJQYXRoID0gX3Jlc29sdmUuc3luYygnQGJhYmVsL3BhcnNlcicsIHtcbiAgICAgICAgICAgIGJhc2VkaXI6IHBhcmVudERpcixcbiAgICAgICAgICB9KVxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdmFyLXJlcXVpcmVzXG4gICAgICAgICAgcGFyc2VyID0gcmVxdWlyZSgvKiB3ZWJwYWNrSWdub3JlOiB0cnVlICovIHBhcnNlclBhdGgpXG4gICAgICAgICAgcmVxdWlyZWRQYXRocy5wdXNoKHBhcnNlclBhdGgpXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcGFyc2VyID0gZGVmYXVsdEJhYmVsUGFyc2VyXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsb2FkT3B0cyA9IHtcbiAgICAgICAgICBmaWxlbmFtZTogZmlsZSxcbiAgICAgICAgICBjd2Q6IFBhdGguZGlybmFtZShmaWxlKSxcbiAgICAgICAgICByb290TW9kZTogJ3Vwd2FyZC1vcHRpb25hbCcsXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFydGlhbCA9IGJhYmVsLmxvYWRQYXJ0aWFsQ29uZmlnU3luYyhsb2FkT3B0cylcbiAgICAgICAgY29uc3QgYmFiZWxyYyA9IHBhcnRpYWwuYmFiZWxyYyB8fCBwYXJ0aWFsLmNvbmZpZ1xuICAgICAgICBjb25zdCBnZXRQYXJzZXIgPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY29uZmlnID0gYmFiZWwubG9hZE9wdGlvbnNTeW5jKGxvYWRPcHRzKVxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNyZWF0ZVBhcnNlckZyb21Db25maWcocGFyc2VyLCBjb25maWcpXG4gICAgICAgICAgcmV0dXJuIGV4dG5hbWUgPT09ICcuZC50cydcbiAgICAgICAgICAgID8gcmVzdWx0LmJpbmRQYXJzZXJPcHRzKHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiBbWyd0eXBlc2NyaXB0JywgeyBkdHM6IHRydWUgfV1dLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgOiByZXN1bHRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYmFiZWxyY1xuICAgICAgICAgID8gYmFiZWxyY1BhcnNlckNhY2hlLmdldFN5bmMoXG4gICAgICAgICAgICAgIGAke2JhYmVscmN9JHtQYXRoLmRlbGltaXRlcn0ke2V4dG5hbWV9YCxcbiAgICAgICAgICAgICAgZ2V0UGFyc2VyXG4gICAgICAgICAgICApXG4gICAgICAgICAgOiBnZXRQYXJzZXIoKVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRQYXJzZXIoZXh0bmFtZSlcbiAgICAgIH1cbiAgICB9XG4gIClcbiAgcmV0dXJuICFvcHRpb25zIHx8IGlzRW1wdHkob3B0aW9ucykgPyBwYXJzZXIgOiBwYXJzZXIuYmluZFBhcnNlck9wdHMob3B0aW9ucylcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBhcnNlckFzeW5jKFxuICBmaWxlOiBzdHJpbmcsXG4gIG9wdGlvbnM/OiBQYXJzZXJPcHRpb25zXG4pOiBQcm9taXNlPFBhcnNlcj4ge1xuICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSlcbiAgY29uc3QgZXh0bmFtZSA9IGdldEV4dG5hbWUoZmlsZSlcblxuICBjb25zdCBwYXJzZXIgPSBhd2FpdCBkaXJQYXJzZXJDYWNoZS5nZXRBc3luYyhcbiAgICBgJHtwYXJlbnREaXJ9JHtQYXRoLmRlbGltaXRlcn0ke2V4dG5hbWV9YCxcbiAgICBhc3luYyAoKTogUHJvbWlzZTxQYXJzZXI+ID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJhYmVsUGF0aCA9IGF3YWl0IHJlc29sdmUoJ0BiYWJlbC9jb3JlJywge1xuICAgICAgICAgIGJhc2VkaXI6IHBhcmVudERpcixcbiAgICAgICAgfSlcbiAgICAgICAgY29uc3QgYmFiZWwgPSBhd2FpdCBpbXBvcnQoLyogd2VicGFja0lnbm9yZTogdHJ1ZSAqLyBiYWJlbFBhdGgpXG4gICAgICAgIHJlcXVpcmVkUGF0aHMucHVzaChiYWJlbFBhdGgpXG5cbiAgICAgICAgbGV0IHBhcnNlcjogdHlwZW9mIGRlZmF1bHRCYWJlbFBhcnNlclxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlclBhdGggPSBhd2FpdCByZXNvbHZlKCdAYmFiZWwvcGFyc2VyJywge1xuICAgICAgICAgICAgYmFzZWRpcjogcGFyZW50RGlyLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgcGFyc2VyID0gYXdhaXQgaW1wb3J0KC8qIHdlYnBhY2tJZ25vcmU6IHRydWUgKi8gcGFyc2VyUGF0aClcbiAgICAgICAgICByZXF1aXJlZFBhdGhzLnB1c2gocGFyc2VyUGF0aClcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBwYXJzZXIgPSBkZWZhdWx0QmFiZWxQYXJzZXJcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxvYWRPcHRzID0ge1xuICAgICAgICAgIGZpbGVuYW1lOiBmaWxlLFxuICAgICAgICAgIGN3ZDogcGFyZW50RGlyLFxuICAgICAgICAgIHJvb3RNb2RlOiAndXB3YXJkLW9wdGlvbmFsJyxcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJ0aWFsID0gYXdhaXQgYmFiZWwubG9hZFBhcnRpYWxDb25maWdBc3luYyhsb2FkT3B0cylcbiAgICAgICAgY29uc3QgYmFiZWxyYyA9IHBhcnRpYWwuYmFiZWxyYyB8fCBwYXJ0aWFsLmNvbmZpZ1xuICAgICAgICBjb25zdCBnZXRQYXJzZXIgPSBhc3luYyAoKTogUHJvbWlzZTxQYXJzZXI+ID0+IHtcbiAgICAgICAgICBjb25zdCBjb25maWcgPSBhd2FpdCBiYWJlbC5sb2FkT3B0aW9uc0FzeW5jKGxvYWRPcHRzKVxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNyZWF0ZVBhcnNlckZyb21Db25maWcocGFyc2VyLCBjb25maWcpXG4gICAgICAgICAgcmV0dXJuIGV4dG5hbWUgPT09ICcuZC50cydcbiAgICAgICAgICAgID8gcmVzdWx0LmJpbmRQYXJzZXJPcHRzKHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiBbWyd0eXBlc2NyaXB0JywgeyBkdHM6IHRydWUgfV1dLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgOiByZXN1bHRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYmFiZWxyY1xuICAgICAgICAgID8gYXdhaXQgYmFiZWxyY1BhcnNlckNhY2hlLmdldEFzeW5jKFxuICAgICAgICAgICAgICBgJHtiYWJlbHJjfSR7UGF0aC5kZWxpbWl0ZXJ9JHtleHRuYW1lfWAsXG4gICAgICAgICAgICAgIGdldFBhcnNlclxuICAgICAgICAgICAgKVxuICAgICAgICAgIDogYXdhaXQgZ2V0UGFyc2VyKClcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0UGFyc2VyKGV4dG5hbWUpXG4gICAgICB9XG4gICAgfVxuICApXG4gIHJldHVybiAhb3B0aW9ucyB8fCBpc0VtcHR5KG9wdGlvbnMpID8gcGFyc2VyIDogcGFyc2VyLmJpbmRQYXJzZXJPcHRzKG9wdGlvbnMpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN5bmMoXG4gIGZpbGU6IHN0cmluZyxcbiAge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnLFxuICAgIC4uLm9wdGlvbnNcbiAgfTogeyBlbmNvZGluZz86IEJ1ZmZlckVuY29kaW5nIH0gJiBQYXJzZXJPcHRpb25zID0ge31cbik6IHQuRmlsZSB7XG4gIGNvbnN0IHBhcnNlciA9IGdldFBhcnNlclN5bmMoZmlsZSwgb3B0aW9ucylcbiAgcmV0dXJuIHBhcnNlci5wYXJzZShyZWFkRmlsZVN5bmMoZmlsZSwgZW5jb2RpbmcpKVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VBc3luYyhcbiAgZmlsZTogc3RyaW5nLFxuICB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCcsXG4gICAgLi4ub3B0aW9uc1xuICB9OiB7IGVuY29kaW5nPzogQnVmZmVyRW5jb2RpbmcgfSAmIFBhcnNlck9wdGlvbnMgPSB7fVxuKTogUHJvbWlzZTx0LkZpbGU+IHtcbiAgY29uc3QgcGFyc2VyID0gYXdhaXQgZ2V0UGFyc2VyQXN5bmMoZmlsZSwgb3B0aW9ucylcbiAgcmV0dXJuIHBhcnNlci5wYXJzZShhd2FpdCByZWFkRmlsZShmaWxlLCBlbmNvZGluZykpXG59XG4iXSwibWFwcGluZ3MiOiI7O0FBQUEsT0FBTyxLQUFLQSxDQUFaLE1BQW1CLGNBQW5CO0FBQ0EsT0FBTyxLQUFLQyxJQUFaLE1BQXNCLE1BQXRCO0FBQ0EsT0FBT0MsUUFBUCxNQUFxQixTQUFyQjtBQUNBLFNBQVNDLFNBQVQsUUFBMEIsTUFBMUI7QUFDQSxPQUFPLEtBQUtDLGtCQUFaLE1BQW9DLGVBQXBDO0FBRUEsU0FBU0MsUUFBUSxJQUFJQyxTQUFyQixFQUFnQ0MsWUFBaEMsUUFBb0QsSUFBcEQ7QUFDQSxNQUFNRixRQUFRLEdBQUdGLFNBQVMsQ0FBQ0csU0FBRCxDQUExQixDLENBRUE7O0FBQ0EsU0FBU0UsT0FBVCxDQUFpQkMsR0FBakIsRUFBb0M7RUFDbEMsS0FBSyxNQUFNQyxHQUFYLElBQWtCRCxHQUFsQixFQUF1QixPQUFPLEtBQVA7O0VBQ3ZCLE9BQU8sSUFBUDtBQUNEOztBQUlELFNBQVNFLFVBQVQsQ0FBb0JDLENBQXBCLEVBQTZDO0VBQzNDLE9BQU8sT0FBT0EsQ0FBUCxLQUFhLFFBQWIsR0FBd0JBLENBQXhCLEdBQTRCQSxDQUFDLENBQUMsQ0FBRCxDQUFwQztBQUNEOztBQUVELFNBQVNDLFVBQVQsQ0FBb0JELENBQXBCLEVBQTBDO0VBQ3hDLE9BQU8sT0FBT0EsQ0FBUCxLQUFhLFFBQWIsR0FBd0IsRUFBeEIsR0FBNkJBLENBQUMsQ0FBQyxDQUFELENBQXJDO0FBQ0Q7O0FBRUQsU0FBU0UsZUFBVCxDQUF5QkMsQ0FBekIsRUFBMENDLENBQTFDLEVBQW9FO0VBQ2xFLE9BQ0VMLFVBQVUsQ0FBQ0ksQ0FBRCxDQUFWLEtBQWtCSixVQUFVLENBQUNLLENBQUQsQ0FBNUIsSUFDQWhCLENBQUMsQ0FBQ2lCLFlBQUYsQ0FBZUosVUFBVSxDQUFDRSxDQUFELENBQXpCLEVBQThCRixVQUFVLENBQUNHLENBQUQsQ0FBeEMsQ0FGRjtBQUlEOztBQUVELFNBQVNFLFlBQVQsQ0FDRUgsQ0FERixFQUVFQyxDQUZGLEVBRzhCO0VBQzVCLElBQUksQ0FBQ0EsQ0FBTCxFQUFRLE9BQU9ELENBQVA7RUFDUixJQUFJLENBQUNBLENBQUwsRUFBUSxPQUFPQyxDQUFQO0VBRVIsSUFBSUEsQ0FBQyxDQUFDRyxLQUFGLENBQVNDLEVBQUQsSUFBUUwsQ0FBQyxDQUFDTSxJQUFGLENBQVFDLEVBQUQsSUFBUVIsZUFBZSxDQUFDUSxFQUFELEVBQUtGLEVBQUwsQ0FBOUIsQ0FBaEIsQ0FBSixFQUE4RCxPQUFPTCxDQUFQLENBSmxDLENBTTVCOztFQUNBLE1BQU1RLEdBQXFCLEdBQUcsSUFBSUMsR0FBSixFQUM1QjtFQUNBVCxDQUFDLENBQUNRLEdBQUYsQ0FBT1gsQ0FBRCxJQUNKYSxLQUFLLENBQUNDLE9BQU4sQ0FBY2QsQ0FBZCxJQUFtQkEsQ0FBbkIsR0FBdUIsQ0FBQ0EsQ0FBRCxFQUFJZSxTQUFKLENBRHpCLENBRjRCLENBQTlCOztFQU1BLEtBQUssTUFBTWYsQ0FBWCxJQUFnQkksQ0FBaEIsRUFBbUI7SUFDakIsSUFBSVMsS0FBSyxDQUFDQyxPQUFOLENBQWNkLENBQWQsQ0FBSixFQUFzQlcsR0FBRyxDQUFDSyxHQUFKLENBQVFoQixDQUFDLENBQUMsQ0FBRCxDQUFULEVBQWMsRUFBRSxHQUFHVyxHQUFHLENBQUNNLEdBQUosQ0FBUWpCLENBQUMsQ0FBQyxDQUFELENBQVQsQ0FBTDtNQUFvQixHQUFHQSxDQUFDLENBQUMsQ0FBRDtJQUF4QixDQUFkLEVBQXRCLEtBQ0ssSUFBSSxDQUFDVyxHQUFHLENBQUNPLEdBQUosQ0FBUWxCLENBQVIsQ0FBTCxFQUFpQlcsR0FBRyxDQUFDSyxHQUFKLENBQVFoQixDQUFSLEVBQVdXLEdBQUcsQ0FBQ00sR0FBSixDQUFRakIsQ0FBUixDQUFYO0VBQ3ZCOztFQUNELE9BQU8sQ0FBQyxHQUFHVyxHQUFHLENBQUNRLE9BQUosRUFBSixFQUFtQlIsR0FBbkIsRUFDTDtFQUNDUyxDQUFELElBQXVCQSxDQUFDLENBQUMsQ0FBRCxDQUFELEtBQVNMLFNBQVQsR0FBcUJLLENBQUMsQ0FBQyxDQUFELENBQXRCLEdBQTRCQSxDQUY5QyxDQUdMO0VBSEssQ0FBUDtBQUtEOztBQUVELFNBQVNDLGFBQVQsQ0FDRWxCLENBREYsRUFFRUMsQ0FGRixFQUc4QjtFQUM1QixJQUFJLENBQUNBLENBQUMsQ0FBQ2tCLElBQUYsQ0FBUUMsTUFBRCxJQUFZcEIsQ0FBWixhQUFZQSxDQUFaLHVCQUFZQSxDQUFDLENBQUVtQixJQUFILENBQVN0QixDQUFELElBQU9ELFVBQVUsQ0FBQ0MsQ0FBRCxDQUFWLEtBQWtCdUIsTUFBakMsQ0FBbkIsQ0FBTCxFQUFtRTtJQUNqRSxPQUFPcEIsQ0FBUDtFQUNEOztFQUNELE9BQU9BLENBQVAsYUFBT0EsQ0FBUCx1QkFBT0EsQ0FBQyxDQUFFcUIsTUFBSCxDQUFXeEIsQ0FBRCxJQUFPLENBQUNJLENBQUMsQ0FBQ3FCLFFBQUYsQ0FBVzFCLFVBQVUsQ0FBQ0MsQ0FBRCxDQUFyQixDQUFsQixDQUFQO0FBQ0Q7O0FBRUQsT0FBTyxNQUFNMEIsTUFBTixDQUFhO0VBU2xCQyxXQUFXLENBQUNDLFdBQUQsRUFBMkJDLFVBQTNCLEVBQXNEO0lBQUE7O0lBQUE7O0lBQUE7O0lBQUE7O0lBQUE7O0lBQUE7O0lBQy9ELEtBQUtELFdBQUwsR0FBbUJBLFdBQW5CO0lBQ0EsS0FBS0MsVUFBTCxHQUFrQkEsVUFBbEI7RUFDRDs7RUFFREMsS0FBSyxDQUFDQyxJQUFELEVBQWVGLFVBQWYsRUFBbUQ7SUFDdEQsT0FBT0EsVUFBVSxHQUNiLEtBQUtHLGNBQUwsQ0FBb0JILFVBQXBCLEVBQWdDQyxLQUFoQyxDQUFzQ0MsSUFBdEMsQ0FEYSxHQUViLEtBQUtILFdBQUwsQ0FBaUJFLEtBQWpCLENBQXVCQyxJQUF2QixFQUE2QixLQUFLRixVQUFsQyxDQUZKO0VBR0Q7O0VBRURJLGVBQWUsQ0FBQ0YsSUFBRCxFQUFlRixVQUFmLEVBQXlEO0lBQ3RFLE9BQU9BLFVBQVUsR0FDYixLQUFLRyxjQUFMLENBQW9CSCxVQUFwQixFQUFnQ0ksZUFBaEMsQ0FBZ0RGLElBQWhELENBRGEsR0FFYixLQUFLSCxXQUFMLENBQWlCSyxlQUFqQixDQUFpQ0YsSUFBakMsRUFBdUMsS0FBS0YsVUFBNUMsQ0FGSjtFQUdEOztFQUVERyxjQUFjLENBQUNILFVBQUQsRUFBb0M7SUFDaEQsT0FBTyxJQUFJSCxNQUFKLENBQVcsS0FBS0UsV0FBaEIsRUFBNkIsRUFDbEMsR0FBRyxLQUFLQyxVQUQwQjtNQUVsQyxHQUFHQSxVQUYrQjtNQUdsQ0ssT0FBTyxFQUFFNUIsWUFBWSxDQUFDLEtBQUt1QixVQUFMLENBQWdCSyxPQUFqQixFQUEwQkwsVUFBVSxDQUFDSyxPQUFyQztJQUhhLENBQTdCLENBQVA7RUFLRDs7RUFFRDVCLFlBQVksQ0FBQyxHQUFHNEIsT0FBSixFQUFxQztJQUMvQyxNQUFNQyxNQUFNLEdBQUc3QixZQUFZLENBQUMsS0FBS3VCLFVBQUwsQ0FBZ0JLLE9BQWpCLEVBQTBCQSxPQUExQixDQUEzQjtJQUNBLE9BQU9DLE1BQU0sS0FBSyxLQUFLTixVQUFMLENBQWdCSyxPQUEzQixHQUNILElBREcsR0FFSCxJQUFJUixNQUFKLENBQVcsS0FBS0UsV0FBaEIsRUFBNkIsRUFDM0IsR0FBRyxLQUFLQyxVQURtQjtNQUUzQkssT0FBTyxFQUFFQztJQUZrQixDQUE3QixDQUZKO0VBTUQ7O0VBRURkLGFBQWEsQ0FBQyxHQUFHYSxPQUFKLEVBQStCO0lBQzFDLE1BQU1FLE9BQU8sR0FBR2YsYUFBYSxDQUFDLEtBQUtRLFVBQUwsQ0FBZ0JLLE9BQWpCLEVBQTBCQSxPQUExQixDQUE3QjtJQUNBLE9BQU9FLE9BQU8sS0FBSyxLQUFLUCxVQUFMLENBQWdCSyxPQUE1QixHQUNILElBREcsR0FFSCxJQUFJUixNQUFKLENBQVcsS0FBS0UsV0FBaEIsRUFBNkIsRUFDM0IsR0FBRyxLQUFLQyxVQURtQjtNQUUzQkssT0FBTyxFQUFFRTtJQUZrQixDQUE3QixDQUZKO0VBTUQ7O0VBRVEsSUFBTEMsS0FBSyxHQUFXO0lBQ2xCLE9BQ0UsS0FBS0MsTUFBTCxLQUNDLEtBQUtBLE1BQUwsR0FBYyxDQUFDLE1BQU07TUFBQTs7TUFDcEIsSUFDRSwyQkFBQyxLQUFLVCxVQUFMLENBQWdCSyxPQUFqQixrREFBQyxzQkFBeUJaLElBQXpCLENBQStCdEIsQ0FBRCxJQUFPRCxVQUFVLENBQUNDLENBQUQsQ0FBVixLQUFrQixZQUF2RCxDQUFELENBREYsRUFHRSxPQUFPLElBQVA7TUFDRixPQUFPLEtBQUtxQixhQUFMLENBQ0wsWUFESyxFQUVMLG1CQUZLLEVBR0xmLFlBSEssQ0FHUSxDQUFDLE1BQUQsRUFBUztRQUFFaUMsR0FBRyxFQUFFO01BQVAsQ0FBVCxDQUhSLEVBR2lDLGNBSGpDLEVBR2lELEtBSGpELEVBR3dELENBQzdELFlBRDZELEVBRTdEO1FBQUVDLHNCQUFzQixFQUFFO01BQTFCLENBRjZELENBSHhELENBQVA7SUFPRCxDQVpjLEdBRGYsQ0FERjtFQWdCRDs7RUFFUSxJQUFMQyxLQUFLLEdBQVc7SUFDbEIsT0FDRSxLQUFLQyxNQUFMLEtBQ0MsS0FBS0EsTUFBTCxHQUFjLEtBQUtyQixhQUFMLENBQ2IsTUFEYSxFQUViLGNBRmEsRUFHYixZQUhhLEVBSWIsS0FKYSxFQUtiZixZQUxhLENBS0EsQ0FBQyxZQUFELEVBQWU7TUFBRXFDLEdBQUcsRUFBRTtJQUFQLENBQWYsQ0FMQSxFQUtnQyxtQkFMaEMsQ0FEZixDQURGO0VBU0Q7O0VBRVMsSUFBTkMsTUFBTSxHQUFXO0lBQ25CLE9BQ0UsS0FBS0MsT0FBTCxLQUNDLEtBQUtBLE9BQUwsR0FBZSxLQUFLeEIsYUFBTCxDQUNkLE1BRGMsRUFFZCxjQUZjLEVBR2QsWUFIYyxFQUlkZixZQUpjLENBS2QsQ0FBQyxZQUFELEVBQWU7TUFBRXdDLHdCQUF3QixFQUFFLElBQTVCO01BQWtDSCxHQUFHLEVBQUU7SUFBdkMsQ0FBZixDQUxjLEVBTWQsbUJBTmMsRUFPZCxLQVBjLENBRGhCLENBREY7RUFZRDs7RUFFUyxJQUFOSSxNQUFNLEdBQVc7SUFDbkIsT0FDRSxLQUFLQyxPQUFMLEtBQ0MsS0FBS0EsT0FBTCxHQUFlLEtBQUszQixhQUFMLENBQ2QsTUFEYyxFQUVkLGNBRmMsRUFHZCxZQUhjLEVBSWQsS0FKYyxFQUtkZixZQUxjLENBS0QsQ0FBQyxZQUFELEVBQWU7TUFBRXFDLEdBQUcsRUFBRTtJQUFQLENBQWYsQ0FMQyxFQUs4QixtQkFMOUIsQ0FEaEIsQ0FERjtFQVNEOztFQUVETSxZQUFZLENBQUM3QixDQUFELEVBQW9CO0lBQzlCLElBQUksK0JBQStCOEIsSUFBL0IsQ0FBb0M5QixDQUFwQyxDQUFKLEVBQTRDLE9BQU8sS0FBS2lCLEtBQVo7SUFDNUMsSUFBSSxnQkFBZ0JhLElBQWhCLENBQXFCOUIsQ0FBckIsQ0FBSixFQUE2QixPQUFPLEtBQUsyQixNQUFaO0lBQzdCLElBQUksbUJBQW1CRyxJQUFuQixDQUF3QjlCLENBQXhCLENBQUosRUFBZ0MsT0FBTyxLQUFLd0IsTUFBWjtJQUNoQyxJQUFJLGtCQUFrQk0sSUFBbEIsQ0FBdUI5QixDQUF2QixDQUFKLEVBQStCLE9BQU8sS0FBS3FCLEtBQVo7SUFDL0IsT0FBTyxJQUFQO0VBQ0Q7O0FBdEhpQjtBQXlIcEIsT0FBTyxNQUFNVSxRQUFnQixHQUFHLElBQUl6QixNQUFKLENBQVdsQyxrQkFBWCxFQUErQjtFQUM3RDRELFVBQVUsRUFBRSxRQURpRDtFQUU3REMsMkJBQTJCLEVBQUUsSUFGZ0M7RUFHN0RDLDBCQUEwQixFQUFFLElBSGlDO0VBSTdEQyxTQUFTLEVBQUUsQ0FKa0Q7RUFLN0RyQixPQUFPLEVBQUUsQ0FDUCxDQUFDLE1BQUQsRUFBUztJQUFFSyxHQUFHLEVBQUU7RUFBUCxDQUFULENBRE8sRUFFUCxjQUZPLEVBR1AsS0FITyxFQUlQLGlCQUpPLEVBS1AsUUFMTyxFQU1QLGlCQU5PLEVBT1Asd0JBUE8sRUFRUCxxQkFSTyxFQVNQLGtCQVRPLEVBVVAsZUFWTyxFQVdQLHFCQVhPLEVBWVAsY0FaTyxFQWFQLFlBYk8sRUFjUCxtQkFkTyxFQWVQLG1CQWZPLEVBZ0JQLDJCQWhCTyxFQWlCUCxrQkFqQk8sRUFrQlAsa0JBbEJPLEVBbUJQLHNCQW5CTyxFQW9CUCxrQkFwQk8sRUFxQlAsV0FyQk8sRUFzQlAsZUF0Qk87QUFMb0QsQ0FBL0IsQ0FBekI7QUErQlAsT0FBTyxNQUFNaUIsUUFBZ0IsR0FBR0wsUUFBUSxDQUFDVixLQUFsQztBQUNQLE9BQU8sTUFBTWdCLFNBQWlCLEdBQUdOLFFBQVEsQ0FBQ1AsTUFBbkM7QUFDUCxPQUFPLE1BQU1jLFNBQWlCLEdBQUdQLFFBQVEsQ0FBQ0osTUFBbkM7O0FBRVAsU0FBU1ksYUFBVCxDQUF1QkMsT0FBdkIsRUFBZ0Q7RUFDOUMsT0FBT1QsUUFBUSxDQUFDRixZQUFULENBQXNCVyxPQUF0QixDQUFQO0FBQ0Q7O0FBRUQsTUFBTUMsT0FJYyxHQUFHdEUsU0FBUyxDQUFDRCxRQUFELENBSmhDO0FBTUEsTUFBTXdFLGFBQXVCLEdBQUcsRUFBaEM7O0FBRUEsTUFBTUMsS0FBTixDQUFrQjtFQUFBO0lBQUEsbUNBQ08sSUFBSW5ELEdBQUosRUFEUDs7SUFBQSxvQ0FFaUIsSUFBSUEsR0FBSixFQUZqQjtFQUFBOztFQUloQm9ELE9BQU8sQ0FBQ2xFLEdBQUQsRUFBU21FLEtBQVQsRUFBNEI7SUFDakMsSUFBSUMsTUFBTSxHQUFHLEtBQUtDLFNBQUwsQ0FBZWxELEdBQWYsQ0FBbUJuQixHQUFuQixDQUFiOztJQUNBLElBQUksQ0FBQ29FLE1BQUwsRUFBYTtNQUNYQSxNQUFNLEdBQUdELEtBQUssRUFBZDtNQUNBLEtBQUtFLFNBQUwsQ0FBZW5ELEdBQWYsQ0FBbUJsQixHQUFuQixFQUF3Qm9FLE1BQXhCO01BQ0EsS0FBS0UsVUFBTCxDQUFnQnBELEdBQWhCLENBQW9CbEIsR0FBcEIsRUFBeUJ1RSxPQUFPLENBQUNSLE9BQVIsQ0FBZ0JLLE1BQWhCLENBQXpCO0lBQ0Q7O0lBQ0QsT0FBT0EsTUFBUDtFQUNEOztFQUVESSxRQUFRLENBQUN4RSxHQUFELEVBQVNtRSxLQUFULEVBQThDO0lBQ3BELElBQUlDLE1BQU0sR0FBRyxLQUFLRSxVQUFMLENBQWdCbkQsR0FBaEIsQ0FBb0JuQixHQUFwQixDQUFiOztJQUNBLElBQUksQ0FBQ29FLE1BQUwsRUFBYTtNQUNYQSxNQUFNLEdBQUdELEtBQUssRUFBZDtNQUNBLEtBQUtHLFVBQUwsQ0FBZ0JwRCxHQUFoQixDQUFvQmxCLEdBQXBCLEVBQXlCb0UsTUFBekI7TUFDQUEsTUFBTSxDQUFDSyxJQUFQLENBQWFDLEtBQUQsSUFBVztRQUNyQjtRQUNBLElBQUksS0FBS0osVUFBTCxDQUFnQm5ELEdBQWhCLENBQW9CbkIsR0FBcEIsTUFBNkJvRSxNQUFqQyxFQUF5QztVQUN2QyxLQUFLQyxTQUFMLENBQWVuRCxHQUFmLENBQW1CbEIsR0FBbkIsRUFBd0IwRSxLQUF4QjtRQUNEO01BQ0YsQ0FMRDtJQU1EOztJQUNELE9BQU9OLE1BQVA7RUFDRDs7RUFFRE8sS0FBSyxHQUFHO0lBQ04sS0FBS04sU0FBTCxDQUFlTSxLQUFmO0lBQ0EsS0FBS0wsVUFBTCxDQUFnQkssS0FBaEI7RUFDRDs7QUFoQ2U7O0FBbUNsQixNQUFNQyxjQUFjLEdBQUcsSUFBSVgsS0FBSixFQUF2QjtBQUNBLE1BQU1ZLGtCQUFrQixHQUFHLElBQUlaLEtBQUosRUFBM0I7QUFFQSxPQUFPLFNBQVNhLFVBQVQsR0FBNEI7RUFDakNGLGNBQWMsQ0FBQ0QsS0FBZjtFQUNBRSxrQkFBa0IsQ0FBQ0YsS0FBbkI7O0VBQ0EsS0FBSyxNQUFNSSxJQUFYLElBQW1CZixhQUFuQixFQUFrQztJQUNoQyxPQUFPZ0IsT0FBTyxDQUFDQyxLQUFSLENBQWNGLElBQWQsQ0FBUDtFQUNEOztFQUNEZixhQUFhLENBQUNrQixNQUFkLEdBQXVCLENBQXZCO0FBQ0QsQyxDQUVEOztBQUNBLFNBQVNDLHNCQUFULENBQWdDckQsV0FBaEMsRUFBMERzRCxNQUExRCxFQUErRTtFQUM3RSxNQUFNO0lBQUVoRCxPQUFGO0lBQVdrQjtFQUFYLElBQTBCOEIsTUFBaEM7RUFDQSxNQUFNQyxJQUFJLEdBQUc7SUFDWHRELFVBQVUsRUFBRTtNQUFFSyxPQUFPLEVBQUUsRUFBWDtNQUFla0I7SUFBZixDQUREO0lBRVhnQyxhQUFhLEVBQUU7RUFGSixDQUFiOztFQUlBLEtBQUssTUFBTTtJQUFFQztFQUFGLENBQVgsSUFBb0NuRCxPQUFwQyxFQUE2QztJQUMzQ21ELGlCQUFpQixTQUFqQixJQUFBQSxpQkFBaUIsV0FBakIsWUFBQUEsaUJBQWlCLENBQUdGLElBQUgsRUFBU0EsSUFBSSxDQUFDdEQsVUFBZCxDQUFqQjtFQUNEOztFQUNELE9BQU8sSUFBSUgsTUFBSixDQUFXRSxXQUFYLEVBQXdCdUQsSUFBSSxDQUFDdEQsVUFBN0IsQ0FBUDtBQUNEOztBQUVELFNBQVN5RCxVQUFULENBQW9CQyxJQUFwQixFQUEwQztFQUFBOztFQUN4QyxPQUFPLDJDQUFpQ0MsSUFBakMsQ0FBc0NELElBQXRDLGlEQUE4QyxDQUE5QyxNQUFvRCxFQUEzRDtBQUNEOztBQUVELE9BQU8sU0FBU0UsYUFBVCxDQUF1QkYsSUFBdkIsRUFBcUNHLE9BQXJDLEVBQXNFO0VBQzNFLE1BQU1DLFNBQVMsR0FBR3RHLElBQUksQ0FBQ3VHLE9BQUwsQ0FBYUwsSUFBYixDQUFsQjtFQUNBLE1BQU0zQixPQUFPLEdBQUcwQixVQUFVLENBQUNDLElBQUQsQ0FBMUI7RUFDQSxNQUFNTSxNQUFNLEdBQUduQixjQUFjLENBQUNWLE9BQWYsQ0FDWixHQUFFMkIsU0FBVSxHQUFFdEcsSUFBSSxDQUFDeUcsU0FBVSxHQUFFbEMsT0FBUSxFQUQzQixFQUViLE1BQU07SUFDSixJQUFJO01BQ0YsTUFBTW1DLFNBQVMsR0FBR3pHLFFBQVEsQ0FBQzBHLElBQVQsQ0FBYyxhQUFkLEVBQTZCO1FBQzdDQyxPQUFPLEVBQUVOO01BRG9DLENBQTdCLENBQWxCLENBREUsQ0FJRjs7O01BQ0EsTUFBTU8sS0FBSyxHQUFHcEIsT0FBTztNQUFDO01BQTBCaUIsU0FBM0IsQ0FBckI7O01BQ0FqQyxhQUFhLENBQUNxQyxJQUFkLENBQW1CSixTQUFuQjtNQUVBLElBQUlGLE1BQUo7O01BQ0EsSUFBSTtRQUNGLE1BQU1PLFVBQVUsR0FBRzlHLFFBQVEsQ0FBQzBHLElBQVQsQ0FBYyxlQUFkLEVBQStCO1VBQ2hEQyxPQUFPLEVBQUVOO1FBRHVDLENBQS9CLENBQW5CLENBREUsQ0FJRjs7O1FBQ0FFLE1BQU0sR0FBR2YsT0FBTztRQUFDO1FBQTBCc0IsVUFBM0IsQ0FBaEI7UUFDQXRDLGFBQWEsQ0FBQ3FDLElBQWQsQ0FBbUJDLFVBQW5CO01BQ0QsQ0FQRCxDQU9FLE9BQU9DLEtBQVAsRUFBYztRQUNkUixNQUFNLEdBQUdyRyxrQkFBVDtNQUNEOztNQUVELE1BQU04RyxRQUFRLEdBQUc7UUFDZkMsUUFBUSxFQUFFaEIsSUFESztRQUVmaUIsR0FBRyxFQUFFbkgsSUFBSSxDQUFDdUcsT0FBTCxDQUFhTCxJQUFiLENBRlU7UUFHZmtCLFFBQVEsRUFBRTtNQUhLLENBQWpCO01BS0EsTUFBTUMsT0FBTyxHQUFHUixLQUFLLENBQUNTLHFCQUFOLENBQTRCTCxRQUE1QixDQUFoQjtNQUNBLE1BQU1NLE9BQU8sR0FBR0YsT0FBTyxDQUFDRSxPQUFSLElBQW1CRixPQUFPLENBQUN4QixNQUEzQzs7TUFDQSxNQUFNMkIsU0FBUyxHQUFHLE1BQU07UUFDdEIsTUFBTTNCLE1BQU0sR0FBR2dCLEtBQUssQ0FBQ1ksZUFBTixDQUFzQlIsUUFBdEIsQ0FBZjtRQUNBLE1BQU1wQyxNQUFNLEdBQUdlLHNCQUFzQixDQUFDWSxNQUFELEVBQVNYLE1BQVQsQ0FBckM7UUFDQSxPQUFPdEIsT0FBTyxLQUFLLE9BQVosR0FDSE0sTUFBTSxDQUFDbEMsY0FBUCxDQUFzQjtVQUNwQkUsT0FBTyxFQUFFLENBQUMsQ0FBQyxZQUFELEVBQWU7WUFBRVMsR0FBRyxFQUFFO1VBQVAsQ0FBZixDQUFEO1FBRFcsQ0FBdEIsQ0FERyxHQUlIdUIsTUFKSjtNQUtELENBUkQ7O01BU0EsT0FBTzBDLE9BQU8sR0FDVmpDLGtCQUFrQixDQUFDWCxPQUFuQixDQUNHLEdBQUU0QyxPQUFRLEdBQUV2SCxJQUFJLENBQUN5RyxTQUFVLEdBQUVsQyxPQUFRLEVBRHhDLEVBRUVpRCxTQUZGLENBRFUsR0FLVkEsU0FBUyxFQUxiO0lBTUQsQ0ExQ0QsQ0EwQ0UsT0FBT1IsS0FBUCxFQUFjO01BQ2QsT0FBTzFDLGFBQWEsQ0FBQ0MsT0FBRCxDQUFwQjtJQUNEO0VBQ0YsQ0FoRFksQ0FBZjtFQWtEQSxPQUFPLENBQUM4QixPQUFELElBQVk5RixPQUFPLENBQUM4RixPQUFELENBQW5CLEdBQStCRyxNQUEvQixHQUF3Q0EsTUFBTSxDQUFDN0QsY0FBUCxDQUFzQjBELE9BQXRCLENBQS9DO0FBQ0Q7QUFFRCxPQUFPLGVBQWVxQixjQUFmLENBQ0x4QixJQURLLEVBRUxHLE9BRkssRUFHWTtFQUNqQixNQUFNQyxTQUFTLEdBQUd0RyxJQUFJLENBQUN1RyxPQUFMLENBQWFMLElBQWIsQ0FBbEI7RUFDQSxNQUFNM0IsT0FBTyxHQUFHMEIsVUFBVSxDQUFDQyxJQUFELENBQTFCO0VBRUEsTUFBTU0sTUFBTSxHQUFHLE1BQU1uQixjQUFjLENBQUNKLFFBQWYsQ0FDbEIsR0FBRXFCLFNBQVUsR0FBRXRHLElBQUksQ0FBQ3lHLFNBQVUsR0FBRWxDLE9BQVEsRUFEckIsRUFFbkIsWUFBNkI7SUFDM0IsSUFBSTtNQUNGLE1BQU1tQyxTQUFTLEdBQUcsTUFBTWxDLE9BQU8sQ0FBQyxhQUFELEVBQWdCO1FBQzdDb0MsT0FBTyxFQUFFTjtNQURvQyxDQUFoQixDQUEvQjtNQUdBLE1BQU1PLEtBQUssR0FBRyxNQUFNO01BQU87TUFBMEJILFNBQWpDLENBQXBCO01BQ0FqQyxhQUFhLENBQUNxQyxJQUFkLENBQW1CSixTQUFuQjtNQUVBLElBQUlGLE1BQUo7O01BQ0EsSUFBSTtRQUNGLE1BQU1PLFVBQVUsR0FBRyxNQUFNdkMsT0FBTyxDQUFDLGVBQUQsRUFBa0I7VUFDaERvQyxPQUFPLEVBQUVOO1FBRHVDLENBQWxCLENBQWhDO1FBR0FFLE1BQU0sR0FBRyxNQUFNO1FBQU87UUFBMEJPLFVBQWpDLENBQWY7UUFDQXRDLGFBQWEsQ0FBQ3FDLElBQWQsQ0FBbUJDLFVBQW5CO01BQ0QsQ0FORCxDQU1FLE9BQU9DLEtBQVAsRUFBYztRQUNkUixNQUFNLEdBQUdyRyxrQkFBVDtNQUNEOztNQUVELE1BQU04RyxRQUFRLEdBQUc7UUFDZkMsUUFBUSxFQUFFaEIsSUFESztRQUVmaUIsR0FBRyxFQUFFYixTQUZVO1FBR2ZjLFFBQVEsRUFBRTtNQUhLLENBQWpCO01BS0EsTUFBTUMsT0FBTyxHQUFHLE1BQU1SLEtBQUssQ0FBQ2Msc0JBQU4sQ0FBNkJWLFFBQTdCLENBQXRCO01BQ0EsTUFBTU0sT0FBTyxHQUFHRixPQUFPLENBQUNFLE9BQVIsSUFBbUJGLE9BQU8sQ0FBQ3hCLE1BQTNDOztNQUNBLE1BQU0yQixTQUFTLEdBQUcsWUFBNkI7UUFDN0MsTUFBTTNCLE1BQU0sR0FBRyxNQUFNZ0IsS0FBSyxDQUFDZSxnQkFBTixDQUF1QlgsUUFBdkIsQ0FBckI7UUFDQSxNQUFNcEMsTUFBTSxHQUFHZSxzQkFBc0IsQ0FBQ1ksTUFBRCxFQUFTWCxNQUFULENBQXJDO1FBQ0EsT0FBT3RCLE9BQU8sS0FBSyxPQUFaLEdBQ0hNLE1BQU0sQ0FBQ2xDLGNBQVAsQ0FBc0I7VUFDcEJFLE9BQU8sRUFBRSxDQUFDLENBQUMsWUFBRCxFQUFlO1lBQUVTLEdBQUcsRUFBRTtVQUFQLENBQWYsQ0FBRDtRQURXLENBQXRCLENBREcsR0FJSHVCLE1BSko7TUFLRCxDQVJEOztNQVNBLE9BQU8wQyxPQUFPLEdBQ1YsTUFBTWpDLGtCQUFrQixDQUFDTCxRQUFuQixDQUNILEdBQUVzQyxPQUFRLEdBQUV2SCxJQUFJLENBQUN5RyxTQUFVLEdBQUVsQyxPQUFRLEVBRGxDLEVBRUppRCxTQUZJLENBREksR0FLVixNQUFNQSxTQUFTLEVBTG5CO0lBTUQsQ0F4Q0QsQ0F3Q0UsT0FBT1IsS0FBUCxFQUFjO01BQ2QsT0FBTzFDLGFBQWEsQ0FBQ0MsT0FBRCxDQUFwQjtJQUNEO0VBQ0YsQ0E5Q2tCLENBQXJCO0VBZ0RBLE9BQU8sQ0FBQzhCLE9BQUQsSUFBWTlGLE9BQU8sQ0FBQzhGLE9BQUQsQ0FBbkIsR0FBK0JHLE1BQS9CLEdBQXdDQSxNQUFNLENBQUM3RCxjQUFQLENBQXNCMEQsT0FBdEIsQ0FBL0M7QUFDRDtBQUVELE9BQU8sU0FBU3dCLFNBQVQsQ0FDTDNCLElBREssRUFFTDtFQUNFNEIsUUFBUSxHQUFHLE1BRGI7RUFFRSxHQUFHekI7QUFGTCxJQUdtRCxFQUw5QyxFQU1HO0VBQ1IsTUFBTUcsTUFBTSxHQUFHSixhQUFhLENBQUNGLElBQUQsRUFBT0csT0FBUCxDQUE1QjtFQUNBLE9BQU9HLE1BQU0sQ0FBQy9ELEtBQVAsQ0FBYW5DLFlBQVksQ0FBQzRGLElBQUQsRUFBTzRCLFFBQVAsQ0FBekIsQ0FBUDtBQUNEO0FBRUQsT0FBTyxlQUFlQyxVQUFmLENBQ0w3QixJQURLLEVBRUw7RUFDRTRCLFFBQVEsR0FBRyxNQURiO0VBRUUsR0FBR3pCO0FBRkwsSUFHbUQsRUFMOUMsRUFNWTtFQUNqQixNQUFNRyxNQUFNLEdBQUcsTUFBTWtCLGNBQWMsQ0FBQ3hCLElBQUQsRUFBT0csT0FBUCxDQUFuQztFQUNBLE9BQU9HLE1BQU0sQ0FBQy9ELEtBQVAsQ0FBYSxNQUFNckMsUUFBUSxDQUFDOEYsSUFBRCxFQUFPNEIsUUFBUCxDQUEzQixDQUFQO0FBQ0QifQ==