/** One optional profile-completion nudge after signup / enable-customer. */
let pendingPrompt = false;

export function markProfileCompletionPrompt(): void {
  pendingPrompt = true;
}

export function consumeProfileCompletionPrompt(): boolean {
  const value = pendingPrompt;
  pendingPrompt = false;
  return value;
}
