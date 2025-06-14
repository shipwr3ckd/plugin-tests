import { findByProps, findByStoreName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findInReactTree } from "@vendetta/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const MessageStore = findByStoreName("MessageStore");

let unpatch: () => void;

export function patchActionSheet() {
  unpatch = after("openLazy", LazyActionSheet, ([component, key]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      after("default", instance, ([props], res) => {
        const buttons = findInReactTree(res, x =>
          Array.isArray(x) && x.some(y => y?.type === ActionSheetRow)
        );
        if (!buttons || buttons.some(x => x?.props?.label === "Edit Message")) return;

        const replyIndex = buttons.findIndex(x => x?.props?.label === "Reply");
        const insertIndex = replyIndex > -1 ? replyIndex : Math.max(
          buttons.findIndex(x => x?.props?.label === "Copy Text"),
          0
        );

        buttons.splice(insertIndex, 0,
          <ActionSheetRow
            label="Edit Message"
            icon={
              <ActionSheetRow.Icon
                source={getAssetIDByName("ic_pencil_24px")}
              />
            }
            onPress={() => {
              try {
                const chanId = props?.message?.channel_id;
                const msgId = props?.message?.id;

                if (!chanId || !msgId) return;

                const { startEditMessage } = findByProps("startEditMessage");
                startEditMessage(chanId, msgId);
              } catch (e) {
                console.error("Edit Message error", e);
              } finally {
                LazyActionSheet.hideActionSheet();
              }
            }}
          />
        );
      });
    });
  });
}

export function unpatchActionSheet() {
  unpatch?.();
}