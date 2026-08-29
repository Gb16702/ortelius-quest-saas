/** @jsxImportSource react */
import {
  EmailContainer,
  EmailSection,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailHighlight,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface ShowcaseInvitationEmailProps {
  inviterName?: string;
  organizationName?: string;
  showcaseLink?: string;
  organization?: OrganizationBranding;
}

const ShowcaseInvitationEmail = ({
  inviterName = "Geoffrey Delhaye",
  organizationName = "Quest",
  showcaseLink = "https://quest.ortelius.app/showcase",
  organization,
}: ShowcaseInvitationEmailProps) => {
  return (
    <EmailContainer preview={`Discover ${organizationName}'s capabilities`}>
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Discover our capabilities</EmailHeading>

        <EmailText margin="" variant="small">
          Hello,
        </EmailText>

        <EmailText variant="small">
          <EmailHighlight>{inviterName}</EmailHighlight> from{" "}
          <EmailHighlight>{organizationName}</EmailHighlight> has invited you to
          get a <EmailHighlight>quote</EmailHighlight> for your logistics and
          transportation needs.
        </EmailText>

        <EmailText variant="small">
          We've built a showcase page where you can learn about our{" "}
          <EmailHighlight>expertise, services</EmailHighlight>, and how we can
          help with your logistics needs.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 py-5">
        <EmailButton fullWidth href={showcaseLink} size="xs" brandColor={organization?.brandColor}>
          Send us a request
        </EmailButton>
      </EmailSection>
    </EmailContainer>
  );
};

export default ShowcaseInvitationEmail;
