import { visit, visitWithTypeInfo } from 'graphql/language';
import { TypeInfo } from 'graphql/utilities';

const timeToNanos = hrtime => ((hrtime[0] * 1e9) + hrtime[1]);

const end = (fn, req) => {
	const context = req._groundsKeeper;

	if(!context.queries || !context.queries.length) return;

  const schema = context.queries[0].info.schema;

	context.report.duration = timeToNanos(process.hrtime(context.start));

  context.resolverCalls.forEach(resolverReport => {
    for (const query of context.queries) {
      if (resolverReport.resolverInfo.operation === query.info.operation) {
        query.resolvers.push(resolverReport);
        break;
      }
    }
  });

  context.queries.forEach(({
  	info: { operation, fragments },
  	resolvers: queryResolvers = []
  }) => {
  	const fields = {};
    const typeInfo = new TypeInfo(schema);

    const asts = [operation].concat(
      Object.keys(fragments).map(
        k => fragments[k]));

    asts.forEach(ast => {
      visit(ast, visitWithTypeInfo(typeInfo, {
        Field: () => {
          const parentType = typeInfo.getParentType().name;

          if (!fields[parentType]) {
            fields[parentType] = {};
          }

          fields[parentType][typeInfo.getFieldDef().name] = [];
        },
      }));
    });

    queryResolvers.forEach(({
    	fieldInfo: { typeName, fieldName },
      args,
    	endOffset,
    	startOffset,
      resultError,
      resultNull,
      resultUndefined
    }) => {
      const field = fields[typeName] && fields[typeName][fieldName];
      if (!field) return;

      const instance = { latency: timeToNanos(endOffset) - timeToNanos(startOffset) };
      if(args && Object.keys(args).length) instance.args = args;
      if(resultError) instance.resultError = true;
      if(resultNull) instance.resultNull = true;
      if(resultUndefined) instance.resultUndefined = true;

      field.push(instance);
    });

    context.report.queries.push({
    	name: operation && operation.name && operation.name.value,
    	fields
    });
  });

	fn(JSON.stringify({ groundsKeeper: context.report }));
}

export default fn => (req, res, next) => {
  res.on('finish', () => end(fn, req));
	next();
};
