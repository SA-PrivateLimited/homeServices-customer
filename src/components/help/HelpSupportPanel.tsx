import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button, Icon} from 'sapvt-ltd-app-packages';
import {useTranslation} from 'react-i18next';
import {
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
  WHATSAPP_SUPPORT_URL,
} from '../../config/support';
import AlertModal from '../AlertModal';
import {openExternalUrl} from '../../utils/openExternalUrl';
import {dispatchHelpAction} from './helpActions';
import {
  useHelpRequestCandidates,
  useHelpRequestSnapshot,
  useSetHelpRequestSnapshot,
} from './helpRequestContext';
import {type HelpSurface} from './helpSurface';
import {
  buildHelpGroups,
  contextualGroupLead,
  type HelpGroup,
  type HelpSubTopic,
} from './helpTopics';
import {HelpFeedbackForm} from './HelpFeedbackForm';

type ViewState =
  | {level: 'home'}
  | {level: 'group'; group: HelpGroup}
  | {level: 'detail'; group: HelpGroup; sub: HelpSubTopic};

function splitTips(raw: string): string[] {
  return raw
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);
}

type Props = {
  surfaceOverride?: HelpSurface;
  onHistory?: boolean;
  /** Notify parent when feedback sub-screen opens (for modal title chrome). */
  onFeedbackOpenChange?: (open: boolean) => void;
};

/**
 * Context-aware Help & Support — web HelpSupportPanel parity:
 * compact topics, contact footer, quiet feedback link.
 */
export function HelpSupportPanel({
  surfaceOverride = 'settings',
  onHistory = false,
  onFeedbackOpenChange,
}: Props) {
  const {t, i18n} = useTranslation();
  const request = useHelpRequestSnapshot();
  const candidates = useHelpRequestCandidates();
  const setRequestSnapshot = useSetHelpRequestSnapshot();
  const [view, setView] = useState<ViewState>({level: 'home'});
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [pickingRequest, setPickingRequest] = useState(false);
  const [linkAlert, setLinkAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({visible: false, title: '', message: ''});

  const setFeedback = (open: boolean) => {
    setFeedbackOpen(open);
    onFeedbackOpenChange?.(open);
  };

  useEffect(() => {
    if (!onHistory) {
      setPickingRequest(false);
      return;
    }
    if (request) {
      setPickingRequest(false);
      return;
    }
    if (candidates.length === 1) {
      setRequestSnapshot(candidates[0]);
      setPickingRequest(false);
      return;
    }
    if (candidates.length > 1) {
      setPickingRequest(true);
    }
  }, [onHistory, request, candidates, setRequestSnapshot]);

  const groups = useMemo(
    () => buildHelpGroups(surfaceOverride, request),
    [surfaceOverride, request],
  );
  const contextLead = contextualGroupLead(surfaceOverride, request);
  const hoursLabel = i18n.language?.startsWith('hi')
    ? t('shell.hoursHi')
    : t('shell.hoursEn');

  const showLinkError = (title: string, message: string) => {
    setLinkAlert({visible: true, title, message});
  };

  const openWhatsApp = (prefill?: string) => {
    const text = prefill ? `?text=${encodeURIComponent(prefill)}` : '';
    void openExternalUrl(`${WHATSAPP_SUPPORT_URL}${text}`).then(ok => {
      if (!ok) {
        showLinkError(
          String(t('help.chatWhatsApp')),
          String(
            t('help.unableToOpenWhatsApp') ||
              "WhatsApp isn't available on this device.",
          ),
        );
      }
    });
  };

  const openSupportCall = () => {
    void openExternalUrl(SUPPORT_PHONE_TEL).then(ok => {
      if (!ok) {
        showLinkError(
          String(t('help.callSupport')),
          String(
            t('help.unableToMakeCall') ||
              t('settings.unableToMakeCall') ||
              "Calling isn't available on this device.",
          ),
        );
      }
    });
  };

  const linkAlertModal = (
    <AlertModal
      visible={linkAlert.visible}
      title={linkAlert.title}
      message={linkAlert.message}
      type="warning"
      onClose={() => setLinkAlert({visible: false, title: '', message: ''})}
    />
  );

  const buildWaPrefill = (topicLabel: string) => {
    const parts = [topicLabel, String(t('help.whatsappPrefill'))];
    if (request?.serviceType) {
      parts.unshift(
        `${request.serviceType}${request.locationLabel ? ` · ${request.locationLabel}` : ''}`,
      );
    }
    return parts.join(' — ');
  };

  const runSubAction = (sub: HelpSubTopic) => {
    if (sub.action === 'cancel-request') {
      if (onHistory && request?.requestId) {
        dispatchHelpAction({type: 'open-request', requestId: request.requestId});
        return;
      }
      dispatchHelpAction({type: 'cancel-request'});
      return;
    }
    if (sub.action === 'edit-request' && request?.requestId) {
      dispatchHelpAction({type: 'edit-request', requestId: request.requestId});
      return;
    }
    if (sub.action === 'open-browse') {
      dispatchHelpAction({type: 'open-browse'});
    }
  };

  const contactButtons = (topicLabel: string) => (
    <View style={styles.contactActions}>
      <Button
        variant="primary"
        block
        onPress={() => openWhatsApp(buildWaPrefill(topicLabel))}>
        {t('help.chatWhatsApp')}
      </Button>
      <Button
        variant="secondary"
        block
        onPress={openSupportCall}>
        {t('help.callSupport')}
      </Button>
    </View>
  );

  const showRequestPicker =
    onHistory && (pickingRequest || (!request && candidates.length > 1));

  if (showRequestPicker) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.lead}>{t('help.pickRequestTitle')}</Text>
        <Text style={styles.pickerHint}>{t('help.pickRequestSkipHint')}</Text>
        {candidates.map(item => (
          <Pressable
            key={item.requestId}
            style={styles.row}
            onPress={() => {
              setRequestSnapshot(item);
              setPickingRequest(false);
              setView({level: 'home'});
            }}>
            <Icon name="assignment" size={18} />
            <View style={styles.copy}>
              <Text style={styles.strong}>
                {[item.serviceType, item.locationLabel]
                  .filter(Boolean)
                  .join(' · ') || t('help.pickRequestFallback')}
              </Text>
              <Text style={styles.em}>{item.statusLabel}</Text>
            </View>
            <Icon name="chevron_right" size={18} />
          </Pressable>
        ))}
        <Pressable
          style={styles.row}
          onPress={() => {
            setPickingRequest(false);
            setView({level: 'home'});
          }}>
          <Icon name="help" size={18} />
          <View style={styles.copy}>
            <Text style={styles.strong}>{t('help.pickRequestSkip')}</Text>
            <Text style={styles.em}>{t('help.pickRequestSkipHint')}</Text>
          </View>
          <Icon name="chevron_right" size={18} />
        </Pressable>
      </ScrollView>
    );
  }

  if (feedbackOpen) {
    return (
      <HelpFeedbackForm
        showChrome
        onBack={() => setFeedback(false)}
        onClose={() => {
          setFeedback(false);
        }}
      />
    );
  }

  if (view.level === 'detail') {
    const {group, sub} = view;
    const tips = splitTips(String(t(sub.tipsKey)));
    return (
      <>
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable
          style={styles.back}
          onPress={() => setView({level: 'group', group})}>
          <Icon name="arrow_back" size={18} />
          <Text>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.h3}>{t(sub.titleKey)}</Text>
        {tips.map(line => (
          <Text key={line} style={styles.tip}>
            {line}
          </Text>
        ))}
        {sub.action ? (
          <Button variant="primary" block onPress={() => runSubAction(sub)}>
            {sub.action === 'cancel-request'
              ? t('help.action.cancelRequest')
              : sub.action === 'edit-request'
                ? t('help.action.editRequest')
                : t('help.action.continue')}
          </Button>
        ) : (
          contactButtons(String(t(sub.titleKey)))
        )}
      </ScrollView>
      {linkAlertModal}
    </>
    );
  }

  if (view.level === 'group') {
    const {group} = view;
    const subs = group.subtopics || [];
    return (
      <>
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable style={styles.back} onPress={() => setView({level: 'home'})}>
          <Icon name="arrow_back" size={18} />
          <Text>{t('common.back')}</Text>
        </Pressable>
        {contextLead && group.id === 'serviceRequest' && contextLead.meta ? (
          <Text style={styles.em}>{contextLead.meta}</Text>
        ) : null}
        <View style={styles.groupHead}>
          <View style={styles.topicIcon}>
            <Icon name={group.icon} size={20} color="#3182CE" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.h3}>{t(group.titleKey)}</Text>
            <Text style={styles.em}>{t(group.subtitleKey)}</Text>
          </View>
        </View>

        {subs.length > 0 ? (
          <>
            {subs.map(sub => (
              <Pressable
                key={sub.id}
                style={styles.row}
                onPress={() => setView({level: 'detail', group, sub})}>
                <View style={styles.copy}>
                  <Text style={styles.strong}>{t(sub.titleKey)}</Text>
                </View>
                <Icon name="chevron_right" size={18} />
              </Pressable>
            ))}
            <Pressable
              style={styles.row}
              onPress={() =>
                setView({
                  level: 'detail',
                  group,
                  sub: {
                    id: 'something-else',
                    titleKey: 'help.group.somethingElseTitle',
                    tipsKey: 'help.group.somethingElseTips',
                  },
                })
              }>
              <View style={styles.copy}>
                <Text style={styles.strong}>
                  {t('help.group.somethingElseTitle')}
                </Text>
              </View>
              <Icon name="chevron_right" size={18} />
            </Pressable>
          </>
        ) : group.tipsKey ? (
          <>
            {splitTips(String(t(group.tipsKey))).map(line => (
              <Text key={line} style={styles.tip}>
                {line}
              </Text>
            ))}
            {contactButtons(String(t(group.titleKey)))}
          </>
        ) : null}
      </ScrollView>
      {linkAlertModal}
    </>
    );
  }

  return (
    <>
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.lead}>{t('help.panelLead')}</Text>

      {onHistory && request ? (
        <View style={styles.context}>
          <Text style={styles.strong}>
            {[request.serviceType, request.locationLabel]
              .filter(Boolean)
              .join(' · ') || t('help.pickRequestFallback')}
          </Text>
          {request.statusLabel ? (
            <Text style={styles.em}>{request.statusLabel}</Text>
          ) : null}
          <View style={styles.contextActions}>
            {candidates.length > 1 ? (
              <Pressable
                onPress={() => {
                  setRequestSnapshot(null);
                  setPickingRequest(true);
                  setView({level: 'home'});
                }}>
                <Text style={styles.contextLink}>{t('help.changeRequest')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                dispatchHelpAction({
                  type: 'open-request',
                  requestId: request.requestId,
                })
              }>
              <Text style={styles.contextLink}>{t('help.viewRequest')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {groups.map(group => (
        <Pressable
          key={group.id}
          style={styles.row}
          onPress={() => setView({level: 'group', group})}>
          <View style={styles.topicIcon}>
            <Icon name={group.icon} size={18} color="#3182CE" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.strong}>{t(group.titleKey)}</Text>
            <Text style={styles.em}>{t(group.subtitleKey)}</Text>
          </View>
          <Icon name="chevron_right" size={18} />
        </Pressable>
      ))}

      <View style={styles.contactSection}>
        <Text style={styles.sectionLabel}>{t('help.stillNeedHelp')}</Text>
        <Pressable
          style={[styles.row, styles.whatsappRow]}
          onPress={() => openWhatsApp(String(t('help.whatsappPrefill')))}>
          <Icon name="chat" size={20} color="#25D366" />
          <View style={styles.copy}>
            <Text style={styles.strong}>{t('help.chatWhatsApp')}</Text>
            <Text style={styles.em}>{t('help.chatWhatsAppSupportHint')}</Text>
          </View>
          <Icon name="chevron_right" size={18} />
        </Pressable>
        <Pressable style={styles.row} onPress={openSupportCall}>
          <Icon name="call" size={20} color="#3182CE" />
          <View style={styles.copy}>
            <Text style={styles.strong}>{t('help.callSupport')}</Text>
            <Text style={styles.em}>
              {SUPPORT_PHONE} · {hoursLabel}
            </Text>
          </View>
          <Icon name="chevron_right" size={18} />
        </Pressable>
      </View>

      <Pressable style={styles.ideaLink} onPress={() => setFeedback(true)}>
        <Text style={styles.ideaText}>
          {t('help.haveIdea')}{' '}
          <Text style={styles.ideaAccent}>{t('help.giveFeedback')}</Text>
        </Text>
      </Pressable>
    </ScrollView>
    {linkAlertModal}
    </>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 6,
  },
  lead: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 2,
  },
  pickerHint: {fontSize: 13, color: '#718096', marginBottom: 4},
  back: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8},
  h3: {fontSize: 16, fontWeight: '700', color: '#1A202C', marginBottom: 4},
  tip: {fontSize: 14, color: '#2D3748', lineHeight: 20, marginBottom: 6},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 28, 46, 0.08)',
  },
  whatsappRow: {
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderColor: 'rgba(37, 211, 102, 0.22)',
  },
  topicIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(49, 130, 206, 0.12)',
  },
  copy: {flex: 1, minWidth: 0},
  strong: {fontSize: 14, fontWeight: '700', color: '#1A202C'},
  em: {fontSize: 12, color: '#718096', marginTop: 2, lineHeight: 16},
  groupHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  contactActions: {gap: 8, marginTop: 12},
  contactSection: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
    marginBottom: 2,
  },
  context: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(49, 130, 206, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 206, 0.2)',
    gap: 4,
    marginBottom: 4,
  },
  contextActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6},
  contextLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3182CE',
    textDecorationLine: 'underline',
  },
  ideaLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  ideaText: {fontSize: 13, color: '#718096', textAlign: 'center'},
  ideaAccent: {fontWeight: '700', color: '#3182CE'},
});
