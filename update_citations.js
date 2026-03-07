/**
 * update_citations.js
 *
 * Fetches citation counts from SerpAPI Google Scholar Author API
 * and writes them to citations.json for the personal portfolio page.
 *
 * Usage:
 *   set SERPAPI_KEY=your_api_key_here
 *   node update_citations.js
 *
 * Environment variables:
 *   SERPAPI_KEY  — Your SerpAPI API key (required)
 *
 * Configuration:
 *   AUTHOR_ID   — Google Scholar author_id (set below)
 *   PAPER_TITLES — List of paper titles to match (set below)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION — Update these values
// ============================================================

// Your Google Scholar author_id from your profile URL:
// https://scholar.google.com/citations?user=YOUR_AUTHOR_ID
const AUTHOR_ID = 'R5bjV1oAAAAJ';

// Paper titles to look up — these must (partially) match the titles
// returned by Google Scholar. Matching is case-insensitive.
const PAPER_TITLES = [
     'VisualCodeMOOC',
     'Patch-Based Multi-Level Attention Mechanism for Few-Shot Multi-Label Medical Image Classification',
     'Cervical Spine Fracture Detection Through Two-Stage Approach',
];

// ============================================================
// IMPLEMENTATION
// ============================================================

function fetchJSON(url) {
     return new Promise((resolve, reject) => {
          https.get(url, (res) => {
               let data = '';
               res.on('data', (chunk) => { data += chunk; });
               res.on('end', () => {
                    try {
                         resolve(JSON.parse(data));
                    } catch (e) {
                         reject(new Error('Failed to parse JSON: ' + data.substring(0, 200)));
                    }
               });
          }).on('error', reject);
     });
}

function matchTitle(scholarTitle, searchTitle) {
     const sTitleLower = scholarTitle.toLowerCase();
     const searchLower = searchTitle.toLowerCase();
     // Check if search title is contained in the scholar title, or vice versa
     return sTitleLower.includes(searchLower) || searchLower.includes(sTitleLower);
}

async function main() {
     const apiKey = process.env.SERPAPI_KEY;
     if (!apiKey) {
          console.error('Error: SERPAPI_KEY environment variable is not set.');
          console.error('Usage: set SERPAPI_KEY=your_key && node update_citations.js');
          process.exit(1);
     }

     if (AUTHOR_ID === 'YOUR_AUTHOR_ID_HERE') {
          console.error('Error: Please set your Google Scholar AUTHOR_ID in update_citations.js');
          console.error('Find it at: https://scholar.google.com/citations?user=YOUR_ID');
          process.exit(1);
     }

     console.log(`Fetching citations for author: ${AUTHOR_ID}`);

     const url = `https://serpapi.com/search.json?engine=google_scholar_author&author_id=${AUTHOR_ID}&hl=en&num=100&api_key=${apiKey}`;

     try {
          const data = await fetchJSON(url);

          if (data.error) {
               console.error('SerpAPI error:', data.error);
               process.exit(1);
          }

          const articles = data.articles || [];
          console.log(`Found ${articles.length} articles on Google Scholar profile.`);

          const results = [];

          for (const searchTitle of PAPER_TITLES) {
               const matched = articles.find(a => matchTitle(a.title, searchTitle));
               if (matched) {
                    const citations = matched.cited_by ? matched.cited_by.value : 0;
                    console.log(`  ✓ "${matched.title}" — ${citations} citations`);
                    results.push({
                         title: matched.title,
                         search_key: searchTitle,
                         citations: citations,
                    });
               } else {
                    console.log(`  ✗ No match found for: "${searchTitle}"`);
                    results.push({
                         title: searchTitle,
                         search_key: searchTitle,
                         citations: null,
                    });
               }
          }

          // Also extract author-level stats if available
          const citedBy = data.cited_by || {};
          const authorStats = {};
          if (citedBy.table && citedBy.table.length > 0) {
               for (const row of citedBy.table) {
                    for (const [key, val] of Object.entries(row)) {
                         authorStats[key] = val;
                    }
               }
          }

          const output = {
               last_updated: new Date().toISOString(),
               author_id: AUTHOR_ID,
               author_stats: authorStats,
               articles: results,
          };

          const outPath = path.join(__dirname, 'citations.json');
          fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
          console.log(`\nWrote citation data to ${outPath}`);

     } catch (err) {
          console.error('Failed to fetch citations:', err.message);
          process.exit(1);
     }
}

main();
