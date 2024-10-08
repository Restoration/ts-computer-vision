import * as facemesh from "@tensorflow-models/facemesh";

const CAMERA_THRESHOLD = 50;

// ランドマークの位置を基に目の中心を計算するヘルパー関数
// 指定された目に対応する複数のランドマークの座標を平均化し目の中心位置を計算。
// 目を構成するランドマークがいくつか存在し、それらの座標を使って全体的な目の位置を1つの点で表すために使用される
const calculateEyeCenter = (keypoints: number[][], eyeIndices: number[]) => {
  let xSum = 0;
  let ySum = 0;

  // 目の中心位置を求めるため、目の全てのランドマークの平均座標を計算する
  eyeIndices.forEach((index) => {
    xSum += keypoints[index][0];
    ySum += keypoints[index][1];
  });

  const centerX = xSum / eyeIndices.length;
  const centerY = ySum / eyeIndices.length;

  return { x: centerX, y: centerY };
};

// 目線の方向がカメラの中心に向いているかどうかの判定
// ビデオの幅と高さを取得して、カメラの中心座標を計算
// 左目と右目の中心座標がカメラの中心からどれだけ離れているかを測定
// 両方の目の中心が、カメラの中心から一定範囲内であれば、カメラを見ていると判断して真偽値を返す
function isLookingAtCamera(
  leftEyeCenter: { x: number; y: number },
  rightEyeCenter: { x: number; y: number },
  video: HTMLVideoElement
): boolean {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  // カメラ（画面）中央の座標
  const centerX = videoWidth / 2;
  const centerY = videoHeight / 2;

  // 目の中心位置がカメラ中央付近かどうかを判定
  const threshold = CAMERA_THRESHOLD; // カメラの中心からどのくらいの範囲で目が合っているとみなすかの閾値
  const leftEyeDistanceX = Math.abs(leftEyeCenter.x - centerX);
  const leftEyeDistanceY = Math.abs(leftEyeCenter.y - centerY);
  const rightEyeDistanceX = Math.abs(rightEyeCenter.x - centerX);
  const rightEyeDistanceY = Math.abs(rightEyeCenter.y - centerY);

  return (
    leftEyeDistanceX < threshold &&
    leftEyeDistanceY < threshold &&
    rightEyeDistanceX < threshold &&
    rightEyeDistanceY < threshold
  );
}

// 目線検出処理
export const detectEyes = async (
  video: HTMLVideoElement,
  model: facemesh.FaceMesh
) => {
  // 再起的に処理を実行
  const detect = async () => {
    const predictions: facemesh.AnnotatedPrediction[] =
      await model.estimateFaces(video);
    if (predictions.length > 0) {
      // 目の位置を取得
      // FIXME 型修正
      const keypoints = predictions[0].scaledMesh as number[][]; // 3次元座標が格納された配列

      // 左目と右目に該当するランドマークのインデックス
      const leftEyeIndices = [33, 133, 160, 159, 158, 144, 145, 153]; // 左目周りのインデックス
      const rightEyeIndices = [362, 263, 387, 386, 385, 373, 374, 380]; // 右目周りのインデックス

      // 左目の中心位置を計算
      const leftEyeCenter = calculateEyeCenter(keypoints, leftEyeIndices);
      console.log("Left Eye Center: ", leftEyeCenter);

      // 右目の中心位置を計算
      const rightEyeCenter = calculateEyeCenter(keypoints, rightEyeIndices);
      console.log("Right Eye Center: ", rightEyeCenter);

      // 両目の平均を取って目の中心位置を出す場合
      const eyesCenter = {
        x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
        y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
      };
      console.log("Eyes Center: ", eyesCenter);

      if (isLookingAtCamera(leftEyeCenter, rightEyeCenter, video)) {
        console.log("目線がカメラと合いました！");
        // イベントを発火
        alert("目線がカメラと合いました！");
      }
    }
    // フレームごとに繰り返し検出を行う
    requestAnimationFrame(detect);
  };

  await detect();
};
