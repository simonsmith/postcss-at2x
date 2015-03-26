var postcss = require('postcss');
var expect  = require('chai').expect;
var fs = require('fs');

var plugin = require('../');

var test = function (input, output, opts) {
  expect(postcss(plugin(opts)).process(input).css).to.eql(output);
};

describe('postcss-at2x', function () {
  it('should add device-pixel-ratio rules', function () {
    test(fs.readFileSync('test/fixtures/at2x.css', 'utf-8'), fs.readFileSync('test/fixtures/at2x.out.css', 'utf-8'));
  });

  it('should allow a custom identifier for retina file names', function () {
    test(fs.readFileSync('test/fixtures/identifier.css', 'utf-8'), fs.readFileSync('test/fixtures/identifier.out.css', 'utf-8'), { identifier: '-retina'});
  });
});
