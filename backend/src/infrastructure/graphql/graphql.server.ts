import { createSchema, createYoga } from 'graphql-yoga'
import {
  type AppShellResolverDependencies,
  createAppShellResolvers,
} from '../../domains/app-shell/presentation/graphql/app-shell.resolvers'
import { appShellTypeDefs } from '../../domains/app-shell/presentation/graphql/app-shell.schema'
import { metricsResolvers } from '../../domains/metrics/presentation/graphql/metrics.resolvers'
import { metricsTypeDefs } from '../../domains/metrics/presentation/graphql/metrics.schema'
import { createGraphQLContext } from './graphql.context'

export type GraphQLServerOptions = {
  appShell?: AppShellResolverDependencies
}

export const createGraphQLServer = (options: GraphQLServerOptions = {}) => {
  return createYoga({
    schema: createSchema({
      typeDefs: [metricsTypeDefs, appShellTypeDefs],
      resolvers: [metricsResolvers, createAppShellResolvers(options.appShell)],
    }),
    graphqlEndpoint: '/api/graphql',
    graphiql: {
      title: 'Ortelius Analytics API',
    },
    context: createGraphQLContext,
    cors: false,
    landingPage: false,
    maskedErrors: process.env.NODE_ENV === 'production',
  })
}
