import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher, React, ReactNative, i18n, stylesheet } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { semanticColors } from "@vendetta/ui";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow;
const MessageStore = findByStoreName("MessageStore");
const ChannelStore = findByStoreName("ChannelStore");

const styles = stylesheet.createThemedStyleSheet({
  icon: {
    width: 24,
    height: 24,
    tintColor: semanticColors.INTERACTIVE_NORMAL,
  },
});

export default () =>
  before("openLazy", LazyActionSheet, ([component, key, { message }]) => {
    if (key !== "MessageLongPressActionSheet" || !message) return;

    component.then((instance) => {
      const unpatch = after("default", instance, (_, comp) => {
        React.useEffect(() => () => unpatch(), []);

        const buttons = findInReactTree(comp, (x) => Array.isArray(x) && x[0]?.type?.name === "ActionSheetRow");
        if (!buttons) return;

        const position = Math.max(
          buttons.findIndex((x: any) => x?.props?.message === i18n.Messages.MARK_UNREAD),
          0
        );

        buttons.splice(
          position,
          0,
          <ActionSheetRow
            label="Quote Message"
            icon={
              <ActionSheetRow.Icon
                source={getAssetIDByName("ic_message_copy")}
                IconComponent={() => (
                  <ReactNative.Image
                    resizeMode="contain"
                    style={styles.icon}
                    source={getAssetIDByName("ic_message_copy")}
                  />
                )}
              />
            }
            onPress={async () => {
              try {
                const channelId = message.channel_id;
                const avatarUrl = `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`;

                const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    text: message.content,
                    username: message.author.username,
                    timestamp: message.timestamp,
                    avatarUrl,
                  }),
                });

                if (!res.ok) {
                  showToast("❌ Failed to generate quote image", getAssetIDByName("Small"));
                  return;
                }

                const imageBuffer = await res.arrayBuffer();
                const form = new FormData();
                form.append("file", new Blob([imageBuffer], { type: "image/png" }), "quote.png");

                await fetch(`/channels/${channelId}/messages`, {
                  method: "POST",
                  body: form,
                });

                showToast("✅ Quote sent!", getAssetIDByName("Check"));
              } catch (err) {
                console.error("Quote error:", err);
                showToast("❌ Error sending quote", getAssetIDByName("Small"));
              } finally {
                LazyActionSheet.hideActionSheet();
              }
            }}
          />
        );
      });
    });
  });