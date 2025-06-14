import { findByStoreName, findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";

const MessageStore = findByStoreName("MessageStore");
const { getMessages } = MessageStore;
const MessageActions = findByProps("sendMessage", "editMessage");

const editedMessages = new Map<string, string>();
let unpatch: () => void;

export function setEditedContent(channelId: string, messageId: string, newContent: string) {
  const key = `${channelId}:${messageId}`;
  editedMessages.set(key, newContent);
}

export function patchMessageStore() {
  unpatch = after("getMessages", MessageStore, ([channelId], res) => {
    const messages = res?._array ?? [];
    for (const msg of messages) {
      const key = `${channelId}:${msg.id}`;
      if (editedMessages.has(key)) {
        msg.content = editedMessages.get(key)!;
      }
    }
  });
}

export function unpatchMessageStore() {
  unpatch?.();
}