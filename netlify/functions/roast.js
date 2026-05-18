exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { profileData } = JSON.parse(event.body);

    const prompt = `You are GitRoast — an AI that roasts GitHub profiles like a Comedy Central roast. Be brutal, funny, and specific. Reference actual numbers.

Profile data:
${profileData}

Respond ONLY in this JSON format, no extra text:
{
  "roast": "2-3 paragraphs of savage, funny roasting. Reference real numbers. Developer humor. No emojis.",
  "feedback": "2-3 genuine tips to improve their GitHub. Start with strengths. Be direct like a senior dev mentor."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text
      .replace(/```json|```/g, '')
      .trim();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: text
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};