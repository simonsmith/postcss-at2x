import postcss from 'postcss';
import fs from 'fs';
import path from 'path';
import plugin from '../lib/';

function readFixture(filename) {
  return fs.readFileSync(path.join('test/fixtures', filename), 'utf-8');
}

function runTest(input, opts, done) {
  input = readFixture(`${input}`);

  postcss([plugin(opts)]).process(input).then((result) => {
    expect(result.css).toMatchSnapshot();
    expect(result.warnings()).toBeEmpty();
    done();
  }).catch(done);
}

describe('postcss-at2x', () => {
  it('should add device-pixel-ratio rules', (done) => {
    runTest('at2x.css', {}, done);
  });

  it('should allow retina image scoped to media query', (done) => {
    runTest('scoped.css', {}, done);
  });

  it('should allow a custom identifier for retina file names', (done) => {
    runTest('identifier.css', {identifier: '-retina'}, done);
  });

  it('should allow mulitple background images to be replaced', (done) => {
    runTest('multibg.css', {}, done);
  });

  it('should process image and add background size', (done) => {
    runTest('read-background-size.css', {detectImageSize: true}, done);
  });
});
