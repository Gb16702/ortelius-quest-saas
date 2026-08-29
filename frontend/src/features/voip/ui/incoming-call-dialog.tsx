import { Mic, MicOff, Minimize2 } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import type { Call, IncomingCallData } from "../model/call"
import { useAudioAnalysis } from "../model/hooks/use-audio-analysis"
import type { VoIPCurrentUser } from "../model/voip.context"

type IncomingCallDialogCall = (Call | IncomingCallData) & {
    callerName?: string
    callerAvatar?: string
    calleeUserId?: string
    calleeName?: string
    calleeImage?: string | null
    callerDisplayName?: string
    callerDisplayImage?: string | null
}

interface IncomingCallDialogProps {
    call?: IncomingCallDialogCall
    currentUser: VoIPCurrentUser
    isOpen: boolean
    isInCall?: boolean
    isInitiator?: boolean
    remoteStream?: MediaStream | null
    localStream?: MediaStream | null
    isMuted?: boolean
    isRemoteMuted?: boolean
    callDuration?: number
    onAccept?: () => void
    onDecline?: () => void
    onEndCall?: () => void
    onToggleMute?: () => void
    onMinimize?: () => void
}

// FIXME: refactor pending
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cognitive complexity refactor pending
export function IncomingCallDialog({
    call,
    currentUser,
    isOpen,
    isInCall = false,
    isInitiator = false,
    remoteStream,
    localStream,
    isMuted = false,
    isRemoteMuted = false,
    callDuration = 0,
    onAccept,
    onDecline,
    onEndCall,
    onToggleMute,
    onMinimize,
}: IncomingCallDialogProps) {
    const [isConnecting, setIsConnecting] = useState(true)

    const { currentSpeaker } = useAudioAnalysis(
        localStream || null,
        remoteStream || null,
        isInCall ? call : null,
        isMuted
    )

    const isLocalSpeaking = currentSpeaker === "local" && !isConnecting
    const isRemoteSpeaking = currentSpeaker === "remote" && !isConnecting

    useEffect(() => {
        if (isInCall) {
            setIsConnecting(true)
        }
    }, [isInCall])

    useEffect(() => {
        if (remoteStream) {
            setIsConnecting(false)
        } else if (isInCall) {
            setIsConnecting(true)
        }
    }, [remoteStream, isInCall])

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }

    let leftUserName: string
    let leftUserImage: string | null | undefined
    let rightUserName: string
    let rightUserImage: string | null | undefined
    let title: string
    let subtitle: string

    if (!isInCall && call) {
        const callerName = call.callerDisplayName || call.fromUserName || call.callerName || "User"
        const callerImage = call.callerDisplayImage || call.fromUserImage || call.callerAvatar
        const calleeName = currentUser.userName || "You"
        const calleeImage = currentUser.userImage

        leftUserName = calleeName
        leftUserImage = calleeImage
        rightUserName = callerName
        rightUserImage = callerImage
        title = "Incoming call"
        subtitle = `${callerName} is calling you`
    } else if (isInCall && call) {
        leftUserName = currentUser.userName || "You"
        leftUserImage = currentUser.userImage

        if (isInitiator) {
            rightUserName = call.calleeName || "User"
            rightUserImage = call.calleeImage
        } else {
            rightUserName = call.callerDisplayName || call.fromUserName || "User"
            rightUserImage = call.callerDisplayImage || call.fromUserImage
        }

        if (isConnecting) {
            title = isInitiator ? "Calling" : "Connecting"
            subtitle = isInitiator
                ? `Waiting for ${rightUserName} to respond...`
                : "Establishing connection..."
        } else {
            title = formatDuration(callDuration)
            subtitle = "Connected"
        }
    } else {
        return null
    }

    const closeDialog = () => {
        if (isInCall) {
            onEndCall?.()
        } else {
            onDecline?.()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="max-w-lg gap-0 p-0"
            >
                <DialogHeader className="border-b p-6 pb-4">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{subtitle}</DialogDescription>
                </DialogHeader>

                <div className="bg-ds-canvas p-8">
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <GeneratedAvatar
                                    src={leftUserImage}
                                    fallbackText={leftUserName}
                                    alt={`${leftUserName} avatar`}
                                    size="xl"
                                    className={`h-20 w-20 border-2 transition-colors duration-150 ${
                                        isLocalSpeaking
                                            ? "border-ds-teal-700"
                                            : "border-ds-surface-border"
                                    }`}
                                />
                                {isInCall && isMuted && (
                                    <div className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ds-canvas bg-ds-danger-solid">
                                        <MicOff className="size-3 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                {(!isInCall || isConnecting) && (
                                    <div className="absolute inset-0 animate-call-ping rounded-full border-2 border-ds-surface-border" />
                                )}
                                <GeneratedAvatar
                                    src={rightUserImage}
                                    fallbackText={rightUserName}
                                    alt={`${rightUserName} avatar`}
                                    size="xl"
                                    className={`h-20 w-20 border-2 transition-colors duration-150 ${
                                        isRemoteSpeaking
                                            ? "border-ds-teal-700"
                                            : "border-ds-surface-border"
                                    }`}
                                />
                                {isInCall && isRemoteMuted && (
                                    <div className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ds-canvas bg-ds-danger-solid">
                                        <MicOff className="size-3 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-ds-surface-border border-t px-8 py-4">
                    {!isInCall ? (
                        <div className="flex w-full items-center justify-between gap-3">
                            <Button
                                size={"lg"}
                                type="button"
                                variant="outline"
                                radius="full"
                                onClick={onDecline}
                            >
                                Decline
                            </Button>
                            <Button
                                size={"lg"}
                                type="button"
                                variant="solid"
                                radius="full"
                                onClick={onAccept}
                            >
                                Accept
                            </Button>
                        </div>
                    ) : (
                        <div className="flex w-full items-center justify-between gap-3">
                            <ButtonGroup className="pointer-events-auto [&_a:hover]:border-ds-surface-border [&_button:hover]:border-ds-surface-border">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size={"lg"}
                                            className={cn(
                                                isMuted && "hover:!border-ds-danger-border"
                                            )}
                                            radius="full"
                                            type="button"
                                            variant={isMuted ? "danger" : "outline"}
                                            onClick={onToggleMute}
                                            disabled={isConnecting}
                                        >
                                            {isMuted ? (
                                                <MicOff className="size-4" />
                                            ) : (
                                                <Mic className="size-4" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isConnecting
                                            ? "Connecting..."
                                            : isMuted
                                              ? "Unmute"
                                              : "Mute"}
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size={"lg"}
                                            radius="full"
                                            type="button"
                                            variant="outline"
                                            onClick={onMinimize}
                                        >
                                            <Minimize2 className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Minimize</TooltipContent>
                                </Tooltip>
                            </ButtonGroup>

                            <Button
                                size={"lg"}
                                type="button"
                                variant="danger"
                                radius="full"
                                onClick={onEndCall}
                                title="End call"
                            >
                                End call
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
