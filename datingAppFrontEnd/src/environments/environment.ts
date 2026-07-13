// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Deriving apiUrl from the browser's own hostname (instead of hardcoding
// "localhost") means the same build works whether you open it as
// http://localhost:4200 on this machine or http://<lan-ip>:4200 from a phone
// on the same network - the backend is assumed to be reachable on the same
// host, port 8000.
export const environment = {
  production: false,
  apiUrl: `http://${window.location.hostname}:8000`,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
