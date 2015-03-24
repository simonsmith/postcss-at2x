# postcss-at2x [![Build Status](https://travis-ci.org/simonsmith/postcss-at2x.svg)](https://travis-ci.org/simonsmith/postcss-at2x)

Ported from [rework-plugin-at2x](https://github.com/reworkcss/rework-plugin-at2x)

### .at2x()

Adds `at-2x` keyword to `background` and `background-image` declarations to add retina support for images.

```css
.logo {
  background: red url('/public/images/logo.png') no-repeat 0 0 at-2x;
}
```

```css
@media (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3/2), (-webkit-min-device-pixel-ratio: 1.5), (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi), (min-resolution: 1.5dppx) {
  .logo {
    background: red url('/public/images/logo@2x.png') no-repeat 0 0;
  }
}
```

### Differences from rework-at2x

* Supports multiple background images and `background` shorthand with properties. See `test/fixtures/at2x.css` for examples.

* Ignores background-size. This should be set on the original declaration and is then inherited.

## Usage

```js
var at2x = require('postcss-at2x');
postcss([at2x]);
```

See [PostCSS](https://github.com/postcss/postcss/) docs for examples for your environment.
