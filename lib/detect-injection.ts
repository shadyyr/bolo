const INJECTION_PATTERNS: RegExp[] = [
  // Instruction overriding
  /\bignore\s+(?:the\s+|your\s+|all\s+|my\s+|above\s+|previous\s+|these\s+|any\s+)?(?:instructions?|prompt|system|rules?|guidelines?|context|above)\b/i,
  /\bdisregard\s+(?:the\s+|your\s+|all\s+|my\s+|above\s+|previous\s+|these\s+|any\s+)?(?:instructions?|prompt|system|rules?|guidelines?|above)\b/i,
  /\bforget\s+(?:the\s+|your\s+|all\s+|my\s+|above\s+|previous\s+|these\s+|any\s+)?(?:instructions?|prompt|system|rules?|guidelines?|everything)\b/i,
  /\boverride\s+(?:the\s+|your\s+|all\s+)?(?:instructions?|prompt|system|rules?|guidelines?)\b/i,
  /\bbypass\s+(?:the\s+|your\s+|all\s+)?(?:instructions?|prompt|system|rules?|guidelines?|restrictions?|filters?)\b/i,

  // Role / persona injection
  /\bpretend\s+(?:to\s+be|you\s+are|you're)\b/i,
  /\byou\s+are\s+now\s+(?:a\b|an\b|the\b|my\b)/i,
  /\byour\s+(?:new|updated|revised)\s+(?:instructions?|role|task|persona|job)\s+(?:are|is)\b/i,
  /\b(?:new|updated)\s+(?:system\s+)?prompt\s*:/i,
  /\bfrom\s+now\s+on[,\s]+(?:you|act|be|respond|write|do|generate|ignore|forget)\b/i,

  // Task hijacking
  /\b(?:don't|do\s+not|stop)\s+(?:write|writing|generate|generating|create|creating)\s+(?:a\s+|an\s+|the\s+)?email\b/i,
  /\binstead\s*,?\s*(?:calculate|compute|answer\s+(?:me|this)|tell\s+me|give\s+me|output|return|show\s+me|respond\s+with)\b/i,

  // Known jailbreak tokens
  /\bjailbreak\b/i,
  /\[INST\]/,
  /<\|system\|>/,
  /<<SYS>>/,
]

/**
 * Returns an error message if the input looks like a prompt injection attempt,
 * or null if the input looks legitimate.
 */
export function detectPromptInjection(text: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return "Please describe what you'd like to say in your email. The input you entered looks like an instruction for the AI rather than an email description."
    }
  }
  return null
}
