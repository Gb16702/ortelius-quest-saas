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
  EmailList,
  EmailListItem,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface RequestRejectedEmailProps {
  username?: string;
  requestNumber?: string;
  organizationName?: string;
  dashboardLink?: string;
  organization?: OrganizationBranding;
}

const RequestRejectedEmail = ({
  username = "Geoffrey",
  requestNumber = "REQ-001",
  organizationName = "Quest",
  dashboardLink = "https://quest.ortelius.app",
  organization,
}: RequestRejectedEmailProps) => {
  return (
    <EmailContainer preview="Request declined">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Request declined</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          Unfortunately, your request{" "}
          <EmailHighlight weight="bold">{requestNumber}</EmailHighlight> to{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight> has
          been declined.
        </EmailText>

        <EmailText variant="small" margin="24px 0 16px 0">
          <EmailHighlight weight="bold">This may be due to:</EmailHighlight>
        </EmailText>

        <EmailList variant="small" color="secondary">
          <EmailListItem>Capacity limitations</EmailListItem>
          <EmailListItem>Service area restrictions</EmailListItem>
          <EmailListItem>
            Specific requirements that cannot be met
          </EmailListItem>
          <EmailListItem>Scheduling conflicts</EmailListItem>
        </EmailList>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Request Details
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          For questions about this decision, please contact{" "}
          <EmailHighlight>{organizationName}</EmailHighlight> directly.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default RequestRejectedEmail;
