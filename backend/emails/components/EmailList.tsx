/** @jsxImportSource react */
import * as React from 'react'
import { theme } from '../theme'

interface EmailListProps {
  children: React.ReactNode
  variant?: 'small' | 'extrasmall'
  color?: 'primary' | 'secondary'
  margin?: string
}

interface EmailListItemProps {
  children: React.ReactNode
}

const EmailList = ({ 
  children, 
  variant = 'extrasmall',
  color = 'primary',
  margin = '0 0 24px 0'
}: EmailListProps) => {
  const fontSize = variant === 'small' ? '14px' : '12px'
  const textColor = color === 'primary' ? theme.colors.text.primary : theme.colors.text.secondary

  const style = {
    margin,
    padding: '0 0 0 20px',
    color: textColor,
    fontSize,
    fontFamily: theme.typography.fontFamily,
    lineHeight: '1.5',
  }

  return <ul style={style}>{children}</ul>
}

const EmailListItem = ({ children }: EmailListItemProps) => {
  const style = {
    margin: '0 0 8px 0',
    padding: 0,
  }

  return <li style={style}>{children}</li>
}

export { EmailList, EmailListItem }
export default EmailList