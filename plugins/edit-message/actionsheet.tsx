import { findByDisplayName, findByProps } from "@metro";
import { findAssetId } from "@lib/api/assets";

export function patchMessageLongPressActionSheet() {
  const MessageLongPressActionSheet = findByDisplayName("MessageLongPressActionSheet");
  if (!MessageLongPressActionSheet) {
    console.warn("MessageLongPressActionSheet not found");
    return;
  }

  const MessageActions = findByProps("editMessage");
  if (!MessageActions) {
    console.warn("MessageActions not found");
    return;
  }

  const EditIcon = findAssetId("EditIcon");

  const originalRender = MessageLongPressActionSheet.prototype.render;

  MessageLongPressActionSheet.prototype.render = function () {
    const original = originalRender.call(this);
    const props = this.props;

    // Try to get the message object from props (adapt this if your version uses other keys)
    const message = props.message || props.messageData || props.targetMessage;

    if (!message) {
      return original;
    }

    // Prepare the new edit action button
    const editAction = {
      label: "Edit Message",
      icon: EditIcon,
      onPress: () => {
        // Close the action sheet and open native message editor
        // The native editor is triggered by this function:
        MessageActions.editMessage(message.channel_id, message.id);
      }
    };

    // Patch the original action sheet options by appending our new action
    try {
      // original.props.children is usually a React element, find where options array is
      const children = original.props.children;

      if (Array.isArray(children)) {
        for (const child of children) {
          if (child?.props?.options && Array.isArray(child.props.options)) {
            child.props.options.push(editAction);
            break;
          }
        }
      } else if (children?.props?.options && Array.isArray(children.props.options)) {
        children.props.options.push(editAction);
      } else {
        console.warn("Could not find options array to patch in action sheet.");
      }
    } catch (e) {
      console.error("Error patching action sheet options:", e);
    }

    return original;
  };
}