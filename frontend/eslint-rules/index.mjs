import path from 'node:path';

const APP_DIR = `${path.sep}src${path.sep}app${path.sep}`;

/** `features/<name>/...` -> { layer: 'features', feature: '<name>' } */
function locate(filename) {
  const index = filename.lastIndexOf(APP_DIR);
  if (index === -1) {
    return null;
  }
  const [layer, feature] = filename.slice(index + APP_DIR.length).split(/[\\/]/);
  return { layer, feature };
}

/**
 * Keeps the Angular app layered:
 * - a feature never imports another feature (share through `shared/` or `core/`);
 * - `shared/` is generic and depends on neither `core/` nor `features/`;
 * - `core/` never depends on a feature (features are lazy-loaded by the router).
 */
const layerBoundaries = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce core / shared / features boundaries' },
    schema: [],
    messages: {
      crossFeature:
        "La feature '{{from}}' ne doit pas importer la feature '{{to}}' : passez par 'shared/' ou 'core/'.",
      forbiddenLayer: "'{{from}}/' ne doit pas dépendre de '{{to}}/'.",
    },
  },
  create(context) {
    const from = locate(context.filename);
    if (!from) {
      return {};
    }

    function check(node) {
      const source = node.source?.value;
      if (typeof source !== 'string' || !source.startsWith('.')) {
        return;
      }
      const to = locate(path.resolve(path.dirname(context.filename), source));
      if (!to) {
        return;
      }
      if (from.layer === 'features' && to.layer === 'features' && from.feature !== to.feature) {
        context.report({
          node,
          messageId: 'crossFeature',
          data: { from: from.feature, to: to.feature },
        });
      } else if (
        (from.layer === 'shared' && (to.layer === 'core' || to.layer === 'features')) ||
        (from.layer === 'core' && to.layer === 'features')
      ) {
        context.report({
          node,
          messageId: 'forbiddenLayer',
          data: { from: from.layer, to: to.layer },
        });
      }
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};

/** Form streams (`valueChanges`, `statusChanges`) never error. */
const NON_ERRORING_STREAMS = new Set(['valueChanges', 'statusChanges']);

function readsNonErroringStream(node) {
  let current = node;
  while (current) {
    if (current.type === 'MemberExpression') {
      if (NON_ERRORING_STREAMS.has(current.property.name)) {
        return true;
      }
      current = current.object;
    } else if (current.type === 'CallExpression') {
      current = current.callee;
    } else {
      return false;
    }
  }
  return false;
}

function pipesCatchError(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.name === 'pipe' &&
    node.arguments.some((arg) => arg.type === 'CallExpression' && arg.callee.name === 'catchError')
  );
}

/**
 * An HTTP call that fails without an error handler leaves the page stuck in its
 * loading state: every `subscribe` must handle errors, either with an `error`
 * callback or a `catchError` in the pipe.
 */
const subscribeHandlesErrors = {
  meta: {
    type: 'problem',
    docs: { description: 'Require error handling on subscribe()' },
    schema: [],
    messages: {
      missingError:
        'subscribe() doit gérer les erreurs : utilisez subscribe({ next, error }) ou catchError().',
    },
  },
  create(context) {
    return {
      "CallExpression[callee.property.name='subscribe']"(node) {
        const receiver = node.callee.object;
        if (readsNonErroringStream(receiver) || pipesCatchError(receiver)) {
          return;
        }
        const [observer] = node.arguments;
        const hasErrorCallback =
          observer?.type === 'ObjectExpression' &&
          observer.properties.some((property) => property.key?.name === 'error');
        if (!hasErrorCallback) {
          context.report({ node, messageId: 'missingError' });
        }
      },
    };
  },
};

export default {
  meta: { name: 'nursery' },
  rules: {
    'layer-boundaries': layerBoundaries,
    'subscribe-handles-errors': subscribeHandlesErrors,
  },
};
