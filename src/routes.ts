import { Request, Response, Router } from 'express';
import Remootio from 'remootio-api-client';
import axios from 'axios';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { ReceivedEncryptedFrameContent, ReceivedFrames, RemootioActionResponse } from 'remootio-api-client/lib/frames';

import { KeyManagementEvent, LeftOpenEvent, RemootioStatus, StateEvent, TriggerEvent } from './types/remootio.type';

import { config } from './config';

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

const logEvent = (message: string): void => {
  if (!existsSync('./logs')) {
    mkdirSync('./logs');
  }

  const d = new Date();
  console.log(message);
  appendFileSync(`./logs/log_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}.log`, `[${d.toISOString()}] - ${message}\n`, 'utf8');
}

const handleResponseQuery = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  if (!response.success) {
    logEvent(`[ERROR] - QUERY - Failed: ${response.errorCode}`);
    return;
  }
  
  remootioStatus = response.state === 'open'
    ? RemootioStatus.OPEN
    : RemootioStatus.CLOSED;
  logEvent(`[INFO] - QUERY - State: ${remootioStatus}`);
}

const handleResponseTrigger = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  logEvent(`[INFO] - TRIGGER - Action was ${response.success ? 'success' : 'failure'} : ${response}`);
}

const handleResponseOpen = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  if (!response.success) {
    logEvent(`[ERROR] - OPEN - Failed: ${response.errorCode}`);
    return;
  }

  remootioStatus = response.state === 'open'
    ? RemootioStatus.OPEN
    : RemootioStatus.CLOSED;
  logEvent(`[INFO] - OPEN - State: ${remootioStatus}`);
}

const handleResponseClose = (payload: RemootioActionResponse): void => {
  const { response } = payload;

  if (!response.success) {
    logEvent(`[ERROR] - CLOSE - Failed: ${response.errorCode}`);
    return;
  }

  remootioStatus = response.state === 'open'
    ? RemootioStatus.OPEN
    : RemootioStatus.CLOSED;
  logEvent(`[INFO] - CLOSE - State: ${remootioStatus}`);
}

const handleKeyManagementEvent = (payload: KeyManagementEvent): void => {
  const { event } = payload;
  logEvent(`This is a KeyManagementEvent from Remootio device: ${JSON.stringify(event, null, 2)}`);
}

const handleLeftOpenEvent = (payload: LeftOpenEvent): void => {
  const { event } = payload;
  logEvent(`This is a LeftOpenEvent from Remootio device. Gate has been left open for ${event.data.timeOpen100ms * 0.1} seconds. ${event.t100ms} -- ${JSON.stringify(event, null, 2)}`);
}

const handleTriggerEvent = (payload: TriggerEvent): void => {
  const { event } = payload;
  logEvent(`This is a TriggerEvent from Remootio device: ${JSON.stringify(event, null, 2)}`);
  if (event.type === 'RelayTrigger') {
    logEvent(`Relay triggered from Remootio device: ${JSON.stringify(event, null, 2)}`);
  }
  if (event.type === 'SecondaryRelayTrigger') {
    logEvent(`Secondary Relay triggered from Remootio device: ${JSON.stringify(event, null, 2)}`);
  }
  if (event.type === 'Connected') {
    logEvent(`Connected to Remootio device: ${JSON.stringify(event, null, 2)}`);
  }
}

const handleStateEvent = (payload: StateEvent): void => {
  const { event } = payload;
  logEvent(`This is a StateEvent from Remootio device: ${JSON.stringify(event, null, 2)}`);
  if (event.type === 'StateChange') {
    remootioStatus = event.state === 'open'
      ? RemootioStatus.OPEN
      : RemootioStatus.CLOSED;
    logEvent(`[INFO] - StateChange: ${event.state}`);

    const url = config.webhooks.stateChange!.replace('remootioStatus', remootioStatus)
    axios.get(url)
      .catch(err => logEvent(`Error occured when calling state change webhook: ${err}`));
  }
}

const onConnecting = (): void => {
  logEvent('Connecting to Remootio device');
}

const onConnected = (): void => {
  logEvent('Connected to Remootio device. Starting authentication...');
  remootio.authenticate();
}

const onAuthenticated = (): void => {
  logEvent('Authenticated to Remootio device. Sending hello...');
  remootio.sendHello();
}

const onError = (errorMessage: string): void => {
  logEvent(`Remootio error occured: ${errorMessage}`);

  const url = config.webhooks.errorMessage!.replace('errorMessage', encodeURIComponent(errorMessage))
  axios.get(url)
    .catch(err => logEvent(`Error occured when calling error message webhook: ${err}`))
}

const onDisconnect = (): void => {
  logEvent('Disconnected from Remootio device');

  axios.get(config.webhooks.disconnect!)
    .catch(err => logEvent(`Error occured when calling disconnect webhook: ${err}`))
}

const onIncomingMessage = (frame: ReceivedFrames, decryptedPayload?: ReceivedEncryptedFrameContent): void => {
  // 'SERVER_HELLO' || 'ERROR' || 'PONG' || 'ENCRYPTED'
  //logEvent(`Received ${frame.type} from Remootio: ${JSON.stringify(frame, null, 2)}`);
  
  if (!decryptedPayload) {
    return;
  }
  
  // 'CHALLENGE' || 'response' || 'event'
  const payloadKeys = Object.keys(decryptedPayload)
  if (!payloadKeys.includes('response') && !payloadKeys.includes('event')) {
    logEvent(`This is not a response nor an event from Remootio device: ${JSON.stringify(decryptedPayload, null, 2)}`);
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
    
    logEvent(`[WARN] - Unknown response: ${response.response}`);
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
logEvent(`Connecting to Remootio device with IP address: ${ipAddress}`);

remootio.on('connecting', onConnecting);
remootio.on('connected', onConnected);
remootio.on('authenticated', onAuthenticated);
remootio.on('error', onError);
remootio.on('disconnect', onDisconnect);
remootio.on('incomingmessage', onIncomingMessage);

remootio.connect(true);

let remootioStatus: RemootioStatus = RemootioStatus.UNKNOWN;

router.get('/status', (req: Request, res: Response) => {
  logEvent(`${req.route.path} called`);
  res.json({
    isAuthenticated: remootio.isAuthenticated,
    isConnected: remootio.isConnected,
    status: remootioStatus,
    timestamp: new Date().toISOString()
  });
});

router.get('/close', (req: Request, res: Response) => {
  logEvent(`${req.route.path} called`);
  if (remootioStatus === RemootioStatus.UNKNOWN) {
    logEvent('Remootio not yet available. 🫷🫸');
    return res.json({ status: 400, result: 'Remootio not yet available' });
  }

  if (remootioStatus === RemootioStatus.CLOSED) {
    logEvent('Already closed. 🫷🫸');
    return res.json({ result: 'Remootio already closed' });
  }
  
  remootio.sendClose();
  logEvent('close sent');
  res.json({ result: 'close sent' });
});

router.get('/open', (req: Request, res: Response) => {
  logEvent(`${req.route.path} called`);
  if (remootioStatus === RemootioStatus.UNKNOWN) {
    return res.json({ status: 400, result: 'Remootio not yet available' });
  }

  if (remootioStatus === RemootioStatus.OPEN) {
    logEvent('Already open. 🫷🫸');
    return res.json({ result: 'Remootio already open' });
  }

  remootio.sendOpen();
  logEvent('open sent');
  res.json({ result: 'open sent' });
});

export default router;
