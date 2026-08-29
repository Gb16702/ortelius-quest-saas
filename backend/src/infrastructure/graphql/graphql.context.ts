import type { YogaInitialContext } from 'graphql-yoga'
import type { AuthUser } from '../../domains/auth/application/auth-models'
import type { GraphQLServerTiming } from './graphql.timing'

export interface GraphQLContext extends YogaInitialContext {
  user: AuthUser | null
  isAuthenticated: boolean
  serverTiming: GraphQLServerTiming | null
}

export interface GraphQLServerContext {
  user: AuthUser | null
  serverTiming?: GraphQLServerTiming | null
}

export const createGraphQLContext = async (
  initialContext: YogaInitialContext & GraphQLServerContext
): Promise<GraphQLContext> => {
  const { user, serverTiming = null } = initialContext

  if (!user) {
    return { ...initialContext, user: null, isAuthenticated: false, serverTiming }
  }

  return {
    ...initialContext,
    user,
    isAuthenticated: true,
    serverTiming,
  }
}
