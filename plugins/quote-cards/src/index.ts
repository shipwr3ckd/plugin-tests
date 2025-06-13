import patchActionSheet, { unpatchActionSheet } from "./patches/actionsheet";

export default {
  onLoad: () => {
    patchActionSheet();
  },
  onUnload: () => {
    unpatchActionSheet?.();
  },
};
