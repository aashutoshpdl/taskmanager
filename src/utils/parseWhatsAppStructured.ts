export interface ParsedMessage {
  date: string;
  time: string;
  sender: string;
  content: string;
}

export function parseWhatsAppStructured(text: string): ParsedMessage[] {
  const lines = text.split("\n");
  const messages: ParsedMessage[] = [];

  const regex =
    /^\[(\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2}:\d{2})\] ([^:]+): (.+)$/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      messages.push({
        date: match[1],
        time: match[2],
        sender: match[3],
        content: match[4],
      });
    } else if (messages.length > 0) {
      messages[messages.length - 1].content += "\n" + line;
    }
  }
  return messages;
}
