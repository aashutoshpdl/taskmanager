// Supports simple ChatGPT "Export" JSON that contains messages with content parts.
// Falls back to plain if shape unrecognized.
export function parseChatGPTJson(jsonStr: string): string | null {
  try {
    const data = JSON.parse(jsonStr);
    // OpenAI classic export: conversations[][].mapping.*.message.content.parts[]
    if (Array.isArray(data) && data.length && data[0].mapping) {
      const all: string[] = [];
      for (const conv of data) {
        for (const key of Object.keys(conv.mapping)) {
          const node = conv.mapping[key];
          const content = node?.message?.content;
          const parts = content?.parts;
          if (Array.isArray(parts)) all.push(parts.join("\n"));
          else if (typeof content === "string") all.push(content);
        }
      }
      return all.join("\n\n---\n\n");
    }
    // Newer export shapes: try best effort
    if (data?.messages && Array.isArray(data.messages)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = data.messages.map((m: any) => {
        if (typeof m.content === "string") return m.content;
        if (Array.isArray(m.content))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return m.content.map((p: any) => p.text ?? "").join("\n");
        return "";
      });
      return all.join("\n\n---\n\n");
    }
    return null;
  } catch {
    return null;
  }
}
