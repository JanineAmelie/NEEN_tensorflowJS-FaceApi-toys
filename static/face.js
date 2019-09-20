const videoWidth = 600;
const videoHeight = 500;

const color = 'aqua';
const boundingBoxColor = 'red';
const lineWidth = 2;

let predictedAges = []

function interpolateAgePredictions(age) {
  predictedAges = [age].concat(predictedAges).slice(0, 30)
  const avgPredictedAge = predictedAges.reduce((total, a) => total + a) / predictedAges.length
  return avgPredictedAge
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: videoWidth,
      height: videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

function detectFaceInRealTime(video, net, task) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');

  canvas.width = videoWidth;
  canvas.height = videoHeight;
  minConfidence = 0.5
  options = new faceapi.SsdMobilenetv1Options({ minConfidence })

  async function poseDetectionFrame() {
    let minPoseConfidence;
    let minPartConfidence;

    let result;
    if (task == 'landmarks')
      result = await faceapi.detectSingleFace(video, options).withFaceLandmarks()
    else if (task == 'age_gender')
      result = await faceapi.detectSingleFace(video, options).withAgeAndGender()
    else if (task == 'expression')
      result = await faceapi.detectSingleFace(video, options).withFaceExpressions()
    else
      result = await faceapi.detectSingleFace(video, options)

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    if (result) {
      const canvas = $('#output').get(0)
      const dims = faceapi.matchDimensions(canvas, video, true)
      const resizedResult = faceapi.resizeResults(result, dims)
      if (task == 'landmarks') {
        faceapi.draw.drawFaceLandmarks(canvas, resizedResult)
      }
      if (task == 'age_gender') {
        const { age, gender, genderProbability } = resizedResult
        const interpolatedAge = interpolateAgePredictions(age)

        new faceapi.draw.DrawTextField(
          [
            `${faceapi.round(interpolatedAge, 0)} years`,
            `${gender} (${faceapi.round(genderProbability)})`
          ],
          result.detection.box.bottomLeft
        ).draw(canvas)
      }
      if (task == 'expression') {
        const minConfidence = 0.05
        const emoji = getHighestExpression(resizedResult.expressions);
        ctx.font = '300px serif'
        // use these alignment properties for "better" positioning
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // draw the emoji


        ctx.fillText(emoji, (resizedResult.detection.box.width / 2) + resizedResult.detection.box.left, (resizedResult.detection.box.height / 2) + resizedResult.detection.box.top + 50) // results in upperleft
      }

    }

    // setTimeout(() => onPlay())

    requestAnimationFrame(poseDetectionFrame);
  }
  poseDetectionFrame();
}

const emoji = {
  neutral: '😑',
  happy: '😁',
  sad: '😭',
  angry: '😡',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😱',
};

// @TODO:
// only change the emoji when it has a high confidence. as to reduce flickering

function getHighestExpression(obj) {
  return emoji[Object.keys(obj).reduce(function (a, b) { return obj[a] > obj[b] ? a : b })];
}



async function start(task) {
  const net = await faceapi.nets.ssdMobilenetv1
    // const net = await faceapi.nets.tinyFaceDetector
    // const net = await faceapi.nets.mtcnn
    .load('/weights')
  if (task == 'landmarks')
    await faceapi.loadFaceLandmarkModel('/weights')
  else if (task == 'age_gender')
    await faceapi.nets.ageGenderNet.load('/weights')
  else if (task == 'expression')
    await faceapi.loadFaceExpressionModel('/weights')

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    alert('this browser does not support video capture, or this device does not have a camera');
  }

  $('#loader').removeClass('active')

  detectFaceInRealTime(video, net, task);
}


navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
