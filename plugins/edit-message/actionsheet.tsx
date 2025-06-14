import { findByProps, findByDisplayName } from "@metro";
import { findAssetId } from "@lib/api/assets";

// Lazy load ActionSheet show/hide functions
const { showSimpleActionSheet, hideActionSheet } = findByProps("showSimpleActionSheet");

// MessageActions contains editMessage method to open the native editor
const MessageActions = findByProps("editMessage");

// Discord's built-in Edit icon asset
const EditIcon = findAssetId("EditIcon");

// Helper: Try to extract the message from various prop keys
function getMessageFromProps(props: any) {
  if (props.message) return props.message;
  if (props.messageData) return props.messageData;
  if (props.targetMessage) return props.targetMessage;
  if (props.channel && props.channel.message) return props.channel.message;
  return null;
}

export function patchMessageLongPressActionSheet() {
  const MessageLongPressActionSheet = findByDisplayName("MessageLongPressActionSheet");
  if (!MessageLongPressActionSheet) {
    console.warn("MessageLongPressActionSheet not found");
    return;
  }

  // Patch render method to add our custom button
  const originalRender = MessageLongPressActionSheet.prototype.render;
  MessageLongPressActionSheet.prototype.render = function patchedRender() {
    const original = originalRender.call(this);
    const props = this.props;

    // Find message safely
    const msg = getMessageFromProps(props);

    // If no message found, render original only
    if (!msg) return original;

    // Add new edit button to action sheet options
    const newEditAction = {
      label: "Edit Message",
      icon: EditIcon,
      async onPress() {
        hideActionSheet(); // close action sheet first

        // Open Discord's native message editor for the selected message
        MessageActions.editMessage(msg.channel_id, msg.id);
      }
    };

    // Clone the original actions/options array and append ours
    // The actions are usually in original.props.children or original.props.content.props.children
    // This depends on Discord version, so try common patterns:

    let patchedChildren = original.props?.children;

    // Find the actions array to insert into:
    if (Array.isArray(patchedChildren)) {
      // If array, try to find the actions container
      for (let i = 0; i < patchedChildren.length; i++) {
        const child = patchedChildren[i];
        if (child?.props?.options) {
          // Add our action to options
          child.props.options = [...child.props.options, newEditAction];
          return original;
        }
      }
    } else if (patchedChildren?.props?.options) {
      // If single object with options prop
      patchedChildren.props.options = [...patchedChildren.props.options, newEditAction];
      return original;
    }

    // If can't find options list, fallback to rendering original without edit button
    console.warn("Could not patch actionsheet options");
    return original;
  };
}