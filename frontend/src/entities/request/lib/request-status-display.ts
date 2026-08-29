interface RequestStatusDisplayValue {
    colorClassName: string
    labelKey: string
    fallbackLabel: string
}

const requestStatusDisplayByStatus: Record<string, RequestStatusDisplayValue> = {
    draft: {
        colorClassName: "bg-[#EEEEEE]",
        labelKey: "requests:status.draft",
        fallbackLabel: "Draft",
    },
    invoiced: {
        colorClassName: "bg-[#00D492]",
        labelKey: "requests:status.invoiced",
        fallbackLabel: "Invoiced",
    },
    quoted: {
        colorClassName: "bg-[#00BCFE]",
        labelKey: "requests:status.quoted",
        fallbackLabel: "Quoted",
    },
    open: {
        colorClassName: "bg-[#FE8906]",
        labelKey: "requests:status.open",
        fallbackLabel: "Open",
    },
    closed: {
        colorClassName: "bg-ds-danger-solid",
        labelKey: "requests:status.closed",
        fallbackLabel: "Closed",
    },
}

export function requestStatusLabelKey(status: string): string {
    return requestStatusDisplayByStatus[status]?.labelKey ?? status
}

export function getRequestStatusDisplay(status: string): RequestStatusDisplayValue {
    return (
        requestStatusDisplayByStatus[status] ?? {
            colorClassName: "bg-gray-500",
            labelKey: status,
            fallbackLabel: status,
        }
    )
}
