import { findByProps } from "@vendetta/metro";

// Must use `as` or else `undefined` is lost due to a TS bug
const hapticsModule = findByProps("triggerHapticFeedback") as Record<string, any> | undefined;

export type FeebackKey = "IMPACT_LIGHT" | "IMPACT_MEDIUM" | "IMPACT_HEAVY" | "NOTIFICATION_ERROR" | "DRAG_AND_DROP_START" | "DRAG_AND_DROP_END" | "DRAG_AND_DROP_MOVE";

export const HapticFeebackTypes: Record<FeebackKey, number>
    = hapticsModule?.HapticFeedbackTypes ?? {};

export const triggerHapticFeedback: (feedbackType?: number | undefined) => void
    = hapticsModule?.triggerHapticFeedback ?? (() => undefined);
