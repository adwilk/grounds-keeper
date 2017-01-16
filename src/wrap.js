import { forEachField, addSchemaLevelResolveFunction } from 'graphql-tools';

const defaultResolver = (source, args, context, { fieldName }) => {
  if (typeof source === 'object' || typeof source === 'function') {
    const property = source[fieldName];
    if (typeof property === 'function') {
      return source[fieldName](args, context);
    }
    return property;
  }
  return undefined;
};

const decorate = (fn, fieldInfo) => {
  const decoratedResolver = (root, args, resolverContext, resolverInfo) => {
    const context = resolverContext && resolverContext.groundsKeeper;

    const report = {
      args,
      fieldInfo,
      resolverInfo,
      startOffset: process.hrtime(context.start)
    };

    context.resolverCalls.push(report);

    const finishRun = () => {
      report.endOffset = process.hrtime(context.start);
    };

    let result;

    try {
      result = fn(root, args, resolverContext, resolverInfo);
    } catch (e) {
      report.resultError = true;
      finishRun();
      throw e;
    }

    if (result === null) {
      report.resultNull = true;
    } else if (typeof result === 'undefined') {
      report.resultUndefined = true;
    } else if (typeof result.then === 'function') {
      result.then((res) => {
        finishRun();
        return res;
      }).catch((err) => {
        report.resultError = true;
        finishRun();
        throw err;
      });
      
      return result;
    } else if (Array.isArray(result)) {
      const promises = [];

      result.forEach((value) => {
        if (value && typeof value.then === 'function') {
          promises.push(value);
        }
      });

      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          finishRun();
        }).catch((err) => {
          report.resultError = true;
          finishRun();
          throw err;
        });
        return result;
      }
    }

    finishRun();
    return result;
  };

  return decoratedResolver;
};

export default schema => {
	addSchemaLevelResolveFunction(schema, (root, args, { groundsKeeper: context }, info) => {
		if (!context.queries) {
	    context.queries = [];
	  }

    context.queries.push({
	    info,
	    resolvers: []
	  });

	  return root;
	});

	forEachField(schema, (field, typeName, fieldName) => {
		if (!field.resolve) {
      field.resolve = defaultResolver;
    }

    field.resolve = decorate(field.resolve, { typeName, fieldName });
	});
};