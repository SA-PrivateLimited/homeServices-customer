import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ServiceRequest} from './api/serviceRequestsApi';

// Alias for backward compatibility
type Consultation = ServiceRequest;
import {OPEN_AI_API_KEY} from '@env';

/**
 * RAG Service for Consultation Queries
 * Uses OpenAI embeddings and chat API to answer questions about patient consultations
 */

interface ConsultationEmbedding {
  consultationId: string;
  consultation: Consultation;
  embedding: number[];
  text: string; // Full text representation of consultation
  createdAt: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const EMBEDDING_STORAGE_KEY = 'consultation_embeddings';
const OPENAI_API_URL = 'https://api.openai.com/v1';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';

class RAGService {
  private apiKey: string;

  constructor() {
    // Debug: Log the API key status (without exposing full key)
    const keyValue = OPEN_AI_API_KEY || '';
    this.apiKey = keyValue;
    
    // API key validated silently
  }

  /**
   * Convert consultation to text representation for embedding
   */
  private consultationToText(consultation: Consultation): string {
    const parts: string[] = [];

    parts.push(`Doctor: ${consultation.doctorName}`);
    parts.push(`Specialization: ${consultation.doctorSpecialization || 'Not specified'}`);
    
    if (consultation.scheduledTime) {
      const date = consultation.scheduledTime instanceof Date 
        ? consultation.scheduledTime 
        : new Date(consultation.scheduledTime);
      parts.push(`Scheduled: ${date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`);
    }

    parts.push(`Status: ${consultation.status}`);
    parts.push(`Payment Status: ${consultation.paymentStatus || 'Not specified'}`);
    parts.push(`Fee: ₹${consultation.consultationFee || 0}`);

    if (consultation.symptoms) {
      parts.push(`Symptoms: ${consultation.symptoms}`);
    }

    if (consultation.diagnosis) {
      parts.push(`Diagnosis: ${consultation.diagnosis}`);
    }

    if (consultation.prescription) {
      parts.push(`Prescription: ${consultation.prescription}`);
    }

    if (consultation.doctorNotes) {
      parts.push(`Doctor Notes: ${consultation.doctorNotes}`);
    }

    if (consultation.notes) {
      parts.push(`Patient Notes: ${consultation.notes}`);
    }

    if (consultation.cancellationReason) {
      parts.push(`Cancellation Reason: ${consultation.cancellationReason}`);
    }

    if (consultation.googleMeetLink) {
      parts.push(`Video Call Link: ${consultation.googleMeetLink}`);
    }

    return parts.join('. ');
  }

  /**
   * Get embedding for text using OpenAI API
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get embedding');
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Store consultation embedding in AsyncStorage
   */
  private async storeEmbedding(embedding: ConsultationEmbedding): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(EMBEDDING_STORAGE_KEY);
      const embeddings: ConsultationEmbedding[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing embedding for this consultation if it exists
      const filtered = embeddings.filter(e => e.consultationId !== embedding.consultationId);
      filtered.push(embedding);

      await AsyncStorage.setItem(EMBEDDING_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      throw new Error('Failed to store consultation embedding');
    }
  }

  /**
   * Get all stored embeddings from AsyncStorage
   */
  private async getStoredEmbeddings(): Promise<ConsultationEmbedding[]> {
    try {
      const stored = await AsyncStorage.getItem(EMBEDDING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Index/insert consultations for a patient
   */
  async indexConsultations(consultations: Consultation[]): Promise<void> {
    if (!this.apiKey) {
      return;
    }

    try {
      
      for (const consultation of consultations) {
        try {
          const text = this.consultationToText(consultation);
          const embedding = await this.getEmbedding(text);

          const consultationEmbedding: ConsultationEmbedding = {
            consultationId: consultation.id,
            consultation,
            embedding,
            text,
            createdAt: Date.now(),
          };

          await this.storeEmbedding(consultationEmbedding);
        } catch (error: any) {
          // Continue with other consultations even if one fails
        }
      }

    } catch (error: any) {
      throw new Error(`Failed to index consultations: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant consultations based on query
   */
  private async retrieveRelevantConsultations(
    query: string,
    topK: number = 5,
  ): Promise<ConsultationEmbedding[]> {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      const storedEmbeddings = await this.getStoredEmbeddings();

      // Calculate similarity scores
      const scored = storedEmbeddings.map(embedding => ({
        embedding,
        score: this.cosineSimilarity(queryEmbedding, embedding.embedding),
      }));

      // Sort by score (highest first) and take top K
      scored.sort((a, b) => b.score - a.score);
      const topResults = scored.slice(0, topK).map(item => item.embedding);

      return topResults;
    } catch (error: any) {
      throw new Error(`Failed to retrieve consultations: ${error.message}`);
    }
  }

  /**
   * Answer question about consultations using RAG
   */
  async answerQuestion(query: string, patientName?: string): Promise<{answer: string; needsEscalation: boolean}> {
    if (!this.apiKey) {
      return {
        answer: 'I apologize, but the AI assistant is not available right now. For further assistance, please contact our support team at support@sa-privatelimited.com.',
        needsEscalation: true,
      };
    }

    try {
      // Retrieve relevant consultations
      const relevantConsultations = await this.retrieveRelevantConsultations(query, 5);

      if (relevantConsultations.length === 0) {
        return {
          answer: 'I couldn\'t find any consultations related to your question. Please make sure you have consultations in your history, or try rephrasing your question. If you need further assistance, please contact our support team at support@sa-privatelimited.com.',
          needsEscalation: true,
        };
      }

      // Build context from relevant consultations
      const context = relevantConsultations
        .map((ce, index) => `Consultation ${index + 1}:\n${ce.text}`)
        .join('\n\n---\n\n');

      // Build prompt for OpenAI
      const systemPrompt = `You are a helpful assistant for a healthcare consultation app called HomeServices. You help patients answer questions about their past consultations.

Your role:
- Answer questions clearly and accurately based only on the consultation data provided
- Be empathetic and professional
- If information is not available in the consultations, say so
- Never make up or guess information
- Use natural language with bullet points for clarity
- Use **bold** markers to emphasize important information (like dates, doctor names, amounts, status)
- Format responses as bullet points when listing multiple items
- Format dates and times naturally (e.g., "December 24, 2025 at 4:00 PM")
- Use emojis sparingly and only when helpful
- Make responses easy to read and scan

FORMATTING RULES:
- Use bullet points (- or •) for lists
- Use **text** to bold important information (dates, names, amounts, status)
- DO NOT use markdown headers (###, ##, #)
- DO NOT use code blocks

${patientName ? `The patient's name is ${patientName}.` : ''}`;

      const userPrompt = `Based on the following consultation history, please answer this question clearly and naturally. Use bullet points for lists and **bold** markers to emphasize important details like dates, doctor names, amounts, and status.

Question: ${query}

Consultation History:
${context}

Provide a clear, well-formatted answer with bullet points where helpful and **bold** text for emphasis on key details.`;

      // Call OpenAI Chat API
      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: userPrompt},
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get answer');
      }

      const data = await response.json();
      let answer = data.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate an answer. Please try again.';
      
      // Clean up markdown but keep **bold** markers and bullet points
      answer = answer
        .replace(/###+\s+/g, '')
        .replace(/##+\s+/g, '')
        .replace(/#+\s+/g, '')
        .replace(/\*\*\*(.*?)\*\*\*/g, '**$1**') // Convert *** to **
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim();
      
      // Normalize bullet points
      answer = answer.replace(/^[-*]\s+/gm, '• ');
      
      // Check if answer indicates escalation is needed
      const needsEscalation = this.shouldEscalate(query, answer, relevantConsultations);
      
      return {
        answer: needsEscalation 
          ? `${answer}\n\nIf this doesn't resolve your issue, please contact our support team at support@sa-privatelimited.com for further assistance.`
          : answer,
        needsEscalation,
      };
    } catch (error: any) {
      return {
        answer: `I apologize, but I encountered an error while processing your question: ${error.message}. Please contact our support team at support@sa-privatelimited.com for assistance.`,
        needsEscalation: true,
      };
    }
  }

  /**
   * Determine if a matter should be escalated to human support
   */
  private shouldEscalate(query: string, answer: string, consultations: ConsultationEmbedding[]): boolean {
    const escalationKeywords = [
      'not available',
      'cannot help',
      'unable to',
      'contact support',
      'escalate',
      'complaint',
      'refund',
      'cancellation policy',
      'payment issue',
      'billing',
      'technical issue',
      'error',
      'problem',
      'issue',
      'complaint',
      'dissatisfied',
      'unhappy',
    ];

    const queryLower = query.toLowerCase();
    const answerLower = answer.toLowerCase();

    // Check if query or answer contains escalation keywords
    const hasEscalationKeyword = escalationKeywords.some(keyword => 
      queryLower.includes(keyword) || answerLower.includes(keyword)
    );

    // If no relevant consultations found or confidence seems low
    const hasLowRelevance = consultations.length < 2;

    // If answer is too short or generic
    const hasGenericAnswer = answer.length < 50 || 
      answerLower.includes("i don't know") ||
      answerLower.includes("i'm not sure") ||
      answerLower.includes("unable to determine");

    return hasEscalationKeyword || (hasLowRelevance && hasGenericAnswer);
  }

  /**
   * Clear all stored embeddings (useful for testing or when user logs out)
   */
  async clearEmbeddings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EMBEDDING_STORAGE_KEY);
    } catch (error) {
    }
  }

  /**
   * Get statistics about indexed consultations
   */
  async getIndexStats(): Promise<{count: number; lastIndexed?: Date}> {
    try {
      const embeddings = await this.getStoredEmbeddings();
      const lastIndexed = embeddings.length > 0
        ? new Date(Math.max(...embeddings.map(e => e.createdAt)))
        : undefined;

      return {
        count: embeddings.length,
        lastIndexed,
      };
    } catch (error) {
      return {count: 0};
    }
  }
}

export default new RAGService();

