import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
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
  unpatch = after("openLazy", LazyActionSheet, ([component, key, data]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      after("default", instance, ([props], res) => {
        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons || buttons.some((x) => x?.props?.label === "Quote Message")) return;

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
                source={getAssetIDByName("ic_chat_bubble")}
                IconComponent={() => (
                  <ReactNative.Image
                    style={{ width: 24, height: 24 }}
                    source={getAssetIDByName("ic_chat_bubble")}
                  />
                )}
              />
            }
            onPress={async () => {
              try {
                const messageId = props?.message?.id;
                const channelId = props?.message?.channel_id;
                if (!messageId || !channelId) return;

                const message = MessageStore.getMessage(channelId, messageId);
                if (!message) return;

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
                if (!res.ok) return;

                const imageUrl = (await res.json())?.url;
                if (!imageUrl || typeof imageUrl !== "string") return;

                const { sendMessage } = findByProps("sendMessage");
                sendMessage(channelId, { content: imageUrl });
              } catch (err) {
                console.error("Quote error", err);
              } finally {
                LazyActionSheet.hideActionSheet();
              }
            }}
          />
        );
      });
    });
  });
}