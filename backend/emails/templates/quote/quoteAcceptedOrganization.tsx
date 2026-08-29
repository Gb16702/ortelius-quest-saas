/** @jsxImportSource react */
import * as React from "react";
import {
  EmailContainer,
  EmailSection,
  EmailSeparator,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailHighlight,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface QuoteAcceptedOrganizationEmailProps {
  username?: string;
  quoteNumber?: string;
  requesterName?: string;
  totalAmount?: string;
  currency?: string;
  dashboardLink?: string;
  organization?: OrganizationBranding;
}

const QuoteAcceptedOrganizationEmail = ({
  username = "Geoffrey",
  quoteNumber = "QUO-001",
  requesterName = "John Doe",
  totalAmount = "1,250",
  currency = "USD",
  dashboardLink = "https://quest.ortelius.app",
  organization,
}: QuoteAcceptedOrganizationEmailProps) => {
  return (
    <EmailContainer preview="Quote accepted">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Quote accepted</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          Great news!{" "}
          <EmailHighlight weight="bold">{requesterName}</EmailHighlight> has
          accepted your quote{" "}
          <EmailHighlight weight="bold">{quoteNumber}</EmailHighlight> for{" "}
          <EmailHighlight weight="bold">
            {totalAmount} {currency}
          </EmailHighlight>
          .
        </EmailText>

        <EmailText variant="small">
          The next step is to prepare and send the invoice to the client. You
          can now proceed with the service delivery process.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Quote Details & Create Invoice
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          Remember to <EmailHighlight>send the invoice</EmailHighlight> to the
          client to complete the process.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default QuoteAcceptedOrganizationEmail;
