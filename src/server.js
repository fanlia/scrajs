
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

export const startHTTP = async (options) => {

  const server = new ApolloServer(options)

  const port = process.env.PORT || 4000

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }) => req,
  })

  console.log(`🚀 Server ready at ${url}`)
}
