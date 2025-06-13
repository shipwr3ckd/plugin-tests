import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";

const ActionSheet = findByProps("openLazy", "hideActionSheet");
const { uploadLocalFiles } = findByProps("uploadLocalFiles");
const { getToken } = findByProps("getToken");

let unpatch;

export default () => {
  unpatch = after("openLazy", ActionSheet, ([component, args], res) => {
    if (component !== "MessageLongPressActionSheet") return;

    const message = args?.[0]?.message;
    if (!message?.author?.id || !message?.content) return;

    after("default", res, ([sheet]) => {
      const render = sheet?.type?.render;
      if (!render) return;

      after("render", render, ([renderArgs], comp) => {
        const rows = renderArgs?.actionSheet?.rows;
        if (!Array.isArray(rows)) return;

        rows.push({
          label: "📋 Quote Message",
          icon: getAssetIDByName("ic_copy_message_link"),
          isDestructive: false,
          onPress: () => generateAndSendQuote(message),
        });
      });
    });
  });
};

export const onUnload = () => unpatch?.();

async function generateAndSendQuote(message) {
  const avatarUrl = `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=4096`;
  const payload = {
    text: message.content,
    username: message.author.username,
    timestamp: message.timestamp,
    avatarUrl,
  };

  try {
    const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Quote API returned an error");

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const file = new File([arrayBuffer], "quote.png", { type: "image/png" });

    const token = getToken();
    const items = [
      {
        item: {
          id: "quote-card",
          uri: file.uri ?? "",
          originalUri: file.uri ?? "",
          mimeType: "image/png",
          filename: "quote.png",
          width: 800,
          height: 400,
          playableDuration: 0,
        },
        id: "quote-card",
        filename: "quote.png",
        isImage: true,
        isVideo: false,
        mimeType: "image/png",
        origin: 1,
      },
    ];

    const parsedMessage = {
      content: "",
      tts: false,
      invalidEmojis: [],
      validNonShortcutEmojis: [],
    };

    uploadLocalFiles([{ ctx: { channel: message.channel_id }, items, token, parsedMessage }]);
  } catch (err) {
    console.error("❌ Failed to generate and send quote:", err);
  }
    }
