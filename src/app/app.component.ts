import { Component } from '@angular/core';
import { WebcamComponentModule } from './webcam/webcam.component';

@Component({
  imports: [WebcamComponentModule],
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Webcam Face Recognition';
}
