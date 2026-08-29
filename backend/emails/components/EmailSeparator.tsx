/** @jsxImportSource react */
import * as React from 'react'
import { theme } from '../theme'

interface EmailSeparatorProps {
  margin?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'default' | 'light'
  thickness?: 'thin' | 'normal'
}

const EmailSeparator = ({ 
  margin = 'lg',
  thickness = 'normal'
}: EmailSeparatorProps) => {
  const margins = {
    xs: `${theme.spacing.xs} 0`,
    sm: `${theme.spacing.sm} 0`,
    md: `${theme.spacing.md} 0`,
    lg: `${theme.spacing.lg} 0`,
    xl: `${theme.spacing.xl} 0`,
  }

  const thicknesses = {
    thin: '1px',
    normal: '1px',
  }

  const style = {
    height: thicknesses[thickness],
    border: 'none',
    margin: margins[margin],
    width: '100%',
  }

  return <div style={style} />
}

export default EmailSeparator