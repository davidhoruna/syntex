/**
 * Script to install required LangChain packages
 * Run with: node setup-langchain.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Print header
console.log(`\n${colors.bright}${colors.cyan}=======================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}  LangChain Setup for Syntex          ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}=======================================${colors.reset}\n`);

console.log(`${colors.bright}Installing required packages...${colors.reset}\n`);

try {
  // Install primary packages
  console.log(`${colors.yellow}Installing langchain packages...${colors.reset}`);
  execSync('npm install langchain@0.0.201 @langchain/openai@0.0.16 @langchain/community@0.0.28', { stdio: 'inherit' });
  
  // Install PDF parsing dependencies
  console.log(`\n${colors.yellow}Installing PDF parsing dependencies...${colors.reset}`);
  execSync('npm install pdf-parse@1.1.1', { stdio: 'inherit' });
  
  console.log(`\n${colors.green}${colors.bright}All packages installed successfully!${colors.reset}\n`);
  
  // Create .env file if it doesn't exist
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.yellow}Creating .env.local file...${colors.reset}`);
    fs.writeFileSync(envPath, 'OPENAI_API_KEY=\n');
    console.log(`${colors.green}Created .env.local file. Please add your OpenAI API key.${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}.env.local file already exists. Please ensure OPENAI_API_KEY is set.${colors.reset}\n`);
  }
  
  console.log(`${colors.bright}${colors.green}Setup completed successfully!${colors.reset}`);
  console.log(`${colors.cyan}Next steps:${colors.reset}`);
  console.log(`${colors.cyan}1. Make sure OPENAI_API_KEY is set in your .env.local file${colors.reset}`);
  console.log(`${colors.cyan}2. Update the langchain-utils.ts file with proper imports${colors.reset}`);
  console.log(`${colors.cyan}3. Test the PDF extraction with a sample document${colors.reset}\n`);
  
} catch (error) {
  console.error(`\n${colors.red}${colors.bright}Error during setup:${colors.reset}`, error.message);
  console.error(`\n${colors.yellow}Please try installing the packages manually:${colors.reset}`);
  console.error(`npm install langchain@0.0.201 @langchain/openai@0.0.16 @langchain/community@0.0.28 pdf-parse@1.1.1\n`);
} 