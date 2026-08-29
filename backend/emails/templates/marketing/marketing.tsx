/** @jsxImportSource react */
import * as React from "react";
import { Img } from "@react-email/components";
import {
  EmailContainer,
  EmailSection,
  EmailHeading,
  EmailText,
  EmailButton,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface MarketingEmailProps {
  preheader?: string;
  logoUrl?: string;
  title?: string;
  body?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  organization?: OrganizationBranding;
}

const MarketingEmail = ({
  preheader = "Streamline your service requests with Ortelius",
  logoUrl,
  title = "Manage your logistics projects with ease",
  body = `
    <p style="margin-bottom: 16px;">Hello,</p>
    <p style="margin-bottom: 16px;">Ortelius is revolutionizing the way you manage your service requests. Our platform connects businesses and service providers for efficient and transparent collaborations.</p>
    <p style="margin-bottom: 16px;"><strong>What you can do with Ortelius:</strong></p>
    <ul style="margin-bottom: 16px; padding-left: 20px;">
      <li>Submit quote requests in just a few clicks</li>
      <li>Track your project progress in real-time</li>
      <li>Communicate directly with providers via integrated chat</li>
      <li>Centralize all your documents in one place</li>
    </ul>
    <p style="margin-bottom: 16px;"><strong>New:</strong> Enjoy our <span style="color: #006BFF; font-weight: bold;">14-day free trial</span> to discover all platform features with no commitment.</p>
    <p style="margin-bottom: 16px;">Join the businesses that have already simplified their project management with Ortelius.</p>
  `,
  ctaText = "Start free trial",
  ctaLink = "https://ortelius.app/signup",
  imageUrl = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=400&fit=crop",
  organization,
}: MarketingEmailProps) => {
  return (
    <EmailContainer preview={preheader}>
      {logoUrl && (
        <EmailSection className="px-5 sm:px-10 pt-5 pb-0">
          <Img
            src={logoUrl}
            alt="Logo"
            style={{
              height: "32px",
              width: "auto",
            }}
          />
        </EmailSection>
      )}

      {title && (
        <EmailSection className="px-5 sm:px-10 pt-5 pb-3">
          <EmailHeading level={1}>{title}</EmailHeading>
        </EmailSection>
      )}

      {imageUrl && (
        <Img
          src={imageUrl}
          alt=""
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
      )}

      {body && (
        <EmailSection className="px-5 sm:px-10 pt-5">
          <EmailText variant="small">
            <span dangerouslySetInnerHTML={{ __html: body }} />
          </EmailText>
        </EmailSection>
      )}

      {ctaText && ctaLink && (
        <EmailSection className="px-5 sm:px-10 py-5">
          <EmailButton fullWidth href={ctaLink} size="xs" brandColor={organization?.brandColor}>
            {ctaText}
          </EmailButton>
        </EmailSection>
      )}
    </EmailContainer>
  );
};

export default MarketingEmail;
