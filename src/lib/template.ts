/** Fills {name} placeholders from `vars`. A placeholder with no value becomes empty text. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}
