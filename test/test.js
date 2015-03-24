var postcss = require('postcss');
var expect  = require('chai').expect;
var fs = require('fs');

var plugin = require('../');

var test = function (input, output, opts) {
  return postcss(plugin(opts)).process(input).css;
};

describe('postcss-at2x', function () {
  it('should add device-pixel-ratio rules', function () {
    test(fs.readFileSync('test/fixtures/at2x.css', 'utf-8'), fs.readFileSync('test/fixtures/at2x.out.css', 'utf-8'));
  });
});
