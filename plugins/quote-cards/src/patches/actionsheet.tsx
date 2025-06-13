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
const token = findByProps("getToken")?.getToken?.();

let unpatchActionSheetInternal: () => void;

export const unpatchActionSheet = () => {
  unpatchActionSheetInternal?.();
};

export default function patchActionSheet() {
  const unpatch = after("openLazy", LazyActionSheet, ([component, key, data]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      unpatchActionSheetInternal = after("default", instance, (_, res) => {
        const message = data?.message;
        if (!message) return;

        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons) return;

        // Avoid duplicate buttons
        if (buttons.find((b) => b?.props?.label === "Quote Message")) return;

        const author = message.author || UserStore.getUser(message.author?.id);
        const timestamp = new Date(message.timestamp).toISOString();

        const avatarUrl = author?.avatar
          ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=256`
          : `https://cdn.discordapp.com/embed/avatars/${(parseInt(author.id) >> 22) % 5}.png`;

        const sendQuote = async () => {
          try {
            showToast("🖼️ Generating quote...");
            console.log("📤 Sending to quote generator", {
              text: message.content,
              username: author?.username,
              timestamp,
              avatarUrl,
            });

            const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: message.content,
                username: author?.username ?? "Unknown",
                timestamp,
                avatarUrl,
              }),
            });

            if (!res.ok) {
              showToast("❌ Quote generation failed");
              console.error("Quote generation failed: HTTP", res.status);
              return;
            }

            const blob = await res.blob();
            const file = new File([blob], "quote.png", { type: "image/png" });

            const parsedMessage = {
              content: "",
              tts: false,
              invalidEmojis: [],
              validNonShortcutEmojis: [],
            };

            const items = [
              {
                item: {
                  id: "quote",
                  uri: URL.createObjectURL(file),
                  originalUri: URL.createObjectURL(file),
                  mimeType: "image/png",
                  filename: "quote.png",
                  width: 500,
                  height: 500,
                  platform: 0,
                },
                id: "quote",
                filename: "quote.png",
                isImage: true,
                mimeType: "image/png",
                channelId: message.channel_id,
              },
            ];

            await uploadLocalFiles?.([
              {
                ctx: { channel: message.channel_id },
                items,
                token,
                parsedMessage,
              },
            ]);

            showToast("✅ Quote sent!");
            console.log("✅ Quote uploaded");
          } catch (e) {
            showToast("❌ Error sending quote");
            console.error("Quote generation error:", e);
          } finally {
            LazyActionSheet.hideActionSheet();
          }
        };

        buttons.splice(
          1,
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

  unpatchActionSheetInternal = unpatch;
              }
