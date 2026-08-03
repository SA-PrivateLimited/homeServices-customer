/**
 * Help/support answers — local stub (Firebase RAG removed).
 */

const ragService = {
  async getIndexStats() {
    return {indexed: 0, ready: false};
  },
  async indexConsultations(_items: any[]) {
    return {indexed: 0};
  },
  async answerQuestion(question: string, _userName?: string) {
    return {
      answer:
        'Support chat is temporarily limited. Please contact admin from Settings → Help, or email support.',
      sources: [],
      question,
    };
  },
};

export default ragService;
