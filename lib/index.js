import path from 'path';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import isUrl from 'is-url';
import imageSize from 'image-size';
import pify from 'pify';
import 'string.prototype.includes';

const defaultResolutions = [
  '(min-device-pixel-ratio: 1.5)',
  '(min-resolution: 144dpi)',
  '(min-resolution: 1.5dppx)',
];

function defaultResolveImagePath (value) {
  return path.resolve(process.cwd(), value);
}

export default postcss.plugin('postcss-at2x', at2x);

function at2x({identifier = '@2x', detectImageSize = false, resolveImagePath = defaultResolveImagePath} = {}) {
  return function(root) {
    // Create an empty rule so that all the new rules can be appended to this
    // and then append it at the end.
    const ruleContainer = postcss.root();

    const rules = [];

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

        const promise = getBackgroundImageSize(
          decl,
          backgroundSize,
          detectImageSize,
          resolveImagePath
        )
          .then((size) => {
            if (size) {
              retinaRule.append(postcss.decl(size));
            }

            // Create the rules and append them to the container
            const params = mediaParent.name === 'media' ?
              combineMediaQuery(mediaParent.params.split(/,\s*/), defaultResolutions) :
              defaultResolutions.join(', ');
            const mediaAtRule = postcss.atRule({name: 'media', params});

            mediaAtRule.append(retinaRule);
            ruleContainer.append(mediaAtRule);
          });

        rules.push(promise);
      });
    });

    return Promise.all(rules).then(() => {
      root.append(ruleContainer);
    });
  };
}

function getBackgroundImageSize(decl, existingBackgroundSize, detectImageSize, resolveImagePath) {
  if (!detectImageSize) {
    return Promise.resolve(existingBackgroundSize);
  }

  const parsedValue = valueParser(decl.value);
  let urlValue = '';

  parsedValue.walk((node) => {
    if (node.type !== 'function' || (node.type === 'function' && node.value !== 'url')) {
      return;
    }
    node.nodes.forEach((fp) => {
      if (!path.isAbsolute(fp.value) && !isUrl(fp.value)) {
        urlValue = resolveImagePath(fp.value, decl.source);
      }
    });
  });

  const result = Promise.resolve();

  if (urlValue !== '') {
    return result
      .then(() => pify(imageSize)(urlValue))
      .then((size) => {
        return postcss.decl({
          prop: 'background-size',
          value: `${size.width}px ${size.height}px`,
        });
      });
  }

  return result;
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
