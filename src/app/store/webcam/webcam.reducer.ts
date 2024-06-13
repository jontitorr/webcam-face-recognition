import { createReducer, on } from '@ngrx/store';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as WebcamActions from './webcam.actions';

export interface WebcamState {
  isWebcamActive: boolean;
  capturedImages: {
    image: string;
    ages: number[];
    faces: faceDetection.Face[];
    timestamp: Date;
  }[];
}

const initialState: WebcamState = {
  isWebcamActive: false,
  capturedImages: [],
};

export const webcamReducer = createReducer(
  initialState,
  on(WebcamActions.startWebcam, (state) => ({
    ...state,
    isWebcamActive: true,
  })),
  on(WebcamActions.stopWebcam, (state) => ({
    ...state,
    isWebcamActive: false,
  })),
  on(
    WebcamActions.addCapturedImage,
    (state, { image, ages, faces, timestamp }) => ({
      ...state,
      capturedImages: [
        ...state.capturedImages,
        { image, ages, faces, timestamp },
      ],
    })
  )
);
