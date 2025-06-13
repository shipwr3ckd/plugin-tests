import patchActionSheet, { onUnload as unloadActionSheet } from "./patches/actionsheet";

export default {
  onLoad: patchActionSheet,
  onUnload: unloadActionSheet,
};
