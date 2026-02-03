import chalk from 'chalk';

export const colors = {
  // Status colors
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.gray,

  // Highlights
  primary: chalk.cyan,
  secondary: chalk.magenta,
  highlight: chalk.cyan.bold,

  // Text styles
  bold: chalk.bold,
  italic: chalk.italic,
  underline: chalk.underline,

  // Custom combinations
  header: chalk.cyan.bold,
  subheader: chalk.white.bold,
  label: chalk.gray,
  value: chalk.white,
  path: chalk.cyan,
  command: chalk.yellow,
  agent: chalk.magenta,
  phase: chalk.blue,
};

export function printHeader(text: string): void {
  console.log(colors.header(`\n  ${text}\n`));
}

export function printSuccess(text: string): void {
  console.log(colors.success(`✓ ${text}`));
}

export function printError(text: string): void {
  console.log(colors.error(`✗ ${text}`));
}

export function printWarning(text: string): void {
  console.log(colors.warning(`⚠ ${text}`));
}

export function printInfo(text: string): void {
  console.log(colors.info(`ℹ ${text}`));
}

export function printStep(step: number, total: number, text: string): void {
  console.log(colors.dim(`[${step}/${total}]`) + ` ${text}`);
}

export function printKeyValue(key: string, value: string): void {
  console.log(`  ${colors.label(key + ':')} ${colors.value(value)}`);
}

export function printTable(rows: Array<[string, string]>): void {
  const maxKeyLen = Math.max(...rows.map(([k]) => k.length));
  rows.forEach(([key, value]) => {
    console.log(`  ${colors.label(key.padEnd(maxKeyLen))}  ${colors.value(value)}`);
  });
}
