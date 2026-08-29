export type TeleatendimentoSignalSender = (payload: any) => void;

type Callbacks = {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
};

export class TeleatendimentoWebRtcClient {
  private peer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private iceCandidateCount = 0;
  private sentIceCandidateCount = 0;

  constructor(
    private readonly callbacks: Callbacks,
    private readonly sendOffer: TeleatendimentoSignalSender,
    private readonly sendAnswer: TeleatendimentoSignalSender,
    private readonly sendIceCandidate: TeleatendimentoSignalSender,
    existingStream?: MediaStream | null,
  ) {
    if (existingStream) {
      this.localStream = existingStream;
      console.log("[WebRTC] constructor: using existing stream, audio tracks:", existingStream.getAudioTracks().length, "video tracks:", existingStream.getVideoTracks().length);
    }
  }

  async ensureLocalStream(constraints?: MediaStreamConstraints) {
    if (this.localStream) return this.localStream;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new DOMException(
        "O acesso à câmera e ao microfone requer uma conexão segura (HTTPS). " +
          "Acesse o sistema via HTTPS ou utilize localhost para realizar videochamadas.",
        "NotSupportedError",
      );
    }

    this.localStream = await navigator.mediaDevices.getUserMedia(
      constraints || {
        audio: true,
        video: true,
      },
    );

    console.log("[WebRTC] ensureLocalStream: stream obtained. audio:", this.localStream.getAudioTracks().length, "video:", this.localStream.getVideoTracks().length, "tracks enabled:", this.localStream.getTracks().map(t => `${t.kind}=${t.enabled}`).join(","));

    return this.localStream;
  }

  getLocalStream() {
    return this.localStream;
  }

  async createOffer() {
    const peer = await this.ensurePeer();
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.setLocalDescription(offer);
    console.log("[WebRTC] createOffer: SDP type:", offer.type, "sdp length:", offer.sdp?.length);
    this.sendOffer(offer);
  }

  async handleOffer(payload: RTCSessionDescriptionInit) {
    console.log("[WebRTC] handleOffer: received, type:", payload.type, "sdp length:", payload.sdp?.length);
    const peer = await this.ensurePeer();
    await peer.setRemoteDescription(new RTCSessionDescription(payload));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    console.log("[WebRTC] handleOffer: answer created and sent, type:", answer.type, "sdp length:", answer.sdp?.length);
    this.sendAnswer(answer);
  }

  async handleAnswer(payload: RTCSessionDescriptionInit) {
    console.log("[WebRTC] handleAnswer: received, type:", payload.type, "sdp length:", payload.sdp?.length);
    const peer = await this.ensurePeer();
    await peer.setRemoteDescription(new RTCSessionDescription(payload));
  }

  async handleIceCandidate(payload: RTCIceCandidateInit) {
    const peer = await this.ensurePeer();

    if (!payload?.candidate) return;

    this.iceCandidateCount++;
    if (this.iceCandidateCount === 1) {
      console.log("[WebRTC] handleIceCandidate: first candidate received", payload.candidate);
    }

    try {
      await peer.addIceCandidate(new RTCIceCandidate(payload));
    } catch {
      // O browser pode reenfileirar em renegociacoes; ignorar falha isolada.
    }
  }

  setAudioEnabled(enabled: boolean) {
    console.log("[WebRTC] setAudioEnabled:", enabled, "tracks:", this.localStream?.getAudioTracks().length);
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setVideoEnabled(enabled: boolean) {
    console.log("[WebRTC] setVideoEnabled:", enabled, "tracks:", this.localStream?.getVideoTracks().length);
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  destroy(stopTracks = true) {
    const trackStates = this.localStream?.getTracks().map(t => `${t.kind}:${t.enabled ? "enabled" : "disabled"}:${t.readyState}`).join(",");
    console.log("[WebRTC] destroy: stopTracks:", stopTracks, "tracks:", trackStates, "iceReceived:", this.iceCandidateCount, "iceSent:", this.sentIceCandidateCount);
    this.peer?.close();
    this.peer = null;
    if (stopTracks) {
      this.localStream?.getTracks().forEach((track) => track.stop());
    }
    this.localStream = null;
  }

  private async ensurePeer() {
    if (this.peer) return this.peer;

    await this.ensureLocalStream();

    console.log("[WebRTC] ensurePeer: creating new RTCPeerConnection");
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    this.localStream?.getTracks().forEach((track) => {
      if (this.localStream) {
        console.log("[WebRTC] ensurePeer: addTrack - kind:", track.kind, "id:", track.id, "enabled:", track.enabled, "readyState:", track.readyState);
        peer.addTrack(track, this.localStream);
      }
    });

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      console.log("[WebRTC] ontrack FIRED - track kind:", event.track?.kind, "streams:", event.streams.length, "stream id:", stream?.id, "videoTracks:", stream?.getVideoTracks().length, "audioTracks:", stream?.getAudioTracks().length);
      if (stream) {
        this.callbacks.onRemoteStream(stream);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.sentIceCandidateCount++;
        if (this.sentIceCandidateCount === 1) {
          console.log("[WebRTC] onicecandidate: first candidate sent", event.candidate.candidate);
        }
        this.sendIceCandidate(event.candidate.toJSON());
      }
    };

    peer.onconnectionstatechange = () => {
      console.log("[WebRTC] connectionState:", peer.connectionState);
      if (peer.connectionState) {
        this.callbacks.onConnectionStateChange?.(peer.connectionState);
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log("[WebRTC] iceConnectionState:", peer.iceConnectionState);
      if (peer.iceConnectionState) {
        this.callbacks.onIceConnectionStateChange?.(peer.iceConnectionState);
      }
    };

    this.peer = peer;
    return peer;
  }
}
