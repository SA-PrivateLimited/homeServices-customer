import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

const {width, height} = Dimensions.get('window');

export interface GuideStep {
  id: string;
  title: string;
  message: string;
  position: {top?: number; bottom?: number; left?: number; right?: number};
  arrowDirection: 'top' | 'bottom' | 'left' | 'right';
}

interface GuideTooltipProps {
  visible: boolean;
  step: GuideStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  onPrevious?: () => void;
}

const GuideTooltip: React.FC<GuideTooltipProps> = ({
  visible,
  step,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  if (!visible) return null;

  const getArrowStyle = () => {
    const arrowSize = 12;
    const arrowStyle: any = {
      position: 'absolute',
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
    };

    switch (step.arrowDirection) {
      case 'top':
        arrowStyle.top = -arrowSize;
        arrowStyle.left = 20;
        arrowStyle.borderLeftWidth = arrowSize;
        arrowStyle.borderRightWidth = arrowSize;
        arrowStyle.borderBottomWidth = arrowSize;
        arrowStyle.borderLeftColor = 'transparent';
        arrowStyle.borderRightColor = 'transparent';
        arrowStyle.borderBottomColor = theme.card;
        break;
      case 'bottom':
        arrowStyle.bottom = -arrowSize;
        arrowStyle.left = 20;
        arrowStyle.borderLeftWidth = arrowSize;
        arrowStyle.borderRightWidth = arrowSize;
        arrowStyle.borderTopWidth = arrowSize;
        arrowStyle.borderLeftColor = 'transparent';
        arrowStyle.borderRightColor = 'transparent';
        arrowStyle.borderTopColor = theme.card;
        break;
      case 'left':
        arrowStyle.left = -arrowSize;
        arrowStyle.top = 20;
        arrowStyle.borderTopWidth = arrowSize;
        arrowStyle.borderBottomWidth = arrowSize;
        arrowStyle.borderRightWidth = arrowSize;
        arrowStyle.borderTopColor = 'transparent';
        arrowStyle.borderBottomColor = 'transparent';
        arrowStyle.borderRightColor = theme.card;
        break;
      case 'right':
        arrowStyle.right = -arrowSize;
        arrowStyle.top = 20;
        arrowStyle.borderTopWidth = arrowSize;
        arrowStyle.borderBottomWidth = arrowSize;
        arrowStyle.borderLeftWidth = arrowSize;
        arrowStyle.borderTopColor = 'transparent';
        arrowStyle.borderBottomColor = 'transparent';
        arrowStyle.borderLeftColor = theme.card;
        break;
    }

    return arrowStyle;
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.tooltipContainer, step.position]}>
          {/* Arrow */}
          <View style={getArrowStyle()} />

          {/* Tooltip Content */}
          <View style={[styles.tooltip, {backgroundColor: theme.card, shadowColor: theme.text}]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Icon name="information-circle" size={20} color={theme.primary} />
                <Text style={[styles.title, {color: theme.text}]}>{step.title}</Text>
              </View>
              <TouchableOpacity onPress={onSkip} style={styles.closeButton}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Message */}
            <Text style={[styles.message, {color: theme.textSecondary}]}>
              {step.message}
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <Text style={[styles.progressText, {color: theme.textSecondary}]}>
                  {currentStep + 1} of {totalSteps}
                </Text>
                <View style={styles.dotsContainer}>
                  {Array.from({length: totalSteps}).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.progressDot,
                        {
                          backgroundColor:
                            index === currentStep ? theme.primary : theme.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Navigation buttons */}
              <View style={styles.buttonsContainer}>
                {currentStep > 0 && onPrevious && (
                  <TouchableOpacity
                    onPress={onPrevious}
                    style={[styles.button, styles.secondaryButton, {borderColor: theme.border}]}>
                    <Text style={[styles.buttonText, {color: theme.text}]}>Back</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onNext}
                  style={[styles.button, styles.primaryButton, {backgroundColor: theme.primary}]}>
                  <Text style={[styles.buttonText, {color: '#fff'}]}>
                    {currentStep === totalSteps - 1 ? 'Got it!' : 'Next'}
                  </Text>
                  {currentStep < totalSteps - 1 && (
                    <Icon name="arrow-forward" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  tooltipContainer: {
    position: 'absolute',
    maxWidth: width - 40,
    minWidth: 280,
  },
  tooltip: {
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    gap: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  primaryButton: {
    minWidth: 80,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GuideTooltip;
