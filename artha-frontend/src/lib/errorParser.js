/**
 * Centralized error parsing utility for Artha Frontend.
 * Transforms technical backend/database errors into user-friendly messages.
 */

const ERROR_MAPPINGS = {
  // Unique Constraints (Database)
  "uk_budget_category": "A category with this name already exists in this budget.",
  "uk_user_email": "This email address is already registered.",
  "uk_company_name": "A company with this name already exists in your workspace.",
  "uk_budget_name": "A budget with this name already exists for this company.",
  
  // Specific Database Error Patterns
  "duplicate key value violates unique constraint": "This item already exists. Please use a unique identifier.",
  "violates foreign key constraint": "This item cannot be deleted as it is being used elsewhere.",
  "not-null constraint": "A required field is missing. Please fill in all mandatory information.",
  "value too long": "The text provided is too long for this field.",
  
  // Business Logic Errors (Custom)
  "Insufficient budget": "The allocated limit exceeds the remaining budget pool.",
  "exceeds remaining": "The amount exceeds the available budget for this category.",
  "Unauthorized": "Your session has expired or you do not have permission for this action.",
  "Forbidden": "You do not have the required role to perform this task.",
  "Not Found": "The requested item could not be found."
};

/**
 * Parses a raw error message or object into a human-readable string.
 * @param {string|object} error - The error to parse.
 * @returns {string} - The user-friendly error message.
 */
export function formatFriendlyError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";
  
  const rawMessage = typeof error === "string" ? error : error.message || String(error);
  
  // 1. Check for explicit mappings
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MAPPINGS)) {
    if (rawMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }
  
  // 2. Clean up common technical prefixes
  let cleanMessage = rawMessage;
  
  // Remove Spring Boot / Hibernate boilerplates
  if (cleanMessage.includes("could not execute statement")) {
    // Try to extract the "Detail: Key..." part which is often more useful
    const detailMatch = cleanMessage.match(/Detail: (.*?)]/);
    if (detailMatch && detailMatch[1]) {
      return `Database Error: ${detailMatch[1]}`;
    }
    return "A database error occurred. Please check your inputs for uniqueness.";
  }
  
  // 3. Fallback to a cleaner version of the raw message
  // If it's a generic "Failed to fetch", return a network message
  if (cleanMessage.toLowerCase().includes("failed to fetch")) {
    return "Connection lost. Please check your internet and try again.";
  }

  // If it's too long and looks like a stack trace, truncate it
  if (cleanMessage.length > 150) {
    return "Something went wrong. Please refresh and try again.";
  }

  return cleanMessage;
}
