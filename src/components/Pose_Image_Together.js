import React, { useEffect, useRef, useState } from "react";
import * as tmPose from "@teachablemachine/pose";
import * as tmImage from "@teachablemachine/image";

const PoseAndImageClassification = () => {
  const containerRef = useRef();
  const cameraRef = useRef([]);

  const [predictions, setPredictions] = useState([]);
  const [poseModel, setPoseModel] = useState(null);
  const [imageModel, setImageModel] = useState(null);
  const [detectedImage, setDetectedImage] = useState("");
  let myAud = null;
  let currentSrc = null;

  const playAud = (src) => {
    console.log("src", src, "currentSrc", currentSrc);
    const extractFolderPath = (url) => {
      if (url === null) {
        return null;
      }
      const parts = url.split("/");
      parts.pop(); // Remove the file name
      return parts.join("/");
    };
    const srcFolder = extractFolderPath(src);
    const currentSrcFolder = extractFolderPath(currentSrc);
    if (srcFolder !== currentSrcFolder) {
      if (myAud !== null) {
        myAud.pause();
        myAud = null;
        currentSrc = null;
      }
      myAud = new Audio(src);
      currentSrc = src;
      myAud.play().catch((error) => {
        if (
          error.name === "NotAllowedError" &&
          error.message ===
            "play() failed because the user didn't interact with the document first"
        ) {
          // Handle the play() request interruption
          // For example, show a button or UI element to allow the user to interact and trigger the audio playback
          console.log("Audio playback requires user interaction");
        } else {
          console.error("Error playing audio:", error);
        }
      });
    } else {
      myAud.play().catch((error) => {
        if (
          error.name === "NotAllowedError" &&
          error.message ===
            "play() failed because the user didn't interact with the document first"
        ) {
          // Handle the play() request interruption
          // For example, show a button or UI element to allow the user to interact and trigger the audio playback
          console.log("Audio playback requires user interaction");
        } else {
          console.error("Error playing audio:", error);
        }
      });
    }
  };

  const pauseAud = () => {
    if (myAud !== null) {
      myAud.pause();
    }
  };

  const [cameraIds, setCameraIds] = useState();

  const loadModels = async () => {
    const imageModelURL =
      "https://teachablemachine.withgoogle.com/models/0lEKy97vU/model.json";
    const imageMetadataURL =
      "https://teachablemachine.withgoogle.com/models/0lEKy97vU/metadata.json";
    const poseModelURL =
      "https://teachablemachine.withgoogle.com/models/iWziCF_1p/model.json";
    const poseMetadataURL =
      "https://teachablemachine.withgoogle.com/models/iWziCF_1p/metadata.json";

    // const modelURL = '/model.json';
    // const metadataURL = '/metadata.json';

    const imageM = await tmImage.load(imageModelURL, imageMetadataURL);
    setImageModel(imageM);
    const poseM = await tmPose.load(poseModelURL, poseMetadataURL);
    setPoseModel(poseM);

    const ids = await getCameraDeviceIds();
    console.log(ids);
    if (ids.length === 0) {
      alert("no camera found");
      return;
    }
    setCameraIds(ids);
  };

  async function getCameraDeviceIds() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      const cameraDeviceIds = cameraDevices.map((device) => device.deviceId);
      return cameraDeviceIds;
    } catch (error) {
      console.error("Error enumerating video devices:", error);
      return [];
    }
  }

  const requestWebcamPermission = async () => {
    try {
      const streams = await Promise.all(
        cameraIds.map((id) =>
          navigator.mediaDevices.getUserMedia({
            video: { deviceId: id },
          })
        )
      );

      for (let i = 0; i < cameraIds.length; i++) {
        cameraRef.current[i].srcObject = streams[i];
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  /* eslint-disable */
  useEffect(() => {
    // Load the model when the component mounts
    loadModels();
  }, []);

  useEffect(() => {
    if (
      containerRef.current.children &&
      containerRef.current.children.length > 0
    ) {
      requestWebcamPermission().then(() => estimatePoseAndClassifyImage());
    }
  }, [containerRef.current, poseModel, imageModel]);
  /* eslint-enable */
  const estimatePoseAndClassifyImage = async () => {
    if (poseModel && imageModel) {
      let maxTopPose = null;
      let maxTopImage = null;

      for (let i = 0; i < cameraRef.current.length; i++) {
        if (cameraRef.current[i].videoWidth > 0) {
          const { pose, posenetOutput } = await poseModel.estimatePose(
            cameraRef.current[i]
          );
          console.log("pose", pose);
          const posePredictionData = await poseModel.predict(posenetOutput);
          setPredictions((prevState) => {
            const updatedPredictions = [...prevState];
            updatedPredictions[i] = posePredictionData;
            return updatedPredictions;
          });
          const topPose = getTopPrediction(posePredictionData);

          if (maxTopPose === null) maxTopPose = topPose;
          else if (
            maxTopPose.probability.toFixed(2) <= topPose.probability.toFixed(2)
          ) {
            maxTopPose = topPose;
          }

          const imagePrediction = await imageModel.predict(
            cameraRef.current[i]
          );
          const topImage = getTopPrediction(imagePrediction);

          if (maxTopImage === null) {
            maxTopImage = topImage;
          }
        }
      }
      if (
        maxTopPose != null &&
        maxTopImage !== null &&
        (maxTopPose.probability.toFixed(2) >= 0.75 ||
          maxTopImage.probability.toFixed(2) >= 0.75)
      ) {
        console.log("Image", maxTopImage.probability);
        console.log("Pose", maxTopPose.probability);
        setDetectedImage(maxTopImage.className); // Update the detected image name

        if (maxTopImage.probability >= maxTopPose.probability) {
          pauseAud();
          const rndInt = Math.floor(Math.random() * 2) + 1;
          playAud(`/audio-folder/${maxTopImage.className}/${rndInt}.mp3`);
          console.log("Object:", maxTopImage.className);
        } else {
          pauseAud();
          const rndInt = Math.floor(Math.random() * 2) + 1;
          playAud(`/audio-folder/${maxTopPose.className}/${rndInt}.mp3`);
        }
      } else {
        pauseAud();
        setDetectedImage("null");
      }
    }
    setTimeout(() => {
      estimatePoseAndClassifyImage();
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
    } else {
      return null;
    }
  };

  return (
    <div>
      <div ref={containerRef}>
        {cameraIds &&
          cameraIds.map((id, idx) => (
            <div key={idx}>
              <video
                ref={(el) => (cameraRef.current[idx] = el)}
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

          {detectedImage && (
            <div>
              <h2>Detected Image: {detectedImage}</h2>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PoseAndImageClassification;
