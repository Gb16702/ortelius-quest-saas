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

interface RequestOnboardingEmailProps {
  requestNumber?: string;
  isAnonymous?: boolean;
  organization?: OrganizationBranding;
  baseUrl?: string;
  dashboardLink?: string;
  signupLink?: string;
}

const RequestOnboardingEmail = ({
  requestNumber = "REQ-001",
  isAnonymous = true,
  organization,
  baseUrl = "",
  dashboardLink = "https://quest.ortelius.app",
  signupLink = "https://quest.ortelius.app",
}: RequestOnboardingEmailProps) => {
  return (
    <EmailContainer preview="Your request has been successfully submitted">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Request submitted successfully</EmailHeading>

        <EmailText variant="small">
          Congratulations! Your request{" "}
          <EmailHighlight weight="bold">{requestNumber}</EmailHighlight> has
          been successfully submitted
          {organization?.name ? ` to ${organization.name}` : ""}. We are
          delighted to assist you with your logistics project.
        </EmailText>

        <EmailText variant="small" margin="24px 0 0px 0">
          <EmailHighlight weight="bold">Next steps</EmailHighlight>
        </EmailText>

        <EmailText variant="small">
          {isAnonymous
            ? "To track the progress of your request and communicate with service providers, please create your account."
            : "You can track the progress of your request and communicate with the organization directly in the chat."}
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 pt-5" align="center">
        <EmailButton
          fullWidth
          href={isAnonymous ? signupLink : dashboardLink}
          size="xs"
        >
          {isAnonymous ? "Create my account" : "View Request"}
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10">
        <EmailText variant="small" margin="0 0 16px 0">
          <EmailHighlight weight="bold">
            Optimize your experience
          </EmailHighlight>
        </EmailText>

        <EmailList variant="small" color="primary">
          <EmailListItem>Add additional documents if needed</EmailListItem>
          <EmailListItem>Stay responsive to provider messages</EmailListItem>
          <EmailListItem>
            Ask questions through the integrated messaging system
          </EmailListItem>
        </EmailList>
      </EmailSection>
    </EmailContainer>
  );
};

export default RequestOnboardingEmail;
