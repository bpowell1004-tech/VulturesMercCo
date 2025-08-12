// Serverless function to handle form submissions
// This function parses incoming POST requests, formats the data
// into a Discord-friendly message, sends it via a webhook and then
// redirects the user to a thank-you page.

export default async function handler(req, res) {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }
    // Ensure the webhook URL is available
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      res.status(500).json({ error: 'Discord webhook URL not configured' });
      return;
    }
    // Read the raw request body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString();
    // Parse URL-encoded form data
    const params = new URLSearchParams(rawBody);
    const data = {};
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }
    // Build the message lines for Discord
    const lines = [];
    // Include the form type at the top
    const formName = data.form || 'Submission';
    lines.push(`**${formName}**`);
    // Include PSN and Discord names if provided
    if (data.client_psn) lines.push(`**PSN:** ${data.client_psn}`);
    if (data.discord_name) lines.push(`**Discord:** ${data.discord_name}`);
    if (data.applicant_psn) lines.push(`**PSN:** ${data.applicant_psn}`);
    if (data.applicant_discord) lines.push(`**Discord:** ${data.applicant_discord}`);
    // Append all other fields with human-friendly labels
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      // Skip fields that we've already handled or that are hidden
      if (['form', 'client_psn', 'discord_name', 'applicant_psn', 'applicant_discord'].includes(key)) {
        continue;
      }
      // Convert snake_case keys to Title Case labels
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`**${label}:** ${value}`);
    }
    // Join lines into a single message
    const content = lines.join('\n');
    // Post the message to Discord
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    // Redirect the user to the thank-you page
    res.writeHead(302, { Location: '/submitted.html' });
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}