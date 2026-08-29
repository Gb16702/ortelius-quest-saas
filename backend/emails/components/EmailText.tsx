/** @jsxImportSource react */
import * as React from 'react'
import { Text } from '@react-email/components'
import { theme } from '../theme'

interface EmailTextProps {
  children: React.ReactNode
  variant?: 'extrasmall' | 'small' | 'body' | 'large'
  color?: 'primary' | 'secondary'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right'
  className?: string
  margin?: string
}

const EmailText = ({ 
  children, 
  variant = 'body',
  color = 'primary',
  weight = 'normal',
  align = 'left',
  className,
  margin
}: EmailTextProps) => {
  const variants = {
    extrasmall: {
      fontSize: theme.typography.sizes.xs,
      lineHeight: theme.typography.lineHeights.normal,
    },
    small: {
      fontSize: theme.typography.sizes.sm,
      lineHeight: theme.typography.lineHeights.normal,
    },
    body: {
      fontSize: theme.typography.sizes.base,
      lineHeight: theme.typography.lineHeights.relaxed,
    },
    large: {
      fontSize: theme.typography.sizes.lg,
      lineHeight: theme.typography.lineHeights.relaxed,
    },
  }

  const defaultMargins = {
    extrasmall: `${theme.spacing.xs} 0`,
    small: `${theme.spacing.xs} 0`,
    body: `${theme.spacing.md} 0`,
    large: `${theme.spacing.md} 0`,
  }

  const style = {
    ...variants[variant],
    color: color === 'primary' ? theme.colors.text.primary : theme.colors.text.secondary,
    fontWeight: theme.typography.weights[weight],
    textAlign: align,
    fontFamily: theme.typography.fontFamily,
    margin: margin || defaultMargins[variant],
  }

  return <Text style={style} className={className}>{children}</Text>
}

export default EmailText