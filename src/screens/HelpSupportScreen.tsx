import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import ragService from '../services/ragService';
import consultationService from '../services/consultationService';
import {OPEN_AI_API_KEY} from '@env';
import FormattedText from '../components/FormattedText';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  needsEscalation?: boolean;
}

const HelpSupportScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {isDarkMode, currentUser, consultations} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStats, setIndexStats] = useState<{count: number; lastIndexed?: Date}>({count: 0});
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Check if API key is configured
    if (!OPEN_AI_API_KEY) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: '⚠️ OpenAI API key is not configured. Please add OPEN_AI_API_KEY to your .env file and rebuild the app to enable the AI assistant.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Initial greeting
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '👋 Hello! I\'m your consultation assistant. I can help you answer questions about your past consultations, appointments, prescriptions, and more. What would you like to know?',
        timestamp: new Date(),
      },
    ]);

    // Load index stats
    loadIndexStats();

    // Index consultations if available
    if (currentUser && consultations.length > 0) {
      indexConsultations();
    }
  }, [currentUser, consultations]);

  const loadIndexStats = async () => {
    try {
      const stats = await ragService.getIndexStats();
      setIndexStats(stats);
    } catch (error) {
    }
  };

  const indexConsultations = async () => {
    if (!currentUser || consultations.length === 0 || !OPEN_AI_API_KEY) {
      return;
    }

    setIsIndexing(true);
    try {
      await ragService.indexConsultations(consultations);
      await loadIndexStats();
    } catch (error: any) {
      addMessage('assistant', `⚠️ Failed to index consultations: ${error.message}. Some features may not work correctly.`);
    } finally {
      setIsIndexing(false);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string, isLoading = false, needsEscalation = false) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role,
      content,
      timestamp: new Date(),
      isLoading,
      needsEscalation,
    };
    setMessages(prev => [...prev, message]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  const handleContactSupport = () => {
    const supportEmail = 'support@sa-privatelimited.com';
    const subject = encodeURIComponent('HomeServices Support Request');
    const body = encodeURIComponent(
      `Dear Support Team,\n\nI need assistance with the following:\n\n[Please describe your issue here]\n\nThank you.\n\n---\nPatient: ${currentUser?.name || 'User'}\nEmail: ${currentUser?.email || 'N/A'}`
    );
    const mailtoLink = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    Linking.canOpenURL(mailtoLink)
      .then(supported => {
        if (supported) {
          return Linking.openURL(mailtoLink);
        } else {
          Alert.alert(
            'Email Not Available',
            `Please send an email to ${supportEmail} with your query.`,
            [{text: 'OK'}]
          );
        }
      })
      .catch(err => {
        Alert.alert(
          'Email Not Available',
          `Please send an email to ${supportEmail} with your query.`,
          [{text: 'OK'}]
        );
      });
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !OPEN_AI_API_KEY) {
      return;
    }

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);

    setIsLoading(true);
    addMessage('assistant', '', true); // Loading message

    try {
      const result = await ragService.answerQuestion(userMessage, currentUser?.name);
      
      // Keep formatting for bullet points and bold text (don't strip ** markers)
      let cleanedAnswer = result.answer
        .replace(/###+\s+/g, '')
        .replace(/##+\s+/g, '')
        .replace(/#+\s+/g, '')
        .replace(/\*\*\*(.*?)\*\*\*/g, '**$1**')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Normalize bullet points
      cleanedAnswer = cleanedAnswer.replace(/^[-*]\s+/gm, '• ');
      
      // Remove loading message and add response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [
          ...filtered,
          {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: cleanedAnswer,
            timestamp: new Date(),
            needsEscalation: result.needsEscalation,
          },
        ];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    } catch (error: any) {
      // Remove loading message and add error
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [
          ...filtered,
          {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: `I apologize, but I encountered an error: ${error.message}. Please contact our support team at support@sa-privatelimited.com for assistance.`,
            timestamp: new Date(),
            needsEscalation: true,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({item}: {item: ChatMessage}) => {
    const isUser = item.role === 'user';
    
    if (item.isLoading) {
      return (
        <View style={[styles.messageContainer, styles.assistantMessage]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loadingText, {color: theme.textSecondary}]}>Thinking...</Text>
        </View>
      );
    }

    return (
      <View>
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessage : styles.assistantMessage,
            isUser
              ? {backgroundColor: theme.primary, alignSelf: 'flex-end'}
              : {backgroundColor: theme.card, alignSelf: 'flex-start'},
          ]}>
          {isUser ? (
            <Text
              style={[
                styles.messageText,
                {color: '#FFFFFF'},
              ]}
              selectable>
              {item.content}
            </Text>
          ) : (
            <FormattedText
              text={item.content}
              style={styles.messageText}
            />
          )}
          <Text
            style={[
              styles.timestamp,
              {color: isUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary},
            ]}>
            {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
        {item.needsEscalation && !isUser && (
          <TouchableOpacity
            style={[styles.escalationButton, {backgroundColor: theme.primary}]}
            onPress={handleContactSupport}
            activeOpacity={0.8}>
            <Icon name="mail-outline" size={18} color="#FFFFFF" />
            <Text style={styles.escalationButtonText}>Contact Support</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, {color: theme.text}]}>Help & Support</Text>
          {isIndexing ? (
            <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
              Indexing consultations...
            </Text>
          ) : indexStats.count > 0 ? (
            <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
              {indexStats.count} consultation{indexStats.count !== 1 ? 's' : ''} indexed
            </Text>
          ) : (
            <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
              AI Assistant
            </Text>
          )}
        </View>
        {consultations.length > 0 && (
          <TouchableOpacity
            onPress={indexConsultations}
            style={styles.refreshButton}
            disabled={isIndexing}>
            <Icon
              name="refresh"
              size={24}
              color={isIndexing ? theme.textSecondary : theme.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: true})}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chatbubbles-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
              Start a conversation
            </Text>
          </View>
        }
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, {backgroundColor: theme.card, borderTopColor: theme.border}]}>
        {!OPEN_AI_API_KEY && (
          <View style={[styles.warningBanner, {backgroundColor: '#FFF3CD', borderLeftColor: '#FFC107'}]}>
            <Icon name="warning" size={20} color="#856404" />
            <Text style={[styles.warningText, {color: '#856404'}]}>
              OpenAI API key not configured
            </Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Ask about your consultations..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading && !!OPEN_AI_API_KEY}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: isLoading || !inputText.trim() || !OPEN_AI_API_KEY
                  ? theme.border
                  : theme.primary,
              },
            ]}
            onPress={handleSend}
            disabled={isLoading || !inputText.trim() || !OPEN_AI_API_KEY}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Icon name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userMessage: {
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingText: {
    fontSize: 13,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  warningText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  escalationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  escalationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HelpSupportScreen;

