import { LegalPageLayout } from "@/widgets/legal-page-layout"

const tocItems = [
    { id: "who-we-are", text: "Who We Are", level: 2 },
    { id: "information-we-collect", text: "Information We Collect", level: 2 },
    {
        id: "how-we-use-information",
        text: "How We Use Your Information",
        level: 2,
    },
    { id: "legal-basis", text: "Legal Basis for Processing", level: 2 },
    { id: "sharing-information", text: "Sharing Your Information", level: 2 },
    { id: "data-retention", text: "Data Retention", level: 2 },
    { id: "your-rights", text: "Your Rights", level: 2 },
    { id: "childrens-privacy", text: "Children's Privacy", level: 2 },
    { id: "cookies-tracking", text: "Cookies and Tracking", level: 2 },
    { id: "policy-changes", text: "Changes to This Policy", level: 2 },
    { id: "contact", text: "Contact Information", level: 2 },
]

export function LegalPrivacyPage() {
    return (
        <LegalPageLayout
            title="Privacy Policy"
            introduction="Ortelius Quest (a brand of The Space Behind BV) is committed to protecting your personal information. We process user data in compliance with global data protection laws. In fact, laws like the EU General Data Protection Regulation (GDPR), the California CCPA/CPRA, Brazil's LGPD, and similar regulations mandate transparency and require a Privacy Policy. This Privacy Policy explains what data we collect, why we collect it, how we use it, and your rights regarding that data. By using Ortelius Quest, you agree to the collection and use of information in accordance with this policy."
            lastUpdated="December 8, 2025"
            tocItems={tocItems}
        >
            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="who-we-are">Who We Are</h2>
            <p>
                The Space Behind BV (Filip Williotstraat 9, 2600 Antwerpen, Belgium, VAT
                BE0733609812) is the data controller for Ortelius Quest. We provide the Ortelius
                Quest SaaS platform ("Service"), which helps logistics and transportation companies
                manage RFIs, RFQs, requests, team collaboration, and communication tools in one
                place. We use secure servers (hosted on AWS, MongoDB Atlas, etc.) to provide our
                Service globally.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="information-we-collect">Information We Collect</h2>
            <p>
                We collect information that you or your organization voluntarily provide when using
                Ortelius Quest, as well as certain data automatically collected to operate and
                improve the Service. This includes:
            </p>
            <ul>
                <li>
                    <strong>Account and Profile Data:</strong> Name, business email, phone number,
                    company name, address, and billing details (collected when you register or
                    update your account).
                </li>
                <li>
                    <strong>Usage Data:</strong> Information about how you use Ortelius Quest – for
                    example, pages viewed, features used, search queries, application errors, log
                    data (IP address, browser type, device identifier, operating system), and
                    dates/times of access.
                </li>
                <li>
                    <strong>Communications Content and Metadata:</strong> If you use our integrated
                    chat or VOIP, we may store the text of your messages and call logs (e.g.
                    timestamp, participants, call duration). Any files, documents, or images you
                    upload (such as RFQs, quotes, supporting documents) are stored by us. We do not
                    scan or sell this content; it remains your data.
                </li>
                <li>
                    <strong>Payment Data:</strong> If you subscribe to Ortelius Quest, we collect
                    your billing name, address, and payment information. We process payments through
                    Stripe, which may collect transaction details like credit card number,
                    expiration date, and billing address on our behalf. We do not see or store your
                    full payment card number – Stripe securely handles that.
                </li>
                <li>
                    <strong>Integration Data:</strong> When you link Ortelius Quest to other
                    services (e.g. your TMS, ERP, or other APIs), data exchanged with those systems
                    (such as shipment details, quotes, routing info) may be sent to Ortelius Quest.
                    We only retrieve or use data from third-party systems that you explicitly
                    authorize.
                </li>
                <li>
                    <strong>Cookies and Tracking:</strong> We use cookies and similar technologies
                    to enhance your experience and analyze usage. A "cookie" is a small text file
                    placed on your device by a website. We use cookies for things like: user
                    authentication (so you stay logged in), remembering your preferences (language,
                    UI settings), and gathering anonymous analytics about Service usage. Third-party
                    services (like Google Analytics or social plugins) may set additional cookies
                    when you visit our website or use the Service. You will be prompted to consent
                    to non-essential cookies, which helps us remember your preferences for future
                    visits.
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="how-we-use-information">How We Use Your Information</h2>
            <p>We use the data we collect to:</p>
            <ul>
                <li>
                    Provide, operate, and maintain Ortelius Quest (authenticate your access, process
                    operations, enable features like chat and calls).
                </li>
                <li>
                    Manage your account and billing (including charging your subscription via
                    Stripe).
                </li>
                <li>
                    Improve the Service: We analyze usage patterns and feedback to fix issues and
                    enhance features, using aggregated or pseudonymized data whenever possible.
                </li>
                <li>
                    Communicate with you: We send administrative emails (service announcements,
                    updates, billing notices, user support) and, if you consent, occasional
                    promotional messages.
                </li>
                <li>
                    Enforce security and prevent fraud: We monitor for suspicious activity (e.g.
                    multiple failed logins) and ensure data integrity.
                </li>
                <li>
                    Comply with legal obligations: We may use or disclose your data as required by
                    law (for example, tax reporting or responding to lawful requests by
                    authorities).
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="legal-basis">Legal Basis for Processing (EU/GDPR)</h2>
            <p>
                Under the GDPR, we must have a legal reason to process personal data. In general, we
                rely on:
            </p>
            <ul>
                <li>
                    <strong>Performance of Contract:</strong> We process data necessary to fulfill
                    our contract with you (to deliver the Service you signed up for). For example,
                    we need your billing info to charge your subscription.
                </li>
                <li>
                    <strong>Consent:</strong> In some cases (e.g. cookies or marketing), we obtain
                    your explicit consent. You can withdraw consent at any time by changing cookie
                    settings or unsubscribing from marketing emails.
                </li>
                <li>
                    <strong>Legitimate Interests:</strong> We may process data for our legitimate
                    business interests (like securing our Service and improving features), as long
                    as those interests do not override your privacy rights.
                </li>
                <li>
                    <strong>Legal Compliance:</strong> We may process your data to comply with legal
                    obligations (such as financial record-keeping).
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="sharing-information">Sharing Your Information</h2>
            <p>
                We will not rent or sell your personal data. We share data only as necessary for the
                purposes outlined above or as required by law:
            </p>
            <ul>
                <li>
                    <strong>Service Providers:</strong> We work with trusted third-party vendors to
                    operate the Service. For example, we share necessary data with Stripe (for
                    payment processing), AWS and MongoDB (for data hosting and storage), and
                    VOIP/chat providers (if any are used in integrations). These service providers
                    are contractually obligated to use your data only to provide services to us.
                </li>
                <li>
                    <strong>Integrated Services:</strong> When you enable an integration (e.g.
                    linking a TMS/ERP), we will share requested data with that external system to
                    facilitate the integration, but only with your permission. Always review the
                    privacy policies of any third-party tools you connect to.
                </li>
                <li>
                    <strong>Business Transfers:</strong> If The Space Behind BV is involved in a
                    merger, acquisition, or asset sale, your information may be transferred. Any
                    successor will keep the Privacy Policy terms.
                </li>
                <li>
                    <strong>Legal Compliance:</strong> We may disclose your information if required
                    by law or in response to valid legal processes (e.g. subpoenas, court orders).
                    We will challenge any unlawful or overly broad requests.
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="data-retention">Data Retention</h2>
            <p>
                We keep your personal data only as long as necessary to provide the Service and
                fulfill business operations, and as required by law. For example:
            </p>
            <ul>
                <li>
                    <strong>Active Data:</strong> We retain account and profile information while
                    your account is active. If you cancel your subscription or delete your account,
                    we will remove your personal data from active systems within a reasonable period
                    (usually within 30 days).
                </li>
                <li>
                    <strong>Backup and Logs:</strong> We may retain some data (backups, logs) for a
                    limited time (up to 90 days) after deletion for recovery and fraud prevention.
                    These backups are encrypted and only used internally for security or legal
                    needs.
                </li>
                <li>
                    <strong>Legal Requirements:</strong> Certain data (like billing records) may be
                    retained longer if required by tax or financial regulations.
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="your-rights">Your Rights</h2>
            <p>You have rights over your personal data under various laws:</p>
            <ul>
                <li>
                    <strong>Access & Portability:</strong> You can request a copy of the personal
                    data we hold about you (in a machine-readable format).
                </li>
                <li>
                    <strong>Rectification:</strong> If your data is inaccurate or incomplete, you
                    can ask us to correct it.
                </li>
                <li>
                    <strong>Erasure:</strong> You can request deletion of your personal data ("right
                    to be forgotten"), subject to our legal obligations.
                </li>
                <li>
                    <strong>Withdrawal of Consent:</strong> If we rely on your consent for any
                    processing (e.g. marketing), you can withdraw consent anytime without affecting
                    processing done prior to withdrawal.
                </li>
                <li>
                    <strong>Restriction or Objection:</strong> Under GDPR, you may ask us to
                    restrict processing or object (for example, if you believe your data is
                    unlawfully processed).
                </li>
                <li>
                    <strong>Portability:</strong> Under GDPR, you can ask us to transfer your data
                    to another service provider.
                </li>
                <li>
                    <strong>Do Not Sell:</strong> For California (CCPA), you have the right to opt
                    out of any sale of personal data (we do not sell data, but will comply if this
                    status changes).
                </li>
            </ul>
            <p>
                To exercise these rights or ask questions about your data, please contact us (see
                below). We aim to respond to valid requests within the timeframes required by law
                (usually 30 days).
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="childrens-privacy">Children's Privacy</h2>
            <p>
                Ortelius Quest is intended for businesses and adult users. We do not knowingly
                collect personal data from children under 13 (or 16 in some regions). If we learn
                that a child under the applicable age has provided personal data, we will delete it.
                If you are a parent or guardian and believe your child has used Ortelius Quest
                without consent, contact us.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="cookies-tracking">Cookies and Tracking</h2>
            <p>
                We use cookies (as defined above) on our website and web app to improve your
                experience. By continuing to use Ortelius Quest, you consent to our use of cookies
                as described. You can manage or block cookies via your browser settings, but be
                aware this may affect your ability to use parts of the Service. We do not use any
                tracking for advertising purposes or "sell" your browsing data. Our cookies are
                mainly functional (to keep you logged in, remember preferences) and analytical (to
                understand aggregate usage).
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="policy-changes">Changes to This Policy</h2>
            <p>
                We may update this Privacy Policy to reflect changes in our practices or laws. We
                will post the updated policy on our website with a new "Last updated" date. If the
                changes are significant, we may notify you by email or in the app. We encourage you
                to review this policy periodically.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="contact">Contact Information</h2>
            <p>
                For questions or concerns about this Privacy Policy or your personal data, please
                contact:
            </p>
            <p>
                <strong>The Space Behind BV (Ortelius Quest)</strong>
                <br />
                Data Protection Officer – Filip Williotstraat 9, 2600 Antwerpen, Belgium.
                <br />
                Email: info@ortelius.app
            </p>
            <p>
                You may also have the right to lodge a complaint with a data protection authority
                (e.g. the Belgian Data Protection Authority) if you believe your data has been
                handled improperly.
            </p>
        </LegalPageLayout>
    )
}
