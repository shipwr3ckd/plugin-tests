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
const token = findByProps("getToken")?.getToken();

let unpatch;

export default function patchActionSheet() {
  return after("openLazy", LazyActionSheet, ([component, key, data]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      unpatch = after("default", instance, (_, res) => {
        const message = data?.message;
        if (!message) return;

        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons) return;

        const alreadyExists = buttons.some(
          (btn) => btn?.props?.label === "Quote Message"
        );
        if (alreadyExists) return;

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
              avatarUrl: `https://cdn.discordapp.com/avatars/${author?.id}/${author?.avatar}.png?size=256`,
            };

            const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Quote card API request failed");

            const blob = await res.blob();
            const reader = new FileReader();

            reader.onloadend = async () => {
              const base64 = reader.result?.split(",")[1];
              if (!base64) throw new Error("Failed to get base64");

              const uri = `data:image/png;base64,${base64}`;

              const items = [
                {
                  item: {
                    uri,
                    filename: "quote.png",
                    mimeType: "image/png",
                    isImage: true,
                  },
                },
              ];

              const parsedMessage = { content: "" };

              await uploadLocalFiles([
                {
                  channelId: message.channel_id,
                  items,
                  token,
                  parsedMessage,
                },
              ]);

              showToast("✅ Quote sent!");
              console.log("[QuoteCard] Quote sent successfully.");
            };

            reader.onerror = (err) => {
              console.error("❌ Failed to read image:", err);
              showToast("❌ Error reading image");
            };

            reader.readAsDataURL(blob);
          } catch (err) {
            console.error("❌ Quote generation failed:", err);
            showToast("❌ Quote generation failed");
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
  if (unpatch) unpatch();
            }
