import { format } from "prettier";

export async function formatTestTypescript(src: string) {
  return await format(src, { parser: "typescript", tabWidth: 2, useTabs: false });
}
