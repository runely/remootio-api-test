import { Request, Response, Router } from 'express';
import Remootio from 'remootio-api-client'
import axios from 'axios'
import { ReceivedEncryptedFrameContent, ReceivedFrames, RemootioActionResponse } from 'remootio-api-client/lib/frames';

import { KeyManagementEvent, LeftOpenEvent, RemootioStatus, StateEvent, TriggerEvent } from './types/remootio.type';

import { config } from './config'

const ipAddress = config.ipAddress;
const apiSecretKey = config.apiSecretKey;
const apiAuthKey = config.apiAuthKey;

if (ipAddress === undefined || apiSecretKey === undefined || apiAuthKey === undefined) {
  throw new Error('Invalid ip address, api secret key or api auth key');
}

if (config.webhooks.errorMessage === undefined ||
  config.webhooks.disconnect === undefined ||
  config.webhooks.stateChange === undefined) {
  throw new Error('Invalid webhooks config');
}

const handleResponseQuery = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  if (!response.success) {
    console.log('[ERROR] - QUERY - Failed:', response.errorCode);
    return;
  }
  
  remootioStatus = response.state === 'open'
    ? RemootioStatus.OPEN
    : RemootioStatus.CLOSED;
  console.log('[INFO] - QUERY - State:', remootioStatus);
}

const handleResponseTrigger = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  console.log('[INFO] - TRIGGER - Action was', response.success ? 'success' : 'failure', ':', response);
}

const handleResponseOpen = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  if (!response.success) {
    console.log('[ERROR] - OPEN - Failed:', response.errorCode);
    return;
  }

  remootioStatus = response.state === 'open'
    ? RemootioStatus.OPEN
    : RemootioStatus.CLOSED;
  console.log('[INFO] - OPEN - State:', remootioStatus);
}

const handleResponseClose = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  if (!response.success) {
    console.log('[ERROR] - CLOSE - Failed:', response.errorCode);
    return;
  }

  remootioStatus = response.state === 'open'
    ? RemootioStatus.OPEN
    : RemootioStatus.CLOSED;
  console.log('[INFO] - CLOSE - State:', remootioStatus);
}

const handleKeyManagementEvent = (payload: KeyManagementEvent): void => {
  const { event } = payload;
  console.log('This is a KeyManagementEvent from Remootio device', event);
}

const handleLeftOpenEvent = (payload: LeftOpenEvent): void => {
  const { event } = payload;
  console.log('This is a LeftOpenEvent from Remootio device. Gate has been left open for', event.data.timeOpen100ms * 0.1, 'seconds.', event.t100ms, '--', event);
}

const handleTriggerEvent = (payload: TriggerEvent): void => {
  const { event } = payload;
  console.log('This is a TriggerEvent from Remootio device', event);
  if (event.type === 'RelayTrigger') {
    console.log('Relay triggered from Remootio device', event);
  }
  if (event.type === 'SecondaryRelayTrigger') {
    console.log('Secondary Relay triggered from Remootio device', event);
  }
  if (event.type === 'Connected') {
    console.log('Connected to Remootio device', event);
  }
}

const handleStateEvent = (payload: StateEvent): void => {
  const { event } = payload;
  console.log('This is a StateEvent from Remootio device', event);
  if (event.type === 'StateChange') {
    remootioStatus = event.state === 'open'
      ? RemootioStatus.OPEN
      : RemootioStatus.CLOSED;
    console.log('[INFO] - StateChange:', event.state);

    const url = config.webhooks.stateChange!.replace('remootioStatus', remootioStatus)
    axios.get(url)
      .catch(err => console.log(err))
  }
}

const onConnecting = (): void => {
  console.log('Connecting to Remootio device');
}

const onConnected = (): void => {
  console.log('Connected to Remootio device. Starting authentication...');
  remootio.authenticate();
}

const onAuthenticated = (): void => {
  console.log('Authenticated to Remootio device. Sending hello...');
  remootio.sendHello();
}

const onError = (errorMessage: string): void => {
  console.error('Remootio error occured:', errorMessage);

  const url = config.webhooks.errorMessage!.replace('errorMessage', encodeURIComponent(errorMessage))
  axios.get(url)
    .catch(err => console.error(err))
}

const onDisconnect = (): void => {
  console.warn('Disconnected from Remootio device');

  axios.get(config.webhooks.disconnect!)
    .catch(err => console.error(err))
}

const onIncomingMessage = (frame: ReceivedFrames, decryptedPayload?: ReceivedEncryptedFrameContent): void => {
  // 'SERVER_HELLO' || 'ERROR' || 'PONG' || 'ENCRYPTED'
  //console.log('Received', frame.type, 'from Remootio:', JSON.stringify(frame, null, 2));
  
  if (!decryptedPayload) {
    return;
  }
  
  // 'CHALLENGE' || 'response' || 'event'
  const payloadKeys = Object.keys(decryptedPayload)
  if (!payloadKeys.includes('response') && !payloadKeys.includes('event')) {
    console.log('This is not a response nor an event from Remootio device', JSON.stringify(decryptedPayload));
    return;
  }

  if (payloadKeys.includes('response')) {
    const response = decryptedPayload as RemootioActionResponse;
    
    if (response.response.type === 'QUERY') {
      handleResponseQuery(response);
      return;
    }

    if (response.response.type === 'TRIGGER') {
      handleResponseTrigger(response);
      return;
    }

    if (response.response.type === 'OPEN') {
      handleResponseOpen(response);
      return;
    }

    if (response.response.type === 'CLOSE') {
      handleResponseClose(response);
      return;
    }
    
    console.log('[WARN] - Unknown response:', response.response);
    return;
  }

  if (payloadKeys.includes('event')) {
    // @ts-ignore
    const type = decryptedPayload['event'].type;

    if (type === 'KeyManagement') {
      const event = decryptedPayload as KeyManagementEvent;
      handleKeyManagementEvent(event);
      return;
    }

    if (type === 'LeftOpen') {
      const event = decryptedPayload as LeftOpenEvent;
      handleLeftOpenEvent(event);
      return;
    }

    if (['RelayTrigger', 'SecondaryRelayTrigger', 'Connected'].includes(type)) {
      const event = decryptedPayload as TriggerEvent;
      handleTriggerEvent(event);
      return;
    }

    if (['StateChange', 'Restart', 'ManualButtonPushed', 'ManualButtonEnabled', 'ManualButtonDisabled', 'DoorbellPushed', 'DoorbellEnabled', 'DoorbellDisabled', 'SensorEnabled', 'SensorFlipped', 'SensorDisabled'].includes(type)) {
      const event = decryptedPayload as StateEvent;
      handleStateEvent(event);
      return;
    }
  }
}

const router = Router();

const remootio = new Remootio(ipAddress, apiSecretKey, apiAuthKey);
console.log('Connecting to Remootio device with IP address', ipAddress);

remootio.on('connecting', onConnecting);
remootio.on('connected', onConnected);
remootio.on('authenticated', onAuthenticated);
remootio.on('error', onError);
remootio.on('disconnect', onDisconnect);
remootio.on('incomingmessage', onIncomingMessage);

remootio.connect(true);

let remootioStatus: RemootioStatus = RemootioStatus.UNKNOWN;

router.get('/status', (req: Request, res: Response) => {
  console.log(req.route.path, 'called');
  res.json({
    isAuthenticated: remootio.isAuthenticated,
    isConnected: remootio.isConnected,
    status: remootioStatus,
    timestamp: new Date().toISOString()
  });
});

router.get('/close', (req: Request, res: Response) => {
  console.log(req.route.path, 'called');
  if (remootioStatus === RemootioStatus.UNKNOWN) {
    console.warn('Remootio not yet available. 🫷🫸');
    return res.json({ status: 400, result: 'Remootio not yet available' });
  }

  if (remootioStatus === RemootioStatus.CLOSED) {
    console.warn('Already closed. 🫷🫸');
    return res.json({ result: 'Remootio already closed' });
  }
  
  remootio.sendClose();
  console.log('close sent');
  res.json({ result: 'close sent' });
});

router.get('/open', (req: Request, res: Response) => {
  console.log(req.route.path, 'called');
  if (remootioStatus === RemootioStatus.UNKNOWN) {
    return res.json({ status: 400, result: 'Remootio not yet available' });
  }

  if (remootioStatus === RemootioStatus.OPEN) {
    console.warn('Already open. 🫷🫸');
    return res.json({ result: 'Remootio already open' });
  }

  remootio.sendOpen();
  console.log('open sent');
  res.json({ result: 'open sent' });
});

export default router;
