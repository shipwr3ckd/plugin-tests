import { findByProps, findByStoreName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findInReactTree } from "@vendetta/utils";
import { openModal, ModalComponent } from "@vendetta/ui/modals";
import { setEditedContent } from "./localedit";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const MessageStore = findByStoreName("MessageStore");

let unpatch: () => void;

const EditModal = (props: { channel: string; id: string; content: string }) => {
  const [text, setText] = React.useState(props.content);
  return (
    <ModalComponent
      title="Edit Message"
      onClose={() => {}}
      footer={
        <>
          <ModalComponent.Cancel label="Cancel" />
          <ModalComponent.Confirm
            label="Save"
            onPress={() => {
              setEditedContent(props.channel, props.id, text);
              ModalComponent.close();
            }}
          />
        </>
      }
    >
      <ModalComponent.TextInput
        defaultValue={props.content}
        multiline
        onChangeText={setText}
        style={{ minHeight: 100 }}
      />
    </ModalComponent>
  );
};

export function patchActionSheet() {
  unpatch = after("openLazy", LazyActionSheet, ([component, key]) => {
    if (key !== "MessageLongPressActionSheet") return;
    component.then((inst) =>
      after("default", inst, ([props], res) => {
        const buttons = findInReactTree(res, (x) =>
          Array.isArray(x) && x.some((y) => y?.type === ActionSheetRow)
        );
        if (!buttons || buttons.some((x) => x?.props?.label === "Edit Message"))
          return;

        const idx = Math.max(
          buttons.findIndex((x) => x?.props?.label === "Reply"),
          buttons.findIndex((x) => x?.props?.label === "Copy Text"),
          0
        );

        buttons.splice(idx, 0,
          <ActionSheetRow
            label="Edit Message"
            icon={<ActionSheetRow.Icon source={getAssetIDByName("ic_pencil_24px")} />}
            onPress={() => {
              const { channel_id, id } = props.message!;
              const orig = MessageStore.getMessage(channel_id, id);
              if (!orig) return;
              openModal((close) => (
                <EditModal channel={channel_id} id={id} content={orig.content} />
              ));
              LazyActionSheet.hideActionSheet();
            }}
          />
        );
      })
    );
  });
}

export function unpatchActionSheet() {
  unpatch?.();
}