import React from "react";
import { AlertModal, AlertActionButton, Button, Stack, TextInput } from "@metro/common/components";
import { dismissAlert } from "@lib/ui/alerts";

interface EditMessageModalProps {
  initialText: string;
  onConfirm: (editedText: string) => void;
}

export function EditMessageModal({ initialText, onConfirm }: EditMessageModalProps) {
  const [value, setValue] = React.useState(initialText);
  const [error, setError] = React.useState("");

  function onConfirmWrapper() {
    if (value.trim().length === 0) {
      setError("Message cannot be empty");
      return;
    }
    onConfirm(value.trim());
    dismissAlert("EditMessageModal");
  }

  return (
    <AlertModal
      title="Editing Message"
      content=""
      extraContent={
        <Stack style={{ marginTop: -12 }}>
          <TextInput
            autoFocus
            isClearable
            multiline
            value={value}
            onChange={(v: string) => {
              setValue(v);
              if (error) setError("");
            }}
            returnKeyType="done"
            onSubmitEditing={onConfirmWrapper}
            state={error ? "error" : undefined}
            errorMessage={error || undefined}
            placeholder="Edit your message here"
            style={{ minHeight: 100 }}
          />
        </Stack>
      }
      actions={
        <Stack>
          <Button
            text="Confirm"
            variant="primary"
            onPress={onConfirmWrapper}
            disabled={value.trim().length === 0}
          />
          <AlertActionButton
            text="Cancel"
            variant="secondary"
            onPress={() => dismissAlert("EditMessageModal")}
          />
        </Stack>
      }
    />
  );
}