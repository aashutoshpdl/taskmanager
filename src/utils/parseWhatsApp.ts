// // Very tolerant WhatsApp .txt detector with enhanced parsing for multiple date/time formats and multiline messages.
// // Lines like: "12/09/2024, 21:17 - John: message" or "12-09-2024 9:17 PM - John: message"
// // eslint-disable-next-line no-useless-escape
// const WA_LINE = /^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?)\s?[-–]\s(.+?):\s(.*)$/;

// export function parseWhatsAppTxt(raw: string) {
//   const lines = raw.split(/\r?\n/);
//   const messages = [];

//   let currentMessage = null;

//   for (const line of lines) {
//     if (!line.trim()) continue;

//     const match = line.match(WA_LINE);
//     if (match) {
//       // If there's a current message, push it before starting a new one
//       if (currentMessage) {
//         messages.push(currentMessage);
//       }

//       const [, date, time, sender, content] = match;
//       currentMessage = {
//         date,
//         time,
//         sender,
//         content
//       };
//     } else if (currentMessage) {
//       // Append line to current message content with newline
//       currentMessage.content += '\n' + line;
//     }
//   }

//   // Push the last message if exists
//   if (currentMessage) {
//     messages.push(currentMessage);
//   }

//   return messages;
// }
