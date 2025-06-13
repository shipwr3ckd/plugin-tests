import { before, after } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";

// Stores and actions
const MessageStore = findByStoreName("MessageStore");
const ChannelStore = findByStoreName("ChannelStore");
const MessageActions = findByProps("sendMessage", "receiveMessage");

// Find ActionSheet builder
const ActionSheet = findByProps("showActionSheet");

function getAvatarUrl(id: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;
}

let unpatchActionSheet: () => void;

export default {
  onLoad() {
    unpatchActionSheet = before(
      "showActionSheet",
      ActionSheet,
      (args) => {
        const [options] = args;
        // We expect options to include message ID and channel
        const { message, channelId } = options;
        if (!message?.id || !channelId) return;

        options.options.push({
          text: "Quote",
          icon: {
            type: 0,
            name: "Quote",
          },
          onPress: async () => {
            try {
              showToast("🎨 Generating quote…", getAssetIDByName("Small"));

              const msg = MessageStore.getMessage(channelId, message.id);
              if (!msg) throw new Error("Message not found");

              const avatarUrl = getAvatarUrl(msg.author.id, msg.author.avatar);
              const payload = {
                text: msg.content || "[No text]",
                username: msg.author.username,
                timestamp: msg.timestamp,
                avatarUrl,
              };

              const res = await fetch(
                "https://quote-cardgen.onrender.com/api/generate",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                }
              );

              if (!res.ok) throw new Error("API failed");

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
              console.error("Quote action error:", e);
              showToast("❌ Failed to quote", getAssetIDByName("Small"));
            }
          },
        });
      }
    );
  },

  onUnload() {
    unpatchActionSheet?.();
  },
};