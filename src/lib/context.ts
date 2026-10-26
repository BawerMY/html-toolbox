import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const CONTEXT_DIR = path.join(process.cwd(), "context");
const SECTION_FILE = /^\d+-.+\.md$/;

/** Builds the system prompt from context/. Read on every call so edits apply without a restart. */
export async function buildSystemPrompt(currentHtml: string | null): Promise<string> {
  const files = (await readdir(CONTEXT_DIR)).filter((f) => SECTION_FILE.test(f)).sort();
  const sections = await Promise.all(files.map((f) => readFile(path.join(CONTEXT_DIR, f), "utf8")));
  if (currentHtml) {
    const template = await readFile(path.join(CONTEXT_DIR, "current-tool.md"), "utf8");
    // Function replacer so "$" sequences in the HTML are kept literally.
    sections.push(template.replace("{{html}}", () => currentHtml));
  }
  return sections.map((s) => s.trim()).join("\n\n");
}

/** Appended to the latest user message, so the output rule is the last thing the model reads. */
export async function loadTurnReminder(): Promise<string> {
  return (await readFile(path.join(CONTEXT_DIR, "turn-reminder.md"), "utf8")).trim();
}
