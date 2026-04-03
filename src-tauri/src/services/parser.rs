use crate::error::AppError;
use crate::models::skill::SkillFrontmatter;

const FRONTMATTER_MAX_BYTES: usize = 4096;

/// Parse a SKILL.md file's raw content into its frontmatter and body.
///
/// The expected format is:
/// ```text
/// ---
/// description: My skill
/// ---
/// Markdown body here.
/// ```
///
/// Returns `(frontmatter, body)` on success. The body may be empty.
/// Strips a leading BOM (`\u{feff}`) if present.
pub fn parse_skill_content(raw: &str) -> Result<(SkillFrontmatter, String), AppError> {
    // Strip BOM if present.
    let content = raw.strip_prefix('\u{feff}').unwrap_or(raw);

    // Split on `---` delimiters. We need at least three parts:
    // [0] = text before the first `---` (must be empty / whitespace only)
    // [1] = YAML frontmatter
    // [2..] = body parts (joined back together)
    let parts: Vec<&str> = content.splitn(3, "---").collect();

    if parts.len() < 3 || !parts[0].trim().is_empty() {
        return Err(AppError::InvalidInput(
            "SKILL.md is missing valid frontmatter delimiters (`---`)".to_string(),
        ));
    }

    let yaml = parts[1];
    let body_raw = parts[2];

    // Validate byte length of frontmatter.
    let yaml_bytes = yaml.len();
    if yaml_bytes > FRONTMATTER_MAX_BYTES {
        return Err(AppError::FrontmatterTooLarge(yaml_bytes));
    }

    // Deserialize frontmatter.
    let frontmatter: SkillFrontmatter = serde_norway::from_str(yaml)
        .map_err(|e| AppError::YamlParse(e.to_string()))?;

    // Strip the leading newline from the body (the one immediately after the
    // closing `---`).
    let body = body_raw.strip_prefix('\n').unwrap_or(body_raw).to_string();

    Ok((frontmatter, body))
}

/// Serialize a `SkillFrontmatter` and a body back into a SKILL.md string.
pub fn serialize_skill_content(
    frontmatter: &SkillFrontmatter,
    body: &str,
) -> Result<String, AppError> {
    let yaml = serde_norway::to_string(frontmatter)
        .map_err(|e| AppError::YamlParse(e.to_string()))?;

    let result = if body.is_empty() {
        format!("---\n{}---\n", yaml)
    } else {
        format!("---\n{}---\n{}", yaml, body)
    };

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_skill() {
        let raw = "---\ndescription: My skill\n---\nDo something useful.\n";
        let (fm, body) = parse_skill_content(raw).expect("should parse");
        assert_eq!(fm.description.as_deref(), Some("My skill"));
        assert_eq!(body, "Do something useful.\n");
    }

    #[test]
    fn parse_missing_frontmatter() {
        let raw = "Just some markdown without delimiters.\n";
        let err = parse_skill_content(raw).expect_err("should fail");
        assert!(
            matches!(err, AppError::InvalidInput(_)),
            "expected InvalidInput, got {err:?}"
        );
    }

    #[test]
    fn parse_empty_body() {
        let raw = "---\ndescription: No body here\n---\n";
        let (fm, body) = parse_skill_content(raw).expect("should parse");
        assert_eq!(fm.description.as_deref(), Some("No body here"));
        assert_eq!(body, "");
    }

    #[test]
    fn parse_with_all_optional_fields() {
        let raw = "\
---
description: Full skill
user-invocable: true
argument-hint: \"<query>\"
allowed-tools:
  - Bash
  - Read
license: MIT
---
Body text.
";
        let (fm, body) = parse_skill_content(raw).expect("should parse");
        assert_eq!(fm.description.as_deref(), Some("Full skill"));
        assert_eq!(fm.user_invocable, Some(true));
        assert_eq!(fm.argument_hint.as_deref(), Some("<query>"));
        assert_eq!(
            fm.allowed_tools.as_deref(),
            Some(&["Bash".to_string(), "Read".to_string()][..])
        );
        // "license" is not a named field so it lands in metadata.
        assert!(fm.metadata.contains_key("license"));
        assert_eq!(body, "Body text.\n");
    }

    #[test]
    fn serialize_round_trip() {
        let raw = "\
---
description: Round-trip skill
user-invocable: true
argument-hint: \"<q>\"
---
Some body content.
";
        let (fm1, body1) = parse_skill_content(raw).expect("initial parse");
        let serialized = serialize_skill_content(&fm1, &body1).expect("serialize");
        let (fm2, body2) = parse_skill_content(&serialized).expect("re-parse");

        assert_eq!(fm1.description, fm2.description);
        assert_eq!(fm1.user_invocable, fm2.user_invocable);
        assert_eq!(fm1.argument_hint, fm2.argument_hint);
        assert_eq!(fm1.allowed_tools, fm2.allowed_tools);
        assert_eq!(body1, body2);
    }

    #[test]
    fn parse_bom_prefixed_file() {
        let raw = "\u{feff}---\ndescription: BOM file\n---\nContent.\n";
        let (fm, body) = parse_skill_content(raw).expect("should handle BOM");
        assert_eq!(fm.description.as_deref(), Some("BOM file"));
        assert_eq!(body, "Content.\n");
    }

    #[test]
    fn parse_frontmatter_too_large() {
        let big_desc = "x".repeat(4097);
        let raw = format!("---\ndescription: {big_desc}\n---\nBody.\n");
        let err = parse_skill_content(&raw).expect_err("should fail for large frontmatter");
        assert!(
            matches!(err, AppError::FrontmatterTooLarge(_)),
            "expected FrontmatterTooLarge, got {err:?}"
        );
    }
}
