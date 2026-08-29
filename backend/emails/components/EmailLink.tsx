/** @jsxImportSource react */
import * as React from 'react'
import { Link } from '@react-email/components'
import { theme } from '../theme'

interface EmailLinkProps {
  href?: string
  children: React.ReactNode
  color?: 'blue' | 'primary' | 'secondary'
  underline?: boolean
}

const EmailLink = ({ 
  href, 
  children, 
  color = 'blue',
  underline = true
}: EmailLinkProps) => {
  const colors = {
    blue: theme.colors.blue.primary,
    primary: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
  }

  const style = {
    color: colors[color] + ' !important',
    textDecoration: underline ? 'underline' : 'none',
    fontFamily: theme.typography.fontFamily,
    MozTextDecorationColor: colors[color],
    WebkitTextDecorationColor: colors[color],
    textDecorationColor: colors[color],
  }

  if (href) {
    return (
      <Link href={href} style={style}>
        {children}
      </Link>
    )
  }

  return <span style={style}>{children}</span>
}

export default EmailLink