import { generateText } from "ai";
import { getAiModel } from "../config/ai.js";

class AiService {
  async generateReview(systemPrompt, userPrompt) {
    const { text } = await generateText({
      model: getAiModel(),
      system: systemPrompt,
      prompt: userPrompt,
    });
    return text;
  }

  async generateStructuredOutput(systemPrompt, userPrompt) {
    const { text } = await generateText({
      model: getAiModel(),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned);
  }
}

export default AiService;
