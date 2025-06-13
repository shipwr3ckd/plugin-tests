import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher, React, ReactNative, i18n, stylesheet } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findInReactTree } from "@vendetta/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const MessageStore = findByStoreName("MessageStore");

const styles = stylesheet.createThemedStyleSheet({
  icon: {
    width: 24,
    height: 24,
    tintColor: "#fff",
  },
});

export default function patchActionSheet() {
  return after("openLazy", LazyActionSheet, ([component, key, ctx]) => {
    if (key !== "MessageLongPressActionSheet" || !ctx?.message) return;

    component.then((sheet: any) => {
      const unpatch = after("default", sheet, (_, res) => {
        React.useEffect(() => () => unpatch(), []);

        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type?.name === "ActionSheetRow")
        );
        if (!buttons) return;

        const message = MessageStore.getMessage(ctx.message.channel_id, ctx.message.id);
        if (!message?.content) return;

        const icon = getAssetIDByName("ic_message_copy");

        const onPress = async () => {
          try {
            const res = await fetch("https://quote-cardgen.onrender.com", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                content: message.content,
                author: {
                  name: message.author.username,
                  avatar: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=128`,
                },
                timestamp: message.timestamp,
              }),
            });

            const { url } = await res.json();

            FluxDispatcher.dispatch({
              type: "SEND_MESSAGE",
              optimistic: true,
              message: {
                channelId: message.channel_id,
                content: url,
                validNonShortcut: true,
                repliedMessageId: message.id,
              },
            });

            showToast("Quote sent!", getAssetIDByName("toast_image"));
          } catch (e) {
            console.error("QuoteCard error:", e);
            showToast("Failed to generate quote.");
          } finally {
            LazyActionSheet.hideActionSheet();
          }
        };

        buttons.splice(
          2,
          0,
          <ActionSheetRow
            label="Quote Message"
            icon={
              <ActionSheetRow.Icon
                source={icon}
                IconComponent={() => (
                  <ReactNative.Image source={icon} style={styles.icon} />
                )}
              />
            }
            onPress={onPress}
          />
        );
      });
    });
  });
}