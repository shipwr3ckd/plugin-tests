import { patchActionSheet } from "./patches/actionsheet";

let unpatch: () => void;

export const onLoad = () => {
  unpatch = patchActionSheet();
};

export const onUnload = () => {
  unpatch?.();
};