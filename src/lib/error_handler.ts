import { Bot } from "./telegram_bot.js";
import { ENV } from "../config/ENV.js";

const TELEGRAM_MESSAGE_LIMIT = 4000;

function truncate(text: string, max = TELEGRAM_MESSAGE_LIMIT): string {
    return text.length > max ? `${text.slice(0, max - 15)}\n\n...[truncated]` : text;
}

function escape_html(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export async function handle_error(error: any, context: string) {
    const message = error?.message ?? "Unknown error";

    console.error(`\n=== Error in ${context} ===`);
    console.error("Error:", message);

    const safe_context = escape_html(truncate(String(context), 300));
    const safe_message = escape_html(truncate(String(message), 700));

    const lines = [
        `⚠️ <b>Error</b>: <code>${safe_context}</code>`,
        `<b>Message</b>: <code>${safe_message}</code>`,
    ];

    if (error?.report) {
        console.error("Report:", error.report);

        if (error.report.endpoint) {
            const endpoint = String(error.report.endpoint);
            const safe_endpoint = escape_html(truncate(endpoint, 500));
            lines.push(`<b>Endpoint</b>: <a href="${safe_endpoint}">${safe_endpoint}</a>`);
        }

        if (error.report.status || error.report.contentType) {
            const status = error.report.status ?? "unknown";
            const type = error.report.contentType ?? "unknown";
            lines.push(`<b>HTTP</b>: <code>${escape_html(String(status))} (${escape_html(String(type))})</code>`);
        }
    } else if (error?.response) {
        console.error("Response status:", error.response.status);
        const response_type = error.response.headers?.get?.("content-type") ?? "unknown";
        lines.push(`<b>HTTP</b>: <code>${escape_html(String(error.response.status))} (${escape_html(String(response_type))})</code>`);
    }

    if (error?.stack) {
        console.error("Stack:", error.stack);
        const first_stack_line = String(error.stack).split("\n")[1]?.trim();
        if (first_stack_line) lines.push(`<b>At</b>: <code>${escape_html(truncate(first_stack_line, 900))}</code>`);
    }

    const error_details = lines.join("\n\n");

    // Send error to admin
    try {
        await Bot.sendMessage(Number(ENV.ADMIN), truncate(error_details), "HTML");
    } catch (notification_error) {
        console.error("Failed to send error notification to admin:", notification_error);
    }
}
