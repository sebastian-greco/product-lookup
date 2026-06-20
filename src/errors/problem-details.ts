export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface ValidationProblemDetails extends ProblemDetails {
  errors: unknown[];
}

export function createProblemDetails(
  problem: ProblemDetails
): ProblemDetails {
  return problem;
}

export function createValidationProblemDetails(
  problem: ValidationProblemDetails
): ValidationProblemDetails {
  return problem;
}
