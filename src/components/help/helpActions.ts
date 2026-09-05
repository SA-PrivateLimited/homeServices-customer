import {DeviceEventEmitter} from 'react-native';

export const HELP_ACTION_EVENT = 'homora:help-action';

export type HelpActionDetail =
  | {type: 'cancel-request'}
  | {type: 'edit-request'; requestId: string}
  | {type: 'open-request'; requestId: string}
  | {type: 'open-browse'}
  | {type: 'open-help'};

export function dispatchHelpAction(detail: HelpActionDetail) {
  DeviceEventEmitter.emit(HELP_ACTION_EVENT, detail);
}
