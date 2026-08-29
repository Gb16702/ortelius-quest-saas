import { Maximize2, Mic, MicOff, PhoneOff } from "lucide-react"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface MinimizedCallViewProps {
    remoteUserName: string
    remoteUserImage?: string | null
    isMuted: boolean
    isRemoteMuted: boolean
    callDuration: number
    onMaximize: () => void
    onEndCall: () => void
    onToggleMute: () => void
}

export function MinimizedCallView({
    remoteUserName,
    remoteUserImage,
    isMuted,
    isRemoteMuted,
    callDuration,
    onMaximize,
    onEndCall,
    onToggleMute,
}: MinimizedCallViewProps) {
    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }

    return (
        <div className="fixed right-4 bottom-4 z-50 flex items-center gap-6 rounded-full bg-ds-surface p-3 shadow-dropdown">
            <div className="relative flex flex-row gap-3">
                <div className="relative">
                    <GeneratedAvatar
                        src={remoteUserImage}
                        fallbackText={remoteUserName}
                        alt={`${remoteUserName} avatar`}
                        size="sm"
                        className="h-10 w-10"
                    />
                    {isRemoteMuted && (
                        <div className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-ds-surface bg-ds-danger-solid">
                            <MicOff className="size-2 text-white" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    <span className="max-w-[120px] truncate font-medium text-ds-fg text-sm">
                        {remoteUserName}
                    </span>
                    <span className="text-ds-fg-muted text-xs">{formatDuration(callDuration)}</span>
                </div>
            </div>

            <div className="flex gap-2">
                <ButtonGroup className="pointer-events-auto [&_a:hover]:border-ds-surface-border [&_button:hover]:border-ds-surface-border">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                className={cn("p-4", isMuted && "hover:!border-ds-danger-border")}
                                radius={"full"}
                                type="button"
                                variant={isMuted ? "danger" : "outline"}
                                size="xs"
                                onClick={onToggleMute}
                            >
                                {isMuted ? (
                                    <MicOff className="size-3.5" />
                                ) : (
                                    <Mic className="size-3.5" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                className="p-4"
                                radius={"full"}
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={onMaximize}
                            >
                                <Maximize2 className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Maximize</TooltipContent>
                    </Tooltip>
                </ButtonGroup>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="p-4"
                            radius={"full"}
                            type="button"
                            variant="danger"
                            size="xs"
                            onClick={onEndCall}
                        >
                            <PhoneOff className="size-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>End call</TooltipContent>
                </Tooltip>
            </div>
        </div>
    )
}
