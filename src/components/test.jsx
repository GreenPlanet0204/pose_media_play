import React, { useEffect, useRef, useState } from 'react';
import * as tmPose from '@teachablemachine/pose';

const PoseEstimationMultiple = () => {
  const webcamRefs = useRef([]);
  const [predictions, setPredictions] = useState([]);

  const playAud = (src) => {
    // Code for playing audio
  };

  const pauseAud = () => {
    // Code for pausing audio
  };

  useEffect(() => {
    const loadModels = async () => {
      const modelURL = 'https://teachablemachine.withgoogle.com/models/iWziCF_1p/model.json';
      const metadataURL = 'https://teachablemachine.withgoogle.com/models/iWziCF_1p/metadata.json';

      const cameraIDs = await getCameraDeviceIds();
      if (cameraIDs.length === 0) {
        alert("No camera is connected");
        return;
      }

      const models = [];
      const webcamRefsArray = [];

      for (let i = 0; i < cameraIDs.length; i++) {
        const model = await tmPose.load(modelURL, metadataURL);
        models.push(model);

        const webcamRef = useRef(null);
        webcamRefsArray.push(webcamRef);
      }

      // Set the state variables
      setPredictions(models.map(() => null));
      webcamRefs.current = webcamRefsArray;

      requestWebcamPermissions();
    };

    loadModels();
  }, []);

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

  const requestWebcamPermissions = async () => {
    try {
      for (let i = 0; i < webcamRefs.current.length; i++) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: cameraIDs[i] }
          }
        });
        webcamRefs.current[i].current.srcObject = stream;
        estimatePose(i);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };

  const estimatePose = async (index) => {
    const model = models[index];
    const webcamRef = webcamRefs.current[index].current;

    if (model && webcamRef && webcamRef.videoWidth > 0) {
      const { pose, posenetOutput } = await model.estimatePose(webcamRef);
      const predictionData = await model.predict(posenetOutput);

      setPredictions((prevPredictions) => {
        const newPredictions = [...prevPredictions];
        newPredictions[index] = predictionData;
        return newPredictions;
      });

      const top = getTopPrediction(predictionData);
      if (top != null && top.probability.toFixed(2) >= 0.75) {
        playAud(`/audio-folder/${top.className}.mp3`);
      } else {
        pauseAud();
      }

      requestAnimationFrame(() => estimatePose(index)); // Continuously estimate pose
    } else {
      requestAnimationFrame(() => estimatePose(index));
    }
  };

  const getTopPrediction = (predictions) => {
    // Code for getting the top prediction
  };

  return (
    <div>
      {webcamRefs.current.map((webcamRef, index) => (
        <div key={index}>
          <video
            ref={webcamRef}
            autoPlay
            playsInline
            muted
          />
        </div>
      ))}

      {predictions.map((prediction, index) => (
        <div key={index}>
          {prediction && (
            <ul>
              {prediction.map((keypoint, i) => (
                <li key={i}>
                  {keypoint.className}: {keypoint.probability.toFixed(3)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default PoseEstimationMultiple;
