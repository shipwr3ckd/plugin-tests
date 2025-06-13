import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";

const MessageStore = findByStoreName("MessageStore");
const UserStore = findByStoreName("UserStore");
const { uploadLocalFiles } = findByProps("uploadLocalFiles");
const token = findByProps("getToken").getToken();

let unregister;

export default {
  onLoad() {
    unregister = registerCommand({
      name: "quote",
      displayName: "quote",
      description: "Quote a replied message as an image",
      displayDescription: "Quote a replied message as an image",
      applicationId: "-1",
      inputType: 1,
      type: 1,
      execute: quoteCommand,
    });
  },

  onUnload() {
    unregister?.();
  },
};

async function quoteCommand(_, ctx) {
  const reference = ctx?.message?.referenced_message;
  if (!reference) {
    return { content: "❌ Please reply to a message when using `/quote`." };
  }

  const { content, timestamp, author } = reference;
  const avatarUrl = `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=4096`;

  try {
    const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: content,
        username: author.username,
        timestamp,
        avatarUrl
      })
    });

    if (!res.ok) {
      return { content: "❌ Failed to generate quote card." };
    }

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
      token 
    }]);

    return null;
  } catch (err) {
    console.error("Quote error:", err);
    return { content: "❌ An error occurred while sending the quote." };
  }
        }
