import postcss from 'postcss';
import fs from 'fs';
import path from 'path';
import plugin from '../lib/';

const {__get__: get} = plugin;

function readFixture(filename) {
  return fs.readFileSync(path.join('test/fixtures', filename), 'utf-8');
}

function runTest(input, opts, done) {
  input = readFixture(`${input}`);

  postcss([plugin(opts)]).process(input).then((result) => {
    expect(result.css).toMatchSnapshot();
    expect(result.warnings().length).toMatchSnapshot();
    done();
  }).catch(err => done.fail(err));
}

describe('plugin API', () => {
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

describe('count function', () => {
  const count = get('count');

  it('should return the position of a char in a string', () => {
    expect(count('hello', 'e')).toEqual(1);
  });
});

describe('splitMultipleBackgrounds function', () => {
  const splitMultipleBackgrounds = get('splitMultipleBackgrounds');

  it('should return an array of background values', () => {
    const value = 'url(http://example.com/image.png), linear-gradient(to right, rgba(255, 255, 255, 0),  rgba(255, 255, 255, 1)), url(/public/images/cool.png) at-2x, url(http://example.com/flowers-pattern.jpg) at-2x;';

    expect(splitMultipleBackgrounds(value)).toEqual([
      'url(http://example.com/image.png)',
      ' linear-gradient(to right, rgba(255, 255, 255, 0),  rgba(255, 255, 255, 1))',
      ' url(/public/images/cool.png) at-2x',
      ' url(http://example.com/flowers-pattern.jpg) at-2x;',
    ]);
  });
});

describe('extractRetinaImage function', () => {
  const extractRetinaImage = get('extractRetinaImage');
  const ident = '@2x';

  it('should ignore values that do not have an image', () => {
    expect(extractRetinaImage(null, 'transparent')).toEqual('transparent');
  });

  it('should ignore values that are missing an identifier', () => {
    const value = 'url("images/image.png")';
    expect(extractRetinaImage(ident, value)).toEqual(value);
  });

  it('should ignore values have an identifier but no url()', () => {
    const value = 'transparent at-2x';
    expect(extractRetinaImage(ident, value)).toEqual(value);
  });

  it('should ignore svg files', () => {
    const value = 'url("images/image.svg")';
    expect(extractRetinaImage(ident, value)).toEqual(value);
  });

  it('should return a retina version of the image', () => {
    const value = 'url("images/image.png") at-2x';
    expect(extractRetinaImage(ident, value)).toEqual('url("images/image@2x.png")');
  });
});

describe('createRetinaImages function', () => {
  const createRetinaImages = get('createRetinaImages');

  it('should return an array of retina images', () => {
    const value = 'url(http://example.com/image.png), url(/public/images/cool.png) at-2x, url(http://example.com/flowers-pattern.jpg) at-2x;';
    expect(createRetinaImages(value, '@2x')).toEqual('url(http://example.com/image.png), url(/public/images/cool@2x.png), url(http://example.com/flowers-pattern@2x.jpg)');
  });
});
