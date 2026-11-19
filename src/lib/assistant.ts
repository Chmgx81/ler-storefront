export type ProductHint = {
  slug: string;
  name: string;
  price: number;
  collection: string;
  colour: string;
  image?: string;
  href: string;
};

export type CartAction = {
  type: 'add_to_cart';
  slug: string;
  qty: number;
  options: Record<string, string>;
};

export type AssistantReply = {
  message: string;
  products: ProductHint[];
  actions: CartAction[];
  mode: 'nim' | 'fallback';
  notice?: string;
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function askAssistant(
  messages: ChatTurn[],
  signal?: AbortSignal,
  contextSlug?: string,
): Promise<AssistantReply> {
  let response: Response;
  try {
    response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ messages, context: contextSlug ? { slug: contextSlug } : undefined }),
      signal,
    });
  } catch {
    throw new Error('The studio assistant could not be reached. Please try again.');
  }
  const body = (await response.json().catch(() => null)) as AssistantReply | { error?: string } | null;
  if (!response.ok) {
    throw new Error((body as { error?: string })?.error || 'The assistant could not answer that.');
  }
  return body as AssistantReply;
}

/** Opens the studio assistant from anywhere, optionally about a specific piece. */
export function openAssistant(options: { slug?: string; question?: string; autoSend?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent('ler:assistant-open', { detail: options }));
}
