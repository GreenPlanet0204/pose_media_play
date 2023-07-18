import React, { useEffect, useRef, useState } from 'react';
import * as tmPose from '@teachablemachine/pose';

const PoseEstimation = () => {
  const containerRef = useRef();
  const cameraRef = useRef([]);

  const [predictions, setPredictions] = useState([]);
  let myAud = null;
  let currentSrc = null;
  let isStop = false;

  const [model, setModel] = useState();

  const playAud = (src) => {
    console.log("src", src, "currentSrc", currentSrc);
    if (src !== currentSrc) {
      if (myAud !== null) {
        myAud.pause();
        myAud = null;
        currentSrc = null;
      }
      myAud = new Audio(src);
      currentSrc = src;
      myAud.play()
        .catch((error) => {
          if (error.name === 'NotAllowedError' && error.message === 'play() failed because the user didn\'t interact with the document first') {
            // Handle the play() request interruption
            // For example, show a button or UI element to allow the user to interact and trigger the audio playback
            console.log('Audio playback requires user interaction');
          } else {
            console.error('Error playing audio:', error);
          }
        });
    } else {
      myAud.play()
        .catch((error) => {
          if (error.name === 'NotAllowedError' && error.message === 'play() failed because the user didn\'t interact with the document first') {
            // Handle the play() request interruption
            // For example, show a button or UI element to allow the user to interact and trigger the audio playback
            console.log('Audio playback requires user interaction');
          } else {
            console.error('Error playing audio:', error);
          }
        });
    }
  };

  const pauseAud = () => {
    if (myAud !== null) {
      myAud.pause();
    }
  };

  useEffect(() => {
    // Load the model when the component mounts
    loadModel();
  }, []);

  const [cameraIds, setCameraIds] = useState();

  const loadModel = async () => {
    const modelURL = 'https://teachablemachine.withgoogle.com/models/iWziCF_1p/model.json';
    const metadataURL = 'https://teachablemachine.withgoogle.com/models/iWziCF_1p/metadata.json';

    // const modelURL = '/model.json';
    // const metadataURL = '/metadata.json';

    const m = await tmPose.load(modelURL, metadataURL);

    setModel(m);

    const ids = await getCameraDeviceIds();
    console.log(ids)
    if(ids.length === 0) {
      alert("no camera found")
      return;
    }
    setCameraIds(ids);
  };

  async function getCameraDeviceIds() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter(device => device.kind === 'videoinput');
      const cameraDeviceIds = cameraDevices.map(device => device.deviceId);
      return cameraDeviceIds;
    } catch (error) {
      console.error('Error enumerating video devices:', error);
      return [];
    }
  }

  const requestWebcamPermission = async () => {
    try {
      const streams = await Promise.all(cameraIds.map((id) => navigator.mediaDevices.getUserMedia({
        video: { deviceId: id }
      })))

      for(let i = 0; i < cameraIds.length; i ++) {
        cameraRef.current[i].srcObject = streams[i]
      }

    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };

  useEffect(() => {
    if (containerRef.current.children && containerRef.current.children.length > 0) {
      requestWebcamPermission().then(() => estimatePose(model));
    }
  }, [containerRef.current, model])
  
  const estimatePose = async (m) => {
    if (m) {
      let maxTop = null;
      for (let i = 0; i < cameraRef.current.length; i ++) {
        if (cameraRef.current[i].videoWidth > 0) {
          const { pose, posenetOutput } = await m.estimatePose(cameraRef.current[i]);
          const predictionData = await m.predict(posenetOutput);
          setPredictions((prevState) => {
            const updatedPredictions = [...prevState];
            updatedPredictions[i] = predictionData;
            return updatedPredictions;
          });
          const top = getTopPrediction(predictionData);
    
          if (maxTop === null) maxTop = top;
          else if (maxTop.probability.toFixed(2) <= top.probability.toFixed(2)) {
            maxTop = top
          }
        }
      }
      if (maxTop != null && maxTop.probability.toFixed(2) >= 0.75) {
        const rndInt = Math.floor(Math.random() * 2) + 1;
        playAud(`/audio-folder/${maxTop.className}/${rndInt}.mp3`);
      } else {
        pauseAud();
      }
    }
    setTimeout(() => {
      estimatePose(m)
    }, 1000);
    // requestAnimationFrame(() => estimatePose(m));
  };

  const getTopPrediction = (predictions) => {
    if (predictions !== null) {
      let topPrediction = predictions[0];
      for (let i = 1; i < predictions.length; i++) {
        if (predictions[i].probability > topPrediction.probability) {
          topPrediction = predictions[i];
        }
      }

      return topPrediction;
    }
    else {
      return null;
    }
  }

  return (
    <div>
      <div ref={containerRef}>
        {cameraIds && cameraIds.map((id, idx) => (
          <div key={idx}>
            <video
              ref={(el) => cameraRef.current[idx] = el}
              autoPlay
              muted
            />
          </div>
        ))}
      </div>
      {predictions.length > 0 && (
        <div>
          {predictions.map((prediction, camIndex) => (
            <div key={camIndex}>
              <h3>Camera {camIndex + 1}</h3>
              <ul>
                {prediction.map((keypoint, index) => (
                  <li key={index}>
                    {keypoint.className}: {keypoint.probability.toFixed(3)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PoseEstimation;
