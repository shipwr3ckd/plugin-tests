import patchActionSheet from "./patches/actionsheet";

let unpatchActionSheet: () => void;

export const onLoad = () => {
  unpatchActionSheet = patchActionSheet();
};

export const onUnload = () => {
  unpatchActionSheet?.();
};

export const settings = {};