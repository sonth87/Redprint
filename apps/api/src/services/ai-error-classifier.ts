export type AIErrorKind =
  | "timeout"
  | "overloaded"
  | "rate_limit"
  | "invalid_json"
  | "schema_error"
  | "compiler_error"
  | "quality_block"
  | "unknown";

export interface ClassifiedAIError {
  kind: AIErrorKind;
  message: string;
  retryable: boolean;
}

export function classifyAIError(error: unknown): ClassifiedAIError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("timed out") || lower.includes("aborterror")) {
    return { kind: "timeout", message, retryable: false };
  }
  if (lower.includes("503") || lower.includes("overloaded") || lower.includes("high demand")) {
    return { kind: "overloaded", message, retryable: false };
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return { kind: "rate_limit", message, retryable: false };
  }
  if (lower.includes("could not extract valid json") || lower.includes("unexpected token")) {
    return { kind: "invalid_json", message, retryable: true };
  }
  if (lower.includes("expected") || lower.includes("required") || lower.includes("validation")) {
    return { kind: "schema_error", message, retryable: true };
  }
  if (lower.includes("compiler produced no valid commands")) {
    return { kind: "compiler_error", message, retryable: true };
  }
  if (lower.includes("quality gate blocked")) {
    return { kind: "quality_block", message, retryable: true };
  }

  return { kind: "unknown", message, retryable: true };
}

