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

let unpatch: () => void;

export function onLoad() {
  unpatch = after("openLazy", LazyActionSheet, ([component, key, data]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      after("default", instance, (_, res) => {
        const message = data?.message;
        if (!message) return;

        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons) return;

        const alreadyAdded = buttons.find((b) => b?.props?.label === "Quote Message");
        if (alreadyAdded) return;

        const pos = Math.max(
          buttons.findIndex((x) => x?.props?.label === "Copy Text"),
          1
        );

        const sendQuote = async () => {
          try {
            const author = message.author ?? UserStore.getUser(message.author?.id);
            const timestamp = new Date(message.timestamp).toISOString();

            const body = {
              text: message.content,
              username: author?.username ?? "Unknown",
              timestamp,
              avatarUrl: `https://cdn.discordapp.com/avatars/${author?.id}/${author?.avatar}.png?size=256`,
            };

            const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Failed to generate image");

            const arrayBuf = await res.arrayBuffer();
            const blob = new Blob([arrayBuf], { type: "image/png" });
            const file = new File([blob], "quote.png", { type: "image/png" });

            showToast("✅ Quote generated, sending...");

            uploadLocalFiles?.([{
              channelId: message.channel_id,
              parsedMessage: { content: "", tts: false, invalidEmojis: [], validNonShortcutEmojis: [] },
              items: [
                {
                  item: {
                    uri: file,
                    filename: "quote.png",
                    mimeType: "image/png",
                    width: 500,
                    height: 200,
                    id: "quote",
                    platform: 0,
                    origin: 1,
                  },
                  isImage: true,
                  isVideo: false,
                  mimeType: "image/png",
                  filename: "quote.png",
                  id: "quote",
                  uri: file,
                  channelId: message.channel_id,
                }
              ],
              token: getToken()
            }]);
          } catch (err) {
            showToast("❌ Quote generation failed");
            console.error("Quote generation error:", err);
          } finally {
            LazyActionSheet.hideActionSheet();
          }
        };

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
            onPress={sendQuote}
          />
        );
      });
    });
  });
}

export function onUnload() {
  unpatch?.();
              }
