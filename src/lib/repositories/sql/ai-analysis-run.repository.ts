import { run } from "@/lib/db";
import type {
  CreateAIAnalysisRunInput,
  IAIAnalysisRunRepository,
} from "../interfaces/ai-analysis-run.repository";

export class AIAnalysisRunRepository implements IAIAnalysisRunRepository {
  async create(input: CreateAIAnalysisRunInput): Promise<void> {
    await run(
      "INSERT INTO ai_analysis_runs (user_id, analysis_type, month, prompt_template_id, prompt_version, input_json, input_text, output_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.userId,
        input.analysisType,
        input.month,
        input.promptTemplateId,
        input.promptVersion,
        JSON.stringify(input.inputJson ?? {}),
        input.inputText ?? "",
        input.outputText,
      ]
    );
  }
}
