/** @jsxImportSource react */
import * as React from 'react'
import { Heading } from '@react-email/components'
import { theme } from '../theme'

interface EmailHeadingProps {
  children: React.ReactNode
  level?: 1 | 2 | 3 | 4
  align?: 'left' | 'center' | 'right'
  color?: 'primary' | 'secondary'
}

const EmailHeading = ({ 
  children, 
  level = 1, 
  align = 'left',
  color = 'primary'
}: EmailHeadingProps) => {
  const styles = {
    1: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.bold,
      lineHeight: theme.typography.lineHeights.tight,
      margin: `${theme.spacing.xl} 0`,
    },
    2: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      lineHeight: theme.typography.lineHeights.tight,
      margin: `${theme.spacing.md} 0`,
    },
    3: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: theme.typography.lineHeights.normal,
      margin: `${theme.spacing.md} 0`,
    },
    4: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: theme.typography.lineHeights.normal,
      margin: `${theme.spacing.sm} 0`,
    },
  }

  const style = {
    ...styles[level],
    textAlign: align,
    color: color === 'primary' ? theme.colors.text.primary : theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily,
  }

  const className = `email-heading-${level}`
  
  return (
    <Heading as={`h${level}` as 'h1' | 'h2' | 'h3' | 'h4'} style={style} className={className}>
      {children}
    </Heading>
  )
}

export default EmailHeading