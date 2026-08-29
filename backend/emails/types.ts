import { ReactElement } from "hono/jsx";

export type OrganizationBranding = {
    name: string;
    logo?: string;
    brandLogo?: string;
    slug?: string;
    subdomain?: string;
    brandColor?: string;
};

export enum EmailTemplate {
    ACCOUNT_CREATED = 'ACCOUNT_CREATED',
    PASSWORD_RESET = 'PASSWORD_RESET',
    REQUEST_ONBOARDING = 'REQUEST_ONBOARDING',
    ORGANIZATION_NOTIFICATION = 'ORGANIZATION_NOTIFICATION',
    ORGANIZATION_INVITATION = 'ORGANIZATION_INVITATION',
    SHOWCASE_INVITATION = 'SHOWCASE_INVITATION',
    QUOTE_SENT = 'QUOTE_SENT',
    QUOTE_ACCEPTED = 'QUOTE_ACCEPTED',
    QUOTE_ACCEPTED_ORGANIZATION = 'QUOTE_ACCEPTED_ORGANIZATION',
    REQUEST_CANCELED = 'REQUEST_CANCELED',
    REQUEST_CANCELED_ORGANIZATION = 'REQUEST_CANCELED_ORGANIZATION',
    REQUEST_REJECTED = 'REQUEST_REJECTED',
    REQUEST_REJECTED_ORGANIZATION = 'REQUEST_REJECTED_ORGANIZATION',
    INVOICE_SENT = 'INVOICE_SENT',
    OTP_CODE = 'OTP_CODE',
    CHAT_MESSAGE_ANONYMOUS = 'CHAT_MESSAGE_ANONYMOUS',
    MARKETING = 'MARKETING',
    LEFT_ORGANIZATION = 'LEFT_ORGANIZATION',
}



export type EmailTemplateProps = {
    [EmailTemplate.ACCOUNT_CREATED]: {
        username: string;
        verificationLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.PASSWORD_RESET]: {
        username: string;
        resetLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.REQUEST_ONBOARDING]: {
        username: string;
        requestNumber: string;
        dashboardLink: string;
        isAnonymous?: boolean;
        signupLink?: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.ORGANIZATION_NOTIFICATION]: {
        username: string;
        requestNumber: string;
        requesterName: string;
        organizationName: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.ORGANIZATION_INVITATION]: {
        username: string;
        organizationName: string;
        inviterName: string;
        inviterEmail?: string;
        role: string;
        inviteLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.SHOWCASE_INVITATION]: {
        inviterName: string;
        organizationName: string;
        showcaseLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.QUOTE_SENT]: {
        username: string;
        quoteNumber: string;
        organizationName: string;
        totalAmount: string;
        currency: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.QUOTE_ACCEPTED]: {
        username: string;
        quoteNumber: string;
        organizationName: string;
        totalAmount: string;
        currency: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.QUOTE_ACCEPTED_ORGANIZATION]: {
        username: string;
        quoteNumber: string;
        requesterName: string;
        totalAmount: string;
        currency: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.REQUEST_CANCELED]: {
        username: string;
        requestNumber: string;
        organizationName: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.REQUEST_CANCELED_ORGANIZATION]: {
        username: string;
        requestNumber: string;
        requesterName: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.REQUEST_REJECTED]: {
        username: string;
        requestNumber: string;
        organizationName: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.REQUEST_REJECTED_ORGANIZATION]: {
        username: string;
        requestNumber: string;
        requesterName: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.INVOICE_SENT]: {
        username: string;
        invoiceNumber: string;
        organizationName: string;
        totalAmount: string;
        currency: string;
        dueDate: string;
        dashboardLink: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.OTP_CODE]: {
        username: string;
        code: string;
        type: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.CHAT_MESSAGE_ANONYMOUS]: {
        username: string;
        senderName: string;
        messageContent: string;
        conversationName: string;
        signupLink?: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.MARKETING]: {
        preheader?: string;
        logoUrl?: string;
        title?: string;
        body?: string;
        ctaText?: string;
        ctaLink?: string;
        imageUrl?: string;
        organization?: OrganizationBranding;
    };
    [EmailTemplate.LEFT_ORGANIZATION]: {
        username: string;
        organizationName: string;
        organization?: OrganizationBranding;
    };
};

export type TemplateProps<T extends EmailTemplate> = EmailTemplateProps[T];

export type TemplateRenderer<T extends EmailTemplate> =
    (props: TemplateProps<T>) => ReactElement;