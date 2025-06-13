import { registerCommand } from "@vendetta/commands"; import { findByProps, findByStoreName } from "@vendetta/metro"; import { showToast } from "@vendetta/ui/toasts";

const MessageStore = findByStoreName("MessageStore"); const UserStore = findByStoreName("UserStore"); const { uploadLocalFiles } = findByProps("uploadLocalFiles"); const { getToken } = findByProps("getToken"); const token = getToken();

let unregister;

export default { onLoad() { unregister = registerCommand({ name: "quote", displayName: "quote", description: "Generate a quote image from a message", displayDescription: "Generate a quote image from a message", inputType: 1, type: 1, applicationId: "-1", execute: async (_, ctx) => { const reply = ctx?.messageReference?.message_id; if (!reply) { showToast("Reply to a message to quote it."); return { content: "❌ Please reply to a message." }; }

const message = MessageStore.getMessage(ctx.channel.id, reply);
    if (!message) {
      showToast("Unable to find the message.");
      return { content: "❌ Failed to find message." };
    }

    const author = UserStore.getUser(message.author.id);
    const username = author?.username ?? "Unknown";
    const avatar = `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=4096`;

    const payload = {
      text: message.content,
      username,
      timestamp: message.timestamp ?? Date.now(),
      avatarUrl: avatar,
    };

    try {
      const res = await fetch("https://quote-cardgen.onrender.com/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Bad response from API");

      const blob = await res.blob();
      const file = new File([blob], "quote.png", { type: "image/png" });

      return uploadLocalFiles([
        {
          channelId: ctx.channel.id,
          files: [file],
          message: { content: "", tts: false },
          replyTo: reply,
          token,
        },
      ]);
    } catch (e) {
      console.error("Failed to send quote", e);
      showToast("❌ Error generating quote");
      return { content: "❌ Failed to generate quote." };
    }
  },
});

},

onUnload() { unregister?.(); }, };

      
