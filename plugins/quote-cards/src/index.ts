import { patchActionSheet, unpatchActionSheetFn } from "./patches/actionsheet";

export default {
  onLoad() {
    patchActionSheet();
  },
  onUnload() {
    unpatchActionSheetFn();
  },
};
