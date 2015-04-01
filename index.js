'use strict';
var fs = require('fs');
var path = require('path');
var SourceNode = require('source-map').SourceNode;
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var acorn = require('acorn');
var makeIdentitySourceMap = require('./makeIdentitySourceMap');

var patcherCode = fs.readFileSync(path.join(__dirname, 'patcher.js'), 'utf8');

module.exports = function(source, map) {
  if(this.cacheable) {
    this.cacheable()
  }

  var ast = acorn.parse(source);
  var names = ast.body
      .filter(function(node) { return node.type === 'FunctionDeclaration'; })
      .map(function(node) { return node.id.name; });

  var appendText = [
    '/* HOT PATCH LOADER */',
    'var __moduleBindings = ' + JSON.stringify(names) + ';',
    patcherCode
  ].join(' ');

  if(this.sourceMap === false) {
    return this.callback(null, [source, appendText]);
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
