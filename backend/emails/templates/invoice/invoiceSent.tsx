/** @jsxImportSource react */
import * as React from 'react'
import {
  EmailContainer,
  EmailSection,
  EmailSeparator,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailHighlight,
} from '../../components'
import { OrganizationBranding } from '../../types'

interface InvoiceSentEmailProps {
  username?: string
  invoiceNumber?: string
  organizationName?: string
  totalAmount?: string
  currency?: string
  dueDate?: string
  dashboardLink?: string
  organization?: OrganizationBranding
}

const InvoiceSentEmail = ({
  username = 'Geoffrey',
  invoiceNumber = 'INV-001',
  organizationName = 'Quest',
  totalAmount = '1,250',
  currency = 'USD',
  dueDate = 'Oct 15, 2025',
  dashboardLink = 'https://quest.ortelius.app',
  organization,
}: InvoiceSentEmailProps) => {
  return (
    <EmailContainer preview="Invoice received">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Invoice received</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          You have received a new invoice (
          <EmailHighlight weight="bold">{invoiceNumber}</EmailHighlight>) from{' '}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight> for{' '}
          <EmailHighlight weight="bold">{totalAmount} {currency}</EmailHighlight>.
        </EmailText>

        <EmailText variant="small">
          Due date: <EmailHighlight weight="bold">{dueDate}</EmailHighlight>. You can review the complete invoice details and proceed with payment.
        </EmailText>
      </EmailSection>

      <EmailSection align="center" className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Invoice Details
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          If you have any questions about this invoice, please contact{' '}
          <EmailHighlight color="secondary" weight="semibold">
            {organizationName}
          </EmailHighlight>{' '}
          directly.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  )
}

export default InvoiceSentEmail