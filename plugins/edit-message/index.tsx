import { findByProps, findByStoreName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findInReactTree } from "@vendetta/utils";
import { showModal, ModalRoot } from "@vendetta/ui/modals"; // Vendetta modal utilities

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const MessageStore = findByStoreName("MessageStore");

let unpatch: () => void;

export const onUnload = () => {
  unpatch?.();
};

export default function patchActionSheet() {
  unpatch = after("openLazy", LazyActionSheet, ([, key]) => {
    if (key !== "MessageLongPressActionSheet") return;

    // Intercept the loaded sheet
    LazyActionSheet.openLazy = ((orig) => async (...args) => {
      const component = await orig(...args);
      after("default", component, ([{ message }], res) => {
        const rows = findInReactTree(res, x =>
          Array.isArray(x) && x.some(y => y?.type === ActionSheetRow)
        );
        if (!rows || rows.some(x => x?.props?.label === "Edit Message")) return;

        rows.unshift(
          <ActionSheetRow
            label="Edit Message"
            icon={<ActionSheetRow.Icon source={getAssetIDByName("ic_pencil_24px")} />}
            onPress={() => {
              const chanId = message.channel_id;
              const msgId = message.id;
              const msg = MessageStore.getMessage(chanId, msgId);
              if (!msg) return;

              showModal(
                <ModalRoot
                  title="Edit Message"
                  defaultValue={msg.content}
                  onClose={() => LazyActionSheet.hideActionSheet()}
                  onSubmit={(newContent: string) => {
                    const { editMessage } = findByProps("editMessage");
                    editMessage(chanId, msgId, { content: newContent });
                    LazyActionSheet.hideActionSheet();
                  }}
                />
              );
            }}
          />
        );
      });
      return component;
    })(LazyActionSheet.openLazy);
  });
}