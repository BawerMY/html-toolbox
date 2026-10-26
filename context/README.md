# Model context

Everything sent to the model as the system prompt lives here. Files are re-read on every request, so edits apply without a restart.

- `NN-name.md` — sections of the system prompt, joined in numeric order. Add a file (e.g. `05-examples.md`) to add a section; remove one to drop it.
- `current-tool.md` — appended when the tool already has HTML. `{{html}}` is replaced with the current document.
- `turn-reminder.md` — appended to the user's latest message (not the system prompt), so the output rule is the last thing the model reads. Older replies are sent without their HTML, and some models copy that and answer with only a sentence.
- Other files (like this README) are not sent.
