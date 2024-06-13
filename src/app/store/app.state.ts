import { ActionReducerMap } from '@ngrx/store';
import { WebcamState, webcamReducer } from './webcam/webcam.reducer';

export interface AppState {
  webcam: WebcamState;
}

export const reducers: ActionReducerMap<AppState> = {
  webcam: webcamReducer,
};
