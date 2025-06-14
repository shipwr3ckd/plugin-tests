import patchActionSheet from "./actionsheet";

export const onLoad = () => {
  patchActionSheet();
};

export const onUnload = () => {
  // Unpatch all patches on unload to prevent leaks
  import("@vendetta/patcher").then(({ unpatchAll }) => unpatchAll());
};