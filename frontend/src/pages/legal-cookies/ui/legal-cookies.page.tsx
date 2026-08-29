import { LegalPageLayout } from "@/widgets/legal-page-layout"

const tocItems = [
    { id: "what-are-cookies", text: "What Are Cookies", level: 2 },
    { id: "cookie-types", text: "Types of Cookies We Use", level: 2 },
    { id: "essential-cookies", text: "Essential Cookies", level: 3 },
    {
        id: "performance-cookies",
        text: "Performance and Analytics Cookies",
        level: 3,
    },
    { id: "preferences-cookies", text: "Preferences Cookies", level: 3 },
    { id: "marketing-cookies", text: "Marketing Cookies", level: 3 },
    {
        id: "managing-cookies",
        text: "Managing Your Cookie Preferences",
        level: 2,
    },
    { id: "third-party-cookies", text: "Third-Party Cookies", level: 2 },
    { id: "contact", text: "Contact Information", level: 2 },
]

export function LegalCookiesPage() {
    return (
        <LegalPageLayout
            title="Cookie Policy"
            introduction="Ortelius Quest uses cookies and similar technologies on its website and Service to improve functionality and analyze usage. This Cookie Policy explains what cookies are, how we use them, and how you can manage your cookie preferences."
            lastUpdated="December 8, 2025"
            tocItems={tocItems}
        >
            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="what-are-cookies">What Are Cookies</h2>
            <p>
                A "cookie" is a small text file placed on your device by a website you visit.
                Cookies allow us to recognize you and remember your preferences, such as login
                status or language settings. They are widely used to make websites work more
                efficiently and provide a better user experience.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="cookie-types">Types of Cookies We Use</h2>
            <p>We use cookies for the following purposes:</p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h3 id="essential-cookies">Essential Cookies</h3>
            <p>
                These are necessary for core features (e.g. maintaining your login session, ensuring
                security, enabling basic navigation). Disabling these may prevent you from using
                parts of the Service. Essential cookies include:
            </p>
            <ul>
                <li>Session cookies that keep you logged in</li>
                <li>Security cookies that protect against fraud and abuse</li>
                <li>Load balancing cookies that ensure proper system performance</li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h3 id="performance-cookies">Performance and Analytics Cookies</h3>
            <p>
                We collect anonymous usage data (through tools like Google Analytics) to understand
                how users interact with Ortelius Quest. This helps us improve the Service. The data
                is aggregated and does not personally identify you. These cookies help us:
            </p>
            <ul>
                <li>Count visits and traffic sources</li>
                <li>Measure and improve performance</li>
                <li>Understand which features are most popular</li>
                <li>Identify and fix errors or usability issues</li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h3 id="preferences-cookies">Preferences Cookies</h3>
            <p>
                These remember your choices (e.g. site language, interface settings) so that we can
                provide a more personalized experience. Preferences cookies allow us to:
            </p>
            <ul>
                <li>Remember your language and region preferences</li>
                <li>Save your UI customization settings</li>
                <li>Recall your previous cookie consent choices</li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h3 id="marketing-cookies">Marketing Cookies</h3>
            <p>
                We do not use cookies for advertising on our own, but third-party services (if any)
                may use cookies to track your browsing across sites. We do not sell your data to
                advertisers and give you control over non-essential cookies.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="managing-cookies">Managing Your Cookie Preferences</h2>
            <p>
                When you first visit our site or Service, you will be prompted to consent to the use
                of non-essential cookies. You can manage your cookie preferences in the following
                ways:
            </p>
            <ul>
                <li>
                    <strong>Cookie Banner:</strong> Accept or decline non-essential cookies when you
                    first visit the site
                </li>
                <li>
                    <strong>Browser Settings:</strong> Most browsers allow you to block or delete
                    cookies through their settings menu. However, blocking cookies may disable
                    certain features of Ortelius Quest or require you to log in more frequently.
                </li>
                <li>
                    <strong>Opt-Out Tools:</strong> For analytics cookies, you can use browser
                    extensions or opt-out tools provided by analytics services (e.g. Google
                    Analytics Opt-out Browser Add-on).
                </li>
            </ul>
            <p>
                Please note that essential cookies cannot be disabled as they are necessary for the
                Service to function properly.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="third-party-cookies">Third-Party Cookies</h2>
            <p>Some cookies on our site may be set by third-party services that we use, such as:</p>
            <ul>
                <li>
                    <strong>Google Analytics:</strong> For understanding site usage and performance
                </li>
                <li>
                    <strong>Stripe:</strong> For secure payment processing
                </li>
                <li>
                    <strong>Content Delivery Networks (CDNs):</strong> For faster content delivery
                </li>
            </ul>
            <p>
                For more detailed information on cookies used by third parties on our site (such as
                analytics or embedded content), please refer to their respective privacy and cookie
                policies. We do not control these third-party cookies and recommend reviewing their
                policies to understand how they use your data.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="contact">Contact Information</h2>
            <p>If you have any questions about our use of cookies, please contact us at:</p>
            <p>
                <strong>The Space Behind BV (Ortelius Quest)</strong>
                <br />
                Filip Williotstraat 9, 2600 Antwerpen, Belgium
                <br />
                Email: info@ortelius.app
            </p>
            <p>
                We encourage you to review this Cookie Policy periodically as we may update it from
                time to time to reflect changes in our practices or applicable laws.
            </p>
        </LegalPageLayout>
    )
}
