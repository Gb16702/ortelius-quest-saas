/** @jsxImportSource react */
import * as React from 'react'
import { theme } from '../theme'

interface EmailHighlightProps {
  children: React.ReactNode
  color?: 'primary' | 'secondary' | 'blue'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
}

const EmailHighlight = ({ 
  children, 
  color = 'primary',
  weight = 'semibold'
}: EmailHighlightProps) => {
  const getColor = () => {
    switch (color) {
      case 'primary':
        return theme.colors.text.primary
      case 'secondary':
        return theme.colors.text.secondary
      case 'blue':
        return theme.colors.blue.primary
      default:
        return theme.colors.text.primary
    }
  }

  const style = {
    color: getColor(),
    fontWeight: theme.typography.weights[weight],
    fontFamily: theme.typography.fontFamily,
  }

  return <span style={style}>{children}</span>
}

export default EmailHighlight