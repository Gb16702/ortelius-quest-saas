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

interface QuoteAcceptedEmailProps {
  username?: string;
  quoteNumber?: string;
  organizationName?: string;
  totalAmount?: string;
  currency?: string;
  dashboardLink?: string;
  organization?: OrganizationBranding;
}

const QuoteAcceptedEmail = ({
  username = "Geoffrey",
  quoteNumber = "QUO-001",
  organizationName = "Quest",
  totalAmount = "1,250",
  currency = "USD",
  dashboardLink = "https://quest.ortelius.app",
  organization,
}: QuoteAcceptedEmailProps) => {
  return (
    <EmailContainer preview="Quote accepted">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Quote accepted</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          Your quote (
          <EmailHighlight weight="bold">{quoteNumber}</EmailHighlight>) from{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight> for{" "}
          <EmailHighlight weight="bold">
            {totalAmount} {currency}
          </EmailHighlight>{" "}
          has been successfully accepted.
        </EmailText>

        <EmailText variant="small">
          The next step is to wait for the invoice from{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight>. You
          will receive an email notification when the invoice is ready.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Quote Details
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          If you have any questions, please contact{" "}
          <EmailHighlight color="secondary" weight="semibold">
            {organizationName}
          </EmailHighlight>{" "}
          directly.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default QuoteAcceptedEmail;
