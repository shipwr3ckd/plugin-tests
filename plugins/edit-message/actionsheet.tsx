import { findByProps } from "@metro";
import { openAlert } from "@lib/ui/alerts";
import React from "react";
import { EditMessageModal } from "./EditMessageModal";

const MessageActionsSheet = findByProps("showSimpleActionSheet");

export function patchMessageActionSheet() {
  if (!MessageActionsSheet) return;

  // Patch method that creates action sheet options for a message
  const original = MessageActionsSheet.showSimpleActionSheet;

  MessageActionsSheet.showSimpleActionSheet = function (options) {
    // Only patch for message action sheets
    if (options?.key === "MessageActionSheet" && options?.options) {
      // Add Edit option before Reply or near it
      options.options.unshift({
        label: "Edit Message",
        icon: "EditIcon", // or findAssetId("EditIcon") if needed
        onPress: () => {
          // Open the EditMessageModal
          const message = options.message;
          if (!message) return;

          openAlert("EditMessageModal", <EditMessageModal
            initialText={message.content || ""}
            onConfirm={(editedText) => {
              // Patch the message content locally
              message.content = editedText;

              // Also update message state so UI reflects edit
              const messageStore = findByProps("updateMessage");
              if (messageStore?.updateMessage) {
                messageStore.updateMessage(message.channel_id, message.id, message);
              }
            }}
          />);
        },
      });
    }

    return original.call(this, options);
  };
}