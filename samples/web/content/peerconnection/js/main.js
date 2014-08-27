var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

var startTime;
var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function () {
  console.log('Local video currentSrc: ' + this.currentSrc +
    ', videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.addEventListener('loadedmetadata', function () {
  console.log('Remote video currentSrc: ' + this.currentSrc +
    ', videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.onresize = function() {
  console.log('Remote video size changed to ' +
        remoteVideo.videoWidth  + 'x' + remoteVideo.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  // if (startTime) {
  //   var elapsedTime = performance.now() - startTime;
  //   console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
  //   startTime = null;
  // }
}

var localStream, pc1, pc2;
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

function getName(pc) {
  return (pc == pc1) ? 'pc1' : 'pc2';
}
function getOtherPc(pc) {
  return (pc == pc1) ? pc2 : pc1;
}

function gotStream(stream) {
  console.log('Received local stream');
  // Call the polyfill wrapper to attach the media stream to this element.
  localVideo = attachMediaStream(localVideo, stream);
  localStream = stream;
  callButton.disabled = false;
}

function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  // Call into getUserMedia via the polyfill (adapter.js).
  getUserMedia({
      audio: true,
      video: true
    }, gotStream,
    function (e) {
      alert('getUserMedia() error: ' + e.name);
    });
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  // startTime = performance.now();
  var videoTracks = localStream.getVideoTracks();
  var audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0)
    console.log('Using video device: ' + videoTracks[0].label);
  if (audioTracks.length > 0)
    console.log('Using audio device: ' + audioTracks[0].label);
  var servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = function(e) { onIceCandidate(pc1, e) };
  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = function(e) { onIceCandidate(pc2, e) };
  pc1.oniceconnectionstatechange = function(e) { onIceStateChange(pc1, e) };
  pc2.oniceconnectionstatechange = function(e) { onIceStateChange(pc2, e) };
  pc2.onaddstream = gotRemoteStream;

  pc1.addStream(localStream);
  console.log('Added local stream to pc1');

  console.log('pc1 createOffer start');
  pc1.createOffer(onCreateOfferSuccess, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
  console.log('Offer from pc1\n' + desc.sdp);
  console.log('pc1 setLocalDescription start');
  pc1.setLocalDescription(desc, function() { onSetLocalSuccess(pc1); });
  console.log('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc, function() { onSetRemoteSuccess(pc2); });
  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer(onCreateAnswerSuccess, onCreateSessionDescriptionError,
                   sdpConstraints);
}

function onSetLocalSuccess(pc) {
  console.log(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
  console.log(getName(pc) + ' setRemoteDescription complete');
}

function gotRemoteStream(e) {
  // Call the polyfill wrapper to attach the media stream to this element.
  remoteVideo = attachMediaStream(remoteVideo, e.stream);
  console.log('pc2 received remote stream');
}

function onCreateAnswerSuccess(desc) {
  console.log('Answer from pc2:\n' + desc.sdp);
  console.log('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc, function() { onSetLocalSuccess(pc2); });
  console.log('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc, function() { onSetRemoteSuccess(pc1); });
}


function onIceCandidate(pc, event) {
  if (event.candidate) {
    getOtherPc(pc).addIceCandidate(new RTCIceCandidate(event.candidate),
        function() { onAddIceCandidateSuccess(pc) },
        function(err) { onAddIceCandidateError(pc, err); });
    console.log(getName(pc) + ' ICE candidate: \n' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess(pc) {
  console.log(getName(pc) + ' addIceCandidate success');
}

function onAddIceCandidateError(pc, error) {
  console.log(getName(pc) + ' failed to add ICE Candidate: ' + error.toString());
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
  }
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}
