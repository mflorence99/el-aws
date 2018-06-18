import { ELAWSModule } from './app/module';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

platformBrowserDynamic().bootstrapModule(ELAWSModule)
  .catch(err => console.log(err));
