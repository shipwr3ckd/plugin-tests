import { findByStoreName } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";

const MessageStore = findByStoreName("MessageStore");

const editedMessages: Record<string, string> = {};

let unpatch: () => void;

export function setEditedContent(channelId: string, messageId: string, newContent: string) {
  const key = `${channelId}_${messageId}`;
  editedMessages[key] = newContent;
}

export function patchMessageStore() {
  unpatch = instead("getMessage", MessageStore, (args, orig) => {
    const msg = orig(...args);
    if (!msg) return msg;

    const [channelId, messageId] = args;
    const key = `${channelId}_${messageId}`;
    if (editedMessages[key]) {
      return {
        ...msg,
        content: editedMessages[key],
        edited_timestamp: new Date().toISOString(),
      };
    }

    return msg;
  });
}

export function unpatchMessageStore() {
  unpatch?.();
}