import { registerCommand } from "@vendetta/commands";
import { findByStoreName, findByProps } from "@vendetta/metro";

const MessageStore = findByStoreName("MessageStore");
const UserStore = findByStoreName("UserStore");
const { uploadLocalFiles } = findByProps("uploadLocalFiles");
const token = findByProps("getToken").getToken();

let command;

export default {
  onLoad: () => {
    command = registerCommand({
      name: "quote",
      displayName: "quote",
      displayDescription: "Generate quote image from a message link",
      description: "Generate quote image from a message link",
      options: [
        {
          name: "link",
          description: "Discord message link",
          type: 3,
          required: true,
          displayName: "link",
          displayDescription: "Discord message link",
        },
      ],
      execute: quoteCommand,
      applicationId: "-1",
      inputType: 1,
      type: 1,
    });
  },

  onUnload: () => {
    command();
  },
};

async function quoteCommand(args, ctx) {
  const link = args[0].value.trim();

  const parsed = link.match(/\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!parsed) return { content: "❌ Invalid message link format." };

  const [, , channelId, messageId] = parsed;
  const quotedMessage = MessageStore.getMessage(channelId, messageId);

  if (!quotedMessage)
    return {
      content: "❌ Couldn't fetch that message. Please open it at least once in the app first.",
    };

  const { content, author, timestamp } = quotedMessage;
  const avatarUrl = author?.getAvatarURL?.(4096);

  if (!content || !author || !avatarUrl)
    return { content: "❌ Failed to parse message details." };

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

    if (!res.ok) {
      const errText = await res.text();
      console.error("Quote card error:", errText);
      return { content: "❌ Failed to generate quote card." };
    }

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const file = {
      item: {
        id: "quote.png",
        filename: "quote.png",
        uri: `data:image/png;base64,${btoa(
          String.fromCharCode(...buffer)
        )}`,
        mimeType: "image/png",
        width: 800,
        height: 400,
        size: buffer.byteLength,
        platform: 0,
        playableDuration: 0,
        originalUri: "",
      },
      id: "quote.png",
      filename: "quote.png",
      isImage: true,
      isVideo: false,
      mimeType: "image/png",
      origin: 1,
    };

    await uploadLocalFiles([
      {
        channelId: ctx.channel.id,
        items: [file],
        parsedMessage: {
          content: "",
          tts: false,
          invalidEmojis: [],
          validNonShortcutEmojis: [],
        },
        token,
      },
    ]);
  } catch (err) {
    console.error("Quote upload error:", err);
    return { content: "❌ An error occurred while sending the quote." };
  }
}
