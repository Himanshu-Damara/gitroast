exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    const { profileData } = JSON.parse(event.body);

    const prompt = `
You are GitRoast — an AI that roasts GitHub profiles like a Comedy Central roast.

Be brutal, funny, sarcastic, and specific.
Reference actual GitHub stats.

Also provide constructive feedback.

Respond ONLY in valid JSON format:
{
  "roast": "funny roast here",
  "feedback": "helpful feedback here"
}

Profile Data:
${profileData}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log(JSON.stringify(data));

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('No response from Gemini');
    }

    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: cleaned
    };

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};