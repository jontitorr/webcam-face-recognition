import { createAction, props } from '@ngrx/store';
import * as faceDetection from '@tensorflow-models/face-detection';

export const startWebcam = createAction('[Webcam] Start Webcam');
export const stopWebcam = createAction('[Webcam] Stop Webcam');
export const addCapturedImage = createAction(
  '[Webcam] Add Captured Image',
  props<{
    image: string;
    ages: number[];
    faces: faceDetection.Face[];
    timestamp: Date;
  }>()
);
