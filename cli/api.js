
import { startHTTP } from '../src/server.js'

import { typeDefs as typeDefsGraphql, resolvers as resolversGraphql, bm } from '../src/graphql.js'

export const commandAPI = async () => {
  const typeDefs = [
    typeDefsGraphql,
  ]

  const resolvers = [
    resolversGraphql,
  ]

  bm.toggle_autoclose()

  await startHTTP({
    typeDefs,
    resolvers,
  })
}
