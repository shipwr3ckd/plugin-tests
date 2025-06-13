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

let unpatchLazy: (() => void) | undefined;

export function patchActionSheet() {
  unpatchLazy = after("openLazy", LazyActionSheet, ([component, key, data]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      after("default", instance, (_, res) => {
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
              avatarUrl: `https://cdn.discordapp.com/avatars/${author?.id}/${author?.avatar}.png?size=256`,
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
            const reader = new FileReader();

            reader.onloadend = () => {
              const base64 = reader.result as string;

              // Send image as base64 in chat
              window.vendetta.plugins.sendMessage(
                message.channel_id,
                {
                  content: "",
                  attachments: [
                    {
                      id: "0",
                      filename: "quote.png",
                      content_type: "image/png",
                      size: blob.size,
                      url: base64,
                    },
                  ],
                }
              );
            };

            reader.readAsDataURL(blob);
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

export function unpatchActionSheetFn() {
  unpatchLazy?.();
}
