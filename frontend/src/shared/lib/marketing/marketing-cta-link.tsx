import { Link } from "@tanstack/react-router"
import type { ComponentPropsWithoutRef } from "react"
import type { MarketingCta } from "./marketing-cta"

type AnchorPassthroughProps = Omit<ComponentPropsWithoutRef<"a">, "href">

interface MarketingCtaLinkProps extends AnchorPassthroughProps {
    cta: MarketingCta
}

export function MarketingCtaLink({ cta, ...rest }: MarketingCtaLinkProps) {
    if (cta.kind === "open-org") {
        return <Link to="/org/$slug/dashboard" params={{ slug: cta.slug }} {...rest} />
    }

    if (cta.kind === "open-app") {
        return <Link to="/me/requests" {...rest} />
    }

    return <Link to="/$lang/pricing" params={{ lang: cta.lang }} {...rest} />
}
