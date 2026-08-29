/** @jsxImportSource react */
import * as React from 'react'
import { Section } from '@react-email/components'
import { theme } from '../theme'
import { cn } from '../utils/cn'

interface EmailSectionProps {
  children: React.ReactNode
  padding?: 'sm' | 'md' | 'lg' | 'xl' | string
  bordered?: boolean
  background?: 'primary' | 'secondary'
  margin?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

const EmailSection = ({ 
  children, 
  padding = 'md',
  bordered = false,
  background = 'primary',
  margin,
  align = 'left',
  className
}: EmailSectionProps) => {
  const paddings = {
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,
  }

  const style = {
    backgroundColor: background === 'primary' 
      ? theme.colors.background.primary 
      : theme.colors.background.secondary,
    margin: margin || 0,
    width: '100%',
    boxSizing: 'border-box' as const,
    textAlign: align as 'left' | 'center' | 'right',
    ...(bordered && {
      border: `1px solid ${theme.colors.border.default}`,
      borderRadius: theme.radius.lg,
      margin: margin || `${theme.spacing.md} ${theme.spacing.md}`,
    }),
    ...(!className && {
      padding: paddings[padding as keyof typeof paddings] || padding,
    }),
  }

  const sectionClasses = cn(className)

  return <Section style={style} className={sectionClasses}>{children}</Section>
}

export default EmailSection