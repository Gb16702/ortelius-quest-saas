/** @jsxImportSource react */
import * as React from 'react'
import { Section } from '@react-email/components'
import { theme } from '../theme'

interface EmailBorderedSectionProps {
  children: React.ReactNode
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  background?: 'primary' | 'secondary'
  centerContent?: boolean
}

const EmailBorderedSection = ({ 
  children, 
  padding = 'xl',
  background = 'secondary',
  centerContent = true
}: EmailBorderedSectionProps) => {
  const paddings = {
    sm: theme.spacing.md,
    md: theme.spacing.lg,
    lg: theme.spacing.xl,
    xl: theme.spacing['2xl'],
  }

  const sectionStyle = {
    margin: `${theme.spacing.lg} ${theme.spacing.lg}`,
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: theme.radius.lg,
    backgroundColor: background === 'primary' 
      ? theme.colors.background.primary 
      : theme.colors.background.secondary,
    padding: paddings[padding],
    width: 'auto',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    ...(centerContent && {
      textAlign: 'center' as const,
    }),
  }

  return <Section style={sectionStyle} className="email-bordered-section">{children}</Section>
}

export default EmailBorderedSection