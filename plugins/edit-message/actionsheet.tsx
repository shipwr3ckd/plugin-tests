import { after } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { showAlert, dismissAlert } from "@vendetta/ui/alerts";
import { AlertModal, Button, Stack, TextInput } from "@vendetta/ui/components";
import { findAssetIdByName } from "@vendetta/ui/assets";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
const MessageStore = findByStoreName("MessageStore");

let unpatch: () => void;

export const onUnload = () => {
  unpatch?.();
};

export default function patchActionSheet() {
  unpatch = after("openLazy", LazyActionSheet, ([component, key]) => {
    if (key !== "MessageLongPressActionSheet") return;

    component.then((instance) => {
      after("default", instance, ([props], res) => {
        // Find buttons container in React tree
        const buttons = res?.props?.children?.[1]?.props?.children;
        if (!buttons) return;

        // Don't add if already exists
        if (buttons.some((b) => b?.props?.label === "Edit Message")) return;

        // Find Reply button index to insert before
        const replyIndex = buttons.findIndex((b) => b?.props?.label === "Reply");
        const insertIndex = replyIndex >= 0 ? replyIndex : buttons.length;

        buttons.splice(insertIndex, 0,
          <ActionSheetRow
            label="Edit Message"
            icon={<ActionSheetRow.Icon source={findAssetIdByName("ic_edit_24px")} />}
            onPress={() => {
              const message = props.message;
              if (!message) return;

              LazyActionSheet.hideActionSheet();

              // Show edit modal
              showAlert("Edit Message", <EditMessageModal message={message} />);
            }}
          />
        );
      });
    });
  });
}

// Modal component to edit message content
function EditMessageModal({ message }: { message: any }) {
  const [text, setText] = React.useState(message.content);
  const [loading, setLoading] = React.useState(false);
  const MessageStore = findByStoreName("MessageStore");

  async function onConfirm() {
    setLoading(true);
    try {
      // Patch message locally
      const editedMessage = { ...message, content: text };
      MessageStore.updateMessage(editedMessage.channel_id, editedMessage.id, editedMessage);

      // TODO: Here you can add code to send API request to Discord to actually edit the message

      dismissAlert("Edit Message");
    } catch (e) {
      console.error("Edit failed", e);
      setLoading(false);
    }
  }

  return (
    <AlertModal
      title="Editing Message"
      content={null}
      extraContent={
        <Stack style={{ marginTop: -12 }}>
          <TextInput
            autoFocus
            value={text}
            onChange={setText}
            multiline
            numberOfLines={4}
            returnKeyType="done"
            onSubmitEditing={onConfirm}
          />
        </Stack>
      }
      actions={
        <Stack>
          <Button
            loading={loading}
            text="Confirm"
            variant="primary"
            disabled={!text.trim()}
            onPress={onConfirm}
          />
          <Button
            text="Cancel"
            variant="secondary"
            onPress={() => dismissAlert("Edit Message")}
          />
        </Stack>
      }
    />
  );
}