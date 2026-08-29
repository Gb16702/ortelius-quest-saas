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

interface QuoteSentEmailProps {
  username?: string;
  quoteNumber?: string;
  organizationName?: string;
  totalAmount?: string;
  currency?: string;
  dashboardLink?: string;
  organization?: OrganizationBranding;
}

const QuoteSentEmail = ({
  username = "Geoffrey",
  quoteNumber = "QUO-001",
  organizationName = "Quest",
  totalAmount = "1,250",
  currency = "USD",
  dashboardLink = "https://quest.ortelius.app",
  organization,
}: QuoteSentEmailProps) => {
  return (
    <EmailContainer preview="Quote received">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Quote received</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          Great news! You have received a new quote (
          <EmailHighlight weight="bold">{quoteNumber}</EmailHighlight>) from{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight> for{" "}
          <EmailHighlight weight="bold">
            {totalAmount} {currency}
          </EmailHighlight>
          .
        </EmailText>

        <EmailText variant="small">
          You can review the complete quote details, accept or reject it from
          your dashboard.
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
          This quote was sent automatically when the organization submitted
          their proposal. If you have any questions, please contact{" "}
          <EmailHighlight>{organizationName}</EmailHighlight> directly.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default QuoteSentEmail;
