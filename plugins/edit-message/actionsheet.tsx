import { findByProps, findByStoreName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findInReactTree } from "@vendetta/utils";

// Core Discord stores & utils
const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const MessageStore = findByStoreName("MessageStore");
const UserStore = findByStoreName("UserStore");
const MessageActions = findByProps("editMessage");

// Access native MessageInput component props (onChange, etc)
const MessageInput = findByProps("defaultValue", "onChange");

// To patch message locally in client
const patchMessageLocally = (channelId, messageId, newContent) => {
  // Patch the message content locally in MessageStore cache
  const msg = MessageStore.getMessage(channelId, messageId);
  if (!msg) return;
  msg.content = newContent;
  MessageStore._emitChange(); // Notify UI of change (some versions may require this)
};

let unpatch;

export const onUnload = () => {
  unpatch?.();
};

export default function patchActionSheet() {
  unpatch = after("openLazy", LazyActionSheet, ([component, key]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      after("default", instance, ([props], res) => {
        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons || buttons.some((x) => x?.props?.label === "Edit Message")) return;

        const replyIndex = buttons.findIndex((x) => x?.props?.label === "Reply");
        const insertIndex =
          replyIndex > -1
            ? replyIndex
            : Math.max(buttons.findIndex((x) => x?.props?.label === "Copy Text"), 0);

        buttons.splice(
          insertIndex,
          0,
          <ActionSheetRow
            label="Edit Message"
            icon={<ActionSheetRow.Icon source={getAssetIDByName("ic_edit_24px")} />}
            onPress={() => {
              const msg = props.message;
              if (!msg) return;

              LazyActionSheet.hideActionSheet();

              // Trigger native message edit UI
              // 1. Call native editMessage action to open the edit UI
              MessageActions.editMessage(msg.channel_id, msg.id);

              // 2. Prefill input box by patching MessageInput's onChange or by dispatching action (depends on your Vendetta version)
              //    This part varies; simplest is to patch MessageInput's internal state directly or simulate user typing.
              //    For example:
              setTimeout(() => {
                if (MessageInput && MessageInput.setText) {
                  MessageInput.setText(msg.content);
                }
              }, 50);

              // 3. Patch message locally on send — ideally handled by native editMessage flow, so no manual patch needed.
              // If you want to patch manually, you can patch MessageStore content on send event.
            }}
          />
        );
      });
    });
  });
}