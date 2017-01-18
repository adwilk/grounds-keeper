# Grounds Keeper

Generates simple usage/latency reports for GraphQL Express servers.

*adapted from https://github.com/apollostack/optics-agent-js*

## Example output
```js
{
   "groundsKeeper":{
      "queries":[ { // support multiple queries for Apollo Server
         "latency": 23532412 // total query latency in nanoseconds
         "name":"QueryName", // prints operation name
         "fields":{ // list requested fields by type
            "Query":{
               "user":[{
                  "latency":123456, // resolver latency in nanoseconds
                  "args":{ // prints any query variables
                     "first":5
                  }
               }]
            }
            "User":{
               "id":[{
                  "latency":9876
               }]
            }
         }
      }],
      "client":"::ffff:172.19.0.1", // requesting remote address
      "referer":"http://localhost:8080/graphiql", // request referer
      "timeStamp":1484537683332, // timestamp of request 
      "latency":4155815954 // total response latency in nanoseconds
   }
}
```

## Set up

install package from npm:
```
npm i -S grounds-keeper
```

import package where you init your express server:
```js
import * as groundsKeeper from 'grounds-keeper';
```

you'll need to wrap your schema to attach to each resolver:
```js
groundsKeeper.wrap(schema); // where schema is your executable schema object
```

add in the grounds keeper middleware to your graphql route:
```js
app.use('/graphql', groundsKeeper.trace(report => {
  console.info(report); // do whatever you want with the output here
}), graphqlExpress(req => ({
  ...
```

finally, pass the express request object into the groundsKeeper context object:
```js
graphqlExpress(req => ({
  schema,
  context: {
    groundsKeeper: groundsKeeper.context(req)
  }
}))
```

putting all that together - here's an example server initialization:
```js
import * as groundsKeeper from 'grounds-keeper';
import express from 'express';
import { graphqlExpress } from 'graphql-server-express';
import schema from './schema';

const app = express();

groundsKeeper.wrap(schema);

app.use('/graphql', groundsKeeper.trace(report => {
  console.info(report);
}), graphqlExpress(req => ({
  schema,
  context: {
    groundsKeeper: groundsKeeper.context(req)
  }
})));

app.listen(8080);
```