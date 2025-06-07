import { findByName } from "@vendetta/metro";

const $showColorPicker = findByName("showCustomColorPickerActionSheet") ?? (() => undefined);

export function showColorPicker(props: {
    color?: number | null | undefined;
    onSelect?: ((color: number) => void) | undefined;
    suggestedColors?: string[] | undefined;
}) {
    props.color ??= 0;
    return $showColorPicker(props);
}
