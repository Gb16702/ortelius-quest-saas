import { useVoIPCalls } from "../model/voip.context"
import { CallAudioOutput } from "./call-audio-output"
import { IncomingCallDialog } from "./incoming-call-dialog"
import { MinimizedCallView } from "./minimized-call-view"

export function VoIPCallManager() {
    const {
        incomingCalls,
        currentUser,
        isInCall,
        activeCall,
        isInitiator,
        localStream,
        remoteStream,
        isMuted,
        isRemoteMuted,
        isMinimized,
        callDuration,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        minimizeCall,
        maximizeCall,
    } = useVoIPCalls()

    const currentIncomingCall = incomingCalls[0]
    const shouldShowDialog = !isInCall && currentIncomingCall
    const shouldShowActiveCall = isInCall && activeCall

    let remoteUserName = "User"
    let remoteUserImage: string | null | undefined = null

    if (activeCall) {
        if (isInitiator) {
            remoteUserName = activeCall.calleeName || "User"
            remoteUserImage = activeCall.calleeImage
        } else {
            remoteUserName = activeCall.callerDisplayName || activeCall.fromUserName || "User"
            remoteUserImage = activeCall.callerDisplayImage || activeCall.fromUserImage
        }
    }

    return (
        <>
            {shouldShowActiveCall && (
                <CallAudioOutput remoteStream={remoteStream} localStream={localStream} />
            )}
            {shouldShowDialog && (
                <IncomingCallDialog
                    key={currentIncomingCall.callId}
                    call={currentIncomingCall}
                    currentUser={currentUser}
                    isOpen={true}
                    isInCall={false}
                    onAccept={() => {
                        if (currentIncomingCall.callId) {
                            void acceptCall(currentIncomingCall.callId).catch(() => undefined)
                        }
                    }}
                    onDecline={() => {
                        if (currentIncomingCall.callId) {
                            declineCall(currentIncomingCall.callId)
                        }
                    }}
                />
            )}

            {shouldShowActiveCall &&
                (isMinimized ? (
                    <MinimizedCallView
                        remoteUserName={remoteUserName}
                        remoteUserImage={remoteUserImage}
                        isMuted={isMuted}
                        isRemoteMuted={isRemoteMuted}
                        callDuration={callDuration}
                        onMaximize={maximizeCall}
                        onEndCall={endCall}
                        onToggleMute={toggleMute}
                    />
                ) : (
                    <IncomingCallDialog
                        key={activeCall.callId}
                        call={activeCall}
                        currentUser={currentUser}
                        isOpen={true}
                        isInCall={true}
                        isInitiator={isInitiator}
                        localStream={localStream}
                        remoteStream={remoteStream}
                        isMuted={isMuted}
                        isRemoteMuted={isRemoteMuted}
                        callDuration={callDuration}
                        onEndCall={endCall}
                        onToggleMute={toggleMute}
                        onMinimize={minimizeCall}
                    />
                ))}
        </>
    )
}
