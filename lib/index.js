import fs from 'fs';
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

function defaultResolveImagePath(value) {
  return path.resolve(process.cwd(), value);
}

export default postcss.plugin('postcss-at2x', at2x);

function at2x({
  identifier = '@2x',
  detectImageSize = false,
  resolveImagePath = defaultResolveImagePath,
  skipMissingRetina = false,
} = {}) {
  return function(root, result) {
    // Create an empty rule so that all the new rules can be appended to this
    // and then append it at the end.
    const ruleContainer = postcss.root();

    const rules = [];

    root.walkRules((rule) => {
      const mediaParent = rule.parent;

      rule.walkDecls(/^background/, (decl) => {
        if (!backgroundWithHiResURL(decl.value)) {
          return;
        }

        // Construct a duplicate rule but with the image urls
        // replaced with retina versions
        const retinaRule = postcss.rule({selector: decl.parent.selector});

        const retinaImages = createRetinaImages(decl.value, identifier);

        // Remove keyword from original declaration here as createRetinaImages needs it
        decl.value = removeKeyword(decl.value);

        if (skipMissingRetina && !retinaImageExists(retinaImages, decl.source, resolveImagePath)) {
          return;
        }

        retinaRule.append(postcss.decl({
          prop: 'background-image',
          value: retinaImages,
        }));

        const promise = getBackgroundImageSize(
          decl,
          detectImageSize,
          resolveImagePath,
          result.warn.bind(result)
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

function retinaImageExists(retinaUrl, source, resolveImagePath) {
  const urlValue = extractUrlValue(retinaUrl, source, resolveImagePath);
  return fs.existsSync(urlValue);
}

function getBackgroundImageSize(
  decl,
  detectImageSize,
  resolveImagePath,
  warn
) {
  if (!detectImageSize) {
    return Promise.resolve();
  }

  const urlValue = extractUrlValue(decl.value, decl.source, resolveImagePath);
  const result = Promise.resolve();

  if (urlValue !== '') {
    return result
      .then(() => pify(imageSize)(urlValue))
      .then((size) => {
        return postcss.decl({
          prop: 'background-size',
          value: `${size.width}px ${size.height}px`,
        });
      }).catch((err) => {
        warn(err);
      });
  }

  return result;
}

function extractUrlValue(url, source, resolveImagePath) {
  const parsedValue = valueParser(url);
  let urlValue = '';

  parsedValue.walk((node) => {
    if (node.type !== 'function' || (node.type === 'function' && node.value !== 'url')) {
      return;
    }
    node.nodes.forEach((fp) => {
      if (!isUrl(fp.value)) {
        urlValue = resolveImagePath(fp.value, source);
      }
    });
  });
  return urlValue;
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

// Matches the <image> within each background definition
const imageRegex = /((?:[^\r\n\s]+)\([^\r\n]+\))[^\r\n]*/gm;

function createRetinaImages(bgValue, identifier) {
  let match;
  const images = [];
  // Loop over all images
  while ((match = imageRegex.exec(bgValue)) !== null) {
    const [definition, image] = match;
    const processedImage = processImage(definition, image, identifier);
    images.push(processedImage);
  }

  return images.join(', ');
}

// Matches `url()` content of an <image>
const urlPathRegex = /url\((.+)\)/;

// Add identifier the background <image> if it meets the criteria:
// * It's a url() image
// * It's not an svg
// * The background definition has at-2x applied
function processImage(definition, image, identifier) {
  if (definition.indexOf('at-2x') === -1) {
    return image;
  }

  const match = image.match(urlPathRegex);
  const imgUrl = match && match[1];

  if (!imgUrl) {
    return image;
  }

  const extension = path.extname(imgUrl);

  if (extension === '.svg') {
    return image;
  }

  // File name without extension
  const filename = path.basename(path.basename(imgUrl), extension);

  // Replace with retina filename
  image = image.replace(filename + extension, filename + identifier + extension);

  return image;
}

function removeKeyword(str) {
  return str.replace(/\sat-2x/g, '');
}

function backgroundWithHiResURL(bgValue) {
  return bgValue.includes('url(') && bgValue.includes('at-2x');
}
