import { before } from "@vendetta/patcher";
import { findByStoreName } from "@vendetta/metro";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { ReactNative as RN } from "@vendetta/metro/common";

const MessageStore = findByStoreName("MessageStore");
const ChannelStore = findByStoreName("ChannelStore");
const PendingReplyStore = findByStoreName("PendingReplyStore");

let unpatch: any;

export default {
  onLoad() {
    const MessageEvents = findByStoreName("MessageStore");

    unpatch = before("sendMessage", MessageEvents, ([channelId, message]) => {
      if (!message.content?.startsWith("/quote")) return;

      const reply = PendingReplyStore.getPendingReply(channelId)?.message;
      if (!reply) {
        showToast("Use /quote as a reply to a message", getAssetIDByName("Small"));
        return;
      }

      const { content, timestamp, author } = reply;
      const username = author.global_name || author.username;
      const avatarUrl = `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=4096`;

      fetch("https://quote-cardgen.onrender.com/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: content,
          username,
          timestamp,
          avatarUrl
        })
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            RN.NativeModules.ImagePickerModule.uploadImage(channelId, {
              content: "",
              file: {
                name: "quote.png",
                type: "image/png",
                data: base64.split(",")[1],
              },
              replyMessageId: reply.id,
            });
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          console.error("Quote Error:", err);
          showToast("Failed to send quote image", getAssetIDByName("Small"));
        });

      message.content = ""; // prevent default message send
    });
  },

  onUnload() {
    unpatch?.();
  }
};
