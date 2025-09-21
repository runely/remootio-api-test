type SensorStates = 'closed' | 'open' | 'no sensor';

type KeyTypes = 'master key' | 'unique key' | 'guest key' | 'api key' | 'smart home' | 'automation';

type ConnectionTypes = 'bluetooth' | 'wifi' | 'internet' | 'autoopen' | 'unknown' | 'none';

export enum RemootioStatus {
  UNKNOWN = 'unknown',
  QUERY = 'querysent',
  OPEN = 'open',
  CLOSED = 'closed'
}

export type KeyManagementEvent = {
  event: {
    cnt: number;
    type: 'KeyManagement'
    state: SensorStates
    t100ms: number
    data: {
      keyNr: number
      keyType: KeyTypes
      bluetooth: boolean
      wifi: boolean
      internet: boolean
      notification: boolean
      isRemoved: boolean
    }
  }
}

export type LeftOpenEvent = {
  event: {
    cnt: number
    type: 'LeftOpen'
    state: SensorStates
    t100ms: number
    data: {
      timeOpen100ms: number
    }
  }
}

export type TriggerEvent = {
  event: {
    cnt: number
    type: 'RelayTrigger' | 'SecondaryRelayTrigger' | 'Connected'
    state: SensorStates
    t100ms: number
    data: {
      keyNr: number
      keyType: KeyTypes
      via: ConnectionTypes
    }
  }
}

export type StateEvent = {
  event: {
    cnt: number
    type:
      | 'StateChange'
      | 'Restart'
      | 'ManualButtonPushed'
      | 'ManualButtonEnabled'
      | 'ManualButtonDisabled'
      | 'DoorbellPushed'
      | 'DoorbellEnabled'
      | 'DoorbellDisabled'
      | 'SensorEnabled'
      | 'SensorFlipped'
      | 'SensorDisabled'
    state: SensorStates
    t100ms: number
  }
}