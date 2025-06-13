import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { showActionSheet } from "@vendetta/ui/actionsheets";
import { getAssetIDByName } from "@vendetta/ui/assets";

const { openLazy } = findByProps("openLazy", "hideActionSheet");
const openSheet = openLazy?.constructor === Function ? openLazy : null;

let unpatch;
export default () => {
  unpatch = after("openLazy", findByProps("openLazy"), ([sheet, args], res) => {
    if (!args?.[0]?.message) return;

    const message = args[0].message;

    after("default", res, ([component]) => {
      const render = component?.type?.render;
      if (!render) return;

      after("render", render, ([sheetProps], comp) => {
        const rows = sheetProps?.actionSheet?.rows;
        if (!Array.isArray(rows)) return;

        rows.push({
          label: "📋 Quote Message",
          icon: getAssetIDByName("Quote"),
          onPress: () => generateAndSendQuote(message),
        });
      });
    });
  });
};

export const onUnload = () => {
  unpatch?.();
};

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

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const file = new File([arrayBuffer], "quote.png", { type: "image/png" });

    const { uploadLocalFiles } = findByProps("uploadLocalFiles");
    const token = findByProps("getToken").getToken();

    const items = [
      {
        item: {
          id: "quote",
          uri: file.uri ?? "",
          originalUri: file.uri ?? "",
          mimeType: "image/png",
          filename: "quote.png",
          width: 800,
          height: 400,
          playableDuration: 0,
        },
        id: "quote",
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
    console.error("❌ Quote generation failed:", err);
  }
      
