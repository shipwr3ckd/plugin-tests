import { patchActionSheet, unpatchActionSheet } from "./actionsheet";

export const onLoad = () => {
  patchActionSheet();
};

export const onUnload = () => {
  unpatchActionSheet();
};