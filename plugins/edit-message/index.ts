import patchActionSheet, { onUnload } from "./actionsheet";

export const onLoad = () => {
  patchActionSheet();
};

export const onUnloadPlugin = () => {
  onUnload();
};