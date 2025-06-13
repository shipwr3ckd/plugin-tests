import { patchActionSheet } from "./patches/actionsheet";

export const onLoad = () => {
  const unpatch = patchActionSheet();
  return () => unpatch();
};