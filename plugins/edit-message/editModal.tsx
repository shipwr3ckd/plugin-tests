import { React } from "@vendetta/metro/common";
import { showAlert } from "@vendetta/ui/alerts";
import { TextInput } from "@vendetta/ui/components";
import { Button, Stack } from "@vendetta/ui";
import { setEditedContent } from "./localedit";

export function showEditModal({
  initialText,
  channelId,
  messageId,
}: {
  initialText: string;
  channelId: string;
  messageId: string;
}) {
  let value = initialText;

  showAlert({
    title: "Editing Message",
    content: "",
    extraContent: (
      <TextInput
        autoFocus
        isClearable
        value={value}
        onChange={(v: string) => (value = v)}
        returnKeyType="done"
        placeholder="Edit content"
        style={{ minHeight: 100 }}
      />
    ),
    actions: (
      <Stack>
        <Button
          text="Confirm"
          variant="primary"
          onPress={() => {
            setEditedContent(channelId, messageId, value);
          }}
        />
        <Button text="Cancel" variant="secondary" />
      </Stack>
    ),
  });
}