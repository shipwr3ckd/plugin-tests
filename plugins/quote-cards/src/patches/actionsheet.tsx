import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { findInReactTree } from "@vendetta/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const UserStore = findByStoreName("UserStore");
const { uploadLocalFiles } = findByProps("uploadLocalFiles");
const token = findByProps("getToken")?.getToken();

let unpatch: () => void;

export default function patchActionSheet() {
  return after("openLazy", LazyActionSheet, ([component, key, data]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      unpatch = after("default", instance, (_, res) => {
        const message = data?.message;
        if (!message) {
          console.warn("[QuoteCard] No message found in action sheet data.");
          return;
        }

        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.every((y) => y?.type === ActionSheetRow)
        );
        if (!buttons) {
          console.warn("[QuoteCard] Couldn't find action sheet buttons.");
          return;
        }

        // Avoid duplicate buttons
        if (buttons.some((b) => b?.props?.label === "Quote Message")) return;

        const sendQuote = async () => {
          try {
            console.log("[QuoteCard] sendQuote triggered.");
            const author = message.author || UserStore.getUser(message.author?.id);
            const timestamp = new Date(message.timestamp).toISOString();

            const body = {
              text: message.content,
              username: author?.username ?? "Unknown",
              timestamp,
              avatarUrl: `https://cdn.discordapp.com/avatars/${author?.id}/${author?.avatar}.png?size=256`,
            };

            console.log("[QuoteCard] Sending request to card API...");
            const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`Card API failed with status ${res.status}`);

            const blob = await res.blob();
            const reader = new FileReader();

            reader.onloadend = async () => {
              const base64 = reader.result?.split(",")[1];
              if (!base64) throw new Error("Base64 conversion failed.");

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

              console.log("[QuoteCard] Uploading image using uploadLocalFiles...");
              await uploadLocalFiles([
                {
                  channelId: message.channel_id,
                  items,
                  token,
                  parsedMessage: { content: "" },
                },
              ]);

              showToast("✅ Quote sent!");
              console.log("[QuoteCard] Upload success.");
            };

            reader.onerror = (e) => {
              console.error("[QuoteCard] FileReader error", e);
              showToast("❌ Error reading image");
            };

            reader.readAsDataURL(blob);
          } catch (err) {
            console.error("[QuoteCard] Error:", err);
            showToast("❌ Quote generation failed");
          } finally {
            LazyActionSheet.hideActionSheet();
          }
        };

        buttons.push(
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
        console.log("[QuoteCard] Quote Message button injected.");
      });
    });
  });
}

export function onUnload() {
  if (unpatch) unpatch();
          }
