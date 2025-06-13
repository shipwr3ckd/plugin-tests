// src/index.tsx
import { findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { React, ReactNative, stylesheet } from "@vendetta/metro/common";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow;
const MessageStore = findByStoreName("MessageStore");
const MessageActions = findByProps("sendMessage", "receiveMessage");

const styles = stylesheet.createThemedStyleSheet({
  iconComponent: {
    width: 24,
    height: 24,
    tintColor: "#5865F2",
  },
});

export default () => {
  before("openLazy", LazyActionSheet, ([, key, data]) => {
    const msg = data?.message;
    if (key !== "MessageLongPressActionSheet" || !msg) return;

    data.component.then((instance) => {
      const unpatch = before("default", instance, (_, res) => {
        React.useEffect(() => () => unpatch(), []);

        const rows = findInReactTree(res, (x) =>
          Array.isArray(x) && x.find((r: any) => r?.type?.displayName === ActionSheetRow.displayName)
        );
        if (!rows) return;

        // insert after 'Reply'
        const pos = rows.findIndex((r: any) =>
          r.props.label?.includes("Reply")
        ) + 1;

        rows.splice(pos, 0,
          <ActionSheetRow
            label="Quote Message"
            icon={
              <ActionSheetRow.Icon
                source={getAssetIDByName("Quote")}
                IconComponent={() => (
                  <ReactNative.Image
                    style={styles.iconComponent}
                    source={getAssetIDByName("Quote")}
                  />
                )}
              />
            }
            onPress={async () => {
              showToast("🎨 Generating quote…", getAssetIDByName("Small"));

              const orig = MessageStore.getMessage(msg.channel_id, msg.id);
              if (!orig) {
                showToast("❌ Message not found.", getAssetIDByName("Small"));
                LazyActionSheet.hideActionSheet();
                return;
              }

              const avatarUrl = `https://cdn.discordapp.com/avatars/${orig.author.id}/${orig.author.avatar}.png?size=128`;
              const payload = {
                text: orig.content || "[No text]",
                username: orig.author.username,
                timestamp: orig.timestamp,
                avatarUrl,
              };

              try {
                const resp = await fetch("https://quote-cardgen.onrender.com/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!resp.ok) throw new Error("API failed");

                const blob = await resp.blob();
                const form = new FormData();
                form.append("file", blob, "quote.png");

                MessageActions.sendMessage(msg.channel_id, {
                  content: "",
                  messageReference: { message_id: msg.id },
                  files: form,
                  invalidEmojis: [],
                  validNonShortcutEmojis: [],
                  attachments: [],
                });

                showToast("✅ Quote sent!", getAssetIDByName("Check"));
              } catch (e) {
                console.error(e);
                showToast("❌ Quote failed.", getAssetIDByName("Small"));
              } finally {
                LazyActionSheet.hideActionSheet();
              }
            }}
          />
        );
      });
    });
  });
};