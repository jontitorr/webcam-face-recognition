import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  NgModule,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as mpFaceDetection from '@mediapipe/face_detection';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { Store, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs';
import * as tf from '@tensorflow/tfjs';
import { AppState, reducers } from '../store/app.state';
import * as WebcamActions from '../store/webcam/webcam.actions';
import { WebcamState } from '../store/webcam/webcam.reducer';

const RED = '#FF2C35';
const GREEN = '#32EEDB';
const BLUE = '#157AB3';
const AGE_ARRAY = [
  2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5, 37.5, 42.5, 47.5, 52.5, 57.5, 62.5,
  67.5, 72.5, 77.5, 82.5, 87.5, 92.5, 97.5,
];

@Component({
  selector: 'app-webcam',
  templateUrl: './webcam.component.html',
  styleUrls: ['./webcam.component.css'],
})
export class WebcamComponent implements OnInit {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  isWebcamActive = false;
  capturedImage: string = '';
  capturedImages: WebcamState['capturedImages'] = [];
  detector: faceDetection.FaceDetector | undefined;
  agePredictionModel: tf.GraphModel<string | tf.io.IOHandler> | undefined;

  constructor(private store: Store<AppState>) {
    this.store.select('webcam').subscribe((state) => {
      if (
        this.isWebcamActive !== state.isWebcamActive &&
        state.isWebcamActive
      ) {
        this.startVideoStream();
      } else if (
        this.isWebcamActive !== state.isWebcamActive &&
        !state.isWebcamActive
      ) {
        this.stopVideoStream();
      }

      this.isWebcamActive = state.isWebcamActive;
      this.capturedImages = state.capturedImages;
    });
  }

  ngOnInit() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('getUserMedia() is not supported by your browser');
    }
  }

  async toggleWebcam() {
    this.isWebcamActive ? this.stopWebcam() : this.startWebcam();
  }

  startWebcam() {
    this.store.dispatch(WebcamActions.startWebcam());
  }

  stopWebcam() {
    this.store.dispatch(WebcamActions.stopWebcam());
  }

  async capture() {
    const context = this.canvas.nativeElement.getContext('2d');

    if (!context) {
      return;
    }

    const { videoWidth, videoHeight } = this.video.nativeElement;
    this.canvas.nativeElement.width = videoWidth;
    this.canvas.nativeElement.height = videoHeight;
    context.drawImage(this.video.nativeElement, 0, 0, videoWidth, videoHeight);
    const { ages, faces } = await this.calculateAgesAndFaces(
      context,
      this.video.nativeElement
    );

    this.drawFaces(context, faces);

    this.store.dispatch(
      WebcamActions.addCapturedImage({
        image: context.canvas.toDataURL('image/png'),
        ages,
        faces,
        timestamp: new Date(),
      })
    );
  }

  async handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || !input.files[0]) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e: any) => {
      const img = new Image();

      img.onload = async () => {
        const context = this.canvas.nativeElement.getContext('2d', {
          willReadFrequently: true,
        });

        if (!context) {
          return;
        }

        this.canvas.nativeElement.width = img.width;
        this.canvas.nativeElement.height = img.height;
        context?.drawImage(img, 0, 0);
        const { ages, faces } = await this.calculateAgesAndFaces(context, img);
        this.drawFaces(context, faces);
        this.store.dispatch(
          WebcamActions.addCapturedImage({
            image: context.canvas.toDataURL('image/png'),
            ages,
            faces,
            timestamp: new Date(),
          })
        );
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  drawPath(
    ctx: CanvasRenderingContext2D,
    points: number[][],
    closePath: boolean
  ) {
    const region = new Path2D();
    region.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      region.lineTo(point[0], point[1]);
    }

    if (closePath) {
      region.closePath();
    }
    ctx.stroke(region);
  }

  drawFaces(ctx: CanvasRenderingContext2D, faces: faceDetection.Face[]) {
    if (!ctx) {
      return;
    }

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const keypoints = face.keypoints.map((keypoint) => [
        keypoint.x,
        keypoint.y,
      ]);

      ctx.strokeStyle = RED;
      ctx.lineWidth = 1;

      const box = face.box;
      this.drawPath(
        ctx,
        [
          [box.xMin, box.yMin],
          [box.xMax, box.yMin],
          [box.xMax, box.yMax],
          [box.xMin, box.yMax],
        ],
        true
      );

      ctx.fillStyle = GREEN;
      ctx.font = '16px Arial';
      ctx.fillText(`${i + 1}`, (box.xMin + box.xMax) / 2, box.yMin - 10);

      for (let j = 0; j < 6; j++) {
        const x = keypoints[j][0];
        const y = keypoints[j][1];

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  private startVideoStream() {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          aspectRatio: 16 / 9,
          frameRate: 30,
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
          facingMode: 'user',
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: false,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16,
        },
      })
      .then((stream) => {
        this.video.nativeElement.srcObject = stream;
      })
      .catch((error) => {
        console.error('Error accessing webcam: ', error);
        this.store.dispatch(WebcamActions.stopWebcam());
      });
  }

  private stopVideoStream() {
    if (this.video.nativeElement.srcObject) {
      const stream = this.video.nativeElement.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      this.video.nativeElement.srcObject = null;
    }
  }

  private async calculateAgesAndFaces(
    context: CanvasRenderingContext2D,
    element: HTMLVideoElement | HTMLImageElement
  ): Promise<{ ages: number[]; faces: faceDetection.Face[] }> {
    if (!this.agePredictionModel) {
      this.agePredictionModel = await tf.loadGraphModel('assets/model.json');
    }

    if (!this.detector) {
      this.detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: 'mediapipe',
          modelType: 'full',
          maxFaces: 2,
          solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@${mpFaceDetection.VERSION}`,
        }
      );
    }

    const faces = (await this.detector?.estimateFaces(element)) ?? [];
    const ages: number[] = [];

    for (const face of faces) {
      const { box } = face;
      const faceImage = context.getImageData(
        box.xMin,
        box.yMin,
        box.xMax - box.xMin,
        box.yMax - box.yMin
      );
      const inputTensor = tf.browser
        .fromPixels(faceImage)
        .resizeNearestNeighbor([128, 128])
        .toFloat();
      const input = inputTensor.div(tf.scalar(255)).expandDims();
      const predictions = this.agePredictionModel.predict(input) as tf.Tensor;
      const predAge = tf.sum(tf.mul(predictions.dataSync(), AGE_ARRAY));
      const age = predAge.dataSync()[0];
      ages.push(age);
    }

    return {
      ages,
      faces,
    };
  }
}

@NgModule({
  imports: [
    CommonModule,
    NgbAlertModule,
    StoreModule.forRoot(reducers),
    StoreDevtoolsModule.instrument({ maxAge: 25 }),
  ],
  exports: [WebcamComponent],
  declarations: [WebcamComponent],
})
export class WebcamComponentModule {}
