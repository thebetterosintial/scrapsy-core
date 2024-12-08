import { Browser, chromium } from 'playwright';
import express, { Request, Response } from "express";

import dotenv from 'dotenv';
import { specs } from './swagger';
import swaggerUi from 'swagger-ui-express';
import { useScrape } from './useScrape';

dotenv.config();

const app = express();
const port = process.env.PORT;
let browser: Browser;

async function initBrowser() {
  browser = await chromium.launch({
    ignoreDefaultArgs: false,
    args: ['--ignore-certificate-errors']
  });
}

initBrowser();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
});

/**
 * @swagger
 * /scrape:
 *   post:
 *     summary: Scrape a webpage and extract data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: The URL to scrape
 *                 example: https://news.ycombinator.com
 *               prompt:
 *                 type: string
 *                 description: Instructions for data extraction
 *                 example: Extract top 5 stories with title and points
 *     responses:
 *       200:
 *         description: Successfully scraped data
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
app.post("/scrape", async (req: Request, res: Response) => {
  const { prompt, url } = req.body;
  const data = await useScrape({ prompt, url });
  res.json(data);
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
