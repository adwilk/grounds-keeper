export default req => {
	req._groundsKeeper = {
		report: {
			queries: [],
			body: req.body,
			client: req.connection.remoteAddress,
			referer: req.header('Referer'),
			timeStamp: Date.now()
		},
		resolverCalls: [],
		start: process.hrtime()
	};

  return req._groundsKeeper;
};