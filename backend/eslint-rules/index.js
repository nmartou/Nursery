import path from 'node:path';

const SRC_DIR = `${path.sep}src${path.sep}`;

/** Returns the path of `filename` relative to `src/`, or null outside of it. */
function relativeToSrc(filename) {
  const index = filename.lastIndexOf(SRC_DIR);
  return index === -1 ? null : filename.slice(index + SRC_DIR.length);
}

/** `modules/<name>/<layer>/...` -> { module, layer } */
function locate(srcRelativePath) {
  const parts = srcRelativePath.split(/[\\/]/);
  if (parts[0] === 'common') {
    return { area: 'common' };
  }
  if (parts[0] === 'modules' && parts.length > 2) {
    return { area: 'modules', module: parts[1], layer: parts[2] };
  }
  return { area: parts[0] };
}

/**
 * Enforces the monolith's layering so modules stay easy to extract into
 * micro-services:
 * - a module never imports another module's internals;
 * - `common/` never depends on a business module;
 * - controllers never talk to repositories directly (they go through services).
 */
const moduleBoundaries = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce module and layer boundaries' },
    schema: [],
    messages: {
      crossModule:
        "Le module '{{from}}' ne doit pas importer les fichiers internes du module '{{to}}'.",
      commonToModule:
        "'common/' ne doit pas dépendre d'un module métier ('{{to}}').",
      controllerToRepository:
        'Un controller ne doit pas importer un repository : passez par un service.',
    },
  },
  create(context) {
    const fromSrc = relativeToSrc(context.filename);
    if (!fromSrc) {
      return {};
    }
    const from = locate(fromSrc);

    function check(node) {
      const source = node.source?.value;
      if (typeof source !== 'string' || !source.startsWith('.')) {
        return;
      }
      const target = relativeToSrc(
        path.resolve(path.dirname(context.filename), source),
      );
      if (!target) {
        return;
      }
      const to = locate(target);

      if (from.area === 'common' && to.area === 'modules') {
        context.report({ node, messageId: 'commonToModule', data: to });
      } else if (
        from.area === 'modules' &&
        to.area === 'modules' &&
        from.module !== to.module &&
        to.layer !== `${to.module}.module.js`
      ) {
        context.report({
          node,
          messageId: 'crossModule',
          data: { from: from.module, to: to.module },
        });
      } else if (
        from.layer === 'controllers' &&
        to.layer === 'repositories' &&
        node.importKind !== 'type'
      ) {
        context.report({ node, messageId: 'controllerToRepository' });
      }
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};

/**
 * With `whitelist: true`, the ValidationPipe silently strips any property
 * without a class-validator decorator: every property of an input DTO must
 * therefore be decorated. Response DTOs (`*ResponseDto`, `*SummaryDto`) are
 * output-only and exempt.
 */
const dtoPropertiesValidated = {
  meta: {
    type: 'problem',
    docs: { description: 'Require validation decorators on input DTOs' },
    schema: [],
    messages: {
      missingDecorator:
        "La propriété '{{name}}' du DTO d'entrée '{{dto}}' n'a aucun décorateur de validation : elle serait supprimée par le ValidationPipe.",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        const name = node.id?.name ?? '';
        if (!name.endsWith('Dto') || /(Response|Summary)Dto$/.test(name)) {
          return;
        }
        for (const member of node.body.body) {
          if (
            member.type === 'PropertyDefinition' &&
            !member.static &&
            (member.decorators ?? []).length === 0
          ) {
            context.report({
              node: member,
              messageId: 'missingDecorator',
              data: { name: member.key.name, dto: name },
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: 'nursery' },
  rules: {
    'module-boundaries': moduleBoundaries,
    'dto-properties-validated': dtoPropertiesValidated,
  },
};
