
/**
 * Abstract avigator definition
 */

export interface Navigator {
  canNavigate?: any[];
  color: string;
  icon: string[];
  route: string;
  title: string;
}

export interface CanNavigate {
  canNavigate: () => boolean;
}
