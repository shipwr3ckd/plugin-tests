import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";

const MessageStore = findByStoreName("MessageStore");
const { uploadLocalFiles } = findByProps("uploadLocalFiles");
const token = findByProps("getToken").getToken();

let unregister;

export default {
  onLoad() {
    unregister = registerCommand({
      name: "quote",
      displayName: "quote",
      description: "Quote a message from a Discord message link",
      displayDescription: "Quote a message from a Discord message link",
      applicationId: "-1",
      inputType: 1,
      type: 1,
      options: [
        {
          name: "link",
          displayName: "link",
          description: "The Discord message link",
          displayDescription: "The Discord message link",
          type: 3,
          required: true,
        },
      ],
      execute: quoteCommand,
    });
  },

  onUnload() {
    unregister?.();
  },
};

function parseMessageLink(link: string) {
  const match = link.match(/discord\.com\/channels\/(?:\d+|@me)\/(\d+)\/(\d+)/);
  if (!match) return null;
  return { channelId: match[1], messageId: match[2] };
}

async function quoteCommand(args, ctx) {
  const link = args[0]?.value;
  const parsed = parseMessageLink(link);

  if (!parsed) {
    return { content: "❌ Invalid message link format." };
  }

  const { channelId, messageId } = parsed;
  const quotedMessage = MessageStore.getMessage(channelId, messageId);

  if (!quotedMessage) {
    return { content: "❌ Message not found. It may not be loaded into memory yet." };
  }

  const { content, timestamp, author } = quotedMessage;
  const avatarUrl = `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=4096`;

  try {
    const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: content,
        username: author.username,
        timestamp,
        avatarUrl,
      }),
    });

    if (!res.ok) return { content: "❌ Failed to generate quote card." };

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const file = {
      id: Date.now().toString(),
      filename: "quote.png",
      mimeType: "image/png",
      data: buffer,
    };

    const parsedMessage = {
      content: "",
      tts: false,
      invalidEmojis: [],
      validNonShortcutEmojis: [],
    };

    await uploadLocalFiles([{
      channelId: ctx.channel.id,
      items: [file],
      parsedMessage,
      token,
    }]);

    return null;
  } catch (err) {
    console.error("Quote error:", err);
    return { content: "❌ An error occurred while sending the quote." };
  }
      }
