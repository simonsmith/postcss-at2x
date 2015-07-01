import postcss from 'postcss';
import { expect } from 'chai';
import plugin from '../lib/';
import fs from 'fs';
import path from 'path';

function readFixture(filename) {
  return fs.readFileSync(path.join('test/fixtures', filename), 'utf-8');
}

function test(input, output, opts, done) {
  input = readFixture(`${input}`);
  output = readFixture(`${output}`);

  postcss([ plugin(opts) ]).process(input).then((result) => {
    expect(result.css).to.eql(output);
    expect(result.warnings()).to.be.empty;
    done();
  }).catch(done);
}

describe('postcss-at2x', () => {
  it('should add device-pixel-ratio rules', (done) => {
    test('at2x.css', 'at2x.out.css', {}, done);
  });

  it('should allow retina image scoped to media query', (done) => {
    test('scoped.css', 'scoped.out.css', {}, done);
  });

  it('should allow a custom identifier for retina file names', (done) => {
    test('identifier.css', 'identifier.out.css', { identifier: '-retina'}, done);
  });
});
