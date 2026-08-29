import type { SVGProps } from "react"

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            strokeLinejoin="round"
            style={{ color: "currentColor" }}
            aria-hidden="true"
            {...props}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8 0.378906L15.0607 7.43957L13.9394 8.56089L13.5 8.12155V13.2501C13.5 14.2166 12.7165 15.0001 11.75 15.0001H4.25C3.2835 15.0001 2.5 14.2166 2.5 13.2501V8.12155L2.06066 8.56089L0.939339 7.43957L8 0.378906ZM4 6.62155L8 2.62155L12 6.62155V13.2501C12 13.3882 11.8881 13.5001 11.75 13.5001H10V10.0001C10 9.44781 9.55228 9.00009 9 9.00009H7C6.44772 9.00009 6 9.44781 6 10.0001V13.5001H4.25C4.11193 13.5001 4 13.3882 4 13.2501V6.62155ZM7.5 13.5001H8.5V10.5001H7.5V13.5001Z"
                fill="currentColor"
            />
        </svg>
    )
}
