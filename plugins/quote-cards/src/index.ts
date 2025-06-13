import { after } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";

// Stores
const MessageStore = findByStoreName("MessageStore");
const ChannelStore = findByStoreName("ChannelStore");

const MessageActions = findByProps("sendMessage", "receiveMessage");

function getAvatarUrl(userId: string, avatar: string): string {
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128`;
}

let unpatch: () => void;

export default {
  onLoad() {
    unpatch = after("sendMessage", MessageActions, async ([channelId, message]) => {
      if (!message?.content?.startsWith('q"')) return;

      const replyId = message?.messageReference?.message_id;
      if (!replyId) {
        showToast("❌ Use the quote command (`q\"`) as a reply.", getAssetIDByName("Small"));
        return;
      }

      const original = MessageStore.getMessage(channelId, replyId);
      if (!original) {
        showToast("⚠️ Original message not found.", getAssetIDByName("Small"));
        return;
      }

      const avatarUrl = getAvatarUrl(original.author.id, original.author.avatar);
      const payload = {
        text: original.content || "[No content]",
        username: original.author.username,
        timestamp: original.timestamp,
        avatarUrl,
      };

      try {
        showToast("🎨 Generating image...", getAssetIDByName("Small"));

        const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Image generation failed");

        const blob = await res.blob();

        const formData = new FormData();
        formData.append("file", blob, "quote.png");

        MessageActions.sendMessage(channelId, {
          content: "",
          messageReference: { message_id: replyId },
          invalidEmojis: [],
          validNonShortcutEmojis: [],
          attachments: [],
          files: formData,
        });

        showToast("✅ Quote sent!", getAssetIDByName("Check"));
      } catch (err) {
        console.error("QuoteCard error:", err);
        showToast("❌ Failed to send image", getAssetIDByName("Small"));
      }
    });
  },

  onUnload() {
    unpatch?.();
  },
};