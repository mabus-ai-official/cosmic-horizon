// Audio unlock — must be imported at app entry point (main.tsx) so that
// login clicks / keystrokes count as user interaction for autoplay policy.

let userHasInteracted = false;
let interactionCallback: (() => void) | null = null;

function onFirstInteraction() {
  userHasInteracted = true;
  if (interactionCallback) {
    interactionCallback();
    interactionCallback = null;
  }
  document.removeEventListener("click", onFirstInteraction);
  document.removeEventListener("keydown", onFirstInteraction);
}

document.addEventListener("click", onFirstInteraction);
document.addEventListener("keydown", onFirstInteraction);

export { userHasInteracted, interactionCallback, onFirstInteraction };

// Writable setter — needed because ES module exports are read-only bindings
export function setInteractionCallback(cb: (() => void) | null) {
  interactionCallback = cb;
}

export function getUserHasInteracted() {
  return userHasInteracted;
}
