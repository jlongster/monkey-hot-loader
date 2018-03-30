'use strict';
var fs = require('fs');
var path = require('path');
var loaderUtils = require('loader-utils');
var SourceNode = require('source-map').SourceNode;
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var acorn = require('acorn');
var makeIdentitySourceMap = require('./makeIdentitySourceMap');
var patcherCode = fs.readFileSync(path.join(__dirname, 'patcher.js'), 'utf8');

module.exports = function(source, map, meta) {
  if(this.cacheable) {
    this.cacheable()
  }

  var query = loaderUtils.parseQuery(this.query)

  var ast = acorn.parse(source, query);
  var needsDefaultBinding = false;
  var names = ast.body
      .map(function(node) {
        needsDefaultBinding = (
          needsDefaultBinding ||
          (
            node.type === 'ExportDefaultDeclaration' &&
            node.declaration.type !== 'FunctionDeclaration'
          )
        );
        if (node.type === 'ExportDefaultDeclaration') {
          return node.declaration;
        }
        if (node.type === 'ExportNamedDeclaration') {
          return node.declaration;
        }
        return node;
      })
      .filter(function(node) { return node.type === 'FunctionDeclaration'; })
      .map(function(node) { return node.id.name; });

  if (needsDefaultBinding) {
    names.push('__webpack_exports__["default"]')
  }


  var appendText = [
    '/* HOT PATCH LOADER */',
    'var __moduleBindings = ' + JSON.stringify(names) + ';',
    patcherCode
  ].join(' ');

  if(this.sourceMap === false) {
    return this.callback(null, [source, appendText].join('\n\n'), map, meta);
  }

  if(!map) {
    map = makeIdentitySourceMap(source, this.resourcePath);
  }

  var node = new SourceNode(null, null, null, [
    SourceNode.fromStringWithSourceMap(source, new SourceMapConsumer(map)),
    new SourceNode(null, null, this.resourcePath, appendText)
  ]).join('\n\n');

  var result = node.toStringWithSourceMap();
  this.callback(null, result.code, result.map.toString());
}
