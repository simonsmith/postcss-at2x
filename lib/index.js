import path from 'path';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import isUrl from 'is-url';
import imageSize from 'image-size';
import 'string.prototype.includes';

const defaultResolutions = [
  '(min--moz-device-pixel-ratio: 1.5)',
  '(-o-min-device-pixel-ratio: 3/2)',
  '(-webkit-min-device-pixel-ratio: 1.5)',
  '(min-device-pixel-ratio: 1.5)',
  '(min-resolution: 144dpi)',
  '(min-resolution: 1.5dppx)',
];

export default postcss.plugin('postcss-at2x', at2x);

function at2x({identifier = '@2x', readBackgroundSize = false} = {}) {
  return function(root) {
    // Create an empty rule so that all the new rules can be appended to this
    // and then append it at the end.
    const ruleContainer = postcss.root();

    root.walkRules((rule) => {
      const mediaParent = rule.parent;

      // Check for any `background-size` declarations and keep a reference to it
      // These need to be added again to prevent it being overridden by usage of
      // the `background` shorthand
      let backgroundSize;
      rule.walkDecls('background-size', (decl) => {backgroundSize = decl;});

      rule.walkDecls(/^background/, (decl) => {
        if (!backgroundWithHiResURL(decl.value)) {
          return;
        }

        // Construct a duplicate rule but with the image urls
        // replaced with retina versions
        const retinaRule = postcss.rule({selector: decl.parent.selector});

        retinaRule.append(decl.clone({
          value: createRetinaUrl(decl.value, identifier),
        }));

        // Remove keyword from original declaration here as createRetinaUrl
        // needs it for regex search
        decl.value = removeKeyword(decl.value);

        if (readBackgroundSize) {
          backgroundSize = getBackgroundImageSize(decl);
        }

        if (backgroundSize) {
          retinaRule.append(postcss.decl(backgroundSize));
        }

        // Create the rules and append them to the container
        const params = mediaParent.name === 'media' ?
                        combineMediaQuery(mediaParent.params.split(/,\s*/), defaultResolutions) :
                        defaultResolutions.join(', ');
        const mediaAtRule = postcss.atRule({name: 'media', params});

        mediaAtRule.append(retinaRule);
        ruleContainer.append(mediaAtRule);
      });
    });

    root.append(ruleContainer);
  };
}

function getBackgroundImageSize(decl) {
  const parsedValue = valueParser(decl.value);
  let backgroundSize;
  let urlValue = '';

  parsedValue.walk((node) => {
    if (node.type !== 'function' || (node.type === 'function' && node.value !== 'url')) {
      return;
    }
    node.nodes.forEach((fp) => {
      if (!path.isAbsolute(fp.value) && !isUrl(fp.value)) {
        urlValue = path.resolve(process.cwd(), fp.value);
      }
    });
  });

  if (urlValue !== '') {
    const size = imageSize(urlValue);
    backgroundSize = postcss.decl({
      prop: 'background-size',
      value: `${size.width}px ${size.height}px`,
    });
  }

  return backgroundSize;
}

/**
 * Add all the resolutions to each media query to scope them
 */
function combineMediaQuery(queries, resolutions) {
  return queries.reduce((finalQuery, query) => {
    resolutions.forEach(resolution => finalQuery.push(`${query} and ${resolution}`));
    return finalQuery;
  }, []).join(', ');
}

// Matches `url()` content as long as it is followed by `at-2x`
const urlPathRegex = /url\(([^\r\n]+)\)(?:[^\r\n]+)?at-2x/gm;

function createRetinaUrl(bgValue, identifier) {
  let match;
  // Loop over all occurances of `url()` and match the path
  while ((match = urlPathRegex.exec(bgValue)) !== null) {
    const [, imgUrl] = match;
    const extension = path.extname(imgUrl);

    if (extension === '.svg') {
      break;
    }

    // File name without extension
    const filename = path.basename(path.basename(imgUrl), extension);

    // Replace with retina filename
    bgValue = bgValue.replace(filename + extension, filename + identifier + extension);
  }

  return removeKeyword(bgValue);
}

function removeKeyword(str) {
  return str.replace(/\sat-2x/g, '');
}

function backgroundWithHiResURL(bgValue) {
  return bgValue.includes('url(') && bgValue.includes('at-2x');
}
