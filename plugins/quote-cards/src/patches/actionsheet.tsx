import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { findInReactTree } from "@vendetta/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const MessageStore = findByStoreName("MessageStore");
const UserStore = findByStoreName("UserStore");

let unpatch: () => void;

export const onUnload = () => {
  unpatch?.();
};

export default function patchActionSheet() {
  // Patch only once: the default MessageLongPressActionSheet
  LazyActionSheet.openLazy("MessageLongPressActionSheet", async () => {
    const mod = await import("@vendetta/ui/components/MessageLongPressActionSheet");
    if (!mod?.default) return mod;

    const original = mod.default;

    mod.default = (props: any) => {
      const res = original(props);

      try {
        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons || buttons.some((x) => x?.props?.label === "Quote Message")) return res;

        const pos = Math.max(
          buttons.findIndex((x) => x?.props?.label === "Copy Text"),
          1
        );

        buttons.splice(
          pos,
          0,
          <ActionSheetRow
            label="Quote Message"
            icon={
              <ActionSheetRow.Icon
                source={getAssetIDByName("ic_message")}
                IconComponent={() => (
                  <ReactNative.Image
                    style={{ width: 24, height: 24 }}
                    source={getAssetIDByName("ic_message")}
                  />
                )}
              />
            }
            onPress={async () => {
              try {
                const messageId = props?.message?.id;
                const channelId = props?.message?.channel_id;

                if (!messageId || !channelId) {
                  showToast("❌ Failed to locate message");
                  return;
                }

                const message = MessageStore.getMessage(channelId, messageId);
                if (!message) {
                  showToast("❌ Could not fetch message content");
                  return;
                }

                const author = message.author ?? UserStore.getUser(message.author?.id);
                const timestamp = new Date(message.timestamp).toISOString();

                const body = {
                  text: message.content.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ""),
                  username: author?.username ?? "Unknown",
                  timestamp,
                  avatarUrl: `https://cdn.discordapp.com/avatars/${author?.id}/${author?.avatar}.png?size=4096`,
                };

                const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });

                if (!res.ok) {
                  showToast("❌ Failed to generate quote");
                  console.error("❌ Quote API error:", res.status);
                  return;
                }

                const json = await res.json();
                const imageUrl = json?.url;

                if (!imageUrl || typeof imageUrl !== "string") {
                  showToast("❌ Invalid image URL returned");
                  console.error("❌ Bad response:", json);
                  return;
                }

                const { sendMessage } = findByProps("sendMessage");

                sendMessage(channelId, {
                  content: imageUrl,
                  message_reference: {
                    message_id: message.id,
                    channel_id: channelId,
                    guild_id: message.guild_id ?? undefined,
                  },
                });

                showToast("✅ Quote sent!");
              } catch (e) {
                showToast("❌ Error sending quote");
                console.error("❌ Exception:", e);
              } finally {
                LazyActionSheet.hideActionSheet();
              }
            }}
          />
        );
      } catch (e) {
        console.error("Quote patch error:", e);
      }

      return res;
    };

    return mod;
  });
}