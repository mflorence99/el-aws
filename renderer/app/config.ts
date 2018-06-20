/**
 * Common configuration settings
 */

export class Config {
  
  setBoundsThrottle = 250;

  // @see https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
  urlValidationPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

}

export const config = new Config();
