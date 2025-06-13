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
const { uploadLocalFiles } = findByProps("uploadLocalFiles");
const { getToken } = findByProps("getToken");

export default function patchActionSheet() {
  return after("openLazy", LazyActionSheet, ([component, key, data]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      const unpatch = after("default", instance, (_, res) => {
        const message = data?.message;
        if (!message) return;

        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons) return;

        const pos = Math.max(
          buttons.findIndex((x) => x?.props?.label === "Copy Text"),
          1
        );

        const sendQuote = async () => {
          try {
            const author = message.author || UserStore.getUser(message.author?.id);
            const timestamp = new Date(message.timestamp).toISOString();

            const body = {
              text: message.content,
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
              return;
            }

            const blob = await res.blob();
            const buffer = await blob.arrayBuffer();
            const file = new File([buffer], "quote.png", { type: "image/png" });

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

            const token = getToken();
            uploadLocalFiles([{ ctx: { channel: message.channel_id }, items, token, parsedMessage }]);

          } catch (e) {
            showToast("❌ Error sending quote");
            console.error("Quote error:", e);
          } finally {
            LazyActionSheet.hideActionSheet();
          }
        };

        buttons.splice(
          pos,
          0,
          <ActionSheetRow
            label="📋 Quote Message"
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
            onPress={sendQuote}
          />
        );
      });
    });
  });
                                                                             }
