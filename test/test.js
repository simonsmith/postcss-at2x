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
    expect(result.warnings()).toHaveLength(0);
    done();
  }).catch(err => done.fail(err));
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

  it('should not add background size when image cannot be found', (done) => {
    runTest('missing-image.css', {detectImageSize: true}, done);
  });

  it('should resolve image path with custom function', (done) => {
    runTest('resolve-image-path.css', {
      detectImageSize: true,
      resolveImagePath: (value, source) => {
        expect(typeof value).toBe('string');
        expect(source).toHaveProperty('input.css');
        return path.resolve(process.cwd(), value);
      }}, done);
  });

  it('should have proper arguments for resolve image path function', (done) => {
    const spy = jest.fn(value => value);
    runTest('resolve-image-path.css', {detectImageSize: true, resolveImagePath: spy}, done);
    const spyCall = spy.mock.calls[0];
    expect(spyCall[0]).toEqual('./test/fixtures/images/cat.jpg');
    expect(spyCall[1]).toMatchSnapshot();
  });

  it('should not add rule for missing retina images when configured to skip missing', (done) => {
    runTest('missing-retina.css', {skipMissingRetina: true}, done);
  });

  it('should add rule for present retina images when configured to skip missing', (done) => {
    runTest('present-retina.css', {skipMissingRetina: true}, done);
  });
});
