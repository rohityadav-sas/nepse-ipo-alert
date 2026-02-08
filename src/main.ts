import { handle_error } from "./lib/error_handler.js";
import { get_auth_headers } from "./services/auth.js";
import { check_new_ipos } from "./services/ipo_checker.js";
import { check_new_ipo_results } from "./services/ipo_result_checker.js";
import { format_ipo_message, format_ipo_result_message } from "./lib/message_formatter.js";
import { Bot } from "./lib/telegram_bot.js";
import { ENV } from "./config/ENV.js";

async function main() {
    try {
        const auth_headers = await get_auth_headers();

        const results = await Promise.allSettled([
            check_new_ipos(auth_headers),
            check_new_ipo_results(),
        ]);

        if (results[0].status === "fulfilled") {
            const new_ipos = results[0].value;
            console.log("New IPOs:", new_ipos);
            for (const ipo of new_ipos) {
                const message = format_ipo_message(ipo);
                await Bot.sendMessage(ENV.CHANNEL, message);
            }
        } else {
            await handle_error(results[0].reason, "IPO Checker");
        }

        if (results[1].status === "fulfilled") {
            const new_ipo_results = results[1].value;
            console.log("New IPO Results:", new_ipo_results);
            for (const result of new_ipo_results) {
                const message = format_ipo_result_message(result);
                await Bot.sendMessage(ENV.CHANNEL, message);
            }
        } else {
            await handle_error(results[1].reason, "IPO Result Checker");
        }

        if (results.some((result) => result.status === "rejected")) {
            process.exitCode = 1;
        }

    } catch (error: any) {
        await handle_error(error, "Main Process");
        process.exit(1);
    }
}

main();
