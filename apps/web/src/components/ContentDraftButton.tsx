/**
 * @deprecated Prefer AiGeneratePostfixButton / AiPostfixField / TipTap `aiDraft`.
 * Kept only so older imports resolve during migration; renders nothing.
 */
export function ContentDraftButton(_props: Record<string, unknown>) {
  return null;
}

export {
  AiGeneratePostfixButton,
  AiPostfixField,
  type AiDraftTarget,
} from "./AiGeneratePostfixButton";
