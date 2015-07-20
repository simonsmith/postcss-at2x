# postcss-at2x [![Build Status](https://travis-ci.org/simonsmith/postcss-at2x.svg)](https://travis-ci.org/simonsmith/postcss-at2x)

Ported from [rework-plugin-at2x](https://github.com/reworkcss/rework-plugin-at2x)

## Installation

```console
$ npm install postcss-at2x --save-dev
```

## Usage

```js
var fs = require('fs');
var postcss = require('postcss');
var at2x = require('postcss-at2x');

var css = fs.readFileSync('input.css', 'utf8');

var output = postcss()
  .use(at2x())
  .process(css)
  .css;
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

@media (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3/2), (-webkit-min-device-pixel-ratio: 1.5), (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi), (min-resolution: 1.5dppx) {
  .logo {
    background: red url('/public/images/logo@2x.png') no-repeat 0 0;
  }
}

@media (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3/2), (-webkit-min-device-pixel-ratio: 1.5), (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi), (min-resolution: 1.5dppx) {
  .banner {
    background: url(/public/images/cool@2x.png),
                url(http://example.com/flowers-pattern@2x.jpg);
  }
}
```

### Options

##### `identifier` (default: `"@2x"`) _string_

Change the identifier added to retina images, for example `file@2x.png` can be `file-retina.png`.

## Differences from rework-at2x

* Supports multiple background images and `background` shorthand with properties. See `test/fixtures/` for examples.

See [PostCSS](https://github.com/postcss/postcss/) docs for examples for your environment.
