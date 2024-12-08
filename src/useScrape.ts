import { Browser, chromium } from "playwright";

import Replicate from "replicate";

interface Props {
    prompt: string;
    url: string;
}

interface ScrapedData {
    [key: string]: any;
}

export const useScrape = async (props: Props): Promise<ScrapedData | { error: string; message: string; details?: any }> => {
    const { prompt, url } = props;
    let browser: Browser | null = null;

    try {
        browser = await launchBrowser();
        const content = await scrapeContent(browser, url);
        const summarizedContent = await summarizeContent(content, prompt);
        const extractedData = await extractData(summarizedContent, prompt);
        return extractedData;
    } catch (error) {
        console.error('Scraping error:', error);
        return handleError(error);
    } finally {
        if (browser) await browser.close();
    }
};

async function launchBrowser(): Promise<Browser> {
    return await chromium.launch({ headless: true });
}

async function scrapeContent(browser: Browser, url: string): Promise<string> {
    const page = await browser.newPage();
    await page.goto(url, { timeout: 30000, waitUntil: 'networkidle' });
    
    return await page.evaluate(() => {
        const scripts = document.querySelectorAll("script, style");
        scripts.forEach((script) => script.remove());
        const mainContent = document.querySelectorAll("body *");
        return Array.from(mainContent)
            .map((element) => element.textContent?.trim())
            .filter((text) => text && text.length > 0)
            .join("\n");
    });
}

async function summarizeContent(content: string, prompt: string): Promise<string> {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const summarizePrompt = `
        Summarize the following content, focusing on data relevant to this prompt: ${prompt}
        Content: ${content.slice(0, 3000)}
    `;

    const summary = await replicate.run(`replicate/${process.env.REPLICATE_MODEL}`, {
        input: {
            prompt: summarizePrompt,
            max_tokens: 500,
            temperature: 0.1,
        }
    });

    return typeof summary === 'string' ? summary : JSON.stringify(summary);
}

async function extractData(summarizedContent: string, prompt: string): Promise<ScrapedData> {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const extractionPrompt = `
        Extract data as a JSON object based on this prompt: ${prompt}
        From this summarized content: ${summarizedContent}
        Important: Your entire response must be a valid JSON object. Do not include any explanatory text outside the JSON structure.
    `;

    const response = await replicate.run(`replicate/${process.env.REPLICATE_MODEL}`, {
        input: {
            prompt: extractionPrompt,
            max_tokens: 1000,
            temperature: 0.1,
            system_prompt: "You are a helpful assistant that returns only valid JSON data without any additional text."
        }
    });

    const joinedResponse = Array.isArray(response) ? response.join('') : response;

    let jsonResponse: ScrapedData;
    
    try {
        jsonResponse = JSON.parse(joinedResponse as string);
    } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        
        const jsonMatch = /\{[\s\S]*\}|\[[\s\S]*\]/.exec(joinedResponse.toString());
        
        if (jsonMatch) {
            try {
                jsonResponse = JSON.parse(jsonMatch[0]);
            } catch {
                throw new Error('Could not extract valid JSON from response');
            }
        } else {
            throw new Error('Response does not contain valid JSON');
        }
    }

    const finalResponse = JSON.stringify(jsonResponse);
    
    if (finalResponse.length > 3000) {
        console.warn('Response truncated to meet character limit.');
        return JSON.parse(finalResponse.slice(0, 3000));
    }

    return jsonResponse;
}

function handleError(error: any): { error: string; message: string; details?: any } {
    if (error instanceof Error) {
        return {
            error: error.name,
            message: error.message,
            details: error
        };
    }
    
    return {
        error: 'Unknown Error',
        message: 'An unexpected error occurred',
        details: error
    };
}