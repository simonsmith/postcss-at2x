# postcss-at2x [![Build Status](https://travis-ci.org/simonsmith/postcss-at2x.svg)](https://travis-ci.org/simonsmith/postcss-at2x)

Ported from [rework-plugin-at2x](https://github.com/reworkcss/rework-plugin-at2x)

## Installation

```console
$ npm install postcss-at2x --save-dev
```

## Usage

```js
const fs = require('fs');
const postcss = require('postcss');
const at2x = require('postcss-at2x');

const input = fs.readFileSync('input.css', 'utf8');

const output = postcss()
  .use(at2x())
  .process(input)
  .then(result => console.log(result.css));
```

### .at2x()

Adds `at-2x` keyword to `background` and `background-image` declarations to add retina support for images.

**Input**

```css
.logo {
  background: red url('/public/images/logo.png') no-repeat 0 0 at-2x;
}

.banner {
  background: url(/public/images/cool.png) at-2x,
              url(http://example.com/flowers-pattern.jpg) at-2x;
}
```

**Output**

```css
.logo {
  background: red url('/public/images/logo.png') no-repeat 0 0;
}

.banner {
  background: url(/public/images/cool.png),
              url(http://example.com/flowers-pattern.jpg);
}

@media (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi), (min-resolution: 1.5dppx) {
  .logo {
    background: red url('/public/images/logo@2x.png') no-repeat 0 0;
  }
}

@media (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi), (min-resolution: 1.5dppx) {
  .banner {
    background: url(/public/images/cool@2x.png),
                url(http://example.com/flowers-pattern@2x.jpg);
  }
}
```

### Options

##### `identifier` (default: `"@2x"`) _string_

Change the identifier added to retina images, for example `file@2x.png` can be `file-retina.png`.

##### `detectImageSize` (default: `false`) _boolean_

Obtains the image dimensions of the non-retina image automatically and applies them to the
`background-size` property of the retina image.

**Output**

```css
.element {
  background: url(img.jpg) no-repeat;
}
@media (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi), (min-resolution: 1.5dppx) {
  .element {
    background: url(img@2x.jpg) no-repeat;
    background-size: 540px 675px; /* Dimensions of img.jpg */
  }
}
```

## Differences from rework-at2x

* Supports multiple background images and `background` shorthand with properties. See `test/fixtures/` for examples.

See [PostCSS](https://github.com/postcss/postcss/) docs for examples for your environment.
