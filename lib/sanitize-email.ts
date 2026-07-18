// AI providers occasionally wrap generated email text in Markdown emphasis
// (especially around prices/percentages, e.g. "**20% discount**") even when
// asked for plain text. The app shows and copies this text as-is — no
// Markdown renderer — so those markers would otherwise land as literal
// asterisks/hashes in the pasted email. Strip the common cases here as a
// backstop; prompts.ts also asks the model not to use Markdown, but models
// don't reliably follow formatting instructions.
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*([^\n*]+?)\*\*\*/g, "$1") // ***bold italic***
    .replace(/\*\*([^\n*]+?)\*\*/g, "$1") // **bold**
    .replace(/__([^\n_]+?)__/g, "$1") // __bold__
    .replace(/^#{1,6}\s+/gm, "") // # Heading
}
