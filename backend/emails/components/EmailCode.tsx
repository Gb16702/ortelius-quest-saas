/** @jsxImportSource react */
import * as React from 'react'
import { Text } from '@react-email/components'
import { theme } from '../theme'

interface EmailCodeProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  spacing?: boolean
}

const EmailCode = ({ 
  children, 
  size = 'xl',
  spacing = false
}: EmailCodeProps) => {
  const sizes = {
    sm: theme.typography.sizes.sm,
    md: theme.typography.sizes.base,
    lg: theme.typography.sizes.lg,
    xl: theme.typography.sizes['2xl'],
  }

  const style = {
    fontSize: sizes[size],
    fontWeight: theme.typography.weights.extrabold,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.radius.sm,
    padding: `${theme.spacing.md} ${theme.spacing.md}`,
    display: 'inline-block',
    letterSpacing: spacing ? '0.35em' : 'normal',
    textAlign: 'center' as const,
    margin: `${theme.spacing.md} 0`,
  }

  return <Text style={style}>{children}</Text>
}

export default EmailCode