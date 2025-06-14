import { patchActionSheet, unpatchActionSheet } from "./actionsheet";
import { patchMessageStore, unpatchMessageStore } from "./localedit";

export const onLoad = () => {
  patchMessageStore();
  patchActionSheet();
};

export const onUnload = () => {
  unpatchActionSheet();
  unpatchMessageStore();
};