exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    const { profileData } = JSON.parse(event.body);

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('Groq API key missing');
    }

    const prompt = `
You are GitRoast — an AI that brutally roasts GitHub profiles like a Comedy Central roast.

Rules:
- Be funny and sarcastic
- Mention actual GitHub stats
- Roast coding habits
- Then give constructive feedback

Respond ONLY in JSON format:

{
  "roast": "funny roast",
  "feedback": "helpful feedback"
}

Profile Data:
${profileData}
`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.9
        })
      }
    );

    const data = await response.json();

    console.log(JSON.stringify(data));

    const rawText =
      data?.choices?.[0]?.message?.content;

    if (!rawText) {
      throw new Error('No response from Groq');
    }

    let parsed;

    try {
      parsed = JSON.parse(
        rawText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
      );
    } catch {
      parsed = {
        roast: rawText,
        feedback:
          'Keep building projects and improving your GitHub consistency.'
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error(err);

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