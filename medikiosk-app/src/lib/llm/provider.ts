export interface ConversationTurnInput {
  questionText: string;
  answerText: string;
  isFollowUp: boolean;
}

export interface FollowUpInput {
  languageCode: string;
  rootQuestionText: string;
  rootQuestionCode: string;
  followUpStrategy: "LLM_ADAPTIVE" | "SOCRATES";
  priorTurns: ConversationTurnInput[];
  followUpsSoFar: number;
  maxFollowUps: number;
}

export interface FollowUpResult {
  questionText: string;
  redFlag: boolean;
  redFlagReason?: string;
}

export interface SummarizeInput {
  languageCode: string;
  turns: ConversationTurnInput[];
  documentTexts: { docType: string; text: string }[];
}

export interface StructuredReportContent {
  chiefComplaint: string;
  hpi: string;
  pastMedical: string;
  drugAllergy: string;
  family: string;
  personal: string;
  ros: string;
  priorInvestigations: string;
}

export interface LlmProvider {
  generateFollowUp(input: FollowUpInput): Promise<FollowUpResult | null>;
  summarizeSession(input: SummarizeInput): Promise<StructuredReportContent>;
}
