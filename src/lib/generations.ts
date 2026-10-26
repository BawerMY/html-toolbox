import type { UIMessageChunk } from "ai";

/**
 * Generations run on the server independently of the browser request that started them.
 * Chunks are buffered so a client can (re)connect at any time and get a full replay plus live updates.
 * In-memory: works for a single server process.
 */
type Generation = {
  chunks: UIMessageChunk[];
  listeners: Set<() => void>;
  abort: AbortController;
  done: boolean;
};

// Finished generations are kept briefly so a client that loaded the page just before the
// final save still gets the complete reply on reconnect.
const KEEP_FINISHED_MS = 60_000;

const globalForGenerations = globalThis as unknown as { generations?: Map<string, Generation> };
const generations = (globalForGenerations.generations ??= new Map());

export function isGenerating(id: string): boolean {
  const generation = generations.get(id);
  return generation !== undefined && !generation.done;
}

/** Drains `stream` in the background, whether or not any client is listening. */
export function startGeneration(id: string, abort: AbortController, stream: ReadableStream<UIMessageChunk>) {
  const generation: Generation = { chunks: [], listeners: new Set(), abort, done: false };
  generations.set(id, generation);
  const notify = () => generation.listeners.forEach((listener) => listener());

  (async () => {
    try {
      const reader = stream.getReader();
      for (let next = await reader.read(); !next.done; next = await reader.read()) {
        generation.chunks.push(next.value);
        notify();
      }
    } catch (error) {
      generation.chunks.push({ type: "error", errorText: error instanceof Error ? error.message : String(error) });
    } finally {
      generation.done = true;
      notify();
      setTimeout(() => {
        if (generations.get(id) === generation) generations.delete(id);
      }, KEEP_FINISHED_MS);
    }
  })();
}

/** A stream of every chunk so far, then live chunks until the generation ends. Null if none. */
export function subscribe(id: string): ReadableStream<UIMessageChunk> | null {
  const generation = generations.get(id);
  if (!generation) return null;
  let sent = 0;
  let onChange: () => void;
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      onChange = () => {
        while (sent < generation.chunks.length) controller.enqueue(generation.chunks[sent++]);
        if (generation.done) {
          generation.listeners.delete(onChange);
          controller.close();
        }
      };
      generation.listeners.add(onChange);
      onChange();
    },
    // The client went away; the generation keeps running.
    cancel() {
      generation.listeners.delete(onChange);
    },
  });
}

/** Cancels the model call. The partial reply is still saved. */
export function stopGeneration(id: string): boolean {
  const generation = generations.get(id);
  if (!generation || generation.done) return false;
  generation.abort.abort();
  return true;
}
