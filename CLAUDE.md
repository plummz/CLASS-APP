# IMPORTANT
Always read this file first before making any changes to the repository.

# CLAUDE.md

## Project Rule
This is the CLASS-APP repository. Always read this file first before making changes.

## Main Instruction
Whenever you update, fix, or add any app feature, also update the in-app **Software Update** feature/page so users can see what changed.

Every update entry should include:
- Update title
- Date
- Short changelog
- Fixed bugs
- New features
- Improved features

Do not skip the Software Update entry unless the change is only a comment or non-user-facing cleanup.

## Code Safety Rules
Before finishing any task:
- Check if the code runs without syntax errors
- Check for broken imports or missing files
- Check for broken buttons, navigation, and event listeners
- Check responsive layout on mobile
- Check for duplicated UI/components
- Check localStorage/database logic if affected
- Check possible edge-case bugs, not only obvious bugs

## Do Not Break Working Features
- Do not rewrite working systems unless necessary
- Do not delete working code without explaining why
- Prefer small, safe changes
- Continue existing implementation instead of restarting
- Preserve current UI/UX unless the task says to redesign it

## Development Flow
For every task:
1. Inspect existing files first
2. Find the correct file before editing
3. Reuse existing patterns
4. Implement the requested change
5. Test or reason through functionality
6. Update Software Update feature
7. Summarize files changed and possible risks

## Token-Saving Context
Assume these app priorities unless told otherwise:
- Mobile-first
- Android-friendly
- PWA-friendly
- Glassmorphism / premium futuristic UI
- Avoid messy layouts
- Keep features organized by folders
- Keep HTML mostly in index.html when requested
- Put feature CSS/JS in their own folders
- Do not over-explain simple changes
- Be direct and implementation-focused

## Output Format
After every coding task, respond with:
- Files changed
- What was added/fixed
- Software Update entry added
- Bugs checked
- Remaining risks or limitations
