import { useLocation, useRouter } from "@tanstack/react-router"
import { parseOptionalSearchParam } from "@/shared/lib/validation/search-params"
import { stripeInvoiceIdSearchSchema } from "../schemas/invoice-search.schema"

function normalizeHash(hash: string): string {
    if (!hash) return ""
    return hash.startsWith("#") ? hash : `#${hash}`
}

function buildHref(pathname: string, searchParams: URLSearchParams, hash: string): string {
    const search = searchParams.toString()
    return `${pathname}${search ? `?${search}` : ""}${normalizeHash(hash)}`
}

export function useInvoiceSheet() {
    const router = useRouter()
    const location = useLocation({
        select: (currentLocation) => ({
            pathname: currentLocation.pathname,
            search: currentLocation.searchStr,
            hash: currentLocation.hash,
        }),
    })
    const searchParams = new URLSearchParams(location.search)

    const invoiceId = parseOptionalSearchParam(
        searchParams.get("invoice"),
        stripeInvoiceIdSearchSchema
    )
    const isOpen = !!invoiceId

    const openInvoice = (id: string) => {
        const nextParams = new URLSearchParams(location.search)
        nextParams.set("invoice", id)
        void router.navigate({
            href: buildHref(location.pathname, nextParams, location.hash),
        })
    }

    const closeInvoice = () => {
        const nextParams = new URLSearchParams(location.search)
        nextParams.delete("invoice")
        void router.navigate({
            href: buildHref(location.pathname, nextParams, location.hash),
        })
    }

    return {
        invoiceId,
        isOpen,
        openInvoice,
        closeInvoice,
    }
}
