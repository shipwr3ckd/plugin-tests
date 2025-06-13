import { findByProps, findByStoreName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
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
  unpatch = after("openLazy", LazyActionSheet, ([component, key]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      after("default", instance, ([props], res) => {
        const buttons = findInReactTree(res, x =>
          Array.isArray(x) && x.some(y => y?.type === ActionSheetRow)
        );
        if (!buttons || buttons.some(x => x?.props?.label === "Quote Message")) return;

        const replyIndex = buttons.findIndex(x => x?.props?.label === "Reply");
        const insertIndex = replyIndex > -1 ? replyIndex : Math.max(
          buttons.findIndex(x => x?.props?.label === "Copy Text"),
          0
        );

        buttons.splice(insertIndex, 0,
          <ActionSheetRow
            label="Quote Message"
            icon={
              <ActionSheetRow.Icon
                source={getAssetIDByName("ic_chat_24px")}
              />
            }
            onPress={async () => {
              try {
                const msgId = props?.message?.id;
                const chanId = props?.message?.channel_id;
                if (!msgId || !chanId) return;

                const msg = MessageStore.getMessage(chanId, msgId);
                if (!msg) return;

                const author = msg.author ?? UserStore.getUser(msg.author?.id);
                const body = {
                  text: msg.content.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ""),
                  username: author?.username ?? "Unknown",
                  timestamp: new Date(msg.timestamp).toISOString(),
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
                sendMessage(chanId, { content: imageUrl });
              } catch (e) {
                console.error("Quote error", e);
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