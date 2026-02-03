import inquirer from 'inquirer';
import { colors } from './colors.js';

export interface SelectOption<T = string> {
  name: string;
  value: T;
  description?: string;
}

/**
 * Prompt for text input
 */
export async function promptText(
  message: string,
  defaultValue?: string
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
    },
  ]);
  return value;
}

/**
 * Prompt for confirmation (yes/no)
 */
export async function promptConfirm(
  message: string,
  defaultValue = false
): Promise<boolean> {
  const { value } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'value',
      message,
      default: defaultValue,
    },
  ]);
  return value;
}

/**
 * Prompt for selection from list
 */
export async function promptSelect<T = string>(
  message: string,
  choices: SelectOption<T>[]
): Promise<T> {
  const { value } = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message,
      choices: choices.map((c) => ({
        name: c.description ? `${c.name} ${colors.dim(`- ${c.description}`)}` : c.name,
        value: c.value,
      })),
    },
  ]);
  return value;
}

/**
 * Prompt for multiple selection
 */
export async function promptMultiSelect<T = string>(
  message: string,
  choices: SelectOption<T>[]
): Promise<T[]> {
  const { value } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'value',
      message,
      choices: choices.map((c) => ({
        name: c.description ? `${c.name} ${colors.dim(`- ${c.description}`)}` : c.name,
        value: c.value,
      })),
    },
  ]);
  return value;
}

/**
 * Prompt for password (hidden input)
 */
export async function promptPassword(message: string): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'password',
      name: 'value',
      message,
      mask: '*',
    },
  ]);
  return value;
}

/**
 * Prompt for editor (opens $EDITOR)
 */
export async function promptEditor(
  message: string,
  defaultValue?: string
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'value',
      message,
      default: defaultValue,
    },
  ]);
  return value;
}

// Alias for promptText
export const promptInput = promptText;
