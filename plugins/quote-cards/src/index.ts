import { findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { FluxDispatcher, React, ReactNative, i18n, stylesheet } from "@vendetta/metro/common";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";

// Core stores & actions
const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow;
const MessageStore = findByStoreName("MessageStore");
const ChannelStore = findByStoreName("ChannelStore");
const MessageActions = findByProps("sendMessage");

// Styling
const styles = stylesheet.createThemedStyleSheet({
  iconComponent: {
    width: 24,
    height: 24,
    tintColor: "#5865F2",
  },
});

export default () =>
  before("openLazy", LazyActionSheet, ([component, key, data]) => {
    const message = data?.message;
    if (key !== "MessageLongPressActionSheet" || !message) return;

    component.then((instance) => {
      const unpatch = before("default", instance, (_, res) => {
        React.useEffect(() => () => unpatch(), []);

        const children = findInReactTree(res, (x) =>
          Array.isArray(x) &&
          x.find((c: any) => c?.type?.name === "ActionSheetRow")
        );
        if (!children) return;

        const idx = children.findIndex((x: any) =>
          typeof x.props.label === "string" &&
          x.props.label.includes(i18n.Messages.REPLY)
        );
        const pos = idx >= 0 ? idx + 1 : children.length;

        children.splice(
          pos,
          0,
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
              try {
                showToast("🎨 Generating quote…", getAssetIDByName("Small"));

                const orig = MessageStore.getMessage(message.channel_id, message.id);
                if (!orig) throw new Error("Original not found");

                const avatarUrl = `https://cdn.discordapp.com/avatars/${orig.author.id}/${orig.author.avatar}.png?size=128`;
                const payload = {
                  text: orig.content || "[No text]",
                  username: orig.author.username,
                  timestamp: orig.timestamp,
                  avatarUrl,
                };

                const resp = await fetch("https://quote-cardgen.onrender.com/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!resp.ok) throw new Error("API failed");

                const blob = await resp.blob();
                const form = new FormData();
                form.append("file", blob, "quote.png");

                MessageActions.sendMessage(message.channel_id, {
                  content: "",
                  messageReference: { message_id: message.id },
                  files: form,
                  invalidEmojis: [],
                  validNonShortcutEmojis: [],
                  attachments: [],
                });

                showToast("✅ Quote sent!", getAssetIDByName("Check"));
              } catch (e) {
                console.error("Quote error:", e);
                showToast("❌ Unable to quote", getAssetIDByName("Small"));
              } finally {
                LazyActionSheet.hideActionSheet();
              }
            }}
          />
        );
      });
    });
  });