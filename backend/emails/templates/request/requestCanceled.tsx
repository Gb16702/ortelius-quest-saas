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

interface RequestCanceledEmailProps {
  username?: string;
  requestNumber?: string;
  organizationName?: string;
  dashboardLink?: string;
  organization?: OrganizationBranding;
}

const RequestCanceledEmail = ({
  username = "Geoffrey",
  requestNumber = "REQ-001",
  organizationName = "Quest",
  dashboardLink = "https://quest.ortelius.app",
  organization,
}: RequestCanceledEmailProps) => {
  return (
    <EmailContainer preview="Request canceled">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Request canceled</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          Your request (
          <EmailHighlight weight="bold">{requestNumber}</EmailHighlight>) to{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight> has
          been successfully canceled.
        </EmailText>

        <EmailText variant="small">
          No further action will be taken. If you need similar services in the
          future, you can always submit a new request.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 py-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Request Details
        </EmailButton>
      </EmailSection>
    </EmailContainer>
  );
};

export default RequestCanceledEmail;
