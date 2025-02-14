require('dotenv').config();
const axios = require('axios');

// Load environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SOURCE_REPO = process.env.SOURCE_REPO;
const DEST_REPO = process.env.DEST_REPO;

if (!GITHUB_TOKEN || !SOURCE_REPO || !DEST_REPO) {
  console.error('❌ Missing required environment variables. Check your .env file.');
  process.exit(1);
}

const HEADERS = {
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
};

const GITHUB_API = 'https://api.github.com/repos';

async function copyLabels() {
  try {
    // Get labels from the destination repo
    const { data: existingLabels } = await axios.get(`${GITHUB_API}/${DEST_REPO}/labels`, HEADERS);
    const existingLabelNames = existingLabels.map(label => label.name);

    // Get labels from the source repo
    const { data: sourceLabels } = await axios.get(`${GITHUB_API}/${SOURCE_REPO}/labels`, HEADERS);

    for (const label of sourceLabels) {
      if (existingLabelNames.includes(label.name)) {
        console.log(`🔄 Skipping existing label: ${label.name}`);
        continue;
      } else {
        // Create a new label
        await axios.post(`${GITHUB_API}/${DEST_REPO}/labels`, {
          name: label.name,
          color: label.color,
          description: label.description || '',
        }, HEADERS);
        console.log(`✅ Created label: ${label.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error copying labels:', error.response?.data || error.message);
  }
}

async function copyMilestones() {
  try {
    const { data: milestones } = await axios.get(`${GITHUB_API}/${SOURCE_REPO}/milestones`, HEADERS);
    for (const milestone of milestones) {
      await axios.post(`${GITHUB_API}/${DEST_REPO}/milestones`, {
        title: milestone.title,
        state: milestone.state,
        description: milestone.description || '',
        due_on: milestone.due_on,
      }, HEADERS);
      console.log(`✅ Milestone copied: ${milestone.title}`);
    }
  } catch (error) {
    console.error('❌ Error copying milestones:', error.response?.data || error.message);
  }
}

async function copyIssues() {
  try {
    const { data: issues } = await axios.get(`${GITHUB_API}/${SOURCE_REPO}/issues?state=open`, HEADERS);
    for (const issue of issues) {
      // Exclude pull requests
      if (issue.pull_request) continue;

      await axios.post(`${GITHUB_API}/${DEST_REPO}/issues`, {
        title: issue.title,
        body: issue.body || '',
        labels: issue.labels.map(l => l.name),
        milestone: issue.milestone ? issue.milestone.number : null,
      }, HEADERS);
      console.log(`✅ Issue copied: ${issue.title}`);
    }
  } catch (error) {
    console.error('❌ Error copying issues:', error.response?.data || error.message);
  }
}

// Run all functions sequentially
async function duplicateRepo() {
  console.log('🚀 Starting repository duplication...');
  await copyLabels();
  await copyMilestones();
  await copyIssues();
  console.log('✅ Repository duplication completed successfully!');
}

// Execute the script
duplicateRepo();
