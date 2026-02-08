import ky from "ky";
import { writeFile } from "fs/promises";
import { API_ENDPOINTS } from "../config/endpoints.js";
import { IPOResultResponse } from "../types/index.js";

const BODY_PREVIEW_LIMIT = 500;

function get_body_preview(body: string): string {
    return body.replace(/\s+/g, " ").trim().slice(0, BODY_PREVIEW_LIMIT);
}

export async function check_new_ipo_results(): Promise<string[]> {
    const existing_ipo_results = (await import("../data/ipo_results.json")).default;

    const response = await ky.get(API_ENDPOINTS.ipo_result, {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
        }
    });

    const raw_body = await response.text();
    const content_type = response.headers.get("content-type") || "unknown";

    if (!response.ok) {
        const error = new Error(`IPO result endpoint failed with status ${response.status}`);
        (error as any).report = {
            endpoint: API_ENDPOINTS.ipo_result,
            status: response.status,
            contentType: content_type,
            bodyPreview: get_body_preview(raw_body),
        };
        throw error;
    }

    if (!content_type.toLowerCase().includes("application/json")) {
        const error = new Error(`IPO result endpoint returned unexpected content-type: ${content_type}`);
        (error as any).report = {
            endpoint: API_ENDPOINTS.ipo_result,
            status: response.status,
            contentType: content_type,
            bodyPreview: get_body_preview(raw_body),
        };
        throw error;
    }

    let ipo_results_response: IPOResultResponse;

    try {
        ipo_results_response = JSON.parse(raw_body) as IPOResultResponse;
    } catch (json_error: any) {
        const error = new Error(`Invalid JSON from IPO result endpoint: ${json_error.message}`);
        (error as any).report = {
            endpoint: API_ENDPOINTS.ipo_result,
            status: response.status,
            contentType: content_type,
            bodyPreview: get_body_preview(raw_body),
        };
        throw error;
    }

    if (!Array.isArray(ipo_results_response?.body?.companyShareList)) {
        const error = new Error("IPO result response shape is invalid: missing body.companyShareList");
        (error as any).report = {
            endpoint: API_ENDPOINTS.ipo_result,
            status: response.status,
            contentType: content_type,
            bodyPreview: get_body_preview(raw_body),
        };
        throw error;
    }

    const existing_result_names = new Set(existing_ipo_results);

    const first_five_results = ipo_results_response.body.companyShareList.slice(0, 5).map(x => x.name);

    const new_ipo_results = first_five_results.filter((result) => !existing_result_names.has(result));

    if (new_ipo_results.length > 0) {
        await writeFile(
            "src/data/ipo_results.json",
            JSON.stringify(first_five_results, null, 4)
        );
    }

    return new_ipo_results;
}
