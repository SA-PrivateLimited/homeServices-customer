import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import type {AppNotification} from '../store';

interface NotificationsScreenProps {
  navigation: any;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  navigation,
}) => {
  const {
    isDarkMode,
    notifications,
    currentUser,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter notifications for current user
  const userNotifications = currentUser?.id 
    ? getUserNotifications(currentUser.id)
    : [];

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh notifications if needed
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleNotificationPress = (notification: AppNotification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    // Navigate based on notification type
    // Use getParent() to navigate to root navigator, then to the correct tab
    if (notification.consultationId) {
      try {
        // Try to navigate to ConsultationsHistory in the ConsultationsStack
        const parent = navigation.getParent();
        if (parent) {
          // Navigate to Consultations tab first, then to ConsultationsHistory
          parent.navigate('Consultations', {
            screen: 'ConsultationsHistory',
            params: {consultationId: notification.consultationId},
          });
        } else {
          // Fallback: navigate to Consultations tab
          navigation.navigate('Consultations');
        }
      } catch (error) {
        // Fallback: just navigate to Consultations tab
        navigation.navigate('Consultations');
      }
    } else if (notification.prescriptionId) {
      // Navigate to Consultations tab
      try {
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Consultations');
        } else {
          navigation.navigate('Consultations');
        }
      } catch (error) {
        navigation.navigate('Consultations');
      }
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'consultation':
        return 'medical-outline';
      case 'prescription':
        return 'document-text-outline';
      case 'reminder':
        return 'time-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotification = ({item}: {item: AppNotification}) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: item.read ? theme.card : theme.primary + '10',
          borderLeftColor: item.read ? 'transparent' : theme.primary,
        },
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}>
      <View style={styles.notificationContent}>
        <View
          style={[
            styles.iconContainer,
            {backgroundColor: theme.primary + '20'},
          ]}>
          <Icon
            name={getNotificationIcon(item.type)}
            size={24}
            color={theme.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontWeight: item.read ? 'normal' : '600',
              },
            ]}>
            {item.title}
          </Text>
          <Text style={[styles.message, {color: theme.textSecondary}]}>
            {item.message}
          </Text>
          <Text style={[styles.time, {color: theme.textSecondary}]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {!item.read && (
          <View style={[styles.unreadDot, {backgroundColor: theme.primary}]} />
        )}
        <TouchableOpacity
          onPress={() => deleteNotification(item.id)}
          style={styles.deleteButton}>
          <Icon name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = userNotifications.filter(n => !n.read).length;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {userNotifications.length > 0 && (
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            },
          ]}>
          <TouchableOpacity
            onPress={() => markAllNotificationsAsRead(currentUser?.id)}
            disabled={unreadCount === 0}
            style={[
              styles.headerButton,
              {opacity: unreadCount === 0 ? 0.5 : 1},
            ]}>
            <Text style={[styles.headerButtonText, {color: theme.primary}]}>
              Mark all as read
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => clearAllNotifications(currentUser?.id)}
            style={styles.headerButton}>
            <Text style={[styles.headerButtonText, {color: theme.error}]}>
              Clear all
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {userNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-off-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
            No notifications
          </Text>
        </View>
      ) : (
        <FlatList
          data={userNotifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default NotificationsScreen;

