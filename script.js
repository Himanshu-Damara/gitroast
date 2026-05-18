let currentRoast = '';
let currentUser = '';

function tryExample(name) {
  document.getElementById('usernameInput').value = name;
  startRoast();
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
}

function hideError() {
  document.getElementById('errorMsg').classList.remove('show');
}

function setLoading(msg) {
  document.getElementById('loadingText').textContent = msg;
  document.getElementById('loadingState').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingState').classList.remove('show');
}

async function startRoast() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) return;

  const btn = document.getElementById('roastBtn');
  btn.disabled = true;
  btn.textContent = 'Roasting...';

  hideError();
  document.getElementById('profileCard').classList.remove('show');
  document.getElementById('roastOutput').classList.remove('show');
  setLoading('fetching github profile...');

  try {
    const [userRes, reposRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`),
      fetch(`https://api.github.com/users/${username}/events/public?per_page=30`)
    ]);

    if (!userRes.ok) {
      throw new Error(
        userRes.status === 404
          ? `User "${username}" not found on GitHub.`
          : 'GitHub API error. Try again.'
      );
    }

    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    hideLoading();
    displayProfile(user, repos);
    setLoading('ai is cooking your roast...');
    await generateRoast(user, repos, events);

  } catch (err) {
    hideLoading();
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Roast Me 🔥';
  }
}

function displayProfile(user, repos) {
  document.getElementById('profileAvatar').src = user.avatar_url;
  document.getElementById('profileName').textContent = user.name || user.login;
  document.getElementById('profileHandle').textContent = `@${user.login}`;

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat"><span class="stat-num">${user.public_repos}</span><span class="stat-label">repos</span></div>
    <div class="stat"><span class="stat-num">${user.followers}</span><span class="stat-label">followers</span></div>
    <div class="stat"><span class="stat-num">${totalStars}</span><span class="stat-label">stars</span></div>
    <div class="stat"><span class="stat-num">${user.following}</span><span class="stat-label">following</span></div>
  `;

  document.getElementById('profileCard').classList.add('show');
}

async function generateRoast(user, repos, events) {
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const forkedRepos = repos.filter(r => r.fork).length;
  const ownRepos = repos.length - forkedRepos;
  const topLangs = [...new Set(repos.filter(r => r.language).map(r => r.language))].slice(0, 5);
  const emptyRepos = repos.filter(r => r.size === 0).length;
  const topRepo = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  const hasProfileReadme = repos.some(r => r.name.toLowerCase() === user.login.toLowerCase());
  const accountAge = user.created_at
    ? Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24 * 365))
    : 0;
  const lastActive = events.length > 0 ? events[0].created_at : null;
  const daysSinceActive = lastActive
    ? Math.floor((Date.now() - new Date(lastActive)) / (1000 * 60 * 60 * 24))
    : 999;

  const profileData = `
Username: ${user.login}
Name: ${user.name || 'Not set'}
Bio: ${user.bio || 'No bio'}
Account age: ${accountAge} years
Public repos: ${user.public_repos} (${ownRepos} original, ${forkedRepos} forked)
Total stars: ${totalStars}
Followers: ${user.followers}
Following: ${user.following}
Empty repos: ${emptyRepos}
Top languages: ${topLangs.join(', ') || 'None detected'}
Best repo: ${topRepo ? `${topRepo.name} with ${topRepo.stargazers_count} stars` : 'None'}
Profile README: ${hasProfileReadme ? 'Yes' : 'No'}
Days since last activity: ${daysSinceActive}
Location: ${user.location || 'Unknown'}
Company: ${user.company || 'None'}
  `.trim();

  const prompt = `You are GitRoast — an AI that roasts GitHub profiles like a Comedy Central roast. Be brutal, funny, and specific. Reference actual numbers.

Profile data:
${profileData}

Respond ONLY in this JSON format, no extra text:
{
  "roast": "2-3 paragraphs of savage, funny roasting. Reference real numbers. Developer humor. No emojis.",
  "feedback": "2-3 genuine tips to improve their GitHub. Start with strengths. Be direct like a senior dev mentor."
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error('AI roast failed. Try again!');

  const data = await response.json();
  hideLoading();

  let parsed;
  try {
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Unexpected AI response. Try again!');
  }

  currentRoast = parsed.roast;
  currentUser = user.login;

  document.getElementById('roastCard').textContent = parsed.roast;
  document.getElementById('feedbackCard').textContent = parsed.feedback;
  document.getElementById('roastOutput').classList.add('show');
}

function copyRoast() {
  navigator.clipboard.writeText(currentRoast).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'copied!';
    setTimeout(() => btn.textContent = 'copy roast', 2000);
  });
}

function shareRoast() {
  const tweet = `Just got roasted by AI on GitRoast 😭🔥\n\nMy GitHub got absolutely destroyed lol\n\nTry yours → gitroast.netlify.app\n\n#GitRoast #GitHub #100DaysOfCode`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
}

document.getElementById('usernameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startRoast();
});