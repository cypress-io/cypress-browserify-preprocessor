exports['browserify preprocessor - e2e correctly preprocesses the file 1'] = `
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

it('is a test', function () {
  var a = 1,
      b = 2;
  expect(a).to.equal(1);
  expect(b).to.equal(2);
  expect(Math.min.apply(Math, [3, 4])).to.equal(3);
});

},{}]},{},[1]);

`

exports['math default exports'] = `
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _default = {
  add: function add(a, b) {
    return a + b;
  }
};
exports["default"] = _default;

},{}],2:[function(require,module,exports){
"use strict";

var _math = require("./math");

context('math.js', function () {
  it('imports function', function () {
    expect(_math.add, 'add').to.be.a('function');
  });
  it('can add numbers', function () {
    expect((0, _math.add)(1, 2)).to.eq(3);
  });
});

},{"./math":1}]},{},[2]);

`
