import matter from "gray-matter";
import type { SkillFrontmatter } from "@/types";

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
}

/**
 * Parse raw SKILL.md content into frontmatter and body.
 * Uses gray-matter for client-side preview rendering.
 */
export function parseSkillContent(raw: string): ParsedSkill {
  const { data, content } = matter(raw);
  return {
    frontmatter: data as SkillFrontmatter,
    body: content,
  };
}

/**
 * Serialize frontmatter and body back into a SKILL.md string.
 * Produces a YAML front-matter block followed by the body.
 */
export function serializeSkillContent(
  frontmatter: SkillFrontmatter,
  body: string
): string {
  return matter.stringify(body, frontmatter as Record<string, unknown>);
}

/**
 * Extract just the description from raw skill content without a full parse.
 * Returns undefined when no description frontmatter key is present.
 */
export function extractDescription(raw: string): string | undefined {
  const parsed = parseSkillContent(raw);
  return parsed.frontmatter.description as string | undefined;
}
