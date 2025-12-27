import React from 'react';
import {Text, StyleSheet} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface FormattedTextProps {
  text: string;
  style?: any;
}

/**
 * Component to render formatted text with bold markers and bullet points
 * Supports **bold** markers for emphasis and bullet points
 */
const FormattedText: React.FC<FormattedTextProps> = ({text, style}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Parse text with **bold** markers and bullet points
  const parseText = (input: string): React.ReactNode[] => {
    if (!input) return [];
    
    const parts: React.ReactNode[] = [];
    const lines = input.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // Check if line is a bullet point (supports •, -, *)
      const bulletMatch = line.match(/^[•\-\*]\s+(.+)$/);
      
      if (bulletMatch) {
        // Render as bullet point
        const lineContent = bulletMatch[1];
        const boldParts = parseBoldText(lineContent, theme, style);
        
        parts.push(
          <Text key={`line-${lineIndex}`}>
            <Text style={{color: theme.primary, fontWeight: '700'}}>• </Text>
            {boldParts}
            {lineIndex < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      } else if (line.trim()) {
        // Regular line with potential bold text
        const boldParts = parseBoldText(line, theme, style);
        parts.push(
          <Text key={`line-${lineIndex}`}>
            {boldParts}
            {lineIndex < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      } else if (lineIndex < lines.length - 1) {
        // Empty line for spacing
        parts.push(<Text key={`spacer-${lineIndex}`}>{'\n'}</Text>);
      }
    });
    
    return parts;
  };

  // Helper function to parse bold text within a line
  const parseBoldText = (text: string, theme: any, baseStyle: any): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    let keyIndex = 0;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${keyIndex++}`} style={[{color: theme.text}, baseStyle]}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }
      
      // Add bold text
      parts.push(
        <Text
          key={`bold-${keyIndex++}`}
          style={[
            {fontWeight: '700', color: theme.text},
            baseStyle,
          ]}>
          {match[1]}
        </Text>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key={`text-${keyIndex++}`} style={[{color: theme.text}, baseStyle]}>
          {text.substring(lastIndex)}
        </Text>
      );
    }
    
    return parts.length > 0 ? parts : [<Text key="default" style={[{color: theme.text}, baseStyle]}>{text}</Text>];
  };

  return (
    <Text style={[{color: theme.text}, style]}>
      {parseText(text)}
    </Text>
  );
};

const styles = StyleSheet.create({
  // Styles are applied inline for better control
});

export default FormattedText;

