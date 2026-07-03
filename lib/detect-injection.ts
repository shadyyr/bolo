// Screens user input for prompt-injection phrasing before it reaches the AI.
//
// Design bias: never block legitimate email content. Users dictate real business
// emails here — "please disregard my previous instructions", "instead, give me a
// full refund", "from now on you must submit timesheets" are all things people
// legitimately want written INTO an email. A missed injection only affects the
// requester's own single-shot generation, so a false negative is far cheaper
// than a false positive that blocks a real user.
const INJECTION_PATTERNS: RegExp[] = [
  // Instruction overriding: "ignore all previous instructions", "disregard the
  // above rules", "forget everything above", "bypass your restrictions".
  // The modifier group repeats (*) so multi-word chains like "all previous" match.
  // "my" is deliberately not a modifier: "disregard my previous instructions and
  // ship to the new address" is a real business email.
  /\b(?:ignore|disregard|forget|override|bypass)\s+(?:(?:the|your|all|any|these|those|of|previous|prior|earlier|above)\s+)*(?:instructions?|prompts?|rules?|guidelines?|restrictions?|filters?|(?:system\s+)?prompt|everything\s+(?:above|before))\b/i,

  // Prompt extraction
  /\b(?:reveal|show|print|output|repeat|display)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?)\b/i,

  // Role / persona injection — scoped to AI personas so email content like
  // "you are now a member of our alumni club" or "you are my assistant for
  // scheduling" is never blocked.
  /\bpretend\s+(?:to\s+be|you\s+are|you're)\b/i,
  /\byou\s+are\s+(?:now\s+)?(?:a\s+|an\s+)?(?:different\s+)?(?:ai\b|chatbot|language\s+model|llm\b|helpful\s+assistant)/i,
  /\byour\s+(?:new|updated|revised)\s+(?:instructions?|persona|system\s+prompt)\s+(?:are|is)\b/i,
  /\b(?:new|updated)\s+(?:system\s+)?prompt\s*:/i,
  /\bfrom\s+now\s+on[,\s]+(?:you\s+are|act\s+as)\s+(?:a\s+|an\s+)?(?:ai\b|assistant|chatbot|bot\b|model|dan\b)/i,

  // Task hijacking — only unambiguous "do math instead of the email" phrasing.
  // ("instead, give me / tell me / show me" are normal email content.)
  /\binstead\s*,?\s*(?:calculate|compute|solve)\b/i,

  // Known jailbreak tokens
  /\bjailbreak\b/i,
  /\[INST\]/,
  /<\|(?:system|im_start)\|>/,
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
