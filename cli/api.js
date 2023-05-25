
import { startHTTP } from '../src/server.js'

import { typeDefs as typeDefsGraphql, resolvers as resolversGraphql } from '../src/graphql.js'

export const commandAPI = async () => {
  const typeDefs = [
    typeDefsGraphql,
  ]

  const resolvers = [
    resolversGraphql,
  ]

  await startHTTP({
    typeDefs,
    resolvers,
  })
}
