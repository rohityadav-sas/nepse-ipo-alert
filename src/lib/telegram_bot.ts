import ky from "./ky.js"

class TelegramBot {
    async sendMessage(chat_id: number, text: string, parse_mode: "HTML" | "MarkdownV2" | null = "HTML") {
        const json: { chat_id: number; text: string; parse_mode?: "HTML" | "MarkdownV2" } = {
            chat_id,
            text,
        };

        if (parse_mode) json.parse_mode = parse_mode;

        return ky.post("sendMessage", { json }).json();
    }
}

export const Bot = new TelegramBot();
