import { findByStoreName } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";

const MessageStore = findByStoreName("MessageStore");
const edits: Record<string, string> = {};

export function setEditedContent(ch: string, id: string, text: string) {
  edits[`${ch}_${id}`] = text;
}

let unpatch: () => void;

export function patchMessageStore() {
  unpatch = instead("getMessage", MessageStore, (args, orig) => {
    const msg = orig(...args);
    if (!msg) return msg;
    const key = `${args[0]}_${args[1]}`;
    if (edits[key]) {
      return {
        ...msg,
        content: edits[key],
        edited_timestamp: new Date().toISOString(),
      };
    }
    return msg;
  });
}

export function unpatchMessageStore() {
  unpatch?.();
}