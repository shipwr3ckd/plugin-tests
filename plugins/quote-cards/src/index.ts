import { after } from "@vendetta/patcher";
import { findByProps, findByName, findByStoreName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

// Core Discord internals
const ActionSheet = findByProps("openLazy");
const MessageStore = findByStoreName("MessageStore");
const MessageActions = findByProps("sendMessage", "receiveMessage");

// Avatar generator
const getAvatarUrl = (id, avatar) =>
  `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;

let unpatch;

export default {
  onLoad() {
    unpatch = after("openLazy", ActionSheet, ([sheetId, sheetFactory], res) => {
      if (sheetId !== "MessageLongPressActionSheet") return;

      res.then((mod) => {
        const render = mod.default?.render ?? mod.default;
        if (!render) return;

        mod.default = (...args) => {
          const rendered = render(...args);
          const buttons = rendered?.props?.actionSheet?.props?.children;

          if (!Array.isArray(buttons)) return rendered;

          // Add new action
          buttons.push({
            label: "Quote",
            onPress: async () => {
              const message = rendered?.props?.actionSheet?.props?.message;
              const channelId = rendered?.props?.actionSheet?.props?.channel?.id;

              if (!message || !channelId) return;

              try {
                showToast("🖼 Generating quote…", getAssetIDByName("Small"));

                const avatarUrl = getAvatarUrl(
                  message.author.id,
                  message.author.avatar
                );

                const payload = {
                  text: message.content || "[No text]",
                  username: message.author.username,
                  timestamp: message.timestamp,
                  avatarUrl,
                };

                const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                if (!res.ok) throw new Error("API error");

                const blob = await res.blob();
                const form = new FormData();
                form.append("file", blob, "quote.png");

                MessageActions.sendMessage(channelId, {
                  content: "",
                  messageReference: { message_id: message.id },
                  invalidEmojis: [],
                  validNonShortcutEmojis: [],
                  attachments: [],
                  files: form,
                });

                showToast("✅ Quote sent!", getAssetIDByName("Check"));
              } catch (e) {
                console.error("Quote plugin error", e);
                showToast("❌ Failed to quote", getAssetIDByName("Small"));
              }
            },
          });

          return rendered;
        };
      });
    });
  },

  onUnload() {
    unpatch?.();
  },
};