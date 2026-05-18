exports.handler = async function (event) {
  // Allow only POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    // Parse frontend request
    const { profileData } = JSON.parse(event.body);

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;

    console.log("API KEY EXISTS:", !!apiKey);

    if (!apiKey) {
      throw new Error("Gemini API key missing");
    }

    // Prompt for Gemini
    const prompt = `
You are GitRoast — an AI that brutally roasts GitHub profiles like a Comedy Central roast.

Rules:
- Be funny, sarcastic, and specific
- Mention actual GitHub stats
- Roast coding habits
- No emojis
- Then give constructive feedback like a senior developer mentor

Respond ONLY in valid JSON format like this:

{
  "roast": "Funny roast here",
  "feedback": "Helpful feedback here"
}

Profile Data:
${profileData}
`;

    // Gemini API request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    // Parse Gemini response
    const data = await response.json();

    console.log("Gemini Response:", JSON.stringify(data));

    // Safe extraction
    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error(
        data?.error?.message || 'No response from Gemini'
      );
    }

    // Clean markdown formatting
    const cleanedText = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let parsed;

    // Ensure valid JSON
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = {
        roast: cleanedText,
        feedback:
          'Keep building projects, write better READMEs, and stay consistent on GitHub.'
      };
    }

    // Return response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error("FUNCTION ERROR:", err);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};